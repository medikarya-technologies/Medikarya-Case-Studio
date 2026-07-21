-- Feature expansion: comments, notifications, reviewer assignment, portfolio

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS assigned_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS portfolio_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS case_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN ('case_submitted', 'case_approved', 'changes_requested', 'new_comment', 'reviewer_assigned')
  ),
  message TEXT NOT NULL,
  related_case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_comments_case_id ON case_comments(case_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_cases_assigned_reviewer ON cases(assigned_reviewer_id);

ALTER TABLE case_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- case_comments: author, assigned reviewer, admins
CREATE POLICY "Participants can view case comments"
  ON case_comments FOR SELECT
  USING (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE clerk_id = auth.uid()::text
      )
    )
    OR (SELECT role FROM users WHERE clerk_id = auth.uid()::text) IN ('reviewer', 'admin')
  );

CREATE POLICY "Participants can insert case comments"
  ON case_comments FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    AND (
      case_id IN (
        SELECT id FROM cases WHERE author_id IN (
          SELECT id FROM users WHERE clerk_id = auth.uid()::text
        )
      )
      OR (SELECT role FROM users WHERE clerk_id = auth.uid()::text) IN ('reviewer', 'admin')
    )
  );

-- notifications: own notifications only
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  )
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );
