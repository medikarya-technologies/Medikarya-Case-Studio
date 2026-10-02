-- 011_rewards.sql
-- Run once in the Supabase SQL editor of the CASE STUDIO's project (URL starts azvkho…).
--
-- Rewards for contributors and reviewers (lib/rewards/):
--   payouts        what is owed to whom and why (a published case, a review), and whether it has been paid
--   certificates   certificates issued when someone reaches a title, each with a public credential id
--   payout_details where to pay someone: the UPI id they gave (kept out of the users table, which other users can read)
-- plus two small additions to existing tables:
--   case_conversions.published_at   set by MediKarya when the case goes live (and cleared if it is taken down)
--   reviewer_profiles.advisory_board  an honorary title an admin gives a reviewer
-- Server key only (RLS on, no policies), like the other programme tables.

alter table public.case_conversions add column if not exists published_at timestamptz;
alter table public.reviewer_profiles add column if not exists advisory_board boolean not null default false;

create table if not exists public.payouts (
    id uuid primary key default gen_random_uuid(),
    ref text not null unique,          -- what it is for, so nothing is ever paid twice: "review:<id>" or "case:<case id>"
    kind text not null check (kind in ('case_published', 'review', 're_review')),
    user_id uuid references public.users(id) on delete set null,  -- null for an author who has no account (a PDF submission)
    payee_name text not null,
    case_id uuid references public.cases(id) on delete set null,
    amount integer not null check (amount >= 0),   -- rupees
    status text not null default 'owed' check (status in ('owed', 'paid', 'void')),
    note text,                         -- e.g. why it is void ("over this month's limit")
    earned_at timestamptz not null default now(),
    paid_at timestamptz,
    paid_ref text,                     -- the UPI transaction reference
    paid_by uuid references public.users(id)
);
create index if not exists payouts_user_idx on public.payouts (user_id, status);
create index if not exists payouts_status_idx on public.payouts (status, earned_at);
alter table public.payouts enable row level security;

create table if not exists public.payout_details (
    user_id uuid primary key references public.users(id) on delete cascade,
    upi_id text not null,
    updated_at timestamptz not null default now()
);
alter table public.payout_details enable row level security;

create sequence if not exists public.certificate_number_seq start 1;

create table if not exists public.certificates (
    id uuid primary key default gen_random_uuid(),
    credential_id text not null unique,     -- e.g. MK-2026-00017, printed on the certificate and checked at /verify
    ref text not null unique,               -- one certificate per person per title: "<kind>:<user id or name>:<title>"
    kind text not null check (kind in ('contributor', 'reviewer', 'advisory_board')),
    user_id uuid references public.users(id) on delete set null,
    recipient_name text not null,
    title text not null,                    -- the title reached, e.g. "Senior Contributor"
    detail text not null,                   -- e.g. "for 5 clinical cases published on MediKarya"
    issued_at timestamptz not null default now(),
    revoked boolean not null default false
);
create index if not exists certificates_user_idx on public.certificates (user_id);
alter table public.certificates enable row level security;

-- The next credential id, e.g. MK-2026-00017.
create or replace function public.next_credential_id() returns text
language sql as $$
  select 'MK-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.certificate_number_seq')::text, 5, '0');
$$;

-- Check: the three tables and the two columns exist.
select 'payouts' as what, count(*)::text as value from public.payouts
union all select 'certificates', count(*)::text from public.certificates
union all select 'payout_details', count(*)::text from public.payout_details
union all select 'case_conversions.published_at', count(*)::text from information_schema.columns where table_name = 'case_conversions' and column_name = 'published_at'
union all select 'reviewer_profiles.advisory_board', count(*)::text from information_schema.columns where table_name = 'reviewer_profiles' and column_name = 'advisory_board';
