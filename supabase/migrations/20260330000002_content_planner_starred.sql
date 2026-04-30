-- Add is_starred to content_ideas
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;
