-- M188 — daily login streak + exclusive rewards (docs/ROADMAP.md,
-- docs/brand/streak-rank-rewards-brief.md).
--
-- Single axis, kept simple on purpose (2026-11-27, user call: an activity
-- axis on top of streak made this harder to reason about for no real gain):
-- login_streak_current (live, resets on a missed day) and login_streak_best
-- (permanent high-water mark — a broken streak never takes back an earned
-- frame/exclusive; frame tier and exclusive-reward eligibility are both pure
-- functions of this one number, at the same 4 milestones: 7/30/100/365 days).
--
-- Exclusive avatars/banners (docs/brand/emblematic-rewards/) are NOT added
-- to profile_avatar_catalog/profile_banner_catalog — their path pattern
-- (`/avatars|banners/exclusive/v1/<slug>.webp`) doesn't match those tables'
-- CHECK constraints by design, and reusing them would need loosening a
-- constraint meant to stay narrow. Instead: `exclusive_avatar_slug` /
-- `exclusive_banner_slug` FK to a new `exclusive_rewards` catalog, enforced
-- by a trigger (same pattern as check_build_limit) so entitlement can't be
-- bypassed by any client write path, not just a dedicated RPC. Real paths
-- stay in a small TS constant (`src/features/profile/exclusiveRewards.ts`)
-- mirrored 1:1 with this table — the DB only needs the threshold to judge
-- eligibility, never the asset path.

begin;

alter table public.profiles add column if not exists login_streak_current int not null default 0;
alter table public.profiles add column if not exists login_streak_best    int not null default 0;
alter table public.profiles add column if not exists last_active_date     date;

create table if not exists public.exclusive_rewards (
  slug        text primary key check (slug ~ '^[a-z][a-z0-9_]*$'),
  threshold   int not null check (threshold > 0),
  sort_order  smallint not null default 100,
  created_at  timestamptz not null default now()
);
grant all on public.exclusive_rewards to service_role;
alter table public.exclusive_rewards enable row level security;
revoke all on table public.exclusive_rewards from public, anon, authenticated;
grant select on table public.exclusive_rewards to anon, authenticated;
drop policy if exists "exclusive rewards public read" on public.exclusive_rewards;
create policy "exclusive rewards public read" on public.exclusive_rewards for select using (true);

insert into public.exclusive_rewards (slug, threshold, sort_order) values
  ('kerubim',  7,   10),
  ('julith',   30,  20),
  ('goultard', 100, 30),
  ('ogrest',   365, 40)
on conflict (slug) do nothing;

alter table public.profiles add column if not exists exclusive_avatar_slug text;
alter table public.profiles add column if not exists exclusive_banner_slug text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and conname = 'profiles_exclusive_avatar_fkey'
  ) then
    alter table public.profiles add constraint profiles_exclusive_avatar_fkey
      foreign key (exclusive_avatar_slug) references public.exclusive_rewards(slug)
      on update restrict on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and conname = 'profiles_exclusive_banner_fkey'
  ) then
    alter table public.profiles add constraint profiles_exclusive_banner_fkey
      foreign key (exclusive_banner_slug) references public.exclusive_rewards(slug)
      on update restrict on delete restrict;
  end if;
end;
$$;

-- Entitlement check, enforced regardless of which client code path writes
-- the column (same reasoning as check_build_limit()). Only runs when a slug
-- actually changes to a non-null value — clearing it back to null
-- (switching back to a regular avatar/banner) is always free.
--
-- Checked against OLD.login_streak_best, never NEW: the "profiles own write"
-- RLS policy is row-level only, so a client can PATCH login_streak_best and
-- exclusive_avatar_slug in the SAME request — if this read NEW, that request
-- would set its own eligibility and always pass. OLD is the row as it stood
-- before this statement, so it can't be inflated by the same write that's
-- trying to use it. (login_streak_best is also frozen against direct writes
-- below, in protect_profile_system_fields — this check doesn't depend on
-- that freeze, but keeps working either way.)
create or replace function public.check_exclusive_reward_claim()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r public.exclusive_rewards;
begin
  if NEW.exclusive_avatar_slug is not null and NEW.exclusive_avatar_slug is distinct from OLD.exclusive_avatar_slug then
    select * into r from public.exclusive_rewards where slug = NEW.exclusive_avatar_slug;
    if r is null or OLD.login_streak_best < r.threshold then
      raise exception 'EXCLUSIVE_REWARD_LOCKED';
    end if;
  end if;

  if NEW.exclusive_banner_slug is not null and NEW.exclusive_banner_slug is distinct from OLD.exclusive_banner_slug then
    select * into r from public.exclusive_rewards where slug = NEW.exclusive_banner_slug;
    if r is null or OLD.login_streak_best < r.threshold then
      raise exception 'EXCLUSIVE_REWARD_LOCKED';
    end if;
  end if;

  return NEW;
end; $$;
drop trigger if exists before_profile_exclusive_claim on public.profiles;
create trigger before_profile_exclusive_claim before update on public.profiles
  for each row execute procedure public.check_exclusive_reward_claim();

