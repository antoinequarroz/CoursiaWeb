create table if not exists public.content_entries (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  kind text not null check (kind in ('faq', 'marketing_text', 'link', 'announcement')),
  title text not null,
  body text,
  url text,
  locale text not null default 'fr-CH',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  publish_at timestamptz,
  archive_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists content_entries_kind_idx on public.content_entries(kind);
create index if not exists content_entries_status_idx on public.content_entries(status);
create index if not exists content_entries_locale_idx on public.content_entries(locale);

alter table public.content_entries enable row level security;

create policy "Authorized admins can read content entries"
  on public.content_entries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_role_assignments assignment
      where assignment.user_id = (select auth.uid())
        and assignment.revoked_at is null
        and assignment.role in ('editor', 'administrator', 'super_administrator')
    )
  );

create table if not exists public.content_entry_revisions (
  id uuid primary key default gen_random_uuid(),
  content_entry_id uuid not null references public.content_entries(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object'),
  change_summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists content_entry_revisions_entry_idx
  on public.content_entry_revisions(content_entry_id, created_at desc);

alter table public.content_entry_revisions enable row level security;

create policy "Authorized admins can read content revisions"
  on public.content_entry_revisions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_role_assignments assignment
      where assignment.user_id = (select auth.uid())
        and assignment.revoked_at is null
        and assignment.role in ('editor', 'administrator', 'super_administrator')
    )
  );

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  enabled boolean not null default false,
  critical boolean not null default false,
  rollout_percentage integer not null default 0 check (rollout_percentage >= 0 and rollout_percentage <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feature_flags_critical_idx on public.feature_flags(critical desc, key);

alter table public.feature_flags enable row level security;

create policy "Authorized admins can read feature flags"
  on public.feature_flags
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_role_assignments assignment
      where assignment.user_id = (select auth.uid())
        and assignment.revoked_at is null
        and assignment.role in ('administrator', 'super_administrator')
    )
  );

create table if not exists public.community_recipe_submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'correction_requested', 'accepted', 'rejected', 'archived')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  recipe_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(recipe_payload) = 'object'),
  photo_asset_id uuid references public.recipe_media_assets(id) on delete set null,
  source text not null,
  rights text not null,
  allergens text[] not null default '{}',
  checklist jsonb not null default '{"recipeChecked":false,"photoChecked":false,"sourceChecked":false,"rightsChecked":false,"allergensChecked":false}'::jsonb check (jsonb_typeof(checklist) = 'object'),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists community_recipe_submissions_status_priority_idx
  on public.community_recipe_submissions(status, priority, submitted_at);
create index if not exists community_recipe_submissions_author_idx
  on public.community_recipe_submissions(author_user_id);

alter table public.community_recipe_submissions enable row level security;

create policy "Authorized moderators can read community submissions"
  on public.community_recipe_submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_role_assignments assignment
      where assignment.user_id = (select auth.uid())
        and assignment.revoked_at is null
        and assignment.role in ('editor', 'moderator', 'administrator', 'super_administrator')
    )
  );

create table if not exists public.community_recipe_moderation_decisions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.community_recipe_submissions(id) on delete cascade,
  decision text not null check (decision in ('accept', 'reject', 'request_correction', 'archive')),
  reason text,
  checklist jsonb not null default '{}'::jsonb check (jsonb_typeof(checklist) = 'object'),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz not null default now()
);

create index if not exists community_recipe_moderation_decisions_submission_idx
  on public.community_recipe_moderation_decisions(submission_id, decided_at desc);

alter table public.community_recipe_moderation_decisions enable row level security;

create policy "Authorized moderators can read moderation decisions"
  on public.community_recipe_moderation_decisions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_role_assignments assignment
      where assignment.user_id = (select auth.uid())
        and assignment.revoked_at is null
        and assignment.role in ('editor', 'moderator', 'administrator', 'super_administrator')
    )
  );

create table if not exists public.support_user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  account_status text not null default 'active' check (account_status in ('active', 'blocked', 'deleted', 'pending')),
  app_version text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'standard', 'premium', 'family')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_user_profiles_email_idx on public.support_user_profiles(email);
create index if not exists support_user_profiles_status_idx on public.support_user_profiles(account_status);

alter table public.support_user_profiles enable row level security;

create policy "Authorized support roles can read support user profiles"
  on public.support_user_profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_role_assignments assignment
      where assignment.user_id = (select auth.uid())
        and assignment.revoked_at is null
        and assignment.role in ('support', 'administrator', 'super_administrator')
    )
  );

create table if not exists public.revenuecat_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  entitlement text,
  product_id text,
  purchased_at timestamptz,
  expires_at timestamptz,
  received_at timestamptz not null default now(),
  payload_redacted jsonb not null default '{}'::jsonb check (jsonb_typeof(payload_redacted) = 'object')
);

create index if not exists revenuecat_events_user_received_idx
  on public.revenuecat_events(user_id, received_at desc);

alter table public.revenuecat_events enable row level security;

create policy "Authorized support roles can read revenuecat events"
  on public.revenuecat_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_role_assignments assignment
      where assignment.user_id = (select auth.uid())
        and assignment.revoked_at is null
        and assignment.role in ('support', 'administrator', 'super_administrator')
    )
  );

create table if not exists public.support_user_procedures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('export', 'delete', 'block')),
  reason text not null,
  ticket_reference text not null,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'completed', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_user_procedures_user_idx
  on public.support_user_procedures(user_id, created_at desc);

alter table public.support_user_procedures enable row level security;

create policy "Authorized support roles can read support procedures"
  on public.support_user_procedures
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_role_assignments assignment
      where assignment.user_id = (select auth.uid())
        and assignment.revoked_at is null
        and assignment.role in ('support', 'administrator', 'super_administrator')
    )
  );
