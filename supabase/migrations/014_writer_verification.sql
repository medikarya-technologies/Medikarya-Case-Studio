-- 014_writer_verification.sql
-- Run once in the Supabase SQL editor of the CASE STUDIO's project (URL starts azvkho…).
-- It makes one new table, so the editor will ask about row level security: either answer is fine, the script
-- turns it on itself. Running it a second time changes nothing.
--
-- Until now anyone who signed up could submit a case. From here a new person fills in who they are right after
-- signing up (/welcome), an admin verifies them in Admin → Users, and only then can they submit. They can write and
-- save drafts while they wait.
--
--   writer_profiles   one per person: what they told us, their proof, and whether an admin has verified them
--
-- The app reads and writes it with the server key only (RLS on, no policies), like the other new tables.

create table if not exists public.writer_profiles (
    user_id uuid primary key references public.users(id) on delete cascade,
    -- who they say they are; empty when an admin verified someone by hand without the form
    kind text check (kind in ('mbbs_student', 'intern', 'pg_resident', 'doctor', 'faculty')),
    institution text,
    year_or_designation text,          -- "Final year" for a student, "Assistant Professor, Medicine" for faculty
    state text,
    phone text,                        -- asked for, never verified
    council text,
    registration_no text,
    proof_path text,                   -- their ID photo in the private "verification-proofs" storage; removed once decided
    declared_at timestamptz,           -- when they ticked "I am a medico, and my cases are my own"
    status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
    admin_note text,
    verified_by uuid references public.users(id) on delete set null,
    verified_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.writer_profiles enable row level security;
create index if not exists writer_profiles_status_idx on public.writer_profiles (status);

-- Two new kinds of notification: an admin is told when someone asks to be verified, and the person when it is decided.
-- The list of allowed kinds is a check on the table; replace it with one that has the two new kinds.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.notifications'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%case_submitted%'
  loop
    execute format('alter table public.notifications drop constraint %I', c.conname);
  end loop;
  alter table public.notifications add constraint notifications_type_check check (
    type in ('case_submitted', 'case_approved', 'changes_requested', 'new_comment', 'reviewer_assigned', 'verification_requested', 'verification_decided')
  );
end $$;

-- Check: the table exists (0 rows), and notifications allow the two new kinds.
select 'writer_profiles rows' as what, count(*)::text as value from public.writer_profiles
union all
select 'notification kinds', pg_get_constraintdef(oid) from pg_constraint where conname = 'notifications_type_check';
