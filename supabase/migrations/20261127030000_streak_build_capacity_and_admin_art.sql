begin;

-- Shared by the insert guard and the own-account RPC, never callable directly.
-- Read fresh state after the insert guard acquires the profile row lock.
create or replace function public.build_quota_for(p_user uuid) returns jsonb
language sql volatile security definer set search_path = public as $$
  with account as (
    select p.builds_count,
      case when p.last_active_date between (now() at time zone 'utc')::date - 1
          and (now() at time zone 'utc')::date
        then greatest(p.login_streak_current, 0) else 0 end as active_streak
    from public.profiles p where p.id = p_user
  ), benefits as (
    select bool_or(b.benefit_value = 'unlimited') as unlimited,
      max(case when b.benefit_value ~ '^[0-9]+$' then b.benefit_value::integer end) as rank_limit
    from public.custom_rank_assignments a
    join public.custom_rank_definitions d on d.id = a.rank_id and d.is_active
    join public.custom_rank_benefits b on b.rank_id = d.id and b.benefit_key = 'build_limit'
    where a.user_id = p_user and a.starts_at <= now()
      and (a.expires_at is null or a.expires_at > now())
      and (a.revoked_at is null or a.revoked_at > now())
  )
  select jsonb_build_object(
    'used', account.builds_count,
    'active_streak', account.active_streak,
    'streak_bonus', account.active_streak / 5,
    'base_limit', case when benefits.unlimited then null else greatest(50, benefits.rank_limit) end,
    'limit', case when benefits.unlimited then null else greatest(50, benefits.rank_limit) + account.active_streak / 5 end
  ) from account cross join benefits;
$$;
revoke all on function public.build_quota_for(uuid) from public, anon, authenticated;

create or replace function public.get_my_build_quota() returns jsonb
language sql volatile security definer set search_path = public as $$
  select public.build_quota_for(auth.uid());
$$;
revoke all on function public.get_my_build_quota() from public, anon;
grant execute on function public.get_my_build_quota() to authenticated;

create or replace function public.check_build_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare quota jsonb;
begin
  perform id from public.profiles where id = NEW.user_id for update;
  quota := public.build_quota_for(NEW.user_id);
  -- AFTER triggers update the cached counter at statement end. Count real
  -- rows here so earlier rows of a bulk INSERT cannot bypass the allowance.
  if (quota->>'limit')::integer is not null
      and (select count(*) from public.builds where user_id = NEW.user_id) >= (quota->>'limit')::integer then
    raise exception 'BUILD_LIMIT_REACHED';
  end if;
  return NEW;
end;
$$;
revoke all on function public.check_build_limit() from public, anon, authenticated;

create or replace function public.check_exclusive_reward_claim() returns trigger
language plpgsql security definer set search_path = public as $$
declare reward public.exclusive_rewards;
begin
  -- OLD.role cannot be forged by a client PATCH that also changes the pick.
  if OLD.role = 'admin' then return NEW; end if;
  if NEW.exclusive_avatar_slug is not null and NEW.exclusive_avatar_slug is distinct from OLD.exclusive_avatar_slug then
    select * into reward from public.exclusive_rewards where slug = NEW.exclusive_avatar_slug;
    if reward is null or OLD.login_streak_best < reward.threshold then
      raise exception 'EXCLUSIVE_REWARD_LOCKED';
    end if;
  end if;
  if NEW.exclusive_banner_slug is not null and NEW.exclusive_banner_slug is distinct from OLD.exclusive_banner_slug then
    select * into reward from public.exclusive_rewards where slug = NEW.exclusive_banner_slug;
    if reward is null or OLD.login_streak_best < reward.threshold then
      raise exception 'EXCLUSIVE_REWARD_LOCKED';
    end if;
  end if;
  return NEW;
end;
$$;

create or replace function public.get_my_exclusive_unlocks() returns jsonb
language sql security definer stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', r.slug, 'threshold', r.threshold, 'progress', p.login_streak_best,
    'eligible', p.role = 'admin' or p.login_streak_best >= r.threshold
  ) order by r.sort_order), '[]'::jsonb)
  from public.exclusive_rewards r, public.profiles p where p.id = auth.uid();
$$;
revoke all on function public.get_my_exclusive_unlocks() from public, anon;
grant execute on function public.get_my_exclusive_unlocks() to authenticated;
commit;
