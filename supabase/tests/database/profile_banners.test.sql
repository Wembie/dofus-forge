-- LOCAL Supabase only. Exercise direct API-role writes, bypassing the UI.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000c1', 'banner-a@test.invalid', '{"username":"banner_a"}'),
  ('00000000-0000-4000-8000-0000000000c2', 'banner-b@test.invalid', '{"username":"banner_b"}');

set local role anon;
select is((select count(*) from public.profile_banner_catalog), 60::bigint,
  'anonymous readers see all shipped banners');
select throws_ok($$ insert into public.profile_banner_catalog (path) values ('/banners/locations/v1/unknown.webp') $$,
  '42501', null, 'anonymous clients cannot expand the catalog');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select lives_ok($$
  do $test$
  declare banner record;
  begin
    for banner in select path from public.profile_banner_catalog loop
      update public.profiles set banner_url = banner.path where id = auth.uid();
      if not exists (select 1 from public.profiles where id = auth.uid() and banner_url = banner.path) then
        raise exception 'Approved banner was not saved: %', banner.path;
      end if;
    end loop;
  end;
  $test$;
$$, 'owners can select every bundled banner');
select throws_ok($$ update public.profiles set banner_url = 'https://tracker.example/banner.png' where id = auth.uid() $$,
  '23503', null, 'a forged HTTPS banner is rejected by the database');
select throws_ok($$ update public.profiles set banner_url = 'http://tracker.example/banner.png' where id = auth.uid() $$,
  '23503', null, 'a forged HTTP banner is rejected by the database');
select throws_ok($$ update public.profiles set banner_url = '//tracker.example/banner.png' where id = auth.uid() $$,
  '23503', null, 'a scheme-relative banner is rejected');
select throws_ok($$ update public.profiles set banner_url = '/banners/locations/v1/unknown.webp' where id = auth.uid() $$,
  '23503', null, 'an unregistered local image is rejected');
select throws_ok($$ update public.profiles set banner_url = '/banners/locations/v1/moon.webp?redirect=1' where id = auth.uid() $$,
  '23503', null, 'query strings cannot alter a newly approved banner');
select throws_ok($$ update public.profiles set banner_url = '/banners/locations/v2/moon.webp' where id = auth.uid() $$,
  '23503', null, 'an unpublished banner version is rejected');
select throws_ok($$ update public.profiles set banner_url = '/banners/locations/v1/bonta.webp?redirect=1' where id = auth.uid() $$,
  '23503', null, 'query strings cannot alter an approved banner');
select throws_ok($$ update public.profiles set banner_url = '/banners/locations/v1/../bonta.webp' where id = auth.uid() $$,
  '23503', null, 'path traversal is rejected');
select throws_ok($$ update public.profiles set banner_url = '' where id = auth.uid() $$,
  '23503', null, 'an empty string is rejected; the banner-free profile uses null');
select throws_ok($$ insert into public.profile_banner_catalog (path) values ('/banners/locations/v1/unknown.webp') $$,
  '42501', null, 'authenticated clients cannot expand the allowlist');
select throws_ok($$ update public.profile_banner_catalog set path = '/banners/locations/v1/unknown.webp' where path = '/banners/locations/v1/bonta.webp' $$,
  '42501', null, 'authenticated clients cannot modify the allowlist');
select throws_ok($$ delete from public.profile_banner_catalog where path = '/banners/locations/v1/bonta.webp' $$,
  '42501', null, 'authenticated clients cannot delete catalog entries');
select lives_ok($$ update public.profiles set banner_url = null where id = auth.uid() $$,
  'owners can restore their banner-free profile');
update public.profiles set banner_url = '/banners/locations/v1/brakmar.webp' where id = '00000000-0000-4000-8000-0000000000c2';
reset role;

select is((select banner_url from public.profiles where id = '00000000-0000-4000-8000-0000000000c1'), null::text,
  'clearing the banner persists null');
select is((select banner_url from public.profiles where id = '00000000-0000-4000-8000-0000000000c2'), null::text,
  'an owner cannot change another user''s banner');
select throws_ok($$ insert into public.profile_banner_catalog (path) values ('https://tracker.example/banner.png') $$,
  '23514', null, 'even privileged catalog writes require bundled image paths');
update public.profiles set banner_url = '/banners/locations/v1/bonta.webp' where id = '00000000-0000-4000-8000-0000000000c1';
select throws_like($$ delete from public.profile_banner_catalog where path = '/banners/locations/v1/bonta.webp' $$,
  '%profiles_banner_url_catalog_fkey%', 'a referenced banner cannot be removed accidentally');

select * from finish();
rollback;
