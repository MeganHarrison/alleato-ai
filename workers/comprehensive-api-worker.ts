/**
 * Comprehensive API Worker for Alleato AI
 * Handles all API endpoints including vectorization, search, and data management
 */

import { OpenAI } from 'openai';

export interface Env {
  DB: D1Database;
  R2_STORAGE: R2Bucket;
  OPENAI_API_KEY: string;
  VECTOR_QUEUE: Queue;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    try {
      // Vectorization endpoints
      if (path === '/api/vectorization-status' && request.method === 'GET') {
        return handleVectorizationStatus(env, headers);
      }
      
      if (path === '/api/vectorize-meeting' && request.method === 'POST') {
        const body = await request.json() as { meeting_id: string };
        return handleVectorizeMeeting(body.meeting_id, env, headers);
      }
      
      if (path === '/api/test-project-matching' && request.method === 'POST') {
        return handleTestProjectMatching(env, headers);
      }
      
      if (path === '/api/sync-r2-to-d1' && request.method === 'POST') {
        return handleR2ToD1Sync(env, headers);
      }
      
      if (path === '/api/test-d1' && request.method === 'GET') {
        return handleTestD1(env, headers);
      }
      
      if (path === '/api/setup-schema' && request.method === 'POST') {
        return handleSetupSchema(env, headers);
      }

      // Existing endpoints
      if (path === '/api/meetings' && request.method === 'GET') {
        return handleGetMeetings(env, headers);
      }

      if (path === '/api/search' && request.method === 'POST') {
        const body = await request.json() as { query: string; project_id?: string };
        return handleVectorSearch(body, env, headers);
      }

      return new Response(
        JSON.stringify({ error: 'Endpoint not found' }), 
        { status: 404, headers }
      );
    } catch (error) {
      console.error('API error:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Internal server error' }), 
        { status: 500, headers }
      );
    }
  }
};

async function handleVectorizationStatus(env: Env, headers: HeadersInit): Promise<Response> {
  try {
    // Get all meetings with their vectorization status
    // Note: Checking which columns exist first
    const meetings = await env.DB.prepare(`
      SELECT 
        m.id as meeting_id,
        m.title,
        m.date,
        m.r2_key,
        CASE WHEN m.vector_processed IS NULL THEN 0 ELSE m.vector_processed END as vector_processed,
        NULL as project_id,
        NULL as client_id,
        NULL as project_name,
        NULL as client_name,
        COALESCE(mc.chunk_count, 0) as chunk_count
      FROM meetings m
      LEFT JOIN (
        SELECT meeting_id, COUNT(*) as chunk_count
        FROM meeting_chunks
        GROUP BY meeting_id
      ) mc ON m.id = mc.meeting_id
      ORDER BY m.date DESC
      LIMIT 100
    `).all();

    return new Response(
      JSON.stringify({ meetings: meetings.results }), 
      { headers }
    );
  } catch (error) {
    console.error('Error fetching vectorization status:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch status', details: error.message }), 
      { status: 500, headers }
    );
  }
}

