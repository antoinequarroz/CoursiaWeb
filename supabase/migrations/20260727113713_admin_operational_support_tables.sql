alter table public.ingredients
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.recipe_import_reports (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  file_name text not null,
  dry_run boolean not null default true,
  report jsonb not null default '{}'::jsonb check (jsonb_typeof(report) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.recipe_import_reports enable row level security;

drop policy if exists "Admins can read recipe import reports" on public.recipe_import_reports;
create policy "Admins can read recipe import reports"
  on public.recipe_import_reports
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_role_assignments ara
      where ara.user_id = (select auth.uid())
        and ara.revoked_at is null
        and ara.role in ('editor', 'administrator', 'super_administrator')
    )
  );

create table if not exists public.recipe_publication_history (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recettes(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  reason text,
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object'),
  changed_at timestamptz not null default now()
);

alter table public.recipe_publication_history enable row level security;

drop policy if exists "Admins can read recipe publication history" on public.recipe_publication_history;
create policy "Admins can read recipe publication history"
  on public.recipe_publication_history
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_role_assignments ara
      where ara.user_id = (select auth.uid())
        and ara.revoked_at is null
        and ara.role in ('editor', 'administrator', 'super_administrator')
    )
  );

create table if not exists public.recipe_media_assets (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references public.recettes(id) on delete cascade,
  private_path text not null,
  public_path text,
  alt_text text,
  author text,
  source text,
  license text,
  consent_reference text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  archived_at timestamptz
);

alter table public.recipe_media_assets enable row level security;

drop policy if exists "Admins can read recipe media assets" on public.recipe_media_assets;
create policy "Admins can read recipe media assets"
  on public.recipe_media_assets
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_role_assignments ara
      where ara.user_id = (select auth.uid())
        and ara.revoked_at is null
        and ara.role in ('editor', 'administrator', 'super_administrator')
    )
  );

alter table public.admin_audit_logs
  drop constraint if exists admin_audit_logs_resource_type_check;

alter table public.admin_audit_logs
  add constraint admin_audit_logs_resource_type_check
  check (resource_type = any (array[
    'course'::text,
    'official_recipe'::text,
    'canonical_ingredient'::text,
    'recipe_media_asset'::text,
    'retailer'::text,
    'product'::text,
    'price_entry'::text,
    'ingredient_product_match'::text,
    'community_recipe_submission'::text,
    'community_moderation_decision'::text,
    'support_user_lookup'::text,
    'support_user_procedure'::text,
    'content_entry'::text,
    'content_entry_revision'::text,
    'feature_flag'::text,
    'admin_role_assignment'::text,
    'moderation_case'::text,
    'support_case'::text,
    'admin_settings'::text
  ]));
