-- Add notion_id column to clients table if it doesn't exist
ALTER TABLE clients ADD COLUMN notion_id TEXT;