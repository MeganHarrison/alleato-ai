/**
 * Enhanced Vectorization Worker with Smart Chunking
 * Processes documents and meetings with intelligent chunking and entity extraction
 */

import { OpenAI } from 'openai';
import SmartChunkingService, { 
  ChunkingResult, 
  SmartChunk, 
  ExtractedEntity,
  ChunkRelationship 
} from '../lib/services/smart-chunking';

export interface Env {
  DB: D1Database;
  R2_STORAGE: R2Bucket;
  OPENAI_API_KEY: string;
  VECTOR_QUEUE: Queue;
}

interface VectorizationTask {
  r2_key: string;
  file_type: 'meeting' | 'document';
  meeting_id?: string;
  project_id?: string;
  client_id?: string;
  force_reprocess?: boolean;
}

export default {
  /**
   * Handle HTTP requests for manual vectorization
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Manual vectorization endpoint
    if (url.pathname === '/api/vectorize' && request.method === 'POST') {
      try {
        const body = await request.json() as VectorizationTask;
        
        // Add to queue for processing
        await env.VECTOR_QUEUE.send(body);
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Vectorization task queued',
          task: body
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Invalid request'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Status endpoint
    if (url.pathname === '/api/status' && request.method === 'GET') {
      const stats = await getVectorizationStats(env);
      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not found', { status: 404 });
  },

  /**
   * Process queue messages
   */
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    console.log(`Processing ${batch.messages.length} vectorization tasks`);
    
    for (const message of batch.messages) {
      try {
        const task = message.body as VectorizationTask;
        await processVectorizationWithSmartChunking(task, env);
        message.ack();
      } catch (error) {
        console.error('Queue processing error:', error);
        message.retry();
      }
    }
  },

  /**
   * Scheduled processing for pending items
   */
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log('Running scheduled vectorization check');
    
    // Process unvectorized meetings
    const unprocessed = await env.DB.prepare(`
      SELECT id, r2_key, title 
      FROM meetings 
      WHERE vector_processed = false 
        AND r2_key IS NOT NULL
      ORDER BY date DESC
      LIMIT 10
    `).all();
    
    console.log(`Found ${unprocessed.results?.length || 0} unprocessed meetings`);
    
    for (const meeting of unprocessed.results || []) {
      await env.VECTOR_QUEUE.send({
        r2_key: meeting.r2_key,
        file_type: 'meeting',
        meeting_id: meeting.id
      });
    }
  }
};

/**
 * Main vectorization function with smart chunking
 */
async function processVectorizationWithSmartChunking(
  task: VectorizationTask,
  env: Env
): Promise<void> {
  const { r2_key, file_type, meeting_id } = task;
  
  console.log(`Processing vectorization for: ${r2_key}`);
  const startTime = Date.now();
  
  try {
    // Fetch content from R2
    const object = await env.R2_STORAGE.get(r2_key);
    if (!object) {
      throw new Error(`Object not found in R2: ${r2_key}`);
    }
    
    const content = await object.text();
    console.log(`Fetched content: ${content.length} characters`);
    
    // Initialize smart chunking service
    const chunkingService = new SmartChunkingService(
      {
        maxTokens: 1500,
        minTokens: 100,
        overlapTokens: 200,
        targetTokens: 1000,
      },
      env.OPENAI_API_KEY
    );
    
    // Process content with smart chunking
    const chunkingResult: ChunkingResult = await chunkingService.processContent(
      content,
      file_type
    );
    
    console.log(`Created ${chunkingResult.chunks.length} smart chunks`);
    console.log(`Extracted ${chunkingResult.relationships.length} relationships`);
    console.log(`Found entities: ${Array.from(chunkingResult.metadata.extractedEntities.keys()).join(', ')}`);
    
    // Create or update meeting record
    let actualMeetingId = meeting_id;
    if (!actualMeetingId && file_type === 'meeting') {
      actualMeetingId = await createOrUpdateMeeting(r2_key, content, chunkingResult, env);
    }
    
    if (!actualMeetingId) {
      throw new Error('Failed to create or find meeting record');
    }
    
    // Store chunks with embeddings
    await storeChunksWithEmbeddings(
      actualMeetingId,
      chunkingResult.chunks,
      env
    );
    
    // Store chunk relationships
    await storeChunkRelationships(chunkingResult.relationships, env);
    
    // Store extracted entities
    await storeExtractedEntities(
      actualMeetingId,
      chunkingResult.chunks,
      env
    );
    
    // Store timeline events
    await storeTimelineEvents(
      actualMeetingId,
      chunkingResult.metadata.timeline || [],
      env
    );
    
    // Update meeting with metadata
    await updateMeetingMetadata(
      actualMeetingId,
      chunkingResult.metadata,
      env
    );
    
    // Mark as processed
    await env.DB.prepare(
      `UPDATE meetings 
       SET vector_processed = true, 
           chunk_count = ?,
           total_tokens = ?
       WHERE id = ?`
    ).bind(
      chunkingResult.chunks.length,
      chunkingResult.metadata.totalTokens,
      actualMeetingId
    ).run();
    
    const duration = Date.now() - startTime;
    console.log(`Successfully vectorized ${r2_key} in ${duration}ms`);
    console.log(`- Chunks: ${chunkingResult.chunks.length}`);
    console.log(`- Relationships: ${chunkingResult.relationships.length}`);
    console.log(`- Entities: ${Array.from(chunkingResult.metadata.extractedEntities.values()).flat().length}`);
    
  } catch (error) {
    console.error(`Vectorization failed for ${r2_key}:`, error);
    
    // Log error to database
    await env.DB.prepare(
      `INSERT INTO processing_queue (
        id, task_type, payload, status, error_message, created_at
      ) VALUES (?, ?, ?, 'failed', ?, datetime('now'))`
    ).bind(
      crypto.randomUUID(),
      'vectorization_error',
      JSON.stringify(task),
      error instanceof Error ? error.message : 'Unknown error'
    ).run();
    
    throw error;
  }
}