async function handleVectorizeMeeting(meetingId: string, env: Env, headers: HeadersInit): Promise<Response> {
  try {
    // Get meeting details
    const meeting = await env.DB.prepare(
      `SELECT * FROM meetings WHERE id = ?`
    ).bind(meetingId).first();

    if (!meeting) {
      return new Response(
        JSON.stringify({ error: 'Meeting not found' }), 
        { status: 404, headers }
      );
    }

    // Fetch content from R2
    const object = await env.R2_STORAGE.get(meeting.r2_key);
    if (!object) {
      return new Response(
        JSON.stringify({ error: 'Meeting transcript not found in storage' }), 
        { status: 404, headers }
      );
    }

    const content = await object.text();

    // Extract metadata
    const metadata = await extractMetadata(content, env);
    
    // Find matching project and client
    const projectMatch = await findMatchingProject(metadata, content, env);
    const clientMatch = projectMatch?.client_id ? 
      await env.DB.prepare(`SELECT * FROM clients WHERE id = ?`).bind(projectMatch.client_id).first() :
      await findMatchingClient(metadata, content, env);

    // For now, just mark that we've processed metadata
    // The current database doesn't have project_id/client_id columns
    console.log(`Project match: ${projectMatch?.title || 'None'}`);
    console.log(`Client match: ${clientMatch?.company_name || 'None'}`);

    // Delete existing chunks (if table exists)
    try {
      await env.DB.prepare(
        `DELETE FROM meeting_chunks WHERE meeting_id = ?`
      ).bind(meetingId).run();
    } catch (e) {
      console.log('Note: meeting_chunks table might not exist yet');
    }

    // Create smart chunks
    const chunks = await createSmartChunks(content, metadata);
    
    // Generate embeddings and store chunks
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk.content,
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      
      // Store chunk
      const chunkId = crypto.randomUUID();
      // Convert embedding to base64 for storage
      const embeddingBuffer = new Float32Array(embedding).buffer;
      const embeddingBase64 = btoa(String.fromCharCode(...new Uint8Array(embeddingBuffer)));
      
      try {
        await env.DB.prepare(
          `INSERT INTO meeting_chunks (
            id, meeting_id, chunk_index, chunk_type, content,
            speaker, start_time, end_time, embedding, embedding_model,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          chunkId,
          meetingId,
          i,
          chunk.type || 'topic_segment',
          chunk.content,
          chunk.speaker || null,
          chunk.startTime || null,
          chunk.endTime || null,
          embeddingBase64,
          'text-embedding-3-small',
          new Date().toISOString()
        ).run();
      } catch (chunkError) {
        console.error('Error inserting chunk:', chunkError);
        // For now, skip embedding storage and just store the chunk
        await env.DB.prepare(
          `INSERT INTO meeting_chunks (
            id, meeting_id, chunk_index, chunk_type, content,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          chunkId,
          meetingId,
          i,
          chunk.type || 'topic_segment',
          chunk.content,
          new Date().toISOString()
        ).run();
      }
      
      // Update vector index (if table exists)
      try {
        await env.DB.prepare(
          `INSERT INTO vector_index (
            id, chunk_id, meeting_id, meeting_title, meeting_date,
            chunk_preview, relevance_score
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          crypto.randomUUID(),
          chunkId,
          meetingId,
          meeting.title,
          meeting.date,
          chunk.content.substring(0, 200),
          1.0
        ).run();
      } catch (e) {
        console.log('Note: vector_index table might not exist');
      }
    }

    // Mark as processed
    await env.DB.prepare(
      `UPDATE meetings SET vector_processed = true WHERE id = ?`
    ).bind(meetingId).run();

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunks: chunks.length,
        project_matched: !!projectMatch,
        client_matched: !!clientMatch
      }), 
      { headers }
    );
  } catch (error) {
    console.error('Error vectorizing meeting:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to vectorize meeting' }), 
      { status: 500, headers }
    );
  }
}

async function handleTestProjectMatching(env: Env, headers: HeadersInit): Promise<Response> {
  try {
    // Get all meetings without project/client
    const unmatchedMeetings = await env.DB.prepare(`
      SELECT id, title, r2_key 
      FROM meetings 
      WHERE project_id IS NULL OR client_id IS NULL
      LIMIT 50
    `).all();

    let matched = 0;
    const total = unmatchedMeetings.results.length;

    for (const meeting of unmatchedMeetings.results) {
      // Fetch content
      const object = await env.R2_STORAGE.get(meeting.r2_key);
      if (!object) continue;

      const content = await object.text();
      const metadata = await extractMetadata(content, env);
      
      // Try to match
      const projectMatch = await findMatchingProject(metadata, content, env);
      const clientMatch = projectMatch?.client_id ? 
        await env.DB.prepare(`SELECT * FROM clients WHERE id = ?`).bind(projectMatch.client_id).first() :
        await findMatchingClient(metadata, content, env);

      if (projectMatch || clientMatch) {
        matched++;
        
        await env.DB.prepare(
          `UPDATE meetings SET project_id = ?, client_id = ? WHERE id = ?`
        ).bind(
          projectMatch?.id,
          clientMatch?.id || projectMatch?.client_id,
          meeting.id
        ).run();
      }
    }

    return new Response(
      JSON.stringify({ matched, total }), 
      { headers }
    );
  } catch (error) {
    console.error('Error testing project matching:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to test matching' }), 
      { status: 500, headers }
    );
  }
}

async function handleGetMeetings(env: Env, headers: HeadersInit): Promise<Response> {
  try {
    // Get all objects from R2 with pagination handling
    const allObjects = [];
    let cursor = undefined;
    let totalFetched = 0;

    do {
      const listOptions: any = { limit: 1000 };
      if (cursor) {
        listOptions.cursor = cursor;
      }

      const response = await env.R2_STORAGE.list(listOptions);
      allObjects.push(...response.objects);
      totalFetched += response.objects.length;
      
      cursor = response.truncated ? response.cursor : undefined;
      
      console.log(`Fetched ${response.objects.length} objects, total: ${totalFetched}, truncated: ${response.truncated}`);
    } while (cursor);

    // Filter for meeting files
    const meetingFiles = allObjects
      .filter(obj => obj.key.endsWith('.md') && obj.key.includes('/'))
      .map(obj => {
        const parts = obj.key.split('/');
        const filename = parts[parts.length - 1];
        const match = filename.match(/^(\d{4}-\d{2}-\d{2})\s*-\s*(.+)\.md$/);
        
        return {
          key: obj.key,
          date: match ? match[1] : 'Unknown',
          title: match ? match[2] : filename.replace('.md', ''),
          size: obj.size,
          uploaded: obj.uploaded
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return new Response(
      JSON.stringify({ 
        meetings: meetingFiles,
        total: meetingFiles.length,
        totalObjects: allObjects.length
      }), 
      { headers }
    );
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch meetings' }), 
      { status: 500, headers }
    );
  }
}

async function handleVectorSearch(body: { query: string; project_id?: string }, env: Env, headers: HeadersInit): Promise<Response> {
  try {
    const { query, project_id } = body;
    
    // Generate embedding for query
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // For now, return a simple text search
    // TODO: Implement proper vector similarity search
    let searchQuery = `
      SELECT 
        mc.id,
        mc.content,
        mc.speaker,
        m.title as meeting_title,
        m.date as meeting_date,
        m.project_id,
        p.title as project_name
      FROM meeting_chunks mc
      JOIN meetings m ON mc.meeting_id = m.id
      LEFT JOIN projects p ON m.project_id = p.id
      WHERE mc.content LIKE ?
    `;
    
    const params = [`%${query}%`];
    
    if (project_id) {
      searchQuery += ` AND m.project_id = ?`;
      params.push(project_id);
    }
    
    searchQuery += ` LIMIT 10`;
    
    const results = await env.DB.prepare(searchQuery).bind(...params).all();
    
    return new Response(
      JSON.stringify({ results: results.results }), 
      { headers }
    );
  } catch (error) {
    console.error('Error performing vector search:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to perform search' }), 
      { status: 500, headers }
    );
  }
}

// Helper functions (same as in vectorization-worker.ts)
async function extractMetadata(content: string, env: Env): Promise<any> {
  // Implementation from vectorization-worker.ts
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
  
  const actionItems = [];
  const actionMatches = content.match(/(?:Action Item|TODO|Task):\s*([^\n]+)/gi);
  if (actionMatches) {
    for (const match of actionMatches) {
      actionItems.push({
        description: match.replace(/(?:Action Item|TODO|Task):\s*/i, '').trim()
      });
    }
  }
  
  const decisions = [];
  const decisionMatches = content.match(/(?:Decision|Decided|Agreed):\s*([^\n]+)/gi);
  if (decisionMatches) {
    for (const match of decisionMatches) {
      decisions.push({
        description: match.replace(/(?:Decision|Decided|Agreed):\s*/i, '').trim()
      });
    }
  }
  
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
    action_items: actionItems,
    decisions: decisions,
    keywords: keywords
  };
}

async function findMatchingProject(metadata: any, content: string, env: Env): Promise<any> {
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
  
  const activeProjects = await env.DB.prepare(
    `SELECT p.*, c.company_name as client_name 
     FROM projects p
     LEFT JOIN clients c ON p.client_id = c.id
     WHERE p.status = 'active'`
  ).all();
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const project of activeProjects.results) {
    let score = 0;
    const projectTitle = (project.title || '').toLowerCase();
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes(projectTitle)) {
      score += 10;
    }
    
    const titleWords = projectTitle.split(/\s+/);
    for (const word of titleWords) {
      if (word.length > 3 && contentLower.includes(word)) {
        score += 2;
      }
    }
    
    if (project.client_name && contentLower.includes((project.client_name || '').toLowerCase())) {
      score += 5;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = project;
    }
  }
  
  return bestScore > 5 ? bestMatch : null;
}

async function findMatchingClient(metadata: any, content: string, env: Env): Promise<any> {
  for (const clientName of metadata.client_mentions) {
    const client = await env.DB.prepare(
      `SELECT * FROM clients 
       WHERE LOWER(company_name) = LOWER(?)
       OR LOWER(company_name) LIKE LOWER(?)`
    ).bind(clientName, `%${clientName}%`).first();
    
    if (client) return client;
  }
  
  const allClients = await env.DB.prepare(`SELECT * FROM clients`).all();
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const client of allClients.results) {
    let score = 0;
    const clientName = (client.company_name || '').toLowerCase();
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes(clientName)) {
      score += 10;
    }
    
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

interface Chunk {
  content: string;
  type: 'full' | 'speaker_turn' | 'topic_segment';
  speaker?: string;
  startTime?: number;
  endTime?: number;
}

async function createSmartChunks(content: string, metadata: any): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  const lines = content.split('\n');
  let currentChunk = '';
  let currentSpeaker = null;
  let chunkStart = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const speakerMatch = line.match(/^(?:\[(\d+:\d+)\])?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*:/);
    if (speakerMatch) {
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
      
      if (speakerMatch[1]) {
        const [minutes, seconds] = speakerMatch[1].split(':').map(Number);
        chunkStart = minutes * 60 + seconds;
      }
    } else {
      currentChunk += line + '\n';
    }
    
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
  
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      type: currentSpeaker ? 'speaker_turn' : 'topic_segment',
      speaker: currentSpeaker,
      startTime: chunkStart
    });
  }
  
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
  
  const chunksWithOverlap: Chunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    let chunkContent = chunks[i].content;
    
    if (i > 0) {
      const prevWords = chunks[i-1].content.split(/\s+/).slice(-30).join(' ');
      chunkContent = `[...${prevWords}]\n\n${chunkContent}`;
    }
    
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

async function handleR2ToD1Sync(env: Env, headers: HeadersInit): Promise<Response> {
  console.log('🔄 Starting R2 to D1 sync...');
  
  try {
    // Get all objects from R2
    const allObjects = [];
    let cursor = undefined;
    
    do {
      const listOptions: any = { limit: 1000 };
      if (cursor) {
        listOptions.cursor = cursor;
      }
      
      const response = await env.R2_STORAGE.list(listOptions);
      allObjects.push(...response.objects);
      cursor = response.truncated ? response.cursor : undefined;
    } while (cursor);
    
    console.log(`Found ${allObjects.length} objects in R2`);
    
    // Filter for transcript files
    const transcriptFiles = allObjects.filter(obj => 
      obj.key.endsWith('.md') && obj.key.includes('transcripts/')
    );
    
    console.log(`Found ${transcriptFiles.length} transcript files`);
    
    let synced = 0;
    let errors = 0;
    let skipped = 0;
    
    for (const file of transcriptFiles) {
      try {
        // Extract meeting ID from filename
        const match = file.key.match(/transcripts\/([^.]+)\.md$/);
        if (!match) continue;
        
        const firefliesId = match[1];
        
        // Check if already exists
        const existing = await env.DB.prepare(
          `SELECT id FROM meetings WHERE fireflies_id = ?`
        ).bind(firefliesId).first();
        
        if (existing) {
          console.log(`Meeting ${firefliesId} already exists, skipping`);
          skipped++;
          continue;
        }
        
        // Fetch content to extract metadata
        const object = await env.R2_STORAGE.get(file.key);
        if (!object) continue;
        
        const content = await object.text();
        
        // Extract basic metadata from content
        const metadata = extractMeetingMetadataFromContent(content);
        
        // Create meeting record with only existing columns
        const meetingId = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT OR IGNORE INTO meetings (
            id, title, date, fireflies_id, r2_key,
            duration, summary,
            searchable_text, word_count,
            transcript_downloaded, vector_processed,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(
          meetingId,
          metadata.title || firefliesId,
          metadata.date || new Date(file.uploaded).toISOString().split('T')[0],
          firefliesId,
          file.key,
          metadata.duration || null,
          metadata.summary || null,
          content.substring(0, 5000), // First 5000 chars for search
          content.split(/\s+/).length,
          true, // transcript_downloaded
          false // vector_processed
        ).run();
        
        synced++;
        console.log(`✅ Synced meeting: ${metadata.title || firefliesId}`);
      } catch (error) {
        errors++;
        console.error(`Error syncing ${file.key}:`, error);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        total: transcriptFiles.length,
        synced,
        skipped,
        errors,
        message: `Synced ${synced} meetings from R2 to D1`
      }),
      { headers }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers }
    );
  }
}

function extractMeetingMetadataFromContent(content: string): any {
  const metadata: any = {};
  
  // Try to extract title from first line or heading
  const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^(.+)$/m);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }
  
  // Try to extract date
  const dateMatch = content.match(/(?:Date|Meeting Date|Recorded on):\s*([^\n]+)/i);
  if (dateMatch) {
    try {
      const date = new Date(dateMatch[1]);
      if (!isNaN(date.getTime())) {
        metadata.date = date.toISOString().split('T')[0];
      }
    } catch (e) {
      // Invalid date
    }
  }
  
  // Extract duration
  const durationMatch = content.match(/(?:Duration|Length):\s*(\d+)\s*(?:minutes?|mins?)/i);
  if (durationMatch) {
    metadata.duration = parseInt(durationMatch[1]);
  }
  
  // Extract participants
  const participantMatches = content.match(/(?:Participants?|Attendees?):\s*([^\n]+)/i);
  if (participantMatches) {
    metadata.participants = participantMatches[1]
      .split(/[,;]/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
  }
  
  // Extract summary (first paragraph or section)
  const summaryMatch = content.match(/(?:Summary|Overview):\s*([^\n]+(?:\n[^\n]+){0,2})/i);
  if (summaryMatch) {
    metadata.summary = summaryMatch[1].trim();
  }
  
  return metadata;
}

async function handleTestD1(env: Env, headers: HeadersInit): Promise<Response> {
  try {
    // Simple query to count meetings
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM meetings`
    ).first();
    
    // Get sample meetings
    const meetings = await env.DB.prepare(
      `SELECT id, title, date, fireflies_id, r2_key, vector_processed 
       FROM meetings 
       ORDER BY date DESC 
       LIMIT 10`
    ).all();
    
    // Count projects and clients
    const projectCount = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM projects`
    ).first();
    
    const clientCount = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM clients`
    ).first();
    
    return new Response(
      JSON.stringify({
        success: true,
        database: 'Connected',
        stats: {
          totalMeetings: countResult?.total || 0,
          totalProjects: projectCount?.total || 0,
          totalClients: clientCount?.total || 0
        },
        sampleMeetings: meetings.results
      }),
      { headers }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        database: 'Error'
      }),
      { status: 500, headers }
    );
  }
}// Schema setup function to add at the end of comprehensive-api-worker.ts

