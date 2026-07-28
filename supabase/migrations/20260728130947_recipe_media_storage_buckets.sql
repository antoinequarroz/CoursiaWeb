insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'recipe-media-validation',
    'recipe-media-validation',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'recipe-media-public',
    'recipe-media-public',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.recipe_media_assets
  drop constraint if exists recipe_media_assets_status_check;

alter table public.recipe_media_assets
  add constraint recipe_media_assets_status_check
  check (status in ('draft', 'validation', 'published', 'archived', 'replaced', 'orphaned'));

alter table public.recipe_media_assets
  drop constraint if exists recipe_media_assets_renditions_check;

alter table public.recipe_media_assets
  alter column renditions set default '[]'::jsonb;

alter table public.recipe_media_assets
  add constraint recipe_media_assets_renditions_check
  check (jsonb_typeof(renditions) = 'array');

drop policy if exists "Admins can read validation recipe media objects" on storage.objects;
create policy "Admins can read validation recipe media objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'recipe-media-validation'
    and exists (
      select 1 from public.admin_role_assignments ara
      where ara.user_id = (select auth.uid())
        and ara.revoked_at is null
        and ara.role in ('editor', 'administrator', 'super_administrator')
    )
  );

drop policy if exists "Admins can manage validation recipe media objects" on storage.objects;
create policy "Admins can manage validation recipe media objects"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'recipe-media-validation'
    and exists (
      select 1 from public.admin_role_assignments ara
      where ara.user_id = (select auth.uid())
        and ara.revoked_at is null
        and ara.role in ('editor', 'administrator', 'super_administrator')
    )
  )
  with check (
    bucket_id = 'recipe-media-validation'
    and exists (
      select 1 from public.admin_role_assignments ara
      where ara.user_id = (select auth.uid())
        and ara.revoked_at is null
        and ara.role in ('editor', 'administrator', 'super_administrator')
    )
  );
