-- Add custom_fields JSONB column to cases table for per-case custom fields
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;
