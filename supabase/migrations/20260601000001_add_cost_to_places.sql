-- Add cost field to places and submissions tables
ALTER TABLE places ADD COLUMN IF NOT EXISTS cost text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS cost text;
