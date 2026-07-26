drop policy if exists images_delete on storage.objects;

create policy images_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images'
  and (select auth.uid())::text = (storage.foldername(name))[2]
);
