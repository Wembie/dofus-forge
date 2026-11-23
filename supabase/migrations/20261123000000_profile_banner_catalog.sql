-- Profile covers accept only approved bundled landscapes, including direct
-- REST writes. API clients cannot expand the server-owned banner catalog.
begin;

create table if not exists public.profile_banner_catalog (
  path text primary key,
  constraint profile_banner_catalog_path check (
    path ~ '^/banners/locations/v[1-9][0-9]*/[a-z][a-z0-9-]*[.]webp$'
  )
);
grant all on public.profile_banner_catalog to service_role;
alter table public.profile_banner_catalog enable row level security;
revoke all on table public.profile_banner_catalog from public, anon, authenticated;
grant select on table public.profile_banner_catalog to anon, authenticated;
drop policy if exists "profile banners public read" on public.profile_banner_catalog;
create policy "profile banners public read" on public.profile_banner_catalog
  for select using (true);

insert into public.profile_banner_catalog (path) values
  ('/banners/locations/v1/bonta.webp'),
  ('/banners/locations/v1/brakmar.webp'),
  ('/banners/locations/v1/astrub.webp'),
  ('/banners/locations/v1/incarnam.webp'),
  ('/banners/locations/v1/amakna.webp'),
  ('/banners/locations/v1/sufokia.webp'),
  ('/banners/locations/v1/pandala.webp'),
  ('/banners/locations/v1/frigost.webp'),
  ('/banners/locations/v1/anutropia.webp'),
  ('/banners/locations/v1/sramvil.webp'),
  ('/banners/locations/v1/zurcalia.webp'),
  ('/banners/locations/v1/xelorium.webp')
on conflict (path) do nothing;

-- Discard legacy custom covers without touching other editable profile fields.
lock table public.profiles in share row exclusive mode;
update public.profiles p set banner_url = null
where p.banner_url is not null
  and not exists (select 1 from public.profile_banner_catalog b where b.path = p.banner_url);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_banner_url_catalog_fkey'
  ) then
    alter table public.profiles add constraint profiles_banner_url_catalog_fkey
      foreign key (banner_url) references public.profile_banner_catalog(path)
      on update restrict on delete restrict;
  end if;
end;
$$;

commit;
