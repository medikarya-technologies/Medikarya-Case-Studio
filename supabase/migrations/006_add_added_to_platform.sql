-- Add added_to_platform boolean column to cases table (default false)
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS added_to_platform BOOLEAN DEFAULT false;