async function handleSetupSchema(env: Env, headers: HeadersInit): Promise<Response> {
  try {
    // Drop existing tables to ensure clean schema
    try {
      await env.DB.prepare(`DROP TABLE IF EXISTS vector_index`).run();
      await env.DB.prepare(`DROP TABLE IF EXISTS meeting_chunks`).run();
    } catch (e) {
      console.log('Note: Tables might not exist yet');
    }
    
    // Create meeting_chunks table without foreign keys
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS meeting_chunks (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_type TEXT,
        content TEXT NOT NULL,
        speaker TEXT,
        start_time INTEGER,
        end_time INTEGER,
        embedding TEXT,
        embedding_model TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // Create vector_index table without foreign keys
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS vector_index (
        id TEXT PRIMARY KEY,
        chunk_id TEXT NOT NULL,
        meeting_id TEXT NOT NULL,
        meeting_title TEXT,
        meeting_date TEXT,
        chunk_preview TEXT,
        relevance_score REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // Create indexes
    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_chunks_meeting ON meeting_chunks(meeting_id)
    `).run();
    
    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_vector_meeting ON vector_index(meeting_id)
    `).run();
    
    // Verify tables were created
    const tables = await env.DB.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name IN ('meeting_chunks', 'vector_index')
    `).all();
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Schema setup completed successfully',
        tables_created: tables.results.map(t => t.name)
      }),
      { headers }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString()
      }),
      { status: 500, headers }
    );
  }
}