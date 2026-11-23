-- LOCAL Supabase only. Existing integer votes remain valid and unchanged.
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-0000000000d0','rating-owner@test.invalid','{"username":"rating_owner"}'),
 ('00000000-0000-4000-8000-0000000000d1','rating-a@test.invalid','{"username":"rating_a"}'),
 ('00000000-0000-4000-8000-0000000000d2','rating-b@test.invalid','{"username":"rating_b"}'),
 ('00000000-0000-4000-8000-0000000000d3','rating-c@test.invalid','{"username":"rating_c"}');
insert into builds (id,user_id,name,game_version,class_slug,visibility,snapshot) values
 ('00000000-0000-4000-8000-0000000000e1','00000000-0000-4000-8000-0000000000d0','Legacy score','3.7.0.0','iop','public','{"v":1}'),
 ('00000000-0000-4000-8000-0000000000e2','00000000-0000-4000-8000-0000000000d0','Half stars','3.7.0.0','iop','public','{"v":1}');
insert into build_ratings(user_id,build_id,rating,created_at,updated_at) values
 ('00000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000e1',4,'2020-01-01','2020-01-01'),
 ('00000000-0000-4000-8000-0000000000d2','00000000-0000-4000-8000-0000000000e1',4,'2020-01-01','2020-01-01'),
 ('00000000-0000-4000-8000-0000000000d3','00000000-0000-4000-8000-0000000000e1',5,'2020-01-01','2020-01-01');
create temporary table legacy_rating_snapshot as
 select to_jsonb(b) as build,
   (select jsonb_agg(to_jsonb(r) order by user_id) from build_ratings r where r.build_id=b.id) as votes
 from builds b where id='00000000-0000-4000-8000-0000000000e1';

select col_type_is('public','build_ratings','rating','numeric','votes use exact numeric values');
select is((select avg_rating from builds where id='00000000-0000-4000-8000-0000000000e1'),4.33::numeric,'integer votes keep their existing average');
select is((select rating_count from builds where id='00000000-0000-4000-8000-0000000000e1'),3,'integer votes keep their count');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}',true);
select lives_ok($$ insert into build_ratings(user_id,build_id,rating)
 values(auth.uid(),'00000000-0000-4000-8000-0000000000e2',0.5)
 on conflict(user_id,build_id) do update set build_id=excluded.build_id,user_id=excluded.user_id,rating=excluded.rating $$,'the API-style upsert accepts half a star');
select is((select rating from build_ratings where build_id='00000000-0000-4000-8000-0000000000e2' and user_id=auth.uid()),0.5::numeric,'half a star is stored exactly');
select lives_ok($$ insert into build_ratings(user_id,build_id,rating)
 values(auth.uid(),'00000000-0000-4000-8000-0000000000e2',1.5)
 on conflict(user_id,build_id) do update set build_id=excluded.build_id,user_id=excluded.user_id,rating=excluded.rating $$,'the same vote can be changed to one and a half stars');
select is((select rating from build_ratings where build_id='00000000-0000-4000-8000-0000000000e2' and user_id=auth.uid()),1.5::numeric,'an updated fraction is stored exactly');
select is((select rating_count from builds where id='00000000-0000-4000-8000-0000000000e2'),1,'changing a vote does not add another voter');
select throws_ok($$ update build_ratings set rating=0 where build_id='00000000-0000-4000-8000-0000000000e2' and user_id=auth.uid() $$,'23514',null,'zero is not a vote');
select throws_ok($$ update build_ratings set rating=1.25 where build_id='00000000-0000-4000-8000-0000000000e2' and user_id=auth.uid() $$,'23514',null,'quarter stars are rejected');
select throws_ok($$ update build_ratings set rating=2.49 where build_id='00000000-0000-4000-8000-0000000000e2' and user_id=auth.uid() $$,'23514',null,'invalid fractions are rejected instead of rounded');
select throws_ok($$ update build_ratings set rating=5.5 where build_id='00000000-0000-4000-8000-0000000000e2' and user_id=auth.uid() $$,'23514',null,'values over five are rejected');
select throws_ok($$ update build_ratings set user_id='00000000-0000-4000-8000-0000000000d2' where build_id='00000000-0000-4000-8000-0000000000e2' and user_id=auth.uid() $$,'42501',null,'a vote cannot move to another user');
select throws_ok($$ update build_ratings set build_id='00000000-0000-4000-8000-0000000000e1' where build_id='00000000-0000-4000-8000-0000000000e2' and user_id=auth.uid() $$,'42501',null,'a vote cannot move to another build');

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000d2","role":"authenticated"}',true);
select lives_ok($$ insert into build_ratings(user_id,build_id,rating) values(auth.uid(),'00000000-0000-4000-8000-0000000000e2',4.5) $$,'another user can contribute four and a half stars');
select is((select avg_rating from builds where id='00000000-0000-4000-8000-0000000000e2'),3::numeric,'averages include fractional votes');
select is((select rating_count from builds where id='00000000-0000-4000-8000-0000000000e2'),2,'both voters are counted');

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}',true);
select lives_ok($$ do $test$ declare n int; begin
 for n in 1..10 loop
   update build_ratings set rating=n::numeric/2 where build_id='00000000-0000-4000-8000-0000000000e2' and user_id=auth.uid();
   if not exists(select 1 from build_ratings where build_id='00000000-0000-4000-8000-0000000000e2' and user_id=auth.uid() and rating=n::numeric/2) then raise exception 'Rating changed'; end if;
 end loop;end;$test$; $$,'all ten half-star and legacy integer choices are accepted exactly');
select is((select avg_rating from builds where id='00000000-0000-4000-8000-0000000000e2'),4.75::numeric,'the authoritative average keeps its decimal precision');
update build_ratings set rating=1 where build_id='00000000-0000-4000-8000-0000000000e2' and user_id='00000000-0000-4000-8000-0000000000d2';
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select throws_ok($$ insert into build_ratings(user_id,build_id,rating) values('00000000-0000-4000-8000-0000000000d3','00000000-0000-4000-8000-0000000000e2',4.5) $$,'42501',null,'anonymous clients still cannot vote');
reset role;

select is((select to_jsonb(b) from builds b where id='00000000-0000-4000-8000-0000000000e1'),(select build from legacy_rating_snapshot),'the unrelated legacy build retains every field and score');
select is((select jsonb_agg(to_jsonb(r) order by user_id) from build_ratings r where build_id='00000000-0000-4000-8000-0000000000e1'),(select votes from legacy_rating_snapshot),'legacy vote values and timestamps remain unchanged');
select is((select rating from build_ratings where build_id='00000000-0000-4000-8000-0000000000e2' and user_id='00000000-0000-4000-8000-0000000000d2'),4.5::numeric,'one user cannot overwrite another user''s fraction');
select * from finish();
rollback;
