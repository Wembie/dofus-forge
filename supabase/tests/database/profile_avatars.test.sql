-- LOCAL Supabase only. Exercise direct API-role writes, bypassing the UI.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000c1', 'avatar-a@test.invalid', '{"username":"avatar_a"}'),
  ('00000000-0000-4000-8000-0000000000c2', 'avatar-b@test.invalid', '{"username":"avatar_b"}');

set local role anon;
select is((select count(*) from public.profile_avatar_catalog), 266::bigint,
  'anonymous readers see all shipped portraits');
select throws_ok($$ insert into public.profile_avatar_catalog (path) values ('/avatars/classes/v1/fake-m.webp') $$,
  '42501', null, 'anonymous clients cannot expand the catalog');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select lives_ok($$
  do $test$
  declare portrait record;
  begin
    for portrait in select path from public.profile_avatar_catalog loop
      update public.profiles set avatar_url = portrait.path where id = auth.uid();
      if not exists (select 1 from public.profiles where id = auth.uid() and avatar_url = portrait.path) then
        raise exception 'Approved avatar was not saved: %', portrait.path;
      end if;
    end loop;
  end;
  $test$;
$$, 'owners can select every bundled portrait');
select throws_ok($$ update public.profiles set avatar_url = 'https://tracker.example/avatar.png' where id = auth.uid() $$,
  '23503', null, 'a forged HTTPS avatar is rejected by the database');
select throws_ok($$ update public.profiles set avatar_url = 'http://tracker.example/avatar.png' where id = auth.uid() $$,
  '23503', null, 'a forged HTTP avatar is rejected by the database');
select throws_ok($$ update public.profiles set avatar_url = '//tracker.example/avatar.png' where id = auth.uid() $$,
  '23503', null, 'a scheme-relative avatar is rejected');
select throws_ok($$ update public.profiles set avatar_url = '/avatars/classes/v1/fake-m.webp' where id = auth.uid() $$,
  '23503', null, 'an unregistered local image is rejected');
select throws_ok($$ update public.profiles set avatar_url = '/avatars/classes/v1/iop-look-8-m.webp' where id = auth.uid() $$,
  '23503', null, 'an unfinished face is not selectable through the API');
select throws_ok($$ update public.profiles set avatar_url = '/avatars/classes/v1/iop-look-2-m.webp?redirect=1' where id = auth.uid() $$,
  '23503', null, 'a second-face URL cannot be modified through a query string');
select throws_ok($$ update public.profiles set avatar_url = '/avatars/classes/v1/iop-m.webp?redirect=1' where id = auth.uid() $$,
  '23503', null, 'query strings cannot alter an approved avatar');
select throws_ok($$ update public.profiles set avatar_url = '/avatars/classes/v1/../iop-m.webp' where id = auth.uid() $$,
  '23503', null, 'path traversal is rejected');
select throws_ok($$ update public.profiles set avatar_url = '' where id = auth.uid() $$,
  '23503', null, 'an empty string is rejected; the initial uses null');
select throws_ok($$ insert into public.profile_avatar_catalog (path) values ('/avatars/classes/v1/fake-m.webp') $$,
  '42501', null, 'authenticated clients cannot expand the allowlist');
select throws_ok($$ update public.profile_avatar_catalog set path = '/avatars/classes/v1/fake-m.webp' where path = '/avatars/classes/v1/iop-m.webp' $$,
  '42501', null, 'authenticated clients cannot modify the allowlist');
select throws_ok($$ delete from public.profile_avatar_catalog where path = '/avatars/classes/v1/iop-m.webp' $$,
  '42501', null, 'authenticated clients cannot delete catalog entries');
select lives_ok($$ update public.profiles set avatar_url = null where id = auth.uid() $$,
  'owners can restore their initial');
update public.profiles set avatar_url = '/avatars/classes/v1/iop-f.webp' where id = '00000000-0000-4000-8000-0000000000c2';
reset role;

select is((select avatar_url from public.profiles where id = '00000000-0000-4000-8000-0000000000c1'), null::text,
  'clearing the avatar persists null');
select is((select avatar_url from public.profiles where id = '00000000-0000-4000-8000-0000000000c2'), null::text,
  'an owner cannot change another user''s avatar');
select throws_ok($$ insert into public.profile_avatar_catalog (path) values ('https://tracker.example/avatar.png') $$,
  '23514', null, 'even privileged catalog writes require bundled image paths');
update public.profiles set avatar_url = '/avatars/classes/v1/iop-m.webp' where id = '00000000-0000-4000-8000-0000000000c1';
select throws_like($$ delete from public.profile_avatar_catalog where path = '/avatars/classes/v1/iop-m.webp' $$,
  '%profiles_avatar_url_catalog_fkey%', 'a referenced portrait cannot be removed accidentally');

select * from finish();
rollback;
