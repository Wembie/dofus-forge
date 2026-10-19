-- Custom ranks: public recognition kept separate from account permissions and membership.
begin;

create table if not exists public.custom_rank_definitions (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  name         text not null check (char_length(btrim(name)) between 1 and 40),
  description  text not null default '' check (char_length(description) <= 180),
  icon         text not null check (icon in ('crown', 'sparkles', 'palette', 'shield', 'heart', 'star', 'gem', 'handshake', 'flame', 'medal')),
  color        text not null check (color in ('#C9A24B', '#D98A4A', '#8B7BB8', '#6FAF85', '#77A9C9', '#C56C72', '#B98B62', '#A6A6A6')),
  is_public    boolean not null default true,
  is_active    boolean not null default true,
  sort_order   smallint not null default 100 check (sort_order between 0 and 999),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.custom_rank_benefits (
  rank_id       uuid not null references public.custom_rank_definitions(id) on delete cascade,
  benefit_key   text not null,
  benefit_value text not null,
  created_at    timestamptz not null default now(),
  primary key (rank_id, benefit_key)
);

-- Upgrade installations that already created this table with the original
-- badge-only constraints, and keep this migration safe to run again.
alter table public.custom_rank_benefits
  drop constraint if exists custom_rank_benefits_benefit_key_check;
alter table public.custom_rank_benefits
  drop constraint if exists custom_rank_benefits_benefit_value_check;
alter table public.custom_rank_benefits
  drop constraint if exists custom_rank_benefits_catalog_check;
alter table public.custom_rank_benefits
  add constraint custom_rank_benefits_catalog_check check (
    (benefit_key = 'profile_badge_style' and benefit_value in ('standard', 'founder', 'creator'))
    or (benefit_key = 'build_limit' and (benefit_value ~ '^[1-9][0-9]{0,4}$' or benefit_value = '100000'))
  );

create table if not exists public.custom_rank_assignments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  rank_id       uuid not null references public.custom_rank_definitions(id) on delete restrict,
  assigned_by   uuid references public.profiles(id) on delete set null,
  starts_at     timestamptz not null default now(),
  expires_at    timestamptz,
  revoked_at    timestamptz,
  revoked_by    uuid references public.profiles(id) on delete set null,
  internal_note text not null default '' check (char_length(internal_note) <= 500),
  created_at    timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at)
);

create index if not exists custom_rank_definitions_active_order_idx
  on public.custom_rank_definitions (is_active, sort_order, name);
create index if not exists custom_rank_assignments_user_history_idx
  on public.custom_rank_assignments (user_id, created_at desc);
create index if not exists custom_rank_assignments_current_idx
  on public.custom_rank_assignments (user_id, starts_at, expires_at)
  where revoked_at is null;
create unique index if not exists custom_rank_one_open_assignment_per_user_idx
  on public.custom_rank_assignments (user_id)
  where revoked_at is null;

alter table public.custom_rank_definitions enable row level security;
alter table public.custom_rank_benefits enable row level security;
alter table public.custom_rank_assignments enable row level security;

drop policy if exists "custom ranks admin read" on public.custom_rank_definitions;
create policy "custom ranks admin read" on public.custom_rank_definitions
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
drop policy if exists "custom ranks admin insert" on public.custom_rank_definitions;
create policy "custom ranks admin insert" on public.custom_rank_definitions
  for insert to authenticated with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
drop policy if exists "custom ranks admin update" on public.custom_rank_definitions;
create policy "custom ranks admin update" on public.custom_rank_definitions
  for update to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "custom rank benefits admin read" on public.custom_rank_benefits;
create policy "custom rank benefits admin read" on public.custom_rank_benefits
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
drop policy if exists "custom rank benefits admin insert" on public.custom_rank_benefits;
create policy "custom rank benefits admin insert" on public.custom_rank_benefits
  for insert to authenticated with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
drop policy if exists "custom rank benefits admin update" on public.custom_rank_benefits;
create policy "custom rank benefits admin update" on public.custom_rank_benefits
  for update to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
drop policy if exists "custom rank benefits admin delete" on public.custom_rank_benefits;
create policy "custom rank benefits admin delete" on public.custom_rank_benefits
  for delete to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "custom rank assignments admin read" on public.custom_rank_assignments;
create policy "custom rank assignments admin read" on public.custom_rank_assignments
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

grant select, insert, update on public.custom_rank_definitions to authenticated;
grant select, insert, update, delete on public.custom_rank_benefits to authenticated;
grant select on public.custom_rank_assignments to authenticated;
revoke all on public.custom_rank_definitions, public.custom_rank_benefits, public.custom_rank_assignments from anon;

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

drop trigger if exists before_build_insert on public.builds;
create trigger before_build_insert before insert on public.builds
  for each row execute procedure public.check_build_limit();
revoke all on function public.check_build_limit() from public, anon, authenticated;

create or replace function public.get_public_custom_rank(p_user_id uuid)
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
  order by a.starts_at desc, d.sort_order, d.created_at
  limit 1;
$$;
revoke all on function public.get_public_custom_rank(uuid) from public;
grant execute on function public.get_public_custom_rank(uuid) to anon, authenticated;

create or replace function public.admin_assign_custom_rank(
  p_user_id uuid,
  p_rank_id uuid,
  p_starts_at timestamptz,
  p_expires_at timestamptz,
  p_internal_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
  v_starts_at timestamptz := coalesce(p_starts_at, now());
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.custom_rank_definitions d where d.id = p_rank_id and d.is_active) then
    raise exception 'rank_not_active' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= v_starts_at then
    raise exception 'expiry_must_follow_start' using errcode = '22023';
  end if;
  if char_length(coalesce(p_internal_note, '')) > 500 then
    raise exception 'note_too_long' using errcode = '22023';
  end if;

  -- Close the previous assignment at the scheduled start, keeping history intact.
  update public.custom_rank_assignments
     set revoked_at = least(coalesce(expires_at, v_starts_at), v_starts_at),
         revoked_by = auth.uid()
   where user_id = p_user_id and revoked_at is null;

  insert into public.custom_rank_assignments
    (user_id, rank_id, assigned_by, starts_at, expires_at, internal_note)
  values
    (p_user_id, p_rank_id, auth.uid(), v_starts_at, p_expires_at, btrim(coalesce(p_internal_note, '')))
  returning id into v_assignment_id;

  return v_assignment_id;
end;
$$;
revoke all on function public.admin_assign_custom_rank(uuid, uuid, timestamptz, timestamptz, text) from public;
grant execute on function public.admin_assign_custom_rank(uuid, uuid, timestamptz, timestamptz, text) to authenticated;

create or replace function public.admin_revoke_custom_rank(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  update public.custom_rank_assignments
     set revoked_at = now(), revoked_by = auth.uid()
   where id = p_assignment_id and revoked_at is null;
end;
$$;
revoke all on function public.admin_revoke_custom_rank(uuid) from public;
grant execute on function public.admin_revoke_custom_rank(uuid) to authenticated;

commit;
