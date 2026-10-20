-- 0.3.114 — rating a build failed with "permission denied for table
-- build_ratings" since 0.3.113.
-- Idempotent: safe to run more than once.
begin;

-- The app saves a rating with an upsert: INSERT … ON CONFLICT DO UPDATE SET
-- build_id, user_id, rating. Postgres requires UPDATE on every column in that
-- SET, even on a first rating, and 0.3.113 only granted UPDATE (rating).
-- The key columns get the grant back, and a trigger keeps them unchanged, so
-- a rating still cannot be moved to another build or user.
grant update (build_id, user_id, rating) on build_ratings to authenticated;

create or replace function keep_rating_keys()
returns trigger language plpgsql set search_path = public as $$
begin
  if NEW.build_id is distinct from OLD.build_id or NEW.user_id is distinct from OLD.user_id then
    raise exception 'a rating cannot be moved to another build or user' using errcode = '42501';
  end if;
  return NEW;
end;
$$;
drop trigger if exists before_rating_keys on build_ratings;
create trigger before_rating_keys before update on build_ratings
  for each row execute procedure keep_rating_keys();

commit;
