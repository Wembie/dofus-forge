-- Keep existing votes and scores unchanged; widen only the allowed vote values.
-- Unconstrained numeric avoids rounding invalid inputs before the CHECK runs.
begin;

alter table public.build_ratings
  drop constraint if exists build_ratings_rating_check;

alter table public.build_ratings
  alter column rating type numeric using rating::numeric;

alter table public.build_ratings
  add constraint build_ratings_rating_check
  check (rating >= 0.5 and rating <= 5 and mod(rating, 0.5) = 0);

notify pgrst, 'reload schema';
commit;
