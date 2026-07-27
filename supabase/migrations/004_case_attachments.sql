-- Migration: 004_case_attachments.sql
-- Description: Table for storing case attachment metadata (images, PDF reports)

CREATE TABLE IF NOT EXISTS case_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  investigation_id TEXT, -- Optional link to a specific investigation entry within the case
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_case_attachments_case_id ON case_attachments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_attachments_investigation_id ON case_attachments(investigation_id);

-- Enable RLS
ALTER TABLE case_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Authors can view attachments for their own cases
CREATE POLICY "Authors can view attachments of their own cases"
  ON case_attachments FOR SELECT
  USING (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE clerk_id = auth.uid()::text
      )
    )
  );

-- 2. Reviewers and admins can view all case attachments
CREATE POLICY "Reviewers and admins can view all case attachments"
  ON case_attachments FOR SELECT
  USING (
    (SELECT role FROM users WHERE clerk_id = auth.uid()::text) IN ('reviewer', 'admin')
  );

-- 3. Authors can insert attachments for their own cases while draft or changes requested
CREATE POLICY "Authors can insert attachments for their own cases"
  ON case_attachments FOR INSERT
  WITH CHECK (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE clerk_id = auth.uid()::text
      ) AND status IN ('draft', 'changes_requested')
    )
    OR (SELECT role FROM users WHERE clerk_id = auth.uid()::text) = 'admin'
  );

-- 4. Authors can delete attachments of their own cases while draft or changes requested
CREATE POLICY "Authors can delete attachments of their own cases"
  ON case_attachments FOR DELETE
  USING (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE clerk_id = auth.uid()::text
      ) AND status IN ('draft', 'changes_requested')
    )
    OR (SELECT role FROM users WHERE clerk_id = auth.uid()::text) = 'admin'
  );
