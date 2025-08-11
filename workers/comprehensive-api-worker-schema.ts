// Schema setup function to add at the end of comprehensive-api-worker.ts

async function handleSetupSchema(env: Env, headers: HeadersInit): Promise<Response> {
  try {
    // Create meeting_chunks table if it doesn't exist
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
      )
    `).run();
    
    // Create vector_index table if it doesn't exist
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS vector_index (
        id TEXT PRIMARY KEY,
        chunk_id TEXT NOT NULL,
        meeting_id TEXT NOT NULL,
        meeting_title TEXT,
        meeting_date TEXT,
        chunk_preview TEXT,
        relevance_score REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chunk_id) REFERENCES meeting_chunks(id),
        FOREIGN KEY (meeting_id) REFERENCES meetings(id)
      )
    `).run();
    
    // Create indexes
    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_chunks_meeting ON meeting_chunks(meeting_id)
    `).run();
    
    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_vector_meeting ON vector_index(meeting_id)
    `).run();
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Schema setup completed successfully'
      }),
      { headers }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers }
    );
  }
}