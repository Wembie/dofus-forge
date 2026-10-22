-- 0.3.123 — live notifications via Realtime Broadcast instead of Postgres
-- Changes. Postgres Changes makes Realtime poll realtime.list_changes() in
-- a loop (~68% of all DB time on the free instance); Broadcast from Database
-- is fed by streaming logical replication of realtime.messages, so idle
-- costs nothing. Each user listens on the private topic
-- 'notifications:<uid>'; the RLS policy below is checked once per channel
-- join (cached for the connection), never per message. No insert policy:
-- clients can't send on these topics. Idempotent.

create or replace function public.broadcast_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object('id', NEW.id),
      'notification',
      'notifications:' || NEW.user_id::text,
      true
    );
  exception when others then
    -- Live delivery is best-effort; the bell refetches on reconnect/focus.
    null;
  end;
  return null;
end; $$;
revoke all on function public.broadcast_notification() from public, anon, authenticated;

drop trigger if exists broadcast_on_notification on public.notifications;
create trigger broadcast_on_notification
  after insert on public.notifications
  for each row execute procedure public.broadcast_notification();

drop policy if exists "notif own topic" on realtime.messages;
create policy "notif own topic" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'notifications:' || (select auth.uid())::text
  );

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime drop table public.notifications;
  end if;
end $$;
