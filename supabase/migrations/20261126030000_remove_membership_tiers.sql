-- Retires the paid "membresía de apoyo" tier system (Fase 1 schema only —
-- never got a UI or payment webhook, so no real account ever left 'free').
-- Decision: the site stays free, nothing for sale; a future one-time
-- donations page replaces the recurring-tier idea. Custom ranks
-- (custom_rank_definitions/benefits/assignments) are a separate system and
-- are untouched.

begin;

-- 1. Drop the public-profile tier lookup and its RPC from the bundle.
create or replace function public.get_public_profile_summary(p_user_id uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'rank',          (select to_jsonb(r) from get_public_custom_rank(p_user_id) r limit 1),
    'build_count',   (select count(*) from builds where user_id = p_user_id and visibility = 'public'),
    'like_count',    (select coalesce(sum(like_count), 0) from builds where user_id = p_user_id and visibility = 'public'),
    'comment_count', (select count(*) from build_comments c join builds b on b.id = c.build_id
                      where c.user_id = p_user_id and c.deleted_at is null and b.visibility = 'public')
  )
$$;

-- 2. check_build_limit() no longer reads a tier — flat 50 base, same as
--    every account has always had in practice (no membership ever shipped).
create or replace function public.check_build_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_build_count integer;
  v_build_limit integer;
begin
  perform p.id
  from public.profiles p
  where p.id = new.user_id
  for update;

  if exists (
    select 1
    from public.custom_rank_assignments a
    join public.custom_rank_definitions d on d.id = a.rank_id and d.is_active
    join public.custom_rank_benefits b on b.rank_id = d.id
      and b.benefit_key = 'build_limit' and b.benefit_value = 'unlimited'
    where a.user_id = new.user_id
      and a.starts_at <= now()
      and (a.expires_at is null or a.expires_at > now())
      and (a.revoked_at is null or a.revoked_at > now())
  ) then
    return new;
  end if;

  select coalesce(p.builds_count, 0), greatest(
    50, -- base free para toda cuenta
    coalesce((
      select max(b.benefit_value::integer)
      from public.custom_rank_assignments a
      join public.custom_rank_definitions d on d.id = a.rank_id and d.is_active
      join public.custom_rank_benefits b on b.rank_id = d.id and b.benefit_key = 'build_limit'
      where a.user_id = new.user_id
        and a.starts_at <= now()
        and (a.expires_at is null or a.expires_at > now())
        and (a.revoked_at is null or a.revoked_at > now())
    ), 0)
  )
  into v_build_count, v_build_limit
  from public.profiles p
  where p.id = new.user_id;

  if v_build_count >= v_build_limit then
    raise exception 'BUILD_LIMIT_REACHED';
  end if;
  return new;
end; $$;

-- 3. Drop the tier entitlement functions, then the tables and types. Tables
--    first (they reference the enum), policies/indexes go with their table.
drop function if exists public.get_public_membership_tier(uuid);
drop function if exists public.featured_build_limit_for_tier(membership_tier);
drop function if exists public.build_limit_for_tier(membership_tier);

drop table if exists public.supporter_contributions;
drop table if exists public.membership_periods;
drop table if exists public.memberships;

drop type if exists membership_status;
drop type if exists membership_tier;

commit;
