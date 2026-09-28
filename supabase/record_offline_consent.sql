-- record_offline_consent.sql
-- Run once in the Supabase SQL editor of the CASE STUDIO's project (URL starts azvkho…, not the main site's).
--
-- The cases added by an admin from students' PDF submissions came with the students' permission for MediKarya to
-- adapt and publish them, given outside the app. This records that permission on those cases (the ones with an
-- original author name), so the MediKarya converter (/admin/studio on the main site) can use them without anyone
-- resubmitting. It adds publish_consent and a note saying where it came from; nothing else changes, and a case
-- whose author already ticked the box keeps what they ticked.

-- 1. The cases this will touch.
select id, title, original_author_name, patient_details->'declarations' as declarations_now
from public.cases
where original_author_name is not null and original_author_name <> '';

-- 2. Record the permission.
update public.cases
set patient_details = jsonb_set(
      coalesce(patient_details, '{}'::jsonb),
      '{declarations}',
      coalesce(patient_details->'declarations', '{}'::jsonb)
        || jsonb_build_object(
             'publish_consent', true,
             'consent_note', 'Given by the author to MediKarya with their PDF submission',
             'confirmed_at', now()::text
           )
    )
where original_author_name is not null and original_author_name <> ''
  and coalesce((patient_details->'declarations'->>'publish_consent')::boolean, false) = false;

-- 3. Check: every authored case should now show publish_consent = true.
select title, original_author_name, patient_details->'declarations'->>'publish_consent' as publish_consent
from public.cases
order by created_at;
