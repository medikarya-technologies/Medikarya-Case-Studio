-- Add name_edited_once column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS name_edited_once BOOLEAN DEFAULT false;

-- Create name_change_requests table
CREATE TABLE IF NOT EXISTS name_change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  requested_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id)
);

-- Enable Row Level Security on name_change_requests
ALTER TABLE name_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for name_change_requests
CREATE POLICY "Users can view their own name change requests"
  ON name_change_requests
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can view all name change requests"
  ON name_change_requests
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE clerk_id = auth.uid()::text) = 'admin'
  );

CREATE POLICY "Users can insert their own name change requests"
  ON name_change_requests
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can update name change requests"
  ON name_change_requests
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE clerk_id = auth.uid()::text) = 'admin'
  );

-- Add original_author_name to cases table
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS original_author_name TEXT;
