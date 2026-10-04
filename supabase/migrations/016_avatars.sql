-- 016: each user's profile picture from their sign-in account (Google), so a published writer or a named reviewer can
-- be shown with their own photo on medikarya.in/contributors. Refreshed from Clerk at most once a week when they use
-- the studio (app/actions/case-actions.ts, getOrCreateCurrentUser). Null = no picture of their own.

alter table users add column if not exists avatar_url text;
alter table users add column if not exists avatar_checked_at timestamptz;
