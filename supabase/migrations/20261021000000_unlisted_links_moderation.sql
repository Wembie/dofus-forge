-- 0.3.115 — unlisted builds by link only, moderation restore / feature,
-- remix notifications when a remix goes public.
-- Idempotent: safe to run more than once.
begin;

-- 1. Unlisted builds used to be readable by anyone, so the API could list
--    them all (?visibility=eq.unlisted). Now one is readable only when the
--    request names it — the app sends the build id in the x-build-id header
--    when a build is opened by its link — or when it is in the caller's own
--    bookmarks or collections (added from that link). Their likes / ratings
--    rows, which exposed build ids to everyone, are readable by their author
--    only (the app never reads anyone else's), and a public collection only
--    lists builds the visitor can read.
create or replace function requested_build_id()
returns uuid language sql stable set search_path = public as $$
  select case when h ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then h::uuid end
  from (select nullif(current_setting('request.headers', true), '')::json->>'x-build-id' as h) r;
$$;
grant execute on function requested_build_id() to anon, authenticated;

create or replace function in_my_lists(p_build uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from build_bookmarks where user_id = auth.uid() and build_id = p_build)
    or exists (select 1 from collection_builds cb join collections c on c.id = cb.collection_id
               where cb.build_id = p_build and c.user_id = auth.uid())
  );
$$;
grant execute on function in_my_lists(uuid) to anon, authenticated;
create index if not exists idx_collection_builds_build on collection_builds(build_id);

drop policy if exists "builds read" on builds;
create policy "builds read" on builds for select using (
  visibility = 'public'
  or (select auth.uid()) = user_id
  or (visibility = 'unlisted' and (id = (select requested_build_id()) or in_my_lists(id)))
);

drop policy if exists "likes read" on build_likes;
drop policy if exists "ratings read" on build_ratings;

drop policy if exists "col_builds read" on collection_builds;
create policy "col_builds read" on collection_builds for select using (
  exists (select 1 from collections where id = collection_id and (is_public or (select auth.uid()) = user_id))
  and exists (select 1 from builds where id = build_id)
);

-- 2. Moderation: undo a hide (build: clears the flag, stays private until
--    its owner publishes it again; comment: visible again), and admins can
--    feature / unfeature a public build.
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
    elsif p_action = 'restore' then
      update builds set moderation_hidden = false where id = p_target;
    end if;
  elsif p_kind = 'comment' and p_action in ('hide', 'delete') then
    update build_comments set deleted_at = now()
      where id = p_target and deleted_at is null
      returning build_id into v_build;
    if v_build is not null then
      update builds set comment_count = greatest(comment_count - 1, 0) where id = v_build;
    end if;
  elsif p_kind = 'comment' and p_action = 'restore' then
    update build_comments set deleted_at = null
      where id = p_target and deleted_at is not null
      returning build_id into v_build;
    if v_build is not null then
      update builds set comment_count = comment_count + 1 where id = v_build;
    end if;
  end if;
end; $$;
revoke all on function moderate_content(text, uuid, text) from public, anon;
grant execute on function moderate_content(text, uuid, text) to authenticated;

create or replace function set_build_featured(p_build uuid, p_featured boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'not_allowed';
  end if;
  update builds set is_featured = p_featured
    where id = p_build and (visibility = 'public' or not p_featured);
end; $$;
revoke all on function set_build_featured(uuid, boolean) from public, anon;
grant execute on function set_build_featured(uuid, boolean) to authenticated;

-- 3. A remix created private and published later now notifies the original
--    author too (it only fired on insert).
create or replace function notify_build_fork() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.fork_of is not null and NEW.visibility <> 'private'
     and (TG_OP = 'INSERT' or OLD.visibility = 'private') then
    perform push_notification((select user_id from builds where id = NEW.fork_of), 'build_forked', NEW.user_id, NEW.id, null);
  end if;
  return null;
end; $$;
drop trigger if exists notify_on_build_fork on builds;
create trigger notify_on_build_fork after insert or update of visibility on builds
  for each row execute procedure notify_build_fork();

commit;
