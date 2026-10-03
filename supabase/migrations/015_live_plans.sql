-- 015_live_plans.sql
-- Run once in the Supabase SQL editor of the CASE STUDIO's project (URL starts azvkho…).
-- Running it a second time changes nothing.
--
-- A case sheet can now carry a LIVE COURSE, written by a resident, doctor or faculty member: what happens to the
-- patient minute by minute if nothing is done, what each treatment does, what stops the deterioration and where the
-- patient settles. When MediKarya converts the case, the live course goes with it as a proposal; a senior clinician
-- signs it off before students meet it.

alter table public.cases add column if not exists live_plan jsonb;

-- Check: the column exists (1 row).
select column_name, data_type from information_schema.columns where table_name = 'cases' and column_name = 'live_plan';
