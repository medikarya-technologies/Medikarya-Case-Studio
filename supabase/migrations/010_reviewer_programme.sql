-- 010_reviewer_programme.sql
-- Run once in the Supabase SQL editor of the CASE STUDIO's project (URL starts azvkho…).
--
-- The reviewer programme: people apply to review cases for MediKarya (/join/reviewer), an admin verifies them, and
-- verified reviewers claim cases from a queue and review the student's case sheet together with MediKarya's
-- AI-built version of it, in one go.
--
--   reviewer_profiles   one application/profile per user: who they are, what they may review, whether verified
--   case_conversions    MediKarya's AI-built version of a case, written by MediKarya when an admin converts it
--   conversion_reviews  a reviewer's claim on, and decision about, one version of a converted case
--
-- The app reads and writes these with the server key only (RLS on, no policies), like the rest of the new tables.

create table if not exists public.reviewer_profiles (
    user_id uuid primary key references public.users(id) on delete cascade,
    kind text not null check (kind in ('pg_resident', 'faculty', 'intern', 'doctor')),
    designation text,                 -- e.g. "PG Resident, 2nd year" or "Associate Professor"
    department text,
    institution text not null,
    specialties text[] not null default '{}',           -- what they asked to review
    approved_specialties text[] not null default '{}',  -- what an admin approved them for
    council text,                     -- e.g. "Delhi Medical Council" or "NMC"
    registration_no text,
    linkedin_url text,
    upi_id text,                      -- for honoraria, when those are paid
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    admin_note text,
    verified_by uuid references public.users(id),
    verified_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.reviewer_profiles enable row level security;

create table if not exists public.case_conversions (
    case_id uuid primary key references public.cases(id) on delete cascade,
    medikarya_case_id text not null,
    version integer not null default 1,   -- goes up each time MediKarya converts or rebuilds it
    case_json jsonb not null,
    review_notes jsonb not null default '[]'::jsonb,
    warnings jsonb not null default '[]'::jsonb,
    test_names jsonb not null default '{}'::jsonb,   -- catalog id -> name, for the report
    converted_at timestamptz not null default now()
);
alter table public.case_conversions enable row level security;

create table if not exists public.conversion_reviews (
    id uuid primary key default gen_random_uuid(),
    case_id uuid not null references public.cases(id) on delete cascade,
    version integer not null,
    reviewer_id uuid not null references public.users(id) on delete cascade,
    claimed_at timestamptz not null default now(),
    claim_expires_at timestamptz not null,
    decision text check (decision in ('approved', 'changes_requested')),
    comments text,
    show_name boolean not null default false,
    decided_at timestamptz
);
create index if not exists conversion_reviews_case_idx on public.conversion_reviews (case_id, version);
create index if not exists conversion_reviews_reviewer_idx on public.conversion_reviews (reviewer_id, claimed_at desc);
alter table public.conversion_reviews enable row level security;

-- Check: the three tables exist.
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('reviewer_profiles', 'case_conversions', 'conversion_reviews')
order by table_name;
