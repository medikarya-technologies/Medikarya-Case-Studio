-- 017_workshop_certificates.sql
-- Run once in the Supabase SQL editor of the CASE STUDIO's project (URL starts azvkho…).
--
-- Allows one more kind of certificate, "workshop": a certificate of participation for a student who worked through a
-- workshop's cases. The main site issues them (Admin → Workshop passes → Certificates), with the same credential ID,
-- QR code and verification page as every other certificate. Nothing existing changes, and the numbering is left alone.

alter table public.certificates drop constraint if exists certificates_kind_check;
alter table public.certificates
  add constraint certificates_kind_check check (kind in ('contributor', 'reviewer', 'advisory_board', 'internship', 'workshop'));

-- Check: the five kinds are listed.
select pg_get_constraintdef(oid) as allowed_kinds from pg_constraint where conname = 'certificates_kind_check';
