-- COUR-109 hardening follow-up.
-- Fixes public views bypassing RLS, public execution of a SECURITY DEFINER
-- event trigger function, and missing Storage upload limits / upsert policy.

alter view if exists public.prix_anomalies set (security_invoker = true);
alter view if exists public.prix_courant set (security_invoker = true);
alter view if exists public.prix_doublons_suspects set (security_invoker = true);
alter view if exists public.profils_actifs set (security_invoker = true);
alter view if exists public.rapport_fraicheur_prix_par_enseigne set (security_invoker = true);
alter view if exists public.recette_allergenes_effectifs set (security_invoker = true);
alter view if exists public.recettes_a_moderer set (security_invoker = true);

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]
where id = 'images';

drop policy if exists images_write on storage.objects;
drop policy if exists images_update on storage.objects;

create policy images_write
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and (select auth.uid())::text = (storage.foldername(name))[2]
);

create policy images_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'images'
  and (select auth.uid())::text = (storage.foldername(name))[2]
)
with check (
  bucket_id = 'images'
  and (select auth.uid())::text = (storage.foldername(name))[2]
);
