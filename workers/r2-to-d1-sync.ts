/**
 * R2 to D1 Sync Worker
 * Syncs meeting transcripts from R2 storage to D1 database
 * Creates meeting records with proper metadata
 */

export interface Env {
  DB: D1Database;
  R2_STORAGE: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/sync-r2-to-d1') {
      return handleR2ToD1Sync(env);
    }
    
    return new Response('Not found', { status: 404 });
  }
};

async function handleR2ToD1Sync(env: Env): Promise<Response> {
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
          continue;
        }
        
        // Fetch content to extract metadata
        const object = await env.R2_STORAGE.get(file.key);
        if (!object) continue;
        
        const content = await object.text();
        
        // Extract basic metadata from content
        const metadata = extractMeetingMetadata(content);
        
        // Create meeting record
        const meetingId = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO meetings (
            id, title, date, fireflies_id, r2_key,
            duration, participants, summary,
            searchable_text, word_count,
            transcript_downloaded, vector_processed,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(
          meetingId,
          metadata.title || firefliesId,
          metadata.date || new Date(file.uploaded).toISOString().split('T')[0],
          firefliesId,
          file.key,
          metadata.duration || null,
          metadata.participants ? JSON.stringify(metadata.participants) : null,
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
    
    return Response.json({
      success: true,
      total: transcriptFiles.length,
      synced,
      errors,
      message: `Synced ${synced} meetings from R2 to D1`
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

function extractMeetingMetadata(content: string): any {
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