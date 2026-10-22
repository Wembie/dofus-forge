-- 0.3.123 — performance pass (M140): work the client did in several round
-- trips moves into the database. Run it BEFORE deploying 0.3.123: the new
-- client no longer archives versions itself. (The old client keeps working
-- on top of it: it sees the version already archived and skips its copy.)
-- Idempotent.

-- 1. Version history. updateBuild made 5–6 requests per save (read the old
--    snapshot, update, read the newest archived one, insert, list the stale
--    ones, delete them) and downloaded two snapshots. A trigger does it in
--    the update itself. jsonb equality ignores key order, so a snapshot that
--    only differs in key order isn't archived.
create or replace function public.archive_build_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if not exists (
      select 1 from (
        select snapshot from build_snapshots where build_id = OLD.id order by created_at desc, id limit 1
      ) newest where newest.snapshot = OLD.snapshot
    ) then
      insert into build_snapshots (build_id, snapshot, label) values (OLD.id, OLD.snapshot, OLD.name);
      delete from build_snapshots where id in (
        select id from build_snapshots where build_id = OLD.id order by created_at desc, id offset 20
      );
    end if;
  exception when others then
    -- History is best effort: never fail the save because of it.
    null;
  end;
  return null;
end; $$;
revoke all on function public.archive_build_version() from public, anon, authenticated;
drop trigger if exists archive_build_version on public.builds;
create trigger archive_build_version after update of snapshot on public.builds
  for each row when (OLD.snapshot is distinct from NEW.snapshot)
  execute procedure public.archive_build_version();

-- 2. Views. Anonymous visitors had no identity (the client always sent
--    p_ip_hash = null), so every refresh inserted an event and bumped
--    view_count, and build_view_events was never pruned. Anonymous visitors
--    are now told apart by a per-build, per-day hash of IP + user agent from
--    the request headers (neither is stored), and each recorded view prunes
--    that build's events older than the 1-hour window, the only part read.
create or replace function public.record_view(p_build_id uuid, p_user_id uuid, p_ip_hash text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user    uuid := auth.uid();
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip      text;
  v_visitor text;
begin
  if not exists (select 1 from builds where id = p_build_id
                 and (visibility in ('public', 'unlisted') or user_id = v_user)) then
    return;
  end if;
  if v_user is null then
    v_ip := nullif(trim(coalesce(v_headers->>'cf-connecting-ip', v_headers->>'x-real-ip',
                                 split_part(v_headers->>'x-forwarded-for', ',', 1))), '');
    if v_ip is not null then
      v_visitor := md5(p_build_id::text || current_date::text || v_ip || coalesce(v_headers->>'user-agent', ''));
    end if;
  end if;
  if not exists (
    select 1 from build_view_events
    where build_id = p_build_id
      and (user_id = v_user or ip_hash = v_visitor)
      and viewed_at > now() - interval '1 hour'
  ) then
    insert into build_view_events(build_id, user_id, ip_hash)
    values (p_build_id, v_user, v_visitor);
    update builds set view_count = view_count + 1 where id = p_build_id;
    delete from build_view_events where build_id = p_build_id and viewed_at <= now() - interval '1 hour';
  end if;
end; $$;
delete from public.build_view_events where viewed_at <= now() - interval '1 hour';

-- 3. Community stats: 8 full aggregates (3 scans of builds, 2 of the
--    append-only forge_runs log) on every Explore visit. Cached in one row
--    for 5 minutes; the first call after that recomputes it.
create table if not exists public.community_stats_cache (
  id           boolean primary key default true check (id),
  stats        jsonb not null,
  refreshed_at timestamptz not null default now()
);
grant select, insert, update, delete on public.community_stats_cache to service_role;
alter table public.community_stats_cache enable row level security;

create or replace function public.get_community_stats()
returns table(
  users_count          bigint,
  builds_count         bigint,
  public_builds_count  bigint,
  likes_count          bigint,
  views_count          bigint,
  builds_this_week     bigint,
  forge_runs_count     bigint,
  forge_finished_count bigint
)
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  select c.stats into v from community_stats_cache c where c.refreshed_at > now() - interval '5 minutes';
  if v is null then
    select to_jsonb(s) into v from (
      select
        (select count(*) from profiles)                                            as users_count,
        (select count(*) from builds)                                              as builds_count,
        (select count(*) from builds where visibility = 'public')                  as public_builds_count,
        (select count(*) from build_likes)                                         as likes_count,
        (select coalesce(sum(view_count), 0) from builds)                          as views_count,
        (select count(*) from builds where created_at >= now() - interval '7 days') as builds_this_week,
        (select count(*) from forge_runs)                                          as forge_runs_count,
        (select count(*) from forge_runs where finished)                           as forge_finished_count
    ) s;
    insert into community_stats_cache (id, stats, refreshed_at) values (true, v, now())
      on conflict (id) do update set stats = excluded.stats, refreshed_at = excluded.refreshed_at;
  end if;
  return query select
    (v->>'users_count')::bigint, (v->>'builds_count')::bigint, (v->>'public_builds_count')::bigint,
    (v->>'likes_count')::bigint, (v->>'views_count')::bigint, (v->>'builds_this_week')::bigint,
    (v->>'forge_runs_count')::bigint, (v->>'forge_finished_count')::bigint;
end; $$;
grant execute on function public.get_community_stats() to anon, authenticated;

-- 4. Build detail: the signed-in viewer's like, bookmark, rating and liked
--    comments in one round trip instead of four. Security invoker: the
--    same RLS as the four separate queries applies.
create or replace function public.get_build_viewer_state(p_build_id uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'liked',      exists (select 1 from build_likes where build_id = p_build_id and user_id = (select auth.uid())),
    'bookmarked', exists (select 1 from build_bookmarks where build_id = p_build_id and user_id = (select auth.uid())),
    'rating',     (select rating from build_ratings where build_id = p_build_id and user_id = (select auth.uid())),
    'comment_likes', coalesce((
      select jsonb_agg(cl.comment_id)
      from comment_likes cl join build_comments c on c.id = cl.comment_id
      where c.build_id = p_build_id and cl.user_id = (select auth.uid())
    ), '[]'::jsonb)
  )
$$;
revoke all on function public.get_build_viewer_state(uuid) from public, anon;
grant execute on function public.get_build_viewer_state(uuid) to authenticated;

-- 5. Public profile: builds count + likes received, public comment count,
--    membership tier and custom rank in one round trip instead of four.
--    Security invoker: the same RLS as the separate queries applies.
create or replace function public.get_public_profile_summary(p_user_id uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'tier',          get_public_membership_tier(p_user_id),
    'rank',          (select to_jsonb(r) from get_public_custom_rank(p_user_id) r limit 1),
    'build_count',   (select count(*) from builds where user_id = p_user_id and visibility = 'public'),
    'like_count',    (select coalesce(sum(like_count), 0) from builds where user_id = p_user_id and visibility = 'public'),
    'comment_count', (select count(*) from build_comments c join builds b on b.id = c.build_id
                      where c.user_id = p_user_id and c.deleted_at is null and b.visibility = 'public')
  )
$$;
revoke all on function public.get_public_profile_summary(uuid) from public;
grant execute on function public.get_public_profile_summary(uuid) to anon, authenticated;
