-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('author', 'reviewer', 'admin')) DEFAULT 'author',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cases table
CREATE TABLE cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'changes_requested')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- Case sections table
CREATE TABLE case_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  section_type TEXT NOT NULL CHECK (
    section_type IN ('chief_complaint', 'history', 'examination', 'diagnosis', 'treatment', 'outcome')
  ),
  content TEXT DEFAULT '',
  "order" INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case reviews table
CREATE TABLE case_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested')),
  comments TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_case_sections_updated_at
  BEFORE UPDATE ON case_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  USING (auth.uid()::text = clerk_id);

CREATE POLICY "Users can insert their own profile"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid()::text = clerk_id);

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  USING (auth.uid()::text = clerk_id)
  WITH CHECK (auth.uid()::text = clerk_id);

-- RLS Policies for cases table
CREATE POLICY "Authors can view their own cases"
  ON cases
  FOR SELECT
  USING (
    author_id IN (
      SELECT id FROM users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Reviewers and admins can view all cases"
  ON cases
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE clerk_id = auth.uid()::text) IN ('reviewer', 'admin')
  );

CREATE POLICY "Authors can insert their own cases"
  ON cases
  FOR INSERT
  WITH CHECK (
    author_id IN (
      SELECT id FROM users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Authors can update their own cases when draft or changes requested"
  ON cases
  FOR UPDATE
  USING (
    author_id IN (
      SELECT id FROM users WHERE clerk_id = auth.uid()::text
    ) AND status IN ('draft', 'changes_requested')
  )
  WITH CHECK (
    author_id IN (
      SELECT id FROM users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can update any case"
  ON cases
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE clerk_id = auth.uid()::text) = 'admin'
  );

CREATE POLICY "Authors can delete their own draft cases"
  ON cases
  FOR DELETE
  USING (
    author_id IN (
      SELECT id FROM users WHERE clerk_id = auth.uid()::text
    ) AND status = 'draft'
  );

CREATE POLICY "Admins can delete any case"
  ON cases
  FOR DELETE
  USING (
    (SELECT role FROM users WHERE clerk_id = auth.uid()::text) = 'admin'
  );

-- RLS Policies for case_sections table
CREATE POLICY "Authors can view sections of their own cases"
  ON case_sections
  FOR SELECT
  USING (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE clerk_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Reviewers and admins can view all sections"
  ON case_sections
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE clerk_id = auth.uid()::text) IN ('reviewer', 'admin')
  );

CREATE POLICY "Authors can insert sections for their own cases"
  ON case_sections
  FOR INSERT
  WITH CHECK (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE clerk_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Authors can update sections of their own cases"
  ON case_sections
  FOR UPDATE
  USING (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE clerk_id = auth.uid()::text
      )
    )
  )
  WITH CHECK (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE clerk_id = auth.uid()::text
      )
    )
  );

-- RLS Policies for case_reviews table
CREATE POLICY "Reviewers and admins can view all reviews"
  ON case_reviews
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE clerk_id = auth.uid()::text) IN ('reviewer', 'admin')
  );

CREATE POLICY "Authors can view reviews of their own cases"
  ON case_reviews
  FOR SELECT
  USING (
    case_id IN (
      SELECT id FROM cases WHERE author_id IN (
        SELECT id FROM users WHERE clerk_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Reviewers and admins can insert reviews"
  ON case_reviews
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE clerk_id = auth.uid()::text) IN ('reviewer', 'admin')
  );
