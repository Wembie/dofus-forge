-- 0.3.135 — security audit fixes (docs/security/). Idempotent; safe to run
-- before or after deploying the matching client, which needs no change.

begin;

-- 1. INSERT kept the table-wide grant, so a client could POST server-owned
--    columns the 0.3.113 pass only locked for UPDATE: a comment with
--    like_count = 999999, a comment inserted already soft-deleted (invisible,
--    yet it bumped the build's comment_count, and moderators could not undo
--    it), or a build dated 2999 that stays first in Explore's "recent" sort.
create or replace function public.reset_comment_system_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  NEW.like_count := 0;
  NEW.deleted_at := null;
  NEW.created_at := now();
  NEW.updated_at := now();
  return NEW;
end;
$$;
drop trigger if exists before_comment_insert_reset on public.build_comments;
create trigger before_comment_insert_reset before insert on public.build_comments
  for each row execute procedure public.reset_comment_system_fields();

create or replace function public.reset_build_counters()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  NEW.like_count        := 0;
  NEW.bookmark_count    := 0;
  NEW.comment_count     := 0;
  NEW.view_count        := 0;
  NEW.avg_rating        := 0;
  NEW.rating_count      := 0;
  NEW.moderation_hidden := false;
  NEW.created_at        := now();
  NEW.updated_at        := now();
  return NEW;
end;
$$;

-- A moderator hide already takes the comment out of comment_count; the
-- author deleting that hidden row afterwards must not take it out twice.
create or replace function public.sync_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update builds set comment_count = comment_count + 1 where id = NEW.build_id;
  elsif OLD.deleted_at is null then
    update builds set comment_count = greatest(comment_count - 1, 0) where id = OLD.build_id;
  end if;
  return null;
end;
$$;

-- Reports: status and reviewer belong to the moderation flow, not the reporter.
create or replace function public.reset_report_review_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  NEW.status      := 'pending';
  NEW.reviewed_by := null;
  NEW.reviewed_at := null;
  NEW.created_at  := now();
  return NEW;
end;
$$;
drop trigger if exists before_build_report_insert on public.build_reports;
create trigger before_build_report_insert before insert on public.build_reports
  for each row execute procedure public.reset_report_review_fields();
drop trigger if exists before_comment_report_insert on public.comment_reports;
create trigger before_comment_report_insert before insert on public.comment_reports
  for each row execute procedure public.reset_report_review_fields();

-- 2. An assignment closed ahead of time by a scheduled reassignment has a
--    future revoked_at: it is still active everywhere (`revoked_at is null or
--    revoked_at > now()`), but revoke only matched `revoked_at is null`, so it
--    silently did nothing and the admin page reported success.
create or replace function public.admin_revoke_custom_rank(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  update public.custom_rank_assignments
     set revoked_at = now(), revoked_by = auth.uid()
   where id = p_assignment_id and (revoked_at is null or revoked_at > now());
  if not found then
    raise exception 'assignment_not_revocable' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.admin_revoke_custom_rank(uuid) from public;
grant execute on function public.admin_revoke_custom_rank(uuid) to authenticated;

-- 3. Anonymous views were deduplicated on IP + user agent; the user agent is
--    whatever the caller sends, so rotating it counted every request, and with
--    no IP header every call counted. Key on the gateway-provided IP only and
--    don't count an anonymous view that has none.
create or replace function public.record_view(p_build_id uuid, p_user_id uuid, p_ip_hash text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user    uuid := auth.uid();
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip      text;
  v_visitor text;
begin
  if not exists (select 1 from builds where id = p_build_id
                 and (visibility in ('public', 'unlisted') or user_id = v_user)) then
    return;
  end if;
  if v_user is null then
    v_ip := nullif(trim(coalesce(v_headers->>'cf-connecting-ip', v_headers->>'x-real-ip',
                                 split_part(v_headers->>'x-forwarded-for', ',', 1))), '');
    if v_ip is null then
      return;
    end if;
    v_visitor := md5(p_build_id::text || current_date::text || v_ip);
  end if;
  if not exists (
    select 1 from build_view_events
    where build_id = p_build_id
      and (user_id = v_user or ip_hash = v_visitor)
      and viewed_at > now() - interval '1 hour'
  ) then
    insert into build_view_events(build_id, user_id, ip_hash)
    values (p_build_id, v_user, v_visitor);
    update builds set view_count = view_count + 1 where id = p_build_id;
    delete from build_view_events where build_id = p_build_id and viewed_at <= now() - interval '1 hour';
  end if;
end; $$;
revoke all on function public.record_view(uuid, uuid, text) from public;
grant execute on function public.record_view(uuid, uuid, text) to anon, authenticated;

-- 4. Forge runs: the 3 s throttle only applied with a session, so anonymous
--    callers could insert rows without limit, and every anonymous caller was
--    the "same session" for finish_forge_run (null is not distinct from null).
--    Anonymous runs are now tied to a per-day hash of the caller's IP.
alter table public.forge_runs add column if not exists visitor text;

create or replace function public.forge_visitor() returns text
language sql stable set search_path = public as $$
  select case when auth.uid() is null then (
    select md5(current_date::text || ip) from (
      select nullif(trim(coalesce(h->>'cf-connecting-ip', h->>'x-real-ip',
                                  split_part(h->>'x-forwarded-for', ',', 1))), '') as ip
      from (select nullif(current_setting('request.headers', true), '')::json as h) headers
    ) client where ip is not null
  ) end
$$;
revoke all on function public.forge_visitor() from public;

create or replace function public.start_forge_run(p_intensity text, p_transcendence boolean, p_requirements int)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_id      bigint;
  v_visitor text := forge_visitor();
begin
  if auth.uid() is null and v_visitor is null then
    return null;
  end if;
  if exists (
    select 1 from forge_runs
    where created_at > now() - interval '3 seconds'
      and (user_id = auth.uid() or (user_id is null and visitor = v_visitor))
  ) then
    return null;
  end if;
  insert into forge_runs (user_id, visitor, intensity, transcendence, requirements)
  values (auth.uid(), v_visitor, p_intensity, p_transcendence, least(greatest(p_requirements, 0), 100))
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.start_forge_run(text, boolean, int) from public;
grant execute on function public.start_forge_run(text, boolean, int) to anon, authenticated;

create or replace function public.finish_forge_run(p_id bigint, p_all_met boolean, p_seconds int)
returns void language plpgsql security definer set search_path = public as $$
declare v_visitor text := forge_visitor();
begin
  update forge_runs
     set finished = true, all_met = p_all_met, seconds = least(greatest(p_seconds, 0), 86400)
   where id = p_id and not finished
     and created_at > now() - interval '1 day'
     and (user_id = auth.uid() or (user_id is null and auth.uid() is null and visitor = v_visitor));
end; $$;
revoke all on function public.finish_forge_run(bigint, boolean, int) from public;
grant execute on function public.finish_forge_run(bigint, boolean, int) to anon, authenticated;

-- 5. slug_redirects maps old slugs to build ids for every build, private and
--    unlisted included. No client writes it today, but once one does, the
--    rows must not list ids the reader couldn't otherwise see.
drop policy if exists "slugs read" on public.slug_redirects;
create policy "slugs read" on public.slug_redirects for select
  using (exists (select 1 from public.builds b where b.id = build_id));

-- 6. Avatars: type and size were only checked in the browser, so the public
--    bucket accepted any file sent straight to the Storage API.
update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
 where id = 'avatars';

commit;
