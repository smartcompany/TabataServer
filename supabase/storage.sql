-- Routine image storage (run after creating bucket `tabata-server` in Supabase Storage)
--
-- Public buckets expose files only by direct URL (/object/public/...).
-- Do NOT add a bucket-wide SELECT policy on storage.objects — Supabase flags
-- that as "clients can list all files in this bucket".

update storage.buckets
set public = true
where id = 'tabata-server';

drop policy if exists "tabata_server_public_read" on storage.objects;
