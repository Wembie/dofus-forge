-- Extend existing custom ranks with expanded badge customization and unlimited saved builds.
-- Apply after 20261018_custom_ranks.sql.
begin;

alter table public.custom_rank_definitions
  drop constraint if exists custom_rank_definitions_icon_check;
alter table public.custom_rank_definitions
  add constraint custom_rank_definitions_icon_check check (icon in (
    'anvil', 'award', 'axe', 'badge_check', 'badge_plus', 'bird', 'book_open',
    'bug', 'castle', 'cat', 'circle_star', 'clover', 'code', 'compass', 'crown',
    'dna', 'feather', 'flame', 'flame_kindling', 'flower', 'gamepad', 'gem',
    'globe', 'hammer', 'handshake', 'headphones', 'heart', 'heart_handshake',
    'heart_pulse', 'landmark', 'leaf', 'medal', 'moon', 'mountain', 'music',
    'orbit', 'palette', 'piggy_bank', 'rabbit', 'rocket', 'scroll', 'shield',
    'shield_check', 'sparkles', 'star', 'sun', 'sword', 'swords', 'target',
    'trophy', 'users', 'wand', 'wrench', 'zap'
  ));

alter table public.custom_rank_definitions
  drop constraint if exists custom_rank_definitions_color_check;
alter table public.custom_rank_definitions
  add constraint custom_rank_definitions_color_check check (color ~ '^#[0-9A-Fa-f]{6}$');

alter table public.custom_rank_benefits
  drop constraint if exists custom_rank_benefits_catalog_check;
alter table public.custom_rank_benefits
  add constraint custom_rank_benefits_catalog_check check (
    (benefit_key = 'profile_badge_style' and benefit_value in (
      'standard', 'founder', 'creator', 'royal', 'neon', 'crystal',
      'holographic', 'obsidian', 'minimal', 'arcane', 'vintage', 'champion',
      'celestial', 'infernal', 'emerald', 'sapphire', 'ruby', 'bronze',
      'silver', 'platinum', 'carbon', 'aurora', 'cosmic', 'toxic'
    ))
    or (benefit_key = 'build_limit' and (
      benefit_value ~ '^[1-9][0-9]{0,4}$' or benefit_value = '100000' or benefit_value = 'unlimited'
    ))
  );

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
    public.build_limit_for_tier(coalesce(m.tier, 'free')),
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
  left join public.memberships m on m.user_id = p.id
  where p.id = new.user_id;

  if v_build_count >= v_build_limit then
    raise exception 'BUILD_LIMIT_REACHED';
  end if;
  return new;
end;
$$;

commit;
