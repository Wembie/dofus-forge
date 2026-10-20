-- 0.3.114 — updating a build failed with 42P17 "infinite recursion detected
-- in policy for relation builds" (every owner update since 0.3.112).
-- Idempotent: safe to run more than once.
begin;

-- Postgres refuses a policy on `builds` whose subquery reads `builds` when
-- the policies applied to that inner read have a subquery of their own. The
-- "builds update" WITH CHECK read `builds b`, and since 0.3.112 the SELECT
-- policy "builds mod read" has an EXISTS on profiles, so every UPDATE failed.
--
-- auth.uid() and is_moderator() are wrapped in (select …) so Postgres runs
-- them once per query (an InitPlan) instead of once per row — Supabase's
-- RLS performance guidance. The wrapper reads no table, so it cannot recurse.

-- 1. Moderator check as a function, so no builds policy reads another table.
create or replace function is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('moderator', 'admin'));
$$;
grant execute on function is_moderator() to anon, authenticated;

drop policy if exists "builds read" on builds;
create policy "builds read" on builds for select
  using (visibility in ('public', 'unlisted') or (select auth.uid()) = user_id);

drop policy if exists "builds mod read" on builds;
create policy "builds mod read" on builds for select using ((select is_moderator()));

drop policy if exists "builds insert" on builds;
create policy "builds insert" on builds for insert
  with check ((select auth.uid()) = user_id and is_featured = false);

-- 2. The UPDATE policy no longer reads builds. is_featured and
--    moderation_hidden are outside the column-level UPDATE grant (0.3.113),
--    so owners can't change them anyway; a hidden build must stay private.
drop policy if exists "builds update" on builds;
create policy "builds update" on builds for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (not moderation_hidden or visibility = 'private'));

drop policy if exists "builds delete" on builds;
create policy "builds delete" on builds for delete
  using ((select auth.uid()) = user_id);

-- 3. Every failed update attempt archived a copy of the unchanged build in
--    build_snapshots (the app archived before updating; fixed in the app).
--    Drop those copies: keep the oldest of identical versions per build.
delete from build_snapshots s
using build_snapshots t
where s.build_id = t.build_id
  and s.snapshot = t.snapshot
  and s.label is not distinct from t.label
  and (s.created_at, s.id) > (t.created_at, t.id);

commit;
