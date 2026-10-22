-- 0.3.123 — performance pass (M140): content-only builds.updated_at, the
-- indexes the app's queries and FK cascades were missing, and RLS that
-- evaluates auth.uid() / is_moderator() / requested_build_id() once per
-- query instead of once per row. Idempotent.

-- 1. builds.updated_at moved on every view, like, rating and comment (the
--    counter triggers UPDATE builds), and the Worker uses it as the OG
--    image ?v= — so each view re-rendered the preview image and busted
--    Discord/WhatsApp caches. Only content changes count now.
create or replace function public.touch_build_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (NEW.name, NEW.description, NEW.slug, NEW.game_version, NEW.class_slug, NEW.gender, NEW.level, NEW.visibility, NEW.snapshot)
     is distinct from
     (OLD.name, OLD.description, OLD.slug, OLD.game_version, OLD.class_slug, OLD.gender, OLD.level, OLD.visibility, OLD.snapshot) then
    NEW.updated_at = now();
  end if;
  return NEW;
end; $$;
drop trigger if exists builds_updated_at on public.builds;
create trigger builds_updated_at before update on public.builds
  for each row execute procedure public.touch_build_updated_at();

-- 2. Explore sorts by <metric> desc, id asc. The "all classes" view had no
--    usable index (all four started with class_slug) and the class ones
--    lacked the id tie-breaker.
drop index if exists public.idx_builds_explore_rating;
drop index if exists public.idx_builds_explore_likes;
drop index if exists public.idx_builds_explore_recent;
drop index if exists public.idx_builds_explore_views;
create index if not exists idx_builds_public_rating on public.builds(avg_rating desc, id) where visibility = 'public';
create index if not exists idx_builds_public_likes  on public.builds(like_count desc, id) where visibility = 'public';
create index if not exists idx_builds_public_recent on public.builds(created_at desc, id) where visibility = 'public';
create index if not exists idx_builds_public_views  on public.builds(view_count desc, id) where visibility = 'public';
create index if not exists idx_builds_class_rating  on public.builds(class_slug, avg_rating desc, id) where visibility = 'public';
create index if not exists idx_builds_class_likes   on public.builds(class_slug, like_count desc, id) where visibility = 'public';
create index if not exists idx_builds_class_recent  on public.builds(class_slug, created_at desc, id) where visibility = 'public';
create index if not exists idx_builds_class_views   on public.builds(class_slug, view_count desc, id) where visibility = 'public';

-- My Builds orders by created_at; nothing orders builds by updated_at.
drop index if exists public.idx_builds_user;
create index if not exists idx_builds_user_created on public.builds(user_id, created_at desc);

-- 3. Lookups by build/comment/user that only had the (user_id, …) primary
--    key: history on every detail view, rating stats on every rating, the
--    profile comment count, a user's collections, and the FK columns that
--    ON DELETE CASCADE / SET NULL scan when a build, comment or profile goes.
create index if not exists idx_build_snapshots_build  on public.build_snapshots(build_id, created_at desc);
create index if not exists idx_build_ratings_build    on public.build_ratings(build_id);
create index if not exists idx_build_likes_build      on public.build_likes(build_id);
create index if not exists idx_build_bookmarks_build  on public.build_bookmarks(build_id);
create index if not exists idx_comment_likes_comment  on public.comment_likes(comment_id);
create index if not exists idx_comments_user          on public.build_comments(user_id) where deleted_at is null;
create index if not exists idx_collections_user       on public.collections(user_id, updated_at desc);
create index if not exists idx_build_tags_tag         on public.build_tags(tag_id);
create index if not exists idx_build_reports_build    on public.build_reports(build_id);
create index if not exists idx_comment_reports_comment on public.comment_reports(comment_id);
create index if not exists idx_notifications_build    on public.notifications(build_id) where build_id is not null;
create index if not exists idx_notifications_comment  on public.notifications(comment_id) where comment_id is not null;
create index if not exists idx_notifications_actor    on public.notifications(actor_id) where actor_id is not null;
create index if not exists idx_profiles_pinned_build  on public.profiles(pinned_build_id) where pinned_build_id is not null;

-- Same columns as their primary key: pure write overhead.
drop index if exists public.idx_slug_redirects;
drop index if exists public.idx_follows_follower;

-- 4. A bare auth.uid() in a policy runs once per row; wrapped in a scalar
--    subquery Postgres runs it once per query (initPlan). Rewrites every
--    public policy as it currently stands in the database, so later
--    migrations' policy changes are kept; already-wrapped calls (deparsed
--    as "( SELECT auth.uid() AS uid)") are left alone.
do $$
declare
  p record;
  fn constant text := '(?<!SELECT )((?:auth\.uid|(?:public\.)?is_moderator|(?:public\.)?requested_build_id)\(\))';
  q text;
  c text;
begin
  for p in select schemaname, tablename, policyname, qual, with_check from pg_policies where schemaname = 'public' loop
    q := regexp_replace(p.qual, fn, '(select \1)', 'g');
    c := regexp_replace(p.with_check, fn, '(select \1)', 'g');
    if q is distinct from p.qual then
      execute format('alter policy %I on %I.%I using (%s)', p.policyname, p.schemaname, p.tablename, q);
    end if;
    if c is distinct from p.with_check then
      execute format('alter policy %I on %I.%I with check (%s)', p.policyname, p.schemaname, p.tablename, c);
    end if;
  end loop;
end $$;
