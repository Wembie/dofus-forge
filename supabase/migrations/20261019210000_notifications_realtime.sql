-- 0.3.112 — deliver notifications live: publish the notifications table to
-- Supabase Realtime. The bell subscribes to INSERTs filtered by user_id;
-- Realtime still applies the table's RLS ("notif own"), so each user only
-- receives their own rows. Idempotent.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
