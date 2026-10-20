-- 0.3.114 — updating a build failed with 42P17 "infinite recursion detected
-- in policy for relation builds" (every owner update since 0.3.112).
-- Idempotent: safe to run more than once.
begin;

-- Postgres refuses a policy on `builds` whose subquery reads `builds` when
-- the policies applied to that inner read have a subquery of their own. The
-- "builds update" WITH CHECK read `builds b`, and since 0.3.112 the SELECT
-- policy "builds mod read" has an EXISTS on profiles, so every UPDATE failed.

-- 1. Moderator check as a function, so builds' SELECT policies carry no
--    subquery.
create or replace function is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('moderator', 'admin'));
$$;
grant execute on function is_moderator() to anon, authenticated;

drop policy if exists "builds mod read" on builds;
create policy "builds mod read" on builds for select using (is_moderator());

-- 2. The UPDATE policy no longer reads builds. is_featured and
--    moderation_hidden are outside the column-level UPDATE grant (0.3.113),
--    so owners can't change them anyway; a hidden build must stay private.
drop policy if exists "builds update" on builds;
create policy "builds update" on builds for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and (not moderation_hidden or visibility = 'private'));

commit;
