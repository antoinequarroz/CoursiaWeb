create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create policy "Published courses are publicly readable"
on public.courses
for select
to anon, authenticated
using (is_published = true);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table public.enrollments enable row level security;

create policy "Users can read their own enrollments"
on public.enrollments
for select
to authenticated
using ((select auth.uid()) = user_id);

create schema if not exists app_private;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type public.admin_role as enum (
      'editor',
      'moderator',
      'support',
      'administrator',
      'super_administrator'
    );
  end if;
end $$;

create table if not exists public.admin_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.admin_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoke_reason text,
  constraint admin_role_assignments_revoke_consistency check (
    (revoked_at is null and revoked_by is null) or (revoked_at is not null)
  )
);

create unique index if not exists admin_role_assignments_one_active_role_per_user
on public.admin_role_assignments (user_id)
where revoked_at is null;

create index if not exists admin_role_assignments_active_role_idx
on public.admin_role_assignments (user_id, role)
where revoked_at is null;

alter table public.admin_role_assignments enable row level security;

create or replace function app_private.admin_role_rank(role public.admin_role)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select case role
    when 'editor' then 10
    when 'moderator' then 20
    when 'support' then 30
    when 'administrator' then 40
    when 'super_administrator' then 50
  end
$$;

create or replace function app_private.current_admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = ''
as $$
  select ara.role
  from public.admin_role_assignments ara
  where ara.user_id = (select auth.uid())
    and ara.revoked_at is null
  order by app_private.admin_role_rank(ara.role) desc
  limit 1
$$;

create or replace function app_private.has_admin_role(minimum_role public.admin_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    app_private.admin_role_rank(app_private.current_admin_role())
      >= app_private.admin_role_rank(minimum_role),
    false
  )
$$;

create or replace function app_private.can_manage_admin_role(target_role public.admin_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target_role in ('administrator', 'super_administrator') then
      app_private.current_admin_role() = 'super_administrator'
    else
      app_private.has_admin_role('administrator')
  end
$$;

revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;
revoke execute on all functions in schema app_private from public;
grant execute on function app_private.current_admin_role() to authenticated;
grant execute on function app_private.has_admin_role(public.admin_role) to authenticated;
grant execute on function app_private.can_manage_admin_role(public.admin_role) to authenticated;

create policy "Users can read their own active admin role"
on public.admin_role_assignments
for select
to authenticated
using (
  user_id = (select auth.uid())
  and revoked_at is null
);

create policy "Administrators can read role assignments"
on public.admin_role_assignments
for select
to authenticated
using ((select app_private.has_admin_role('administrator')));

create policy "Authorized administrators can grant roles"
on public.admin_role_assignments
for insert
to authenticated
with check (
  granted_by = (select auth.uid())
  and revoked_at is null
  and (select app_private.can_manage_admin_role(role))
);

create policy "Authorized administrators can revoke roles"
on public.admin_role_assignments
for update
to authenticated
using ((select app_private.can_manage_admin_role(role)))
with check (
  revoked_at is not null
  and revoked_by = (select auth.uid())
  and role = admin_role_assignments.role
  and user_id = admin_role_assignments.user_id
);
