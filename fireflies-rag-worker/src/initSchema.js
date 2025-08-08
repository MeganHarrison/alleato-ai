export async function initializeSchema(env) {
  try {
    const schema = `
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date_time DATETIME NOT NULL,
        duration INTEGER NOT NULL,
        participants TEXT,
        summary TEXT,
        transcript_url TEXT,
        tags TEXT,
        category TEXT,
        project TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS meeting_chunks (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL,
        chunk_type TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        start_time INTEGER,
        end_time INTEGER,
        speaker_name TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS webhook_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        meeting_id TEXT,
        payload TEXT,
        received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT FALSE,
        processed_at DATETIME,
        error TEXT
      );

      CREATE TABLE IF NOT EXISTS processing_queue (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL,
        action TEXT NOT NULL,
        priority INTEGER DEFAULT 5,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        last_attempt DATETIME,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        scheduled_for DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vector_index (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chunk_id TEXT NOT NULL,
        meeting_id TEXT NOT NULL,
        vector BLOB NOT NULL,
        magnitude REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chunk_id) REFERENCES meeting_chunks(id),
        FOREIGN KEY (meeting_id) REFERENCES meetings(id)
      );
    `;

    // Split into individual statements
    const statements = schema.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await env.ALLEATO_DB.prepare(statement).run();
      }
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date_time)',
      'CREATE INDEX IF NOT EXISTS idx_meetings_project ON meetings(project)',
      'CREATE INDEX IF NOT EXISTS idx_meetings_category ON meetings(category)',
      'CREATE INDEX IF NOT EXISTS idx_chunks_meeting ON meeting_chunks(meeting_id)',
      'CREATE INDEX IF NOT EXISTS idx_chunks_type ON meeting_chunks(chunk_type)',
      'CREATE INDEX IF NOT EXISTS idx_chunks_speaker ON meeting_chunks(speaker_name)',
      'CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed)',
      'CREATE INDEX IF NOT EXISTS idx_webhook_events_meeting ON webhook_events(meeting_id)',
      'CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status)',
      'CREATE INDEX IF NOT EXISTS idx_processing_queue_meeting ON processing_queue(meeting_id)',
      'CREATE INDEX IF NOT EXISTS idx_processing_queue_scheduled ON processing_queue(scheduled_for)',
      'CREATE INDEX IF NOT EXISTS idx_vector_index_chunk ON vector_index(chunk_id)',
      'CREATE INDEX IF NOT EXISTS idx_vector_index_meeting ON vector_index(meeting_id)'
    ];

    for (const index of indexes) {
      await env.ALLEATO_DB.prepare(index).run();
    }

    // Insert initial metadata
    await env.ALLEATO_DB.prepare(`
      INSERT OR REPLACE INTO system_metadata (key, value) VALUES 
        ('schema_version', '1.0'),
        ('initialized_at', datetime('now'))
    `).run();

    return {
      success: true,
      message: 'Schema initialized successfully',
      tables: ['meetings', 'meeting_chunks', 'webhook_events', 'processing_queue', 'system_metadata', 'vector_index']
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}