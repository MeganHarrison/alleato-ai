/**
 * Vectorization module using OpenAI embeddings
 */

export class Vectorization {
  constructor(env) {
    this.env = env;
    this.openaiApiKey = env.OPENAI_API_KEY;
    this.embeddingModel = 'text-embedding-3-small';
    this.batchSize = 20; // Process 20 chunks at a time
  }

  /**
   * Generate embeddings for text using OpenAI
   */
  async generateEmbedding(text) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: text,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: texts,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data.map(item => item.embedding);
  }

  /**
   * Process a meeting for vectorization
   */
  async vectorizeMeeting(meetingId) {
    try {
      console.log(`Starting vectorization for meeting ${meetingId}`);
      
      // 1. Get all chunks for this meeting
      const chunks = await this.getMeetingChunks(meetingId);
      if (chunks.length === 0) {
        throw new Error(`No chunks found for meeting ${meetingId}`);
      }
      
      console.log(`Processing ${chunks.length} chunks for meeting ${meetingId}`);
      
      // 2. Process chunks in batches
      for (let i = 0; i < chunks.length; i += this.batchSize) {
        const batch = chunks.slice(i, i + this.batchSize);
        const texts = batch.map(chunk => chunk.content);
        
        try {
          // Generate embeddings for batch
          const embeddings = await this.generateBatchEmbeddings(texts);
          
          // Update chunks with embeddings
          await this.updateChunkEmbeddings(batch, embeddings);
          
          console.log(`Processed batch ${i / this.batchSize + 1} of ${Math.ceil(chunks.length / this.batchSize)}`);
          
          // Rate limiting
          await this.sleep(500);
          
        } catch (error) {
          console.error(`Error processing batch for meeting ${meetingId}:`, error);
          throw error;
        }
      }
      
      // 3. Create vector index entries
      await this.createVectorIndex(meetingId);
      
      // 4. Mark meeting as vectorized
      await this.markMeetingVectorized(meetingId);
      
      console.log(`Successfully vectorized meeting ${meetingId}`);
      return { success: true, chunkCount: chunks.length };
      
    } catch (error) {
      console.error(`Error vectorizing meeting ${meetingId}:`, error);
      throw error;
    }
  }

  /**
   * Get all chunks for a meeting
   */
  async getMeetingChunks(meetingId) {
    const results = await this.env.ALLEATO_DB.prepare(`
      SELECT id, content, chunk_type, chunk_index, speaker, start_time, end_time
      FROM meeting_chunks
      WHERE meeting_id = ?
      ORDER BY chunk_index
    `).bind(meetingId).all();
    
    return results.results;
  }

  /**
   * Update chunks with embeddings
   */
  async updateChunkEmbeddings(chunks, embeddings) {
    const query = `
      UPDATE meeting_chunks
      SET embedding = ?, embedding_model = ?
      WHERE id = ?
    `;
    
    const stmt = this.env.ALLEATO_DB.prepare(query);
    const batch = [];
    
    for (let i = 0; i < chunks.length; i++) {
      // Convert embedding array to binary blob
      const embeddingBlob = this.float32ArrayToBlob(embeddings[i]);
      
      batch.push(
        stmt.bind(
          embeddingBlob,
          this.embeddingModel,
          chunks[i].id
        )
      );
    }
    
    await this.env.ALLEATO_DB.batch(batch);
  }

  /**
   * Convert float array to binary blob for storage
   */
  float32ArrayToBlob(floatArray) {
    const buffer = new ArrayBuffer(floatArray.length * 4);
    const view = new Float32Array(buffer);
    for (let i = 0; i < floatArray.length; i++) {
      view[i] = floatArray[i];
    }
    return buffer;
  }

  /**
   * Convert binary blob back to float array
   */
  blobToFloat32Array(blob) {
    const view = new Float32Array(blob);
    return Array.from(view);
  }

  /**
   * Create vector index entries for fast search
   */
  async createVectorIndex(meetingId) {
    // Get meeting info
    const meeting = await this.env.ALLEATO_DB.prepare(`
      SELECT title, date_time FROM meetings WHERE id = ?
    `).bind(meetingId).first();
    
    if (!meeting) {
      throw new Error(`Meeting ${meetingId} not found`);
    }
    
    // Get chunks with key info
    const chunks = await this.env.ALLEATO_DB.prepare(`
      SELECT id, content, chunk_type
      FROM meeting_chunks
      WHERE meeting_id = ?
    `).bind(meetingId).all();
    
    // Create index entries
    const query = `
      INSERT INTO vector_index (
        id, chunk_id, meeting_id, meeting_title, 
        meeting_date, chunk_preview
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const stmt = this.env.ALLEATO_DB.prepare(query);
    const batch = [];
    
    for (const chunk of chunks.results) {
      const preview = chunk.content.substring(0, 200);
      const indexId = `idx_${chunk.id}`;
      
      batch.push(
        stmt.bind(
          indexId,
          chunk.id,
          meetingId,
          meeting.title,
          meeting.date_time,
          preview
        )
      );
    }
    
    await this.env.ALLEATO_DB.batch(batch);
  }

  /**
   * Mark meeting as vectorized
   */
  async markMeetingVectorized(meetingId) {
    await this.env.ALLEATO_DB.prepare(`
      UPDATE meetings
      SET vector_processed = 1, processed_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), meetingId).run();
  }

  /**
   * Process vectorization queue
   */
  async processVectorizationQueue(limit = 10) {
    try {
      console.log('Processing vectorization queue...');
      
      // Get pending tasks from queue
      const tasks = await this.env.ALLEATO_DB.prepare(`
        SELECT id, meeting_id
        FROM processing_queue
        WHERE task_type = 'vectorize' 
          AND status = 'pending'
          AND attempts < 3
        ORDER BY priority DESC, created_at ASC
        LIMIT ?
      `).bind(limit).all();
      
      if (tasks.results.length === 0) {
        console.log('No pending vectorization tasks');
        return { processed: 0, failed: 0 };
      }
      
      const results = {
        processed: 0,
        failed: 0,
        errors: []
      };
      
      for (const task of tasks.results) {
        try {
          // Mark as processing
          await this.updateTaskStatus(task.id, 'processing');
          
          // Vectorize the meeting
          await this.vectorizeMeeting(task.meeting_id);
          
          // Mark as completed
          await this.updateTaskStatus(task.id, 'completed');
          results.processed++;
          
        } catch (error) {
          console.error(`Failed to vectorize meeting ${task.meeting_id}:`, error);
          
          // Update task with error
          await this.updateTaskError(task.id, error.message);
          results.failed++;
          results.errors.push({
            meetingId: task.meeting_id,
            error: error.message
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Queue processing error:', error);
      throw error;
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId, status) {
    const query = status === 'completed' 
      ? `UPDATE processing_queue 
         SET status = ?, processed_at = ? 
         WHERE id = ?`
      : `UPDATE processing_queue 
         SET status = ?, attempts = attempts + 1 
         WHERE id = ?`;
    
    const params = status === 'completed'
      ? [status, new Date().toISOString(), taskId]
      : [status, taskId];
    
    await this.env.ALLEATO_DB.prepare(query).bind(...params).run();
  }

  /**
   * Update task with error
   */
  async updateTaskError(taskId, errorMessage) {
    await this.env.ALLEATO_DB.prepare(`
      UPDATE processing_queue
      SET status = 'failed', 
          attempts = attempts + 1,
          error_message = ?
      WHERE id = ?
    `).bind(errorMessage, taskId).run();
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}