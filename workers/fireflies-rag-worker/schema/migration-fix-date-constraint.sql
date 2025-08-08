-- Migration to fix date constraint issue

-- First, ensure all existing records have date_time populated
UPDATE meetings 
SET date_time = date 
WHERE date_time IS NULL AND date IS NOT NULL;

-- Create a trigger to automatically populate date from date_time
CREATE TRIGGER IF NOT EXISTS sync_date_from_datetime
AFTER INSERT ON meetings
FOR EACH ROW
WHEN NEW.date IS NULL AND NEW.date_time IS NOT NULL
BEGIN
  UPDATE meetings SET date = NEW.date_time WHERE id = NEW.id;
END;

-- Create a trigger for updates too
CREATE TRIGGER IF NOT EXISTS sync_date_from_datetime_update
AFTER UPDATE ON meetings
FOR EACH ROW
WHEN NEW.date IS NULL AND NEW.date_time IS NOT NULL
BEGIN
  UPDATE meetings SET date = NEW.date_time WHERE id = NEW.id;
END;