/**
 * Create or update meeting record
 */
async function createOrUpdateMeeting(
  r2_key: string,
  content: string,
  chunkingResult: ChunkingResult,
  env: Env
): Promise<string> {
  // Extract meeting info from filename
  const match = r2_key.match(/meetings\/(\d{4}-\d{2}-\d{2})\s*-\s*(.+)\.md$/);
  const meetingDate = match?.[1];
  const title = match?.[2] || 'Untitled Meeting';
  
  // Check if meeting exists
  const existing = await env.DB.prepare(
    `SELECT id FROM meetings WHERE r2_key = ?`
  ).bind(r2_key).first();
  
  if (existing) {
    return existing.id as string;
  }
  
  // Extract participants from metadata
  const participants = chunkingResult.metadata.speakers || 
    chunkingResult.metadata.extractedEntities.get('person')?.map(e => e.value) || [];
  
  // Extract action items and decisions
  const actionItems = chunkingResult.metadata.extractedEntities.get('action_item') || [];
  const decisions = chunkingResult.metadata.extractedEntities.get('decision') || [];
  
  // Create new meeting
  const meetingId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO meetings (
      id, title, date, r2_key,
      participants, action_items, decisions,
      searchable_text, word_count, vector_processed,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, false, datetime('now'), datetime('now'))`
  ).bind(
    meetingId,
    title,
    meetingDate,
    r2_key,
    JSON.stringify(participants),
    JSON.stringify(actionItems.map(e => ({ description: e.value, confidence: e.confidence }))),
    JSON.stringify(decisions.map(e => ({ description: e.value, confidence: e.confidence }))),
    content.substring(0, 5000),
    content.split(/\s+/).length
  ).run();
  
  return meetingId;
}

/**
 * Store chunks with embeddings
 */
async function storeChunksWithEmbeddings(
  meetingId: string,
  chunks: SmartChunk[],
  env: Env
): Promise<void> {
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  
  for (const chunk of chunks) {
    // Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk.content,
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    
    // Store chunk with all metadata
    await env.DB.prepare(
      `INSERT INTO meeting_chunks (
        id, meeting_id, chunk_index, chunk_type, content,
        speaker, start_time, end_time,
        parent_chunk_id, previous_chunk_id, next_chunk_id,
        topics, sentiment, importance,
        context_before, context_after, token_count,
        embedding, embedding_model,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        datetime('now'), datetime('now')
      )`
    ).bind(
      chunk.id,
      meetingId,
      chunk.position,
      chunk.type,
      chunk.content,
      chunk.speaker || null,
      chunk.startTime || null,
      chunk.endTime || null,
      chunk.parentChunkId || null,
      chunk.previousChunkId || null,
      chunk.nextChunkId || null,
      JSON.stringify(chunk.topics),
      chunk.sentiment || null,
      chunk.importance,
      chunk.contextBefore || null,
      chunk.contextAfter || null,
      chunk.tokenCount,
      new Uint8Array(new Float32Array(embedding).buffer),
      'text-embedding-3-small'
    ).run();
    
    // Update vector index
    await env.DB.prepare(
      `INSERT INTO vector_index (
        id, chunk_id, meeting_id, chunk_preview, relevance_score,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      crypto.randomUUID(),
      chunk.id,
      meetingId,
      chunk.content.substring(0, 200),
      chunk.importance
    ).run();
  }
}

