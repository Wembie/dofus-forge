-- Local database only: real API roles, RLS, claims and permanent streak record.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000e1', 'streak-a@test.invalid', '{"username":"streak_a"}'),
  ('00000000-0000-4000-8000-0000000000e2', 'streak-b@test.invalid', '{"username":"streak_b"}');
update public.profiles set login_streak_current = 89, login_streak_best = 89,
  last_active_date = (now() at time zone 'utc')::date - 2
  where id = '00000000-0000-4000-8000-0000000000e1';
update public.profiles set login_streak_current = 2, login_streak_best = 90
  where id = '00000000-0000-4000-8000-0000000000e2';

set local role anon;
select is((select count(*) from public.exclusive_rewards), 16::bigint, 'all sixteen milestones are discoverable');
select throws_ok($$ insert into public.exclusive_rewards (slug, threshold) values ('forged', 1) $$,
  '42501', null, 'anonymous clients cannot add rewards');
reset role;
select results_eq($$ select threshold from public.exclusive_rewards where slug in ('kerubim','julith','goultard','ogrest') order by threshold $$,
  $$ values (7),(30),(100),(365) $$, 'original milestones are unchanged');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e1', true);
select is((select count(*) from jsonb_array_elements(public.get_my_exclusive_unlocks()) r
  where (r->>'threshold')::int = 90 and (r->>'eligible')::boolean), 0::bigint, 'day 89 unlocks neither day-90 reward');
select throws_ok($$ update public.profiles set exclusive_avatar_slug = 'otomai' where id = auth.uid() $$,
  'P0001', 'EXCLUSIVE_REWARD_LOCKED', 'locked portrait cannot be claimed directly');
select throws_ok($$ update public.profiles set exclusive_banner_slug = 'bakara_tipsy' where id = auth.uid() $$,
  'P0001', 'EXCLUSIVE_REWARD_LOCKED', 'locked scenery cannot be claimed directly');
select throws_ok($$ update public.profiles set login_streak_best = 365, exclusive_avatar_slug = 'jiva' where id = auth.uid() $$,
  'P0001', 'EXCLUSIVE_REWARD_LOCKED', 'one PATCH cannot forge a record and spend it');
update public.profiles set login_streak_best = 365, login_streak_current = 365 where id = auth.uid();
select is((select login_streak_best from public.profiles where id = auth.uid()), 89, 'record remains server-owned');
select is((public.bump_login_streak()->>'current')::int, 1, 'missing a day restarts the active streak');
select is((select login_streak_best from public.profiles where id = auth.uid()), 89, 'restart preserves the permanent record');
select lives_ok($$ update public.profiles set exclusive_avatar_slug = 'bakara', exclusive_banner_slug = 'bakara' where id = auth.uid() $$,
  'earned normal Bakara remains selectable after restart');
update public.profiles set exclusive_avatar_slug = 'bakara' where id = '00000000-0000-4000-8000-0000000000e2';
reset role;
select is((select exclusive_avatar_slug from public.profiles where id = '00000000-0000-4000-8000-0000000000e2'), null::text,
  'one account cannot change another account selection');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e2', true);
select is((select count(*) from jsonb_array_elements(public.get_my_exclusive_unlocks()) r
  where (r->>'threshold')::int = 90 and (r->>'eligible')::boolean), 2::bigint, 'both day-90 rewards unlock together even after restart');
select lives_ok($$ update public.profiles set exclusive_avatar_slug = 'otomai', exclusive_banner_slug = 'bakara_tipsy' where id = auth.uid() $$,
  'both same-day reward pairs may be mixed');
select lives_ok($$ update public.profiles set exclusive_avatar_slug = 'bakara_tipsy', exclusive_banner_slug = 'otomai' where id = auth.uid() $$,
  'both day-90 portraits and scenes are independently selectable');
select throws_ok($$ update public.profiles set exclusive_avatar_slug = 'bakara_drunk_book' where id = auth.uid() $$,
  'P0001', 'EXCLUSIVE_REWARD_LOCKED', 'day-120 version remains locked');
select throws_ok($$ update public.exclusive_rewards set threshold = 1 where slug = 'jiva' $$,
  '42501', null, 'authenticated clients cannot lower catalog thresholds');
select lives_ok($$ update public.profiles set exclusive_avatar_slug = null, exclusive_banner_slug = null where id = auth.uid() $$,
  'returning to regular artwork remains possible');
reset role;
update public.profiles set login_streak_best = 365 where id = '00000000-0000-4000-8000-0000000000e2';
set local role authenticated;
select lives_ok($$
  do $test$ declare reward record; begin
    for reward in select slug from public.exclusive_rewards loop
      update public.profiles set exclusive_avatar_slug = reward.slug, exclusive_banner_slug = reward.slug where id = auth.uid();
      if not exists (select 1 from public.profiles where id = auth.uid() and exclusive_avatar_slug = reward.slug and exclusive_banner_slug = reward.slug) then
        raise exception 'Claim did not persist: %', reward.slug;
      end if;
    end loop;
  end $test$;
$$, 'every shipped pair is claimable at the permanent day-365 record');
select * from finish();
rollback;
