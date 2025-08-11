/**
 * Vectorization Worker for Alleato AI
 * Automatically processes documents and meetings from R2 storage
 * Generates embeddings and stores in D1 for RAG functionality
 */

import { OpenAI } from 'openai';

export interface Env {
  DB: D1Database;
  R2_STORAGE: R2Bucket;
  OPENAI_API_KEY: string;
  VECTOR_QUEUE: Queue;
}

interface ProcessingTask {
  id: string;
  task_type: string;
  payload: {
    r2_key: string;
    file_type?: string;
    meeting_id?: string;
    project_id?: string;
    client_id?: string;
  };
}

interface ExtractedMetadata {
  project_mentions: string[];
  client_mentions: string[];
  participants: string[];
  action_items: Array<{
    description: string;
    assignee?: string;
    due_date?: string;
  }>;
  decisions: Array<{
    description: string;
    made_by?: string;
  }>;
  keywords: string[];
}

// Smart chunking configuration
const CHUNK_CONFIG = {
  maxChunkSize: 1500, // tokens
  overlapSize: 200,   // tokens
  minChunkSize: 100,  // tokens
};

export default {
  // Handle R2 upload events
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Verify this is an R2 event
      const eventType = request.headers.get('X-Event-Type');
      if (eventType === 'r2.object.created') {
        const event = await request.json() as any;
        const { key } = event;
        
        // Determine file type from key
        const fileType = key.includes('/meetings/') ? 'meeting' : 'document';
        
        // Extract potential metadata from file path
        // Expected format: meetings/YYYY-MM-DD - Title.md
        let meetingDate, title;
        if (fileType === 'meeting') {
          const match = key.match(/meetings\/(\d{4}-\d{2}-\d{2})\s*-\s*(.+)\.md$/);
          if (match) {
            meetingDate = match[1];
            title = match[2];
          }
        }
        
        // Add to processing queue
        await env.DB.prepare(
          `INSERT INTO processing_queue (id, task_type, payload, status, scheduled_for) 
           VALUES (?, ?, ?, 'pending', datetime('now'))`
        ).bind(
          crypto.randomUUID(),
          'vectorize_' + fileType,
          JSON.stringify({ 
            r2_key: key, 
            file_type: fileType,
            meeting_date: meetingDate,
            title: title
          })
        ).run();
        
        // Trigger immediate processing
        await env.VECTOR_QUEUE.send({
          r2_key: key,
          file_type: fileType
        });
        
        return new Response('Vectorization task queued', { status: 200 });
      }
      
      return new Response('Not an R2 event', { status: 400 });
    } catch (error) {
      console.error('Error handling R2 event:', error);
      return new Response('Internal error', { status: 500 });
    }
  },

  // Process queue messages
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processVectorization(message.body as any, env);
        message.ack();
      } catch (error) {
        console.error('Queue processing error:', error);
        message.retry();
      }
    }
  },

  // Scheduled processing for pending items
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log('Running scheduled vectorization check');
    
    // Get pending tasks
    const pending = await env.DB.prepare(
      `SELECT * FROM processing_queue 
       WHERE status = 'pending' 
       AND task_type LIKE 'vectorize%'
       AND attempts < 3
       ORDER BY created_at ASC
       LIMIT 10`
    ).all<ProcessingTask>();
    
    console.log(`Found ${pending.results.length} pending vectorization tasks`);
    
    // Process each task
    for (const task of pending.results) {
      try {
        const payload = JSON.parse(task.payload as any);
        await processVectorization(payload, env);
        
        // Mark as completed
        await env.DB.prepare(
          `UPDATE processing_queue 
           SET status = 'completed', completed_at = datetime('now')
           WHERE id = ?`
        ).bind(task.id).run();
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error);
        
        // Update attempts and error
        await env.DB.prepare(
          `UPDATE processing_queue 
           SET attempts = attempts + 1, 
               error_message = ?,
               status = CASE WHEN attempts >= 2 THEN 'failed' ELSE 'pending' END
           WHERE id = ?`
        ).bind(error.message, task.id).run();
      }
    }
  }
};

