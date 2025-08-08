-- Add notion_id column to projects table if it doesn't exist
ALTER TABLE projects ADD COLUMN notion_id TEXT;