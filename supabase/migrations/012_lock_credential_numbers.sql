-- 012_lock_credential_numbers.sql
-- Run once in the Supabase SQL editor of the CASE STUDIO's project (URL starts azvkho…).
--
-- next_credential_id() hands out certificate numbers (MK-2026-00017). It could be called by anyone holding the
-- site's public key, which every visitor's browser has: nobody could get a certificate that way, but they could
-- use numbers up and leave gaps. After this, only the server can call it.

revoke execute on function public.next_credential_id() from public, anon, authenticated;
grant execute on function public.next_credential_id() to service_role;

-- No real certificate has been issued yet (testing used a few numbers), so start the numbering at 1.
-- This line does nothing harmful if certificates exist, but then leave it out: numbers must never repeat.
do $$
begin
  if not exists (select 1 from public.certificates) then
    perform setval('public.certificate_number_seq', 1, false);
  end if;
end $$;

-- Check: "certificates issued" 0 and "next number" 1 (if none were issued before running this).
select (select count(*) from public.certificates) as certificates_issued,
       (select case when is_called then last_value + 1 else last_value end from public.certificate_number_seq) as next_number;
