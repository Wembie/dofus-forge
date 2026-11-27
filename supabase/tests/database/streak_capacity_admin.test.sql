begin;
create extension if not exists pgtap with schema extensions;
select plan(29);
insert into auth.users (id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-0000000000f1','streak-admin@test.invalid','{"username":"streak_admin"}'),
 ('00000000-0000-4000-8000-0000000000f2','streak-quota@test.invalid','{"username":"streak_quota"}'),
 ('00000000-0000-4000-8000-0000000000f3','streak-mod@test.invalid','{"username":"streak_mod"}');
update profiles set role='admin' where id='00000000-0000-4000-8000-0000000000f1';
update profiles set role='moderator' where id='00000000-0000-4000-8000-0000000000f3';
update profiles set login_streak_current=4,login_streak_best=365,last_active_date=(now() at time zone 'utc')::date
 where id='00000000-0000-4000-8000-0000000000f2';
insert into builds(user_id,name,game_version,class_slug,visibility,snapshot)
 select '00000000-0000-4000-8000-0000000000f2','Quota '||n,'3.7.14.18','iop','private','{}' from generate_series(1,50) n;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000f1',true);
select is((select count(*) from jsonb_array_elements(get_my_exclusive_unlocks()) r where (r->>'eligible')::boolean),16::bigint,'admin has every art entitlement without a streak');
select lives_ok($$ do $test$ declare r record; begin
 for r in select slug from exclusive_rewards loop
  update profiles set exclusive_avatar_slug=r.slug,exclusive_banner_slug=r.slug where id=auth.uid();
 end loop; end $test$; $$,'admin can save every portrait and scene');
select is((select login_streak_best from profiles where id=auth.uid()),0,'admin access never invents a streak record');
select throws_ok($$ update profiles set exclusive_avatar_slug='https://tracker.invalid/a.png' where id=auth.uid() $$,'23503',null,'admin art access still requires registered local artwork');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000f3","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000f3',true);
select is((select count(*) from jsonb_array_elements(get_my_exclusive_unlocks()) r where (r->>'eligible')::boolean),0::bigint,'moderators do not inherit administrator art access');
select throws_ok($$ update profiles set role='admin',exclusive_avatar_slug='ogrest' where id=auth.uid() $$,'P0001','EXCLUSIVE_REWARD_LOCKED','a forged role cannot bypass art eligibility');
select throws_ok($$ select public.build_quota_for('00000000-0000-4000-8000-0000000000f2') $$,'42501',null,'private quota helper cannot query another account');
select throws_ok($$ insert into builds(user_id,name,game_version,class_slug,visibility,snapshot) select auth.uid(),'Bulk '||n,'3.7.14.18','iop','private','{}' from generate_series(1,51) n $$,'P0001','BUILD_LIMIT_REACHED','a multirow request cannot skip capacity checks');

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000f2","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000f2',true);
select is((get_my_build_quota()->>'limit')::int,50,'four active days keep fifty slots despite lifetime record 365');
select throws_ok($$ insert into builds(user_id,name,game_version,class_slug,visibility,snapshot) values(auth.uid(),'Over cap','3.7.14.18','iop','private','{}') $$,'P0001','BUILD_LIMIT_REACHED','the fifty-first build is rejected before five days');
reset role;
update profiles set login_streak_current=5 where id='00000000-0000-4000-8000-0000000000f2';
set local role authenticated;
select is((get_my_build_quota()->>'limit')::int,51,'five days grant exactly one additional slot');
select lives_ok($$ insert into builds(user_id,name,game_version,class_slug,visibility,snapshot) values(auth.uid(),'Bonus slot','3.7.14.18','iop','private','{}') $$,'earned fifty-first slot can be used');
select throws_ok($$ insert into builds(user_id,name,game_version,class_slug,visibility,snapshot) values(auth.uid(),'Still over cap','3.7.14.18','iop','private','{}') $$,'P0001','BUILD_LIMIT_REACHED','one extra slot does not grant two');
reset role;
update profiles set login_streak_current=9 where id='00000000-0000-4000-8000-0000000000f2';
set local role authenticated;
select is((get_my_build_quota()->>'limit')::int,51,'nine days retain one extra slot');
reset role;
update profiles set login_streak_current=10,last_active_date=(now() at time zone 'utc')::date-1 where id='00000000-0000-4000-8000-0000000000f2';
set local role authenticated;
select is((get_my_build_quota()->>'limit')::int,52,'ten days and yesterday last activity retain two slots');
reset role;
update profiles set last_active_date=(now() at time zone 'utc')::date-2 where id='00000000-0000-4000-8000-0000000000f2';
set local role authenticated;
select is((get_my_build_quota()->>'streak_bonus')::int,0,'a stale streak loses bonus before the next login bump');
select is((get_my_build_quota()->>'limit')::int,50,'expired active streak returns to base capacity');
select is((select count(*) from builds where user_id=auth.uid()),51::bigint,'over-cap existing builds are never deleted');
select lives_ok($$ update builds set name='Still editable' where user_id=auth.uid() $$,'existing builds remain editable above current cap');
select throws_ok($$ insert into builds(user_id,name,game_version,class_slug,visibility,snapshot) values(auth.uid(),'After reset','3.7.14.18','iop','private','{}') $$,'P0001','BUILD_LIMIT_REACHED','cannot add builds while above current allowance');
select is((bump_login_streak()->>'current')::int,1,'daily bump restarts expired active streak at one');
select is((get_my_build_quota()->>'limit')::int,50,'restart does not restore historical bonus');
reset role;
update profiles set login_streak_current=10 where id='00000000-0000-4000-8000-0000000000f2';
insert into custom_rank_definitions(id,slug,name,icon,color) values('00000000-0000-4000-8000-0000000000f4','quota-test','Quota test','anvil','#aabbcc');
insert into custom_rank_benefits(rank_id,benefit_key,benefit_value) values('00000000-0000-4000-8000-0000000000f4','build_limit','100');
insert into custom_rank_assignments(user_id,rank_id) values('00000000-0000-4000-8000-0000000000f2','00000000-0000-4000-8000-0000000000f4');
set local role authenticated;
select is((get_my_build_quota()->>'base_limit')::int,100,'rank quota remains the base allowance');
select is((get_my_build_quota()->>'limit')::int,102,'active streak bonus stacks on a finite rank quota');
reset role;
update custom_rank_benefits set benefit_value='unlimited' where rank_id='00000000-0000-4000-8000-0000000000f4';
set local role authenticated;
select is(get_my_build_quota()->>'limit',null::text,'unlimited rank remains unlimited');
select lives_ok($$ insert into builds(user_id,name,game_version,class_slug,visibility,snapshot) select auth.uid(),'Unlimited '||n,'3.7.14.18','iop','private','{}' from generate_series(1,60) n $$,'unlimited rank can create beyond the finite allowance');
reset role;
update custom_rank_assignments set expires_at=now()-interval '1 second',starts_at=now()-interval '1 day' where user_id='00000000-0000-4000-8000-0000000000f2';
set local role authenticated;
select is((get_my_build_quota()->>'limit')::int,52,'expired rank removes only its allowance, keeping active streak bonus');
select throws_ok($$ insert into builds(user_id,name,game_version,class_slug,visibility,snapshot) values(auth.uid(),'After rank expiry','3.7.14.18','iop','private','{}') $$,'P0001','BUILD_LIMIT_REACHED','rank expiry cannot bypass the current quota');
select is((select count(*) from builds where user_id=auth.uid()),111::bigint,'all builds survive rank expiry too');
select * from finish();
rollback;
