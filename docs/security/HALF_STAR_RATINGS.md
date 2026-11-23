# Half-star rating rollout

Apply `supabase/migrations/20261123010000_half_star_ratings.sql` to the hosted project before publishing the half-star interface. Frontend deployment does not execute SQL migrations. The Database workflow uses a disposable local Supabase stack.

`build_ratings.rating` changes from `smallint` (`int2`) to unconstrained `numeric` through the identity cast `rating::numeric`. It accepts 0.5 through 5 in steps of 0.5. Unconstrained numeric is deliberate: a declared decimal scale would round inputs such as 2.49 before the CHECK could reject them. The migration also requests a PostgREST schema-cache reload.

Existing integer votes keep their exact values. The migration does not insert, update or delete vote or build rows, rescale ratings, rebuild averages, reset counts, or change creation/update timestamps. Existing primary keys, ownership policies and column grants remain in place. Replaying the migration preserves integer and fractional votes alike. Subsequent user votes update averages and counts through the existing `sync_rating_stats` trigger.

The UI submits the original score (4.5 stays 4.5), and the save API validates the same half-step range. A failed save restores the previous vote. After a successful write, the detail page fetches the authoritative average and count, including the access header for unlisted links; it does not reconstruct totals from rounded averages.

## Verification

The isolated PostgreSQL migration check compares complete legacy vote and build records before and after applying the actual migration, including averages, counts and timestamps. It tests all ten scores, invalid fractions, authoritative averages and replay. `supabase/tests/database/half_star_ratings.test.sql` checks the complete schema with real API roles, upserts, ownership, legacy integer votes and fractional aggregates. Run database tests only on a disposable local stack.

Read-only checks for the SQL editor after rollout:

```sql
select data_type, numeric_precision, numeric_scale
from information_schema.columns
where table_schema = 'public' and table_name = 'build_ratings' and column_name = 'rating';
-- numeric, with no declared precision or scale

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.build_ratings'::regclass and conname = 'build_ratings_rating_check';
-- 0.5 <= rating <= 5, divisible by 0.5
```
