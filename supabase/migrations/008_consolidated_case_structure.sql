-- 008_consolidated_case_structure.sql
-- Migration to support the MediKarya Consolidated 7-Section Case Form Structure

-- 1. Add JSONB columns for the new 7 consolidated case form sections to cases table
ALTER TABLE cases ADD COLUMN IF NOT EXISTS patient_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '{}'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS general_physical_examination JSONB DEFAULT '{}'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS systemic_examination JSONB DEFAULT '{}'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS local_examination JSONB DEFAULT '{}'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS diagnosis JSONB DEFAULT '{}'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS investigations_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS original_author_name TEXT;

-- 2. Add investigation_group column to case_attachments table
ALTER TABLE case_attachments ADD COLUMN IF NOT EXISTS investigation_group TEXT CHECK (investigation_group IN ('confirmation', 'staging'));
