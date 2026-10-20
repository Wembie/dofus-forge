-- 0.3.112 — security / moderation fixes for the community features (M56–M58).
-- Idempotent: safe to run more than once.
begin;

-- push_notification is only meant to be called from the notification
-- triggers. Supabase grants EXECUTE on new functions to anon/authenticated
-- directly, so revoking from public alone would let any signed-in user
-- create notifications for anyone, impersonating any actor.
revoke all on function push_notification(uuid, notification_type, uuid, uuid, uuid) from public, anon, authenticated;

-- Moderation "hide" must stick: the owner can't make a hidden build public
-- again, and moderators can still read it (to review further reports).
alter table builds add column if not exists moderation_hidden boolean not null default false;

drop policy if exists "builds mod read" on builds;
create policy "builds mod read" on builds for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')));

drop policy if exists "builds update" on builds;
create policy "builds update" on builds for update
  using (auth.uid() = user_id)
  -- Aliased subqueries on purpose (see schema.sql): the owner can't change
  -- is_featured or moderation_hidden, nor un-private a hidden build.
  with check (
    auth.uid() = user_id
    and is_featured = (select b.is_featured from builds b where b.id = builds.id)
    and moderation_hidden = (select b.moderation_hidden from builds b where b.id = builds.id)
    and (not moderation_hidden or visibility = 'private')
  );

-- Hide sets the flag; hiding a comment also lowers the build's comment_count
-- (sync_comment_count only reacts to INSERT/DELETE, not to a soft delete).
create or replace function moderate_content(p_kind text, p_target uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare v_build uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')) then
    raise exception 'not_allowed';
  end if;
  if p_kind = 'build' then
    if p_action = 'hide' then
      update builds set visibility = 'private', moderation_hidden = true where id = p_target;
    elsif p_action = 'delete' then
      delete from builds where id = p_target;
    end if;
  elsif p_kind = 'comment' and p_action in ('hide', 'delete') then
    update build_comments set deleted_at = now()
      where id = p_target and deleted_at is null
      returning build_id into v_build;
    if v_build is not null then
      update builds set comment_count = greatest(comment_count - 1, 0) where id = v_build;
    end if;
  end if;
end; $$;
revoke all on function moderate_content(text, uuid, text) from public, anon;
grant execute on function moderate_content(text, uuid, text) to authenticated;

commit;
