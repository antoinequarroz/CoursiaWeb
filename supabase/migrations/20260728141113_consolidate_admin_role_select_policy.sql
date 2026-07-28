-- Avoid overlapping SELECT policies on admin_role_assignments while preserving
-- the previous access model.

drop policy if exists "Administrators can read role assignments" on public.admin_role_assignments;
drop policy if exists "Users can read their own active admin role" on public.admin_role_assignments;

create policy "Authorized users can read relevant admin role assignments"
  on public.admin_role_assignments
  for select
  to authenticated
  using (
    (
      user_id = (select auth.uid())
      and revoked_at is null
    )
    or (select app_private.has_admin_role('administrator'::public.admin_role))
  );
