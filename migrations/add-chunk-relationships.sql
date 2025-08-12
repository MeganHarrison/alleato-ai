-- Migration: Add chunk relationships and enhanced entity tracking
-- Purpose: Store relationships between chunks for better context retrieval

-- 1. Add chunk_relationships table to track how chunks relate to each other
CREATE TABLE IF NOT EXISTS chunk_relationships (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  from_chunk_id TEXT NOT NULL,
  to_chunk_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL, -- 'sequential', 'reference', 'topic_continuation', 'speaker_continuation'
  strength REAL DEFAULT 1.0, -- 0.0 to 1.0 confidence score
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (from_chunk_id) REFERENCES meeting_chunks(id) ON DELETE CASCADE,
  FOREIGN KEY (to_chunk_id) REFERENCES meeting_chunks(id) ON DELETE CASCADE,
  UNIQUE(from_chunk_id, to_chunk_id, relationship_type)
);

-- 2. Add extracted_entities table for better entity tracking
CREATE TABLE IF NOT EXISTS extracted_entities (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  chunk_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'person', 'project', 'decision', 'action_item', 'date', 'client', 'risk', 'milestone'
  entity_value TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  context TEXT, -- Surrounding text for context
  position INTEGER, -- Position in the original text
  metadata JSON, -- Additional metadata (assignee, due_date, etc.)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (chunk_id) REFERENCES meeting_chunks(id) ON DELETE CASCADE,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  INDEX idx_entity_type (entity_type),
  INDEX idx_entity_value (entity_value),
  INDEX idx_meeting_entities (meeting_id)
);

-- 3. Enhance meeting_chunks table with new columns
ALTER TABLE meeting_chunks ADD COLUMN IF NOT EXISTS parent_chunk_id TEXT;
ALTER TABLE meeting_chunks ADD COLUMN IF NOT EXISTS previous_chunk_id TEXT;
ALTER TABLE meeting_chunks ADD COLUMN IF NOT EXISTS next_chunk_id TEXT;
ALTER TABLE meeting_chunks ADD COLUMN IF NOT EXISTS topics JSON; -- Array of extracted topics
ALTER TABLE meeting_chunks ADD COLUMN IF NOT EXISTS sentiment TEXT; -- 'positive', 'negative', 'neutral', 'mixed'
ALTER TABLE meeting_chunks ADD COLUMN IF NOT EXISTS importance REAL DEFAULT 0.5; -- 0.0 to 1.0 importance score
ALTER TABLE meeting_chunks ADD COLUMN IF NOT EXISTS context_before TEXT; -- Context from previous chunk
ALTER TABLE meeting_chunks ADD COLUMN IF NOT EXISTS context_after TEXT; -- Context from next chunk
ALTER TABLE meeting_chunks ADD COLUMN IF NOT EXISTS token_count INTEGER;

-- 4. Add timeline_events table for chronological tracking
CREATE TABLE IF NOT EXISTS timeline_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  meeting_id TEXT NOT NULL,
  chunk_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'decision', 'action_item', 'milestone', 'risk'
  event_description TEXT NOT NULL,
  event_timestamp INTEGER, -- Seconds from start of meeting or position
  assignee TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (chunk_id) REFERENCES meeting_chunks(id) ON DELETE CASCADE,
  INDEX idx_timeline_meeting (meeting_id),
  INDEX idx_timeline_type (event_type),
  INDEX idx_timeline_status (status)
);

-- 5. Add document_metadata enhancements
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS extracted_entities JSON; -- Summary of all entities
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS timeline JSON; -- Timeline of events
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS speakers JSON; -- List of speakers
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS chunk_count INTEGER;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS total_tokens INTEGER;

-- 6. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chunk_relationships_from ON chunk_relationships(from_chunk_id);
CREATE INDEX IF NOT EXISTS idx_chunk_relationships_to ON chunk_relationships(to_chunk_id);
CREATE INDEX IF NOT EXISTS idx_chunk_relationships_type ON chunk_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_chunks_parent ON meeting_chunks(parent_chunk_id);
CREATE INDEX IF NOT EXISTS idx_chunks_importance ON meeting_chunks(importance);
CREATE INDEX IF NOT EXISTS idx_chunks_sentiment ON meeting_chunks(sentiment);

-- 7. Add search helper view
CREATE VIEW IF NOT EXISTS chunk_search_view AS
SELECT 
  mc.id AS chunk_id,
  mc.meeting_id,
  mc.content,
  mc.speaker,
  mc.importance,
  mc.sentiment,
  mc.topics,
  m.title AS meeting_title,
  m.date AS meeting_date,
  m.project_id,
  m.client_id,
  p.title AS project_title,
  c.company_name AS client_name
FROM meeting_chunks mc
LEFT JOIN meetings m ON mc.meeting_id = m.id
LEFT JOIN projects p ON m.project_id = p.id
LEFT JOIN clients c ON m.client_id = c.id;

-- 8. Add entity search view
CREATE VIEW IF NOT EXISTS entity_search_view AS
SELECT 
  e.id AS entity_id,
  e.entity_type,
  e.entity_value,
  e.confidence,
  e.context,
  e.meeting_id,
  m.title AS meeting_title,
  m.date AS meeting_date,
  mc.content AS chunk_content,
  mc.speaker AS chunk_speaker
FROM extracted_entities e
LEFT JOIN meetings m ON e.meeting_id = m.id
LEFT JOIN meeting_chunks mc ON e.chunk_id = mc.id;

-- 9. Add stored procedure for finding related chunks
-- Note: D1 doesn't support stored procedures, but we can create this as a reference query
-- This would be implemented in the application layer
/*
-- Find all chunks related to a given chunk
SELECT 
  cr.to_chunk_id AS related_chunk_id,
  cr.relationship_type,
  cr.strength,
  mc.content,
  mc.speaker,
  mc.importance
FROM chunk_relationships cr
JOIN meeting_chunks mc ON cr.to_chunk_id = mc.id
WHERE cr.from_chunk_id = ?
ORDER BY cr.strength DESC, mc.position ASC;
*/

-- 10. Add migration tracking
INSERT INTO system_metadata (key, value, updated_at) 
VALUES ('chunk_relationships_migration', '1.0.0', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = '1.0.0', updated_at = CURRENT_TIMESTAMP;