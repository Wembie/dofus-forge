-- Cross-user isolation checks against a LOCAL Supabase stack only:
--   supabase start && supabase db reset && supabase test db
-- Never run against the production project. Everything happens inside one
-- transaction that is rolled back. See docs/security/ACCESS_CONTROL.md.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Two dummy accounts; handle_new_user() creates their profiles.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'a@test.invalid', '{"username":"user_a"}'),
  ('00000000-0000-4000-8000-00000000000b', 'b@test.invalid', '{"username":"user_b"}');

insert into builds (id, user_id, name, game_version, class_slug, visibility, snapshot) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', 'A private',  '3.0.0.0', 'iop', 'private',  '{"v":1}'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-00000000000a', 'A public',   '3.0.0.0', 'iop', 'public',   '{"v":1}'),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-00000000000a', 'A unlisted', '3.0.0.0', 'iop', 'unlisted', '{"v":1}');

-- ── anonymous ────────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.headers', '{}', true);

select is_empty($$ select id from builds where id = '00000000-0000-4000-8000-0000000000a1' $$,
  'anon cannot read a private build');
select isnt_empty($$ select id from builds where id = '00000000-0000-4000-8000-0000000000a2' $$,
  'anon can read a public build');
select is_empty($$ select id from builds where visibility = 'unlisted' $$,
  'anon cannot list unlisted builds without the link header');
select throws_ok($$ insert into builds (user_id, name, game_version, class_slug, snapshot)
                    values ('00000000-0000-4000-8000-00000000000a', 'x', '3.0.0.0', 'iop', '{"v":1}') $$,
  '42501', null, 'anon cannot create builds');
select record_view('00000000-0000-4000-8000-0000000000a2', null, null);
reset role;
select is((select view_count from builds where id = '00000000-0000-4000-8000-0000000000a2'), 0,
  'an anonymous view with no client IP is not counted');

-- ── user B against user A ────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);

select is_empty($$ select id from builds where id = '00000000-0000-4000-8000-0000000000a1' $$,
  'user B cannot read user A''s private build');
update builds set name = 'hijacked' where id = '00000000-0000-4000-8000-0000000000a2';
delete from builds where id = '00000000-0000-4000-8000-0000000000a2';
insert into build_comments (build_id, user_id, content, like_count, deleted_at, created_at)
  values ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-00000000000b', 'hi', 999999, now(), '2999-01-01');
select throws_ok($$ insert into build_comments (build_id, user_id, content)
                    values ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-00000000000a', 'as A') $$,
  '42501', null, 'user B cannot post a comment as user A');
reset role;

select is((select name from builds where id = '00000000-0000-4000-8000-0000000000a2'), 'A public',
  'user B cannot rename user A''s build');
select isnt_empty($$ select id from builds where id = '00000000-0000-4000-8000-0000000000a2' $$,
  'user B cannot delete user A''s build');
select results_eq(
  $$ select like_count, deleted_at is null, created_at <= now() from build_comments
     where user_id = '00000000-0000-4000-8000-00000000000b' $$,
  $$ values (0, true, true) $$,
  'server-owned comment columns are reset on insert');

-- ── user A on their own data ─────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

select isnt_empty($$ select id from builds where id = '00000000-0000-4000-8000-0000000000a1' $$,
  'user A can read their own private build');
update profiles set role = 'admin' where id = '00000000-0000-4000-8000-00000000000a';
insert into builds (id, user_id, name, game_version, class_slug, visibility, snapshot, created_at, like_count) values
  ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-00000000000a', 'future', '3.0.0.0', 'iop', 'public', '{"v":1}', '2999-01-01', 5000);
select throws_ok($$ select admin_revoke_custom_rank('00000000-0000-4000-8000-0000000000ff') $$,
  '42501', 'admin_required', 'a non-admin cannot call the admin rank RPC');
reset role;

select is((select role::text from profiles where id = '00000000-0000-4000-8000-00000000000a'), 'user',
  'a user cannot promote themselves');
select results_eq(
  $$ select like_count, created_at <= now() from builds where id = '00000000-0000-4000-8000-0000000000a4' $$,
  $$ values (0, true) $$,
  'server-owned build columns are reset on insert');

select * from finish();
rollback;
