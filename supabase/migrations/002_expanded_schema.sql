-- Alter cases table to add new fields
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS specialty TEXT CHECK (specialty IN (
  'cardiology',
  'pulmonology',
  'gastroenterology',
  'neurology',
  'orthopedics',
  'dermatology',
  'emergency_medicine',
  'family_medicine',
  'internal_medicine',
  'pediatrics',
  'other'
)) DEFAULT 'internal_medicine';

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate';

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add JSONB columns for structured data
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS patient_details JSONB DEFAULT '{}';

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS chief_complaint_history JSONB DEFAULT '{}';

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS medical_history JSONB DEFAULT '{}';

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS current_medications JSONB DEFAULT '[]';

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS review_of_systems JSONB DEFAULT '{}';

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS examination_findings JSONB DEFAULT '{}';

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS investigations JSONB DEFAULT '[]';

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS diagnosis_management JSONB DEFAULT '{}';

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS learning_points TEXT[] DEFAULT '{}';

-- Add trigger for updated_at on cases if not exists (already should be there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_cases_updated_at'
  ) THEN
    CREATE TRIGGER update_cases_updated_at
      BEFORE UPDATE ON cases
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END
$$;

-- Update RLS policies to include new columns (policies already allow all columns)