-- Extend the existing system-fields freeze (0.3.113, protect_profile_system_fields)
-- to the streak columns: a direct client PATCH to login_streak_current/_best or
-- last_active_date is silently reverted to OLD, same as it already is for
-- role/followers_count/following_count/builds_count. Only bump_login_streak()
-- below can move these — it's security definer, so current_user inside it is
-- the function owner, not 'anon'/'authenticated', and this guard passes it
-- through untouched (same mechanism that already lets the follows/builds
-- counter triggers write through this guard).
create or replace function public.protect_profile_system_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if pg_trigger_depth() <= 1 and current_user in ('anon', 'authenticated') then
    NEW.role                  := OLD.role;
    NEW.followers_count       := OLD.followers_count;
    NEW.following_count       := OLD.following_count;
    NEW.builds_count          := OLD.builds_count;
    NEW.login_streak_current  := OLD.login_streak_current;
    NEW.login_streak_best     := OLD.login_streak_best;
    NEW.last_active_date      := OLD.last_active_date;
  end if;
  return NEW;
end;
$$;

-- Bumps the caller's own daily streak — idempotent per UTC calendar day
-- (safe to call on every app load, not just once). `for update` serializes
-- concurrent calls for the same account (e.g. two open tabs) instead of a
-- lost update.
create or replace function public.bump_login_streak() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_last    date;
  v_current int;
  v_best    int;
  v_today   date := (now() at time zone 'utc')::date;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select last_active_date, login_streak_current, login_streak_best
    into v_last, v_current, v_best
    from public.profiles where id = v_uid for update;

  if v_last is null or v_last < v_today - 1 then
    v_current := 1;
  elsif v_last = v_today - 1 then
    v_current := v_current + 1;
  end if; -- v_last = v_today: already bumped, v_current unchanged

  v_best := greatest(v_best, v_current);

  update public.profiles set
    last_active_date = v_today,
    login_streak_current = v_current,
    login_streak_best = v_best
  where id = v_uid;

  return jsonb_build_object('current', v_current, 'best', v_best);
end; $$;
revoke all on function public.bump_login_streak() from public, anon;
grant execute on function public.bump_login_streak() to authenticated;

-- Per-account unlock progress for the account page's rewards panel.
create or replace function public.get_my_exclusive_unlocks() returns jsonb
language sql security definer stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug',      r.slug,
    'threshold', r.threshold,
    'progress',  p.login_streak_best,
    'eligible',  p.login_streak_best >= r.threshold
  ) order by r.sort_order), '[]'::jsonb)
  from public.exclusive_rewards r, public.profiles p
  where p.id = auth.uid();
$$;
revoke all on function public.get_my_exclusive_unlocks() from public, anon;
grant execute on function public.get_my_exclusive_unlocks() to authenticated;

-- All of the account's active admin-assigned custom ranks, not just one —
-- several can and should show together (Owner + Youtuber + ... at once).
-- Renamed from get_public_custom_rank (singular, LIMIT 1) now that it
-- returns every active row; sort_order is the display order, not a
-- winner-takes-all priority (nothing competes for a single slot anymore).
drop function if exists public.get_public_custom_rank(uuid);
create or replace function public.get_public_custom_ranks(p_user_id uuid)
returns table (
  rank_name text,
  rank_description text,
  rank_icon text,
  rank_color text,
  badge_style text
)
language sql
security definer
stable
set search_path = public
as $$
  select d.name, d.description, d.icon, d.color, coalesce(b.benefit_value, 'standard')
  from public.custom_rank_assignments a
  join public.custom_rank_definitions d on d.id = a.rank_id
  left join public.custom_rank_benefits b
    on b.rank_id = d.id and b.benefit_key = 'profile_badge_style'
  where a.user_id = p_user_id
    and a.starts_at <= now()
    and (a.expires_at is null or a.expires_at > now())
    and (a.revoked_at is null or a.revoked_at > now())
    and d.is_active
    and d.is_public
  order by d.sort_order, a.starts_at desc, d.created_at;
$$;
revoke all on function public.get_public_custom_ranks(uuid) from public;
grant execute on function public.get_public_custom_ranks(uuid) to anon, authenticated;

-- Public profile bundle: admin ranks (plural now), the streak high-water
-- mark (frame tier is a pure function of this on the client — no tier
-- lookup needed here) and the two exclusive picks, alongside the existing
-- counts. Still one round trip.
create or replace function public.get_public_profile_summary(p_user_id uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'ranks',                coalesce((select jsonb_agg(to_jsonb(r)) from get_public_custom_ranks(p_user_id) r), '[]'::jsonb),
    'login_streak_best',     (select login_streak_best from profiles where id = p_user_id),
    'exclusive_avatar_slug', (select exclusive_avatar_slug from profiles where id = p_user_id),
    'exclusive_banner_slug', (select exclusive_banner_slug from profiles where id = p_user_id),
    'build_count',   (select count(*) from builds where user_id = p_user_id and visibility = 'public'),
    'like_count',    (select coalesce(sum(like_count), 0) from builds where user_id = p_user_id and visibility = 'public'),
    'comment_count', (select count(*) from build_comments c join builds b on b.id = c.build_id
                      where c.user_id = p_user_id and c.deleted_at is null and b.visibility = 'public')
  )
$$;
revoke all on function public.get_public_profile_summary(uuid) from public;
grant execute on function public.get_public_profile_summary(uuid) to anon, authenticated;

alter function public.bump_login_streak()             set search_path = public;
alter function public.get_my_exclusive_unlocks()       set search_path = public;
alter function public.get_public_custom_ranks(uuid)    set search_path = public;
alter function public.check_exclusive_reward_claim()   set search_path = public;

commit;
