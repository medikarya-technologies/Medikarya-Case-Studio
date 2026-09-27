-- 009_specialties_and_declarations.sql
-- Run once in the Supabase SQL editor.
--
-- Adds five specialties the form now offers (General Surgery, Obstetrics & Gynaecology, Psychiatry, ENT,
-- Ophthalmology). Until this runs, saving a case with one of them fails; every other case is unaffected.
--
-- Nothing else needs the database changed: what an author confirms before submitting (no real patient's details,
-- and whether MediKarya may publish the case) is saved inside patient_details as `declarations`.

-- The specialty check was created inline in 002, so its name was chosen by Postgres; drop it whatever it is called.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.cases'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%specialty%'
  LOOP
    EXECUTE format('ALTER TABLE public.cases DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.cases
ADD CONSTRAINT cases_specialty_check CHECK (specialty IN (
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
  'general_surgery',
  'obstetrics_gynaecology',
  'psychiatry',
  'ent',
  'ophthalmology',
  'other'
));

-- Check: should list the new constraint with all 16 values.
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.cases'::regclass AND conname = 'cases_specialty_check';
