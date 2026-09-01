-- Public Storage bucket for report/content card images.
-- Existing cards and files are not deleted or overwritten.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-card-images',
  'report-card-images',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "report_card_images_public_read" on storage.objects;
drop policy if exists "report_card_images_authenticated_insert" on storage.objects;

create policy "report_card_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'report-card-images');

create policy "report_card_images_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'report-card-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
