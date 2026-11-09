-- Privacy retention (M157). The Privacy Policy promises that the pseudonymous
-- visitor identifiers are short-lived:
--   * build_view_events.ip_hash (view dedup) is gone within 2 hours. Rows were
--     only pruned when the same build got another view, so a build nobody
--     opened again kept its hashes forever.
--   * forge_runs.visitor (md5 of the day + IP for signed-out optimizer runs)
--     is gone within 2 days. It is only read for 1 day (finish_forge_run) and
--     3 seconds (start_forge_run spam guard); an md5 of an IPv4 address and a
--     known date is cheap to reverse, so keeping it is keeping the IP.
-- An hourly pg_cron job enforces both. Run once in the Supabase SQL editor.

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.purge_visitor_identifiers()
returns void language sql security definer set search_path = public as $$
  delete from public.build_view_events where viewed_at <= now() - interval '1 hour';
  update public.forge_runs set visitor = null
   where visitor is not null and created_at <= now() - interval '1 day';
$$;
revoke all on function public.purge_visitor_identifiers() from public, anon, authenticated;

-- Same name replaces the existing job, so re-running this file is safe.
select cron.schedule('purge-visitor-identifiers', '17 * * * *', 'select public.purge_visitor_identifiers()');

select public.purge_visitor_identifiers();
