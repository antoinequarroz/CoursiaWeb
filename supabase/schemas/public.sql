create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;

revoke all privileges on public.courses from anon, authenticated, public;
grant select on public.courses to anon, authenticated;

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

create index if not exists enrollments_course_id_idx
on public.enrollments (course_id);

revoke all privileges on public.enrollments from anon, authenticated, public;
grant select on public.enrollments to authenticated;

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

create index if not exists admin_role_assignments_granted_by_idx
on public.admin_role_assignments (granted_by)
where granted_by is not null;

create index if not exists admin_role_assignments_revoked_by_idx
on public.admin_role_assignments (revoked_by)
where revoked_by is not null;

alter table public.admin_role_assignments enable row level security;

revoke all privileges on public.admin_role_assignments from anon, authenticated, public;
revoke all privileges on type public.admin_role from anon, authenticated, public;
grant usage on type public.admin_role to authenticated;
grant select, insert, update on public.admin_role_assignments to authenticated;

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
  with current_admin as (
    select app_private.current_admin_role() as role
  )
  select coalesce(
    case
      when role = 'super_administrator' then true
      when role = 'administrator' then minimum_role <> 'super_administrator'
      else role = minimum_role
    end,
    false
  )
  from current_admin
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

create or replace function public.prevent_admin_role_assignment_identity_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id <> old.user_id
    or new.role <> old.role
    or new.granted_by is distinct from old.granted_by
    or new.granted_at <> old.granted_at then
    raise exception 'admin role assignments must be revoked and recreated, not reassigned';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_admin_role_assignment_identity_update
on public.admin_role_assignments;

create trigger prevent_admin_role_assignment_identity_update
before update on public.admin_role_assignments
for each row
execute function public.prevent_admin_role_assignment_identity_update();

revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;
revoke execute on all functions in schema app_private from public;
grant execute on function app_private.current_admin_role() to authenticated;
grant execute on function app_private.has_admin_role(public.admin_role) to authenticated;
grant execute on function app_private.can_manage_admin_role(public.admin_role) to authenticated;
revoke execute on function public.prevent_admin_role_assignment_identity_update() from public;

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
  and revoke_reason is not null
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_audit_action') then
    create type public.admin_audit_action as enum (
      'create',
      'update',
      'publish',
      'archive',
      'moderate',
      'role_change'
    );
  end if;
end $$;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action public.admin_audit_action not null,
  resource_type text not null check (
    resource_type in (
      'course',
      'admin_role_assignment',
      'moderation_case',
      'support_case',
      'admin_settings'
    )
  ),
  resource_id text not null,
  occurred_at timestamptz not null default now(),
  context jsonb not null default '{}'::jsonb,
  constraint admin_audit_logs_context_is_object check (jsonb_typeof(context) = 'object')
);

alter table public.admin_audit_logs enable row level security;

revoke all privileges on public.admin_audit_logs from anon, authenticated, public;
revoke all privileges on type public.admin_audit_action from anon, authenticated, public;
grant usage on type public.admin_audit_action to authenticated;
grant select on public.admin_audit_logs to authenticated;

create index if not exists admin_audit_logs_occurred_at_idx
on public.admin_audit_logs (occurred_at desc);

create index if not exists admin_audit_logs_actor_user_id_idx
on public.admin_audit_logs (actor_user_id)
where actor_user_id is not null;

create index if not exists admin_audit_logs_resource_idx
on public.admin_audit_logs (resource_type, resource_id);

create index if not exists admin_audit_logs_action_idx
on public.admin_audit_logs (action);

create policy "Administrators can read audit logs"
on public.admin_audit_logs
for select
to authenticated
using ((select app_private.has_admin_role('administrator')));
