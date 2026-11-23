-- Public avatars must be bundled Forge portraits, even through direct REST
-- requests. Clients may read the catalog but cannot expand the allowlist.
begin;

create table if not exists public.profile_avatar_catalog (
  path text primary key,
  constraint profile_avatar_catalog_path check (
    path ~ '^/avatars/classes/v[1-9][0-9]*/[a-z][a-z0-9-]*-(m|f)[.]webp$'
  )
);
grant all on public.profile_avatar_catalog to service_role;
alter table public.profile_avatar_catalog enable row level security;
revoke all on table public.profile_avatar_catalog from public, anon, authenticated;
grant select on table public.profile_avatar_catalog to anon, authenticated;
drop policy if exists "profile avatars public read" on public.profile_avatar_catalog;
create policy "profile avatars public read" on public.profile_avatar_catalog
  for select using (true);

insert into public.profile_avatar_catalog (path) values
  ('/avatars/classes/v1/cra-m.webp'),
  ('/avatars/classes/v1/cra-f.webp'),
  ('/avatars/classes/v1/ecaflip-m.webp'),
  ('/avatars/classes/v1/ecaflip-f.webp'),
  ('/avatars/classes/v1/eniripsa-m.webp'),
  ('/avatars/classes/v1/eniripsa-f.webp'),
  ('/avatars/classes/v1/enutrof-m.webp'),
  ('/avatars/classes/v1/enutrof-f.webp'),
  ('/avatars/classes/v1/eliotrope-m.webp'),
  ('/avatars/classes/v1/eliotrope-f.webp'),
  ('/avatars/classes/v1/feca-m.webp'),
  ('/avatars/classes/v1/feca-f.webp'),
  ('/avatars/classes/v1/foggernaut-m.webp'),
  ('/avatars/classes/v1/foggernaut-f.webp'),
  ('/avatars/classes/v1/forgelance-m.webp'),
  ('/avatars/classes/v1/forgelance-f.webp'),
  ('/avatars/classes/v1/huppermage-m.webp'),
  ('/avatars/classes/v1/huppermage-f.webp'),
  ('/avatars/classes/v1/iop-m.webp'),
  ('/avatars/classes/v1/iop-f.webp'),
  ('/avatars/classes/v1/masqueraider-m.webp'),
  ('/avatars/classes/v1/masqueraider-f.webp'),
  ('/avatars/classes/v1/osamodas-m.webp'),
  ('/avatars/classes/v1/osamodas-f.webp'),
  ('/avatars/classes/v1/ouginak-m.webp'),
  ('/avatars/classes/v1/ouginak-f.webp'),
  ('/avatars/classes/v1/pandawa-m.webp'),
  ('/avatars/classes/v1/pandawa-f.webp'),
  ('/avatars/classes/v1/rogue-m.webp'),
  ('/avatars/classes/v1/rogue-f.webp'),
  ('/avatars/classes/v1/sacrier-m.webp'),
  ('/avatars/classes/v1/sacrier-f.webp'),
  ('/avatars/classes/v1/sadida-m.webp'),
  ('/avatars/classes/v1/sadida-f.webp'),
  ('/avatars/classes/v1/sram-m.webp'),
  ('/avatars/classes/v1/sram-f.webp'),
  ('/avatars/classes/v1/xelor-m.webp'),
  ('/avatars/classes/v1/xelor-f.webp')
on conflict (path) do nothing;

-- Legacy external/custom images return to the user's initial. Touch only
-- avatar_url; an unrelated profile edit must not fail the new constraint.
lock table public.profiles in share row exclusive mode;
update public.profiles p set avatar_url = null
where p.avatar_url is not null
  and not exists (select 1 from public.profile_avatar_catalog a where a.path = p.avatar_url);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_avatar_url_catalog_fkey'
  ) then
    alter table public.profiles add constraint profiles_avatar_url_catalog_fkey
      foreign key (avatar_url) references public.profile_avatar_catalog(path)
      on update restrict on delete restrict;
  end if;
end;
$$;

commit;