async function processVectorization(payload: any, env: Env): Promise<void> {
  const { r2_key, file_type, meeting_id } = payload;
  
  console.log(`Processing vectorization for: ${r2_key}`);
  
  // Fetch content from R2
  const object = await env.R2_STORAGE.get(r2_key);
  if (!object) {
    throw new Error(`Object not found in R2: ${r2_key}`);
  }
  
  const content = await object.text();
  
  // Extract metadata and match with projects/clients
  const metadata = await extractMetadata(content, env);
  
  // Find matching project and client
  const projectMatch = await findMatchingProject(metadata, content, env);
  const clientMatch = projectMatch?.client_id ? 
    await findClient(projectMatch.client_id, env) : 
    await findMatchingClient(metadata, content, env);
  
  // Create or update meeting record
  let actualMeetingId = meeting_id;
  if (file_type === 'meeting' && !meeting_id) {
    // Extract meeting info from filename
    const match = r2_key.match(/meetings\/(\d{4}-\d{2}-\d{2})\s*-\s*(.+)\.md$/);
    const meetingDate = match?.[1];
    const title = match?.[2] || 'Untitled Meeting';
    
    // Check if meeting already exists
    const existing = await env.DB.prepare(
      `SELECT id FROM meetings WHERE r2_key = ?`
    ).bind(r2_key).first();
    
    if (existing) {
      actualMeetingId = existing.id;
      // Update with project/client info
      await env.DB.prepare(
        `UPDATE meetings 
         SET project_id = ?, client_id = ?, vector_processed = false
         WHERE id = ?`
      ).bind(projectMatch?.id, clientMatch?.id, actualMeetingId).run();
    } else {
      // Create new meeting record
      actualMeetingId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO meetings (
          id, title, date, r2_key, project_id, client_id,
          participants, action_items, decisions, keywords,
          searchable_text, word_count, vector_processed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false)`
      ).bind(
        actualMeetingId,
        title,
        meetingDate,
        r2_key,
        projectMatch?.id,
        clientMatch?.id,
        JSON.stringify(metadata.participants),
        JSON.stringify(metadata.action_items),
        JSON.stringify(metadata.decisions),
        JSON.stringify(metadata.keywords),
        content.substring(0, 5000), // First 5000 chars for search
        content.split(/\s+/).length,
      ).run();
    }
  }
  
  // Smart chunking with context preservation
  const chunks = await createSmartChunks(content, metadata);
  
  // Generate embeddings for each chunk
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk.content,
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    
    // Store chunk with embedding
    const chunkId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO meeting_chunks (
        id, meeting_id, chunk_index, chunk_type, content,
        speaker, start_time, end_time, embedding, embedding_model
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      chunkId,
      actualMeetingId,
      i,
      chunk.type,
      chunk.content,
      chunk.speaker,
      chunk.startTime,
      chunk.endTime,
      new Uint8Array(new Float32Array(embedding).buffer),
      'text-embedding-3-small'
    ).run();
    
    // Update vector index for fast search
    await env.DB.prepare(
      `INSERT INTO vector_index (
        id, chunk_id, meeting_id, meeting_title, meeting_date,
        chunk_preview, relevance_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      chunkId,
      actualMeetingId,
      payload.title || 'Meeting',
      payload.meeting_date,
      chunk.content.substring(0, 200),
      1.0
    ).run();
  }
  
  // Mark as vector processed
  if (file_type === 'meeting') {
    await env.DB.prepare(
      `UPDATE meetings SET vector_processed = true WHERE id = ?`
    ).bind(actualMeetingId).run();
  }
  
  console.log(`Successfully vectorized ${chunks.length} chunks for ${r2_key}`);
}

async function extractMetadata(content: string, env: Env): Promise<ExtractedMetadata> {
  // Extract participants from meeting format
  const participantMatches = content.match(/(?:Participants?|Attendees?):\s*([^\n]+)/gi);
  const participants = [];
  if (participantMatches) {
    for (const match of participantMatches) {
      const names = match.replace(/(?:Participants?|Attendees?):\s*/i, '')
        .split(/[,;]/)
        .map(name => name.trim())
        .filter(name => name.length > 0);
      participants.push(...names);
    }
  }
  
  // Extract action items
  const actionItems = [];
  const actionMatches = content.match(/(?:Action Item|TODO|Task):\s*([^\n]+)/gi);
  if (actionMatches) {
    for (const match of actionMatches) {
      actionItems.push({
        description: match.replace(/(?:Action Item|TODO|Task):\s*/i, '').trim()
      });
    }
  }
  
  // Extract decisions
  const decisions = [];
  const decisionMatches = content.match(/(?:Decision|Decided|Agreed):\s*([^\n]+)/gi);
  if (decisionMatches) {
    for (const match of decisionMatches) {
      decisions.push({
        description: match.replace(/(?:Decision|Decided|Agreed):\s*/i, '').trim()
      });
    }
  }
  
  // Extract project mentions
  const projectMentions = [];
  const projectMatches = content.match(/(?:project|Project)\s+(?:name|Name)?:?\s*([A-Za-z0-9\s\-]+)/gi);
  if (projectMatches) {
    for (const match of projectMatches) {
      const projectName = match.replace(/(?:project|Project)\s+(?:name|Name)?:?\s*/i, '').trim();
      if (projectName.length > 2 && projectName.length < 100) {
        projectMentions.push(projectName);
      }
    }
  }
  
  // Extract client mentions
  const clientMentions = [];
  const clientMatches = content.match(/(?:client|Client|customer|Customer)\s+(?:name|Name)?:?\s*([A-Za-z0-9\s\-&]+)/gi);
  if (clientMatches) {
    for (const match of clientMatches) {
      const clientName = match.replace(/(?:client|Client|customer|Customer)\s+(?:name|Name)?:?\s*/i, '').trim();
      if (clientName.length > 2 && clientName.length < 100) {
        clientMentions.push(clientName);
      }
    }
  }
  
  // Extract keywords (simple implementation)
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  const words = content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const wordFreq = new Map<string, number>();
  
  for (const word of words) {
    if (!commonWords.has(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }
  
  const keywords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  return {
    project_mentions: [...new Set(projectMentions)],
    client_mentions: [...new Set(clientMentions)],
    participants: [...new Set(participants)],
    action_items,
    decisions,
    keywords
  };
}

async function findMatchingProject(
  metadata: ExtractedMetadata, 
  content: string, 
  env: Env
): Promise<any> {
  // First try exact matches from metadata
  for (const projectName of metadata.project_mentions) {
    const project = await env.DB.prepare(
      `SELECT p.*, c.company_name as client_name 
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       WHERE LOWER(p.title) = LOWER(?)
       OR LOWER(p.title) LIKE LOWER(?)`
    ).bind(projectName, `%${projectName}%`).first();
    
    if (project) return project;
  }
  
  // Try fuzzy matching with all active projects
  const activeProjects = await env.DB.prepare(
    `SELECT p.*, c.company_name as client_name 
     FROM projects p
     LEFT JOIN clients c ON p.client_id = c.id
     WHERE p.status = 'active'`
  ).all();
  
  // Score each project based on content matches
  let bestMatch = null;
  let bestScore = 0;
  
  for (const project of activeProjects.results) {
    let score = 0;
    const projectTitle = project.title.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Check if project title appears in content
    if (contentLower.includes(projectTitle)) {
      score += 10;
    }
    
    // Check individual words
    const titleWords = projectTitle.split(/\s+/);
    for (const word of titleWords) {
      if (word.length > 3 && contentLower.includes(word)) {
        score += 2;
      }
    }
    
    // Check if client name appears
    if (project.client_name && contentLower.includes(project.client_name.toLowerCase())) {
      score += 5;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = project;
    }
  }
  
  return bestScore > 5 ? bestMatch : null;
}

async function findMatchingClient(
  metadata: ExtractedMetadata,
  content: string,
  env: Env
): Promise<any> {
  // First try exact matches from metadata
  for (const clientName of metadata.client_mentions) {
    const client = await env.DB.prepare(
      `SELECT * FROM clients 
       WHERE LOWER(company_name) = LOWER(?)
       OR LOWER(company_name) LIKE LOWER(?)`
    ).bind(clientName, `%${clientName}%`).first();
    
    if (client) return client;
  }
  
  // Try fuzzy matching with all clients
  const allClients = await env.DB.prepare(
    `SELECT * FROM clients`
  ).all();
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const client of allClients.results) {
    let score = 0;
    const clientName = client.company_name.toLowerCase();
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes(clientName)) {
      score += 10;
    }
    
    // Check individual words
    const nameWords = clientName.split(/\s+/);
    for (const word of nameWords) {
      if (word.length > 3 && contentLower.includes(word)) {
        score += 2;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = client;
    }
  }
  
  return bestScore > 5 ? bestMatch : null;
}

async function findClient(clientId: string, env: Env): Promise<any> {
  return await env.DB.prepare(
    `SELECT * FROM clients WHERE id = ?`
  ).bind(clientId).first();
}

interface Chunk {
  content: string;
  type: 'full' | 'speaker_turn' | 'topic_segment';
  speaker?: string;
  startTime?: number;
  endTime?: number;
}

async function createSmartChunks(
  content: string, 
  metadata: ExtractedMetadata
): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  
  // Try to detect meeting structure
  const lines = content.split('\n');
  let currentChunk = '';
  let currentSpeaker = null;
  let chunkStart = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect speaker changes (common patterns)
    const speakerMatch = line.match(/^(?:\[(\d+:\d+)\])?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*:/);
    if (speakerMatch) {
      // Save previous chunk if exists
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          type: 'speaker_turn',
          speaker: currentSpeaker,
          startTime: chunkStart
        });
      }
      
      currentSpeaker = speakerMatch[2];
      currentChunk = line + '\n';
      
      // Extract timestamp if available
      if (speakerMatch[1]) {
        const [minutes, seconds] = speakerMatch[1].split(':').map(Number);
        chunkStart = minutes * 60 + seconds;
      }
    } else {
      currentChunk += line + '\n';
    }
    
    // Check if chunk is getting too large
    const words = currentChunk.split(/\s+/).length;
    if (words > 300) {
      chunks.push({
        content: currentChunk.trim(),
        type: currentSpeaker ? 'speaker_turn' : 'topic_segment',
        speaker: currentSpeaker,
        startTime: chunkStart
      });
      currentChunk = '';
      currentSpeaker = null;
    }
  }
  
  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      type: currentSpeaker ? 'speaker_turn' : 'topic_segment',
      speaker: currentSpeaker,
      startTime: chunkStart
    });
  }
  
  // If no speaker structure detected, fall back to paragraph chunking
  if (chunks.length === 0) {
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if ((currentChunk + '\n\n' + paragraph).split(/\s+/).length > 300) {
        if (currentChunk) {
          chunks.push({
            content: currentChunk.trim(),
            type: 'topic_segment'
          });
        }
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        type: 'topic_segment'
      });
    }
  }
  
  // Add overlap for context
  const chunksWithOverlap: Chunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    let chunkContent = chunks[i].content;
    
    // Add end of previous chunk
    if (i > 0) {
      const prevWords = chunks[i-1].content.split(/\s+/).slice(-30).join(' ');
      chunkContent = `[...${prevWords}]\n\n${chunkContent}`;
    }
    
    // Add beginning of next chunk
    if (i < chunks.length - 1) {
      const nextWords = chunks[i+1].content.split(/\s+/).slice(0, 30).join(' ');
      chunkContent = `${chunkContent}\n\n[${nextWords}...]`;
    }
    
    chunksWithOverlap.push({
      ...chunks[i],
      content: chunkContent
    });
  }
  
  return chunksWithOverlap;
}