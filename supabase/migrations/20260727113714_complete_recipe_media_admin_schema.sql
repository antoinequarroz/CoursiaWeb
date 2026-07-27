alter table public.recipe_media_assets
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists crop jsonb not null default '{}'::jsonb check (jsonb_typeof(crop) = 'object'),
  add column if not exists renditions jsonb not null default '{}'::jsonb check (jsonb_typeof(renditions) = 'object'),
  add column if not exists consent_confirmed boolean not null default false;

alter table public.recipe_media_assets
  drop constraint if exists recipe_media_assets_status_check;

alter table public.recipe_media_assets
  add constraint recipe_media_assets_status_check
  check (status in ('draft', 'published', 'archived', 'replaced', 'orphaned'));

create index if not exists recipe_media_assets_recipe_id_idx on public.recipe_media_assets(recipe_id);
create index if not exists recipe_media_assets_status_idx on public.recipe_media_assets(status);
create index if not exists recipe_import_reports_idempotency_key_idx on public.recipe_import_reports(idempotency_key);
create index if not exists recipe_publication_history_recipe_id_idx on public.recipe_publication_history(recipe_id);