/**
 * Store chunk relationships
 */
async function storeChunkRelationships(
  relationships: ChunkRelationship[],
  env: Env
): Promise<void> {
  for (const rel of relationships) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO chunk_relationships (
        id, from_chunk_id, to_chunk_id, relationship_type, strength,
        created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      crypto.randomUUID(),
      rel.fromChunkId,
      rel.toChunkId,
      rel.type,
      rel.strength
    ).run();
  }
}

/**
 * Store extracted entities
 */
async function storeExtractedEntities(
  meetingId: string,
  chunks: SmartChunk[],
  env: Env
): Promise<void> {
  for (const chunk of chunks) {
    for (const entity of chunk.entities) {
      // Parse metadata based on entity type
      let metadata: any = {};
      if (entity.type === 'action_item') {
        // Extract assignee and due date if present in context
        const assigneeMatch = entity.context?.match(/assigned to:?\s*([^,\n]+)/i);
        const dueDateMatch = entity.context?.match(/due:?\s*([^,\n]+)/i);
        metadata = {
          assignee: assigneeMatch?.[1]?.trim(),
          due_date: dueDateMatch?.[1]?.trim()
        };
      }
      
      await env.DB.prepare(
        `INSERT INTO extracted_entities (
          id, chunk_id, meeting_id, entity_type, entity_value,
          confidence, context, position, metadata,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        crypto.randomUUID(),
        chunk.id,
        meetingId,
        entity.type,
        entity.value,
        entity.confidence,
        entity.context || null,
        entity.position || null,
        JSON.stringify(metadata)
      ).run();
    }
  }
}

/**
 * Store timeline events
 */
async function storeTimelineEvents(
  meetingId: string,
  timeline: any[],
  env: Env
): Promise<void> {
  for (const event of timeline) {
    await env.DB.prepare(
      `INSERT INTO timeline_events (
        id, meeting_id, chunk_id, event_type, event_description,
        event_timestamp, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`
    ).bind(
      crypto.randomUUID(),
      meetingId,
      event.chunkId,
      event.type,
      event.description,
      event.timestamp
    ).run();
  }
}

/**
 * Update meeting with extracted metadata
 */
async function updateMeetingMetadata(
  meetingId: string,
  metadata: any,
  env: Env
): Promise<void> {
  // Prepare entity summary
  const entitySummary: any = {};
  for (const [type, entities] of metadata.extractedEntities.entries()) {
    entitySummary[type] = entities.map((e: ExtractedEntity) => ({
      value: e.value,
      confidence: e.confidence
    }));
  }
  
  await env.DB.prepare(
    `UPDATE meetings SET
      extracted_entities = ?,
      timeline = ?,
      speakers = ?,
      keywords = ?,
      updated_at = datetime('now')
    WHERE id = ?`
  ).bind(
    JSON.stringify(entitySummary),
    JSON.stringify(metadata.timeline || []),
    JSON.stringify(metadata.speakers || []),
    JSON.stringify(metadata.topics || []),
    meetingId
  ).run();
}

/**
 * Get vectorization statistics
 */
async function getVectorizationStats(env: Env): Promise<any> {
  const stats = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total_meetings,
      SUM(CASE WHEN vector_processed = true THEN 1 ELSE 0 END) as processed_meetings,
      SUM(chunk_count) as total_chunks,
      AVG(chunk_count) as avg_chunks_per_meeting,
      SUM(total_tokens) as total_tokens
    FROM meetings
  `).first();
  
  const entityStats = await env.DB.prepare(`
    SELECT 
      entity_type,
      COUNT(*) as count
    FROM extracted_entities
    GROUP BY entity_type
  `).all();
  
  const relationshipStats = await env.DB.prepare(`
    SELECT 
      relationship_type,
      COUNT(*) as count,
      AVG(strength) as avg_strength
    FROM chunk_relationships
    GROUP BY relationship_type
  `).all();
  
  return {
    meetings: stats,
    entities: entityStats.results,
    relationships: relationshipStats.results,
    timestamp: new Date().toISOString()
  };
}