-- Migration to add missing tables to existing database

-- Add missing columns to meetings table if they don't exist
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE
-- We'll handle errors in application code

-- Create webhook_events table
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

-- Create processing_queue table
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

-- Create system_metadata table
CREATE TABLE IF NOT EXISTS system_metadata (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create vector_index table
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

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_meeting ON webhook_events(meeting_id);
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_processing_queue_meeting ON processing_queue(meeting_id);
CREATE INDEX IF NOT EXISTS idx_processing_queue_scheduled ON processing_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_vector_index_chunk ON vector_index(chunk_id);
CREATE INDEX IF NOT EXISTS idx_vector_index_meeting ON vector_index(meeting_id);

-- Check if meeting_chunks table exists, create if not
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

-- Create indexes for meeting_chunks if they don't exist
CREATE INDEX IF NOT EXISTS idx_chunks_meeting ON meeting_chunks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_chunks_type ON meeting_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_chunks_speaker ON meeting_chunks(speaker_name);

-- Insert system metadata
INSERT OR REPLACE INTO system_metadata (key, value) VALUES 
    ('schema_version', '1.1'),
    ('migration_date', datetime('now')),
    ('last_sync', NULL);