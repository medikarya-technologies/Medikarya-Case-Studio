-- 013_internship_certificates.sql
-- Run once in the Supabase SQL editor of the CASE STUDIO's project (URL starts azvkho…).
--
-- Certificates could only be for case contributors, reviewers and the advisory board. This allows one more kind,
-- "internship": a certificate an admin issues by hand (Admin → Certificates) to someone who interned at MediKarya,
-- with the same credential ID, QR code and verification page as the others. Nothing existing changes.

alter table public.certificates drop constraint if exists certificates_kind_check;
alter table public.certificates
  add constraint certificates_kind_check check (kind in ('contributor', 'reviewer', 'advisory_board', 'internship'));

-- Check: the four kinds are listed.
select pg_get_constraintdef(oid) as allowed_kinds from pg_constraint where conname = 'certificates_kind_check';

-- No real certificate has been issued yet (testing used a few numbers), so start the numbering at 1.
-- If certificates already exist, this leaves the numbering alone: numbers must never repeat.
do $$
begin
  if not exists (select 1 from public.certificates) then
    perform setval('public.certificate_number_seq', 1, false);
  end if;
end $$;

select (select count(*) from public.certificates) as certificates_issued,
       (select case when is_called then last_value + 1 else last_value end from public.certificate_number_seq) as next_number;
