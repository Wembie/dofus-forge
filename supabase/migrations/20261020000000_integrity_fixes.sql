-- 0.3.113 — data-integrity and permission fixes found in a review.
-- Idempotent: safe to run more than once.
begin;

-- 1. Profile counters (followers / following / builds) were frozen: the guard
--    that stops users from editing their own counters also reverted the
--    counter triggers, since inside a trigger the JWT role is still
--    'authenticated'. It now only applies to direct API writes (roles anon /
--    authenticated, not from another trigger); the counter triggers, the
--    service role and the SQL editor (the resync below) pass. Security
--    invoker on purpose, so current_user is the caller's role.
create or replace function protect_profile_system_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if pg_trigger_depth() <= 1 and current_user in ('anon', 'authenticated') then
    NEW.role            := OLD.role;
    NEW.followers_count := OLD.followers_count;
    NEW.following_count := OLD.following_count;
    NEW.builds_count    := OLD.builds_count;
  end if;
  return NEW;
end;
$$;

-- Resync the frozen counters.
update profiles p set
  followers_count = s.followers, following_count = s.following, builds_count = s.builds
from (
  select pr.id,
    (select count(*) from follows f where f.following_id = pr.id) as followers,
    (select count(*) from follows f where f.follower_id  = pr.id) as following,
    (select count(*) from builds b  where b.user_id      = pr.id) as builds
  from profiles pr
) s
where s.id = p.id
  and (p.followers_count, p.following_count, p.builds_count) is distinct from (s.followers, s.following, s.builds);

-- 2. Build owners could write their own counters (like_count, avg_rating,
--    view_count…) with a direct PATCH/INSERT. Only the editable columns stay
--    writable; counters are reset on insert. The counter triggers are
--    security definer, so they keep working.
revoke update on builds from authenticated;
grant update (name, description, slug, game_version, class_slug, gender, level, visibility, snapshot) on builds to authenticated;

create or replace function reset_build_counters()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  NEW.like_count        := 0;
  NEW.bookmark_count    := 0;
  NEW.comment_count     := 0;
  NEW.view_count        := 0;
  NEW.avg_rating        := 0;
  NEW.rating_count      := 0;
  NEW.moderation_hidden := false;
  return NEW;
end;
$$;
drop trigger if exists before_build_insert_counters on builds;
create trigger before_build_insert_counters before insert on builds for each row execute procedure reset_build_counters();

-- 3. Like / bookmark / follow / comment-like rows could be UPDATEd (moving a
--    like to another build), which the INSERT/DELETE counter triggers don't
--    see. Those rows are insert/delete only; a rating can only change its value.
revoke update on build_likes, build_bookmarks, follows, comment_likes from authenticated;
revoke update on build_ratings from authenticated;
grant update (rating) on build_ratings to authenticated;

-- 4. Comments: authors could un-hide a moderated comment or edit like_count
--    (the app never edits comments), and hidden comments plus comments on
--    private builds were readable through the API.
revoke update on build_comments from authenticated;
drop policy if exists "comments read" on build_comments;
create policy "comments read" on build_comments for select using (
  deleted_at is null
  and exists (select 1 from builds b where b.id = build_id
              and (b.visibility in ('public', 'unlisted') or b.user_id = auth.uid()))
);
drop policy if exists "comments mod read" on build_comments;
create policy "comments mod read" on build_comments for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')));

-- Resync build counters that the update paths above could have skewed.
update builds b set
  like_count = s.likes, bookmark_count = s.bookmarks, comment_count = s.comments,
  rating_count = s.ratings, avg_rating = s.avg
from (
  select bb.id,
    (select count(*) from build_likes     l where l.build_id = bb.id) as likes,
    (select count(*) from build_bookmarks k where k.build_id = bb.id) as bookmarks,
    (select count(*) from build_comments  c where c.build_id = bb.id and c.deleted_at is null) as comments,
    (select count(*) from build_ratings   r where r.build_id = bb.id) as ratings,
    coalesce((select round(avg(r.rating)::numeric, 2) from build_ratings r where r.build_id = bb.id), 0) as avg
  from builds bb
) s
where s.id = b.id
  and (b.like_count, b.bookmark_count, b.comment_count, b.rating_count, b.avg_rating)
      is distinct from (s.likes, s.bookmarks, s.comments, s.ratings, s.avg);

-- 5. generate_slug ran as the caller, so RLS hid other users' private slugs
--    and publishing could collide with one (unique violation).
alter function generate_slug(text) security definer;
alter function generate_slug(text) set search_path = public;

-- 6. record_view trusted the user id sent by the client and counted views
--    of builds the caller can't see.
create or replace function record_view(p_build_id uuid, p_user_id uuid, p_ip_hash text)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if not exists (select 1 from builds where id = p_build_id
                 and (visibility in ('public', 'unlisted') or user_id = v_user)) then
    return;
  end if;
  if not exists (
    select 1 from build_view_events
    where build_id = p_build_id
      and (user_id = v_user or ip_hash = p_ip_hash)
      and viewed_at > now() - interval '1 hour'
  ) then
    insert into build_view_events(build_id, user_id, ip_hash)
    values (p_build_id, v_user, p_ip_hash);
    update builds set view_count = view_count + 1 where id = p_build_id;
  end if;
end; $$;

-- 7. security definer functions must pin search_path (Supabase linter:
--    function_search_path_mutable).
alter function handle_new_user()               set search_path = public;
alter function sync_like_count()               set search_path = public;
alter function sync_rating_stats()             set search_path = public;
alter function sync_bookmark_count()           set search_path = public;
alter function sync_comment_count()            set search_path = public;
alter function sync_comment_like_count()       set search_path = public;
alter function sync_follow_counts()            set search_path = public;
alter function get_public_membership_tier(uuid) set search_path = public;
alter function get_total_builds_count()        set search_path = public;
alter function get_community_stats()           set search_path = public;

commit;
