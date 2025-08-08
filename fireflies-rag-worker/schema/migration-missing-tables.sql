-- Add missing tables to existing alleato database

-- System metadata
CREATE TABLE IF NOT EXISTS system_metadata (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Meeting chunks for vectorization
CREATE TABLE IF NOT EXISTS meeting_chunks (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_type TEXT NOT NULL, -- 'full', 'time_segment', 'speaker_turn'
    
    -- Content
    content TEXT NOT NULL,
    speaker TEXT,
    start_time INTEGER, -- seconds from start
    end_time INTEGER,
    
    -- Vector data
    embedding BLOB, -- Store as binary for efficiency
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meeting_chunks ON meeting_chunks(meeting_id, chunk_index);

-- Webhook events log
CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    fireflies_id TEXT,
    payload TEXT, -- JSON
    processed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_events ON webhook_events(created_at DESC);

-- Vector search optimization table
CREATE TABLE IF NOT EXISTS vector_index (
    id TEXT PRIMARY KEY,
    chunk_id TEXT NOT NULL,
    meeting_id TEXT NOT NULL,
    
    -- Denormalized for fast search
    meeting_title TEXT,
    meeting_date DATETIME,
    chunk_preview TEXT, -- First 200 chars
    relevance_score REAL DEFAULT 0,
    
    FOREIGN KEY (chunk_id) REFERENCES meeting_chunks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vector_search ON vector_index(meeting_date DESC);

-- Processing queue
CREATE TABLE IF NOT EXISTS processing_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id TEXT NOT NULL,
    task_type TEXT NOT NULL, -- 'download', 'vectorize', 'index'
    priority INTEGER DEFAULT 5,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON processing_queue(status, priority DESC, created_at);