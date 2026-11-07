-- Lower the per-build version history cap from 20 to 3 (request-consumption
-- / free-tier audit, docs/performance/free-tier-capacity-analysis.md):
-- build_snapshots rows count against Supabase's 500 MB free-tier DB size,
-- and most builds never look past their most recent couple of saves. The
-- prune is automatic on every save (archive_build_version trigger) — a
-- user is never asked to delete a version to make room. Idempotent.

begin;

create or replace function public.archive_build_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if not exists (
      select 1 from (
        select snapshot from build_snapshots where build_id = OLD.id order by created_at desc, id limit 1
      ) newest where newest.snapshot = OLD.snapshot
    ) then
      insert into build_snapshots (build_id, snapshot, label) values (OLD.id, OLD.snapshot, OLD.name);
      delete from build_snapshots where id in (
        select id from build_snapshots where build_id = OLD.id order by created_at desc, id offset 3
      );
    end if;
  exception when others then
    -- History is best effort: never fail the save because of it.
    null;
  end;
  return null;
end; $$;

-- Retroactive purge: existing builds can already hold up to 20 archived
-- versions under the old cap. Drop everything past the newest 3 per build
-- now, instead of waiting for each build's next save to trim it.
delete from public.build_snapshots where id in (
  select id from (
    select id, row_number() over (partition by build_id order by created_at desc, id) as rn
    from public.build_snapshots
  ) ranked where rn > 3
);

commit;
