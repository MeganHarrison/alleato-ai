-- Migration to align existing alleato database with expected schema

-- Add missing columns to meetings table
ALTER TABLE meetings ADD COLUMN date_time DATETIME;
ALTER TABLE meetings ADD COLUMN organizer_email TEXT;
ALTER TABLE meetings ADD COLUMN attendees TEXT;
ALTER TABLE meetings ADD COLUMN meeting_url TEXT;
ALTER TABLE meetings ADD COLUMN transcript_downloaded BOOLEAN DEFAULT 0;
ALTER TABLE meetings ADD COLUMN processed_at DATETIME;
ALTER TABLE meetings ADD COLUMN r2_key TEXT;
ALTER TABLE meetings ADD COLUMN transcript_preview TEXT;
ALTER TABLE meetings ADD COLUMN updated_at DATETIME;

-- Copy date to date_time
UPDATE meetings SET date_time = date WHERE date_time IS NULL;

-- Copy participants to attendees
UPDATE meetings SET attendees = participants WHERE attendees IS NULL;

-- Set updated_at to current timestamp
UPDATE meetings SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_date_time ON meetings(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_category ON meetings(category);
CREATE INDEX IF NOT EXISTS idx_project ON meetings(project);
CREATE INDEX IF NOT EXISTS idx_processed ON meetings(vector_processed);