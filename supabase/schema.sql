-- ═══════════════════════════════════════════════════════════════════════
-- Dofus Forge — schema completo
-- Fuente de verdad: docs/DATABASE.md (edítalo ahí, no aquí directamente,
-- y vuelve a copiar este archivo si cambias algo)
-- Pega esto entero en Supabase Dashboard → SQL Editor → Run. Una sola vez.
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- Data API grants: Supabase stops granting them automatically to new tables
-- in "public" (from 2026-10-30), so every create table below is followed by
-- an explicit grant (the same access the old default gave, narrower where a
-- table already had its own grants). RLS policies still decide which rows.

-- ═══════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════

create type build_visibility as enum ('private', 'unlisted', 'public');
create type notification_type as enum (
  'build_liked', 'build_commented', 'build_rated', 'build_forked',
  'comment_liked', 'comment_replied', 'new_follower'
);
create type report_status as enum ('pending', 'reviewed', 'actioned', 'dismissed');
create type report_reason as enum ('spam', 'incorrect_data', 'inappropriate', 'other');
create type user_role     as enum ('user', 'moderator', 'admin');


-- ═══════════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════════

create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text unique not null,
  display_name     text,
  bio              text,
  avatar_url       text,
  banner_url       text,
  role             user_role not null default 'user',
  pinned_build_id  uuid,
  followers_count  int not null default 0,
  following_count  int not null default 0,
  builds_count     int not null default 0,
  settings         jsonb not null default '{}',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  constraint username_format check (username ~ '^[a-z0-9_-]{3,30}$')
);
grant select, insert, update, delete on public.profiles to anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- BUILDS
-- ═══════════════════════════════════════════════════════════════

create table builds (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  name            text not null,
  description     text,
  slug            text unique,
  game_version    text not null,  -- ej. '3.6.11.15' (public/data/version.json), sin default: siempre explícito
  class_slug      text not null check (class_slug in (
    'cra','ecaflip','eniripsa','enutrof','eliotrope','feca','foggernaut',
    'forgelance','huppermage','iop','masqueraider','osamodas','ouginak','pandawa',
    'rogue','sacrier','sadida','sram','xelor'
  )),
  gender          text not null default 'male' check (gender in ('male','female')),
  level           smallint not null default 200 check (level between 1 and 200),
  visibility      build_visibility not null default 'private',
  is_featured     boolean not null default false,
  snapshot        jsonb not null,
  like_count      int not null default 0,
  bookmark_count  int not null default 0,
  comment_count   int not null default 0,
  view_count      int not null default 0,
  avg_rating      numeric(3,2) not null default 0,
  rating_count    int not null default 0,
  fork_of         uuid references builds(id) on delete set null,
  moderation_hidden boolean not null default false,  -- ocultado por moderación: el dueño no puede volver a publicarlo
  search_vector   tsvector generated always as (
    -- 'simple' (no stemming), no 'spanish': nombres/descripciones son texto libre del
    -- usuario en cualquiera de los 4 idiomas de la app (es/en/fr/pt) — un config de
    -- idioma fijo stemea mal los otros 3
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
grant select, insert, update, delete on public.builds to anon, authenticated, service_role;

-- FK circular profiles ↔ builds
alter table profiles
  add constraint fk_pinned_build
  foreign key (pinned_build_id) references builds(id) on delete set null;


-- ═══════════════════════════════════════════════════════════════
-- TAGS
-- ═══════════════════════════════════════════════════════════════

create table tags (
  id         serial primary key,
  name       text unique not null check (name ~ '^[a-z0-9-]{2,20}$'),
  category   text not null default 'general',
  created_by uuid references profiles(id) on delete set null
);
grant select, insert, update, delete on public.tags to anon, authenticated, service_role;

create table build_tags (
  build_id  uuid references builds(id) on delete cascade,
  tag_id    int  references tags(id)   on delete cascade,
  primary key (build_id, tag_id)
);
grant select, insert, update, delete on public.build_tags to anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- HISTORIAL DE VERSIONES
-- ═══════════════════════════════════════════════════════════════

create table build_snapshots (
  id          uuid primary key default gen_random_uuid(),
  build_id    uuid not null references builds(id) on delete cascade,
  snapshot    jsonb not null,
  label       text,
  created_at  timestamptz default now()
);
grant select, insert, update, delete on public.build_snapshots to anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- SLUG REDIRECTS
-- ═══════════════════════════════════════════════════════════════

create table slug_redirects (
  old_slug   text primary key,
  build_id   uuid not null references builds(id) on delete cascade,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.slug_redirects to anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- SOCIAL: LIKES, RATINGS, BOOKMARKS
-- ═══════════════════════════════════════════════════════════════

create table build_likes (
  user_id    uuid references profiles(id) on delete cascade,
  build_id   uuid references builds(id)  on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, build_id)
);
grant select, insert, update, delete on public.build_likes to anon, authenticated, service_role;

create table build_ratings (
  user_id    uuid references profiles(id) on delete cascade,
  build_id   uuid references builds(id)  on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, build_id)
);
grant select, insert, update, delete on public.build_ratings to anon, authenticated, service_role;

create table build_bookmarks (
  user_id    uuid references profiles(id) on delete cascade,
  build_id   uuid references builds(id)  on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, build_id)
);
grant select, insert, update, delete on public.build_bookmarks to anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════

create table build_view_events (
  build_id   uuid references builds(id) on delete cascade,
  user_id    uuid,
  ip_hash    text,
  viewed_at  timestamptz default now()
);
grant select, insert, update, delete on public.build_view_events to anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════

create table build_comments (
  id          uuid primary key default gen_random_uuid(),
  build_id    uuid not null references builds(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  parent_id   uuid references build_comments(id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 2000),
  like_count  int not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  deleted_at  timestamptz
);
grant select, insert, update, delete on public.build_comments to anon, authenticated, service_role;

create table comment_likes (
  user_id    uuid references profiles(id) on delete cascade,
  comment_id uuid references build_comments(id) on delete cascade,
  primary key (user_id, comment_id)
);
grant select, insert, update, delete on public.comment_likes to anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- FOLLOWS
-- ═══════════════════════════════════════════════════════════════

create table follows (
  follower_id  uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);
grant select, insert, update, delete on public.follows to anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  type        notification_type not null,
  actor_id    uuid references profiles(id) on delete set null,
  build_id    uuid references builds(id)   on delete cascade,
  comment_id  uuid references build_comments(id) on delete cascade,
  read        boolean not null default false,
  created_at  timestamptz default now()
);
grant select, insert, update, delete on public.notifications to anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- COLLECTIONS
-- ═══════════════════════════════════════════════════════════════

create table collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  name        text not null,
  description text,
  is_public   boolean not null default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
grant select, insert, update, delete on public.collections to anon, authenticated, service_role;

create table collection_builds (
  collection_id  uuid references collections(id) on delete cascade,
  build_id       uuid references builds(id)      on delete cascade,
  position       smallint not null default 0,
  added_at       timestamptz default now(),
  primary key (collection_id, build_id)
);
grant select, insert, update, delete on public.collection_builds to anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- REPORTS
-- ═══════════════════════════════════════════════════════════════

create table build_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references profiles(id) on delete cascade,
  build_id     uuid not null references builds(id)  on delete cascade,
  reason       report_reason not null,
  detail       text check (detail is null or char_length(detail) <= 500),
  status       report_status not null default 'pending',
  reviewed_by  uuid references profiles(id),
  reviewed_at  timestamptz,
  created_at   timestamptz default now(),
  unique (reporter_id, build_id)
);
grant select, insert, update, delete on public.build_reports to anon, authenticated, service_role;

-- Reportes de comentarios (M58): mismo modelo que build_reports
create table comment_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references profiles(id) on delete cascade,
  comment_id   uuid not null references build_comments(id) on delete cascade,
  reason       report_reason not null,
  detail       text check (detail is null or char_length(detail) <= 500),
  status       report_status not null default 'pending',
  reviewed_by  uuid references profiles(id),
  reviewed_at  timestamptz,
  created_at   timestamptz default now(),
  unique (reporter_id, comment_id)
);
grant select, insert, update, delete on public.comment_reports to anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- STORAGE: bucket de avatares
-- ═══════════════════════════════════════════════════════════════
-- profiles.avatar_url se llena solo con URLs de este bucket (nunca una URL
-- externa pegada a mano) — ruta de cada archivo: {user_id}/avatar.{ext}

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar public read" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatar upload own" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar update own" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar delete own" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ═══════════════════════════════════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════════════════════════════════

-- ── Explore (queries de listado con filtros + ordenamiento) ──────────
create index idx_builds_explore_rating   on builds(class_slug, avg_rating desc)  where visibility = 'public';
create index idx_builds_explore_likes    on builds(class_slug, like_count desc)  where visibility = 'public';
create index idx_builds_explore_recent   on builds(class_slug, created_at desc)  where visibility = 'public';
create index idx_builds_explore_views    on builds(class_slug, view_count desc)  where visibility = 'public';
create index idx_builds_level            on builds(level) where visibility = 'public';
create index idx_builds_featured         on builds(is_featured, avg_rating desc) where visibility = 'public';
create index idx_builds_search           on builds using gin(search_vector) where visibility = 'public';
create index idx_builds_user             on builds(user_id, updated_at desc);
create index idx_builds_slug             on builds(slug) where slug is not null;
create index idx_builds_fork             on builds(fork_of) where fork_of is not null;

-- ── Items ───────────────────────────────────────────────────────────

-- ── Social ──────────────────────────────────────────────────────────
create index idx_build_views     on build_view_events(build_id, viewed_at desc);
create index idx_notifications   on notifications(user_id, read, created_at desc);
create index idx_comments_build  on build_comments(build_id, created_at) where deleted_at is null;
create index idx_comments_parent on build_comments(parent_id) where parent_id is not null;
create index idx_follows_follower  on follows(follower_id);
create index idx_follows_following on follows(following_id);
create index idx_slug_redirects  on slug_redirects(old_slug);
create index idx_reports_pending on build_reports(status) where status = 'pending';
create index idx_tags_category   on tags(category);


-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

alter table profiles          enable row level security;
alter table builds            enable row level security;
alter table build_snapshots   enable row level security;
alter table build_likes       enable row level security;
alter table build_ratings     enable row level security;
alter table build_bookmarks   enable row level security;
alter table build_view_events enable row level security;
alter table build_comments    enable row level security;
alter table comment_likes     enable row level security;
alter table follows           enable row level security;
alter table notifications     enable row level security;
alter table collections       enable row level security;
alter table collection_builds enable row level security;
alter table build_reports     enable row level security;
alter table build_tags        enable row level security;
alter table tags              enable row level security;
alter table slug_redirects    enable row level security;
alter table comment_reports   enable row level security;

-- Profiles: lectura pública
create policy "profiles public read" on profiles for select using (true);
create policy "profiles own write" on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Builds: público/unlisted visibles a todos; privado solo al dueño
create policy "builds read" on builds for select using (
  visibility in ('public', 'unlisted') or auth.uid() = user_id
);
-- Moderadores/admins leen cualquier build (para revisar reportes de builds ocultos)
create policy "builds mod read" on builds for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')));
create policy "builds insert" on builds for insert
  with check (auth.uid() = user_id and is_featured = false);
create policy "builds update" on builds for update
  using (auth.uid() = user_id)
  -- Aliased subquery on purpose: an unaliased `builds where id = builds.id`
  -- self-correlates to `id = id` (always true) and returns every row instead
  -- of the one being updated, raising "more than one row returned by a
  -- subquery" — this is what broke rating a build (sync_rating_stats()'s
  -- UPDATE on builds runs as the calling user, so this WITH CHECK applies).
  -- El dueño tampoco puede cambiar moderation_hidden ni volver público un build ocultado.
  with check (
    auth.uid() = user_id
    and is_featured = (select b.is_featured from builds b where b.id = builds.id)
    and moderation_hidden = (select b.moderation_hidden from builds b where b.id = builds.id)
    and (not moderation_hidden or visibility = 'private')
  );
create policy "builds delete" on builds for delete
  using (auth.uid() = user_id);

-- Tablas hijas de un build: read según visibilidad del build padre, write solo dueño
create policy "build_snapshots read" on build_snapshots for select using (
  exists (select 1 from builds where id = build_id
    and (visibility in ('public','unlisted') or auth.uid() = user_id))
);
create policy "build_snapshots write" on build_snapshots for all using (
  exists (select 1 from builds where id = build_id and auth.uid() = user_id)
);

create policy "build_tags read" on build_tags for select using (
  exists (select 1 from builds where id = build_id
    and (visibility in ('public','unlisted') or auth.uid() = user_id))
);
create policy "build_tags write" on build_tags for all using (
  exists (select 1 from builds where id = build_id and auth.uid() = user_id)
);

-- Social
create policy "likes read"       on build_likes     for select using (true);
create policy "likes write"      on build_likes     for all    using (auth.uid() = user_id);
create policy "ratings read"     on build_ratings   for select using (true);
create policy "ratings write"    on build_ratings   for all    using (auth.uid() = user_id);
create policy "bookmarks own"    on build_bookmarks for all    using (auth.uid() = user_id);
create policy "comments read"    on build_comments  for select using (true);
create policy "comments write"   on build_comments  for all    using (auth.uid() = user_id);
create policy "clikes write"     on comment_likes   for all    using (auth.uid() = user_id);
create policy "follows read"     on follows         for select using (true);
create policy "follows write"    on follows         for all    using (auth.uid() = follower_id);
create policy "notif own"        on notifications   for all    using (auth.uid() = user_id);
create policy "collections read" on collections     for select using (is_public or auth.uid() = user_id);
create policy "collections write" on collections    for all    using (auth.uid() = user_id);
create policy "col_builds read"  on collection_builds for select using (
  exists (select 1 from collections where id = collection_id and (is_public or auth.uid() = user_id))
);
-- Escritura: solo el dueño de la colección agrega/quita builds (M56)
create policy "col_builds write" on collection_builds for all
  using (exists (select 1 from collections where id = collection_id and auth.uid() = user_id))
  with check (exists (select 1 from collections where id = collection_id and auth.uid() = user_id));
-- Reports: insert para cualquier user autenticado; SELECT solo para moderadores/admins
create policy "reports insert" on build_reports for insert
  with check (auth.uid() = reporter_id);
create policy "reports admin read" on build_reports for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')));
create policy "reports admin update" on build_reports for update
  using (exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')));
create policy "creports insert" on comment_reports for insert
  with check (auth.uid() = reporter_id);
create policy "creports mod read" on comment_reports for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')));
create policy "creports mod update" on comment_reports for update
  using (exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')));

-- Tags: lectura pública; escritura solo moderadores/admins
create policy "tags read"       on tags for select using (true);
create policy "tags admin write" on tags for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')));

create policy "slugs read" on slug_redirects for select using (true);


-- ═══════════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════════
-- RLS policies above only decide which ROWS a role can touch — Postgres
-- still needs a plain GRANT before a role can attempt the operation on the
-- table at all. Supabase normally sets this up automatically for every new
-- table at project creation; broad here on purpose, RLS is the real gate
-- (e.g. authenticated gets table-wide UPDATE on build_reports, but the
-- "reports admin update" policy still blocks a non-admin's actual update).

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;


-- ═══════════════════════════════════════════════════════════════
-- FUNCIONES Y TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- ── updated_at automático ────────────────────────────────────────────
create function touch_updated_at()
returns trigger language plpgsql as $$
begin NEW.updated_at = now(); return NEW; end;
$$;
create trigger builds_updated_at      before update on builds         for each row execute procedure touch_updated_at();
create trigger profiles_updated_at    before update on profiles       for each row execute procedure touch_updated_at();
create trigger comments_updated_at    before update on build_comments for each row execute procedure touch_updated_at();
create trigger collections_updated_at before update on collections    for each row execute procedure touch_updated_at();
create trigger ratings_updated_at     before update on build_ratings  for each row execute procedure touch_updated_at();


-- ── Auto-crear profile al registrarse (con manejo de colisión de username) ──
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  requested_username text := new.raw_user_meta_data->>'username';
  base_username       text;
  candidate           text;
  suffix              int := 0;
begin
  if requested_username is not null and requested_username ~ '^[a-z0-9_-]{3,30}$' then
    base_username := requested_username;
  else
    base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_-]', '_', 'gi'));
    base_username := left(base_username, 25);
  end if;
  loop
    candidate := case when suffix = 0 then base_username else base_username || suffix::text end;
    exit when not exists (select 1 from public.profiles where username = candidate);
    suffix := suffix + 1;
  end loop;
  insert into public.profiles(id, username)
  values (new.id, candidate);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ── Proteger campos de sistema en profiles ───────────────────────────
create function protect_profile_system_fields()
returns trigger language plpgsql security definer as $$
begin
  if current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' then
    NEW.role            := OLD.role;
    NEW.followers_count := OLD.followers_count;
    NEW.following_count := OLD.following_count;
    NEW.builds_count    := OLD.builds_count;
  end if;
  return NEW;
end;
$$;
create trigger profile_system_fields_guard
  before update on profiles
  for each row execute procedure protect_profile_system_fields();

-- ── Slug redirect al renombrar ───────────────────────────────────────
create function handle_slug_change()
returns trigger language plpgsql as $$
begin
  if old.slug is not null and old.slug is distinct from new.slug then
    insert into slug_redirects(old_slug, build_id)
    values (old.slug, new.id)
    on conflict (old_slug) do nothing;
  end if;
  return new;
end;
$$;
create trigger on_build_slug_change
  before update of slug on builds
  for each row when (old.slug is distinct from new.slug)
  execute procedure handle_slug_change();


-- ── Likes ────────────────────────────────────────────────────────────
-- security definer on every sync_* below (except sync_builds_count, which
-- only ever updates the actor's own profile) — these UPDATE builds/profiles/
-- build_comments rows that belong to someone OTHER than the acting user
-- (liking/rating/commenting on someone else's build), and those tables'
-- owner-only UPDATE policies would otherwise silently block the counter
-- update (0 rows matched by RLS, no error) whenever the actor isn't the
-- row's owner — exactly what made comment_count/like_count/avg_rating never
-- move for anyone except the build's own owner testing on themselves.
create or replace function sync_like_count() returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update builds set like_count = like_count + 1 where id = NEW.build_id;
  else
    update builds set like_count = like_count - 1 where id = OLD.build_id;
  end if;
  return null;
end; $$;
create trigger on_like after insert or delete on build_likes for each row execute procedure sync_like_count();


-- ── Ratings ──────────────────────────────────────────────────────────
create or replace function sync_rating_stats() returns trigger language plpgsql security definer as $$
declare bid uuid := coalesce(NEW.build_id, OLD.build_id);
begin
  update builds set
    avg_rating   = (select coalesce(avg(rating), 0) from build_ratings where build_id = bid),
    rating_count = (select count(*) from build_ratings where build_id = bid)
  where id = bid;
  return null;
end; $$;
create trigger on_rating after insert or update or delete on build_ratings for each row execute procedure sync_rating_stats();


-- ── Bookmarks ────────────────────────────────────────────────────────
create or replace function sync_bookmark_count() returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update builds set bookmark_count = bookmark_count + 1 where id = NEW.build_id;
  else
    update builds set bookmark_count = bookmark_count - 1 where id = OLD.build_id;
  end if;
  return null;
end; $$;
create trigger on_bookmark after insert or delete on build_bookmarks for each row execute procedure sync_bookmark_count();


-- ── Comments ─────────────────────────────────────────────────────────
create or replace function sync_comment_count() returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update builds set comment_count = comment_count + 1 where id = NEW.build_id;
  else
    update builds set comment_count = comment_count - 1 where id = OLD.build_id;
  end if;
  return null;
end; $$;
create trigger on_comment after insert or delete on build_comments for each row execute procedure sync_comment_count();


-- ── Comment likes ─────────────────────────────────────────────────────
create or replace function sync_comment_like_count() returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update build_comments set like_count = like_count + 1 where id = NEW.comment_id;
  else
    update build_comments set like_count = like_count - 1 where id = OLD.comment_id;
  end if;
  return null;
end; $$;
create trigger on_comment_like after insert or delete on comment_likes for each row execute procedure sync_comment_like_count();


-- ── Follows ──────────────────────────────────────────────────────────
create or replace function sync_follow_counts() returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set following_count = following_count + 1 where id = NEW.follower_id;
    update profiles set followers_count = followers_count + 1 where id = NEW.following_id;
  else
    update profiles set following_count = following_count - 1 where id = OLD.follower_id;
    update profiles set followers_count = followers_count - 1 where id = OLD.following_id;
  end if;
  return null;
end; $$;
create trigger on_follow after insert or delete on follows for each row execute procedure sync_follow_counts();


-- ── Builds count en profile ───────────────────────────────────────────
create function sync_builds_count() returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set builds_count = builds_count + 1 where id = NEW.user_id;
  else
    update profiles set builds_count = builds_count - 1 where id = OLD.user_id;
  end if;
  return null;
end; $$;
create trigger on_build after insert or delete on builds for each row execute procedure sync_builds_count();


-- ── Membresía / tiers (Fase 1 — Base segura, docs/MEMBERSHIP_DESIGN.md §7/§10) ──
-- Dos tablas separadas a propósito: un aporte único (Aportador) no tiene
-- estado, periodo ni intervalo, así que mezclarlo con la suscripción
-- recurrente obligaría a rellenar campos que no le aplican. profiles.role
-- no se toca: sigue siendo solo permisos, nunca plan de pago.
--
-- Sin fila en `memberships` = tier 'free' (no se crea una fila por usuario
-- al registrarse; solo existe una vez que hay una suscripción real). El
-- navegador nunca decide el tier: solo el backend, después de verificar al
-- proveedor — por eso no hay policy de insert/update/delete para
-- authenticated más abajo, solo lectura de la fila propia; escribir
-- requiere la service_role key del webhook.
create type membership_tier   as enum ('free', 'apprentice', 'artisan', 'forger', 'master');
create type membership_status as enum ('active', 'past_due', 'canceled');

create table memberships (
  user_id                   uuid primary key references profiles(id) on delete cascade,
  tier                      membership_tier   not null default 'free',
  status                    membership_status not null default 'active',
  provider                  text,
  provider_customer_id      text,
  provider_subscription_id  text,
  -- 'month/1', 'month/3' o 'year/1' (§4 "Periodicidad y ahorro") — texto y no
  -- enum porque todavía no hay proveedor elegido (§9) para fijar el formato final
  billing_interval          text check (billing_interval in ('month/1', 'month/3', 'year/1')),
  current_period_end        timestamptz,
  cancel_at_period_end      boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
grant all on public.memberships to service_role;

-- Ledger de periodos pagados (racha e hitos de §4 "Racha de apoyo" se
-- calculan contando meses cubiertos aquí, no número de transacciones).
-- unique(provider, provider_payment_id): el mismo evento de webhook
-- reenviado no duplica el periodo.
create table membership_periods (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references profiles(id) on delete cascade,
  tier                 membership_tier not null,
  billing_interval     text not null check (billing_interval in ('month/1', 'month/3', 'year/1')),
  period_start         timestamptz not null,
  period_end           timestamptz not null,
  amount               numeric(10,2) not null check (amount >= 0),
  currency             text not null,
  provider             text not null,
  provider_payment_id  text not null,
  created_at           timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
grant all on public.membership_periods to service_role;

-- Aportador (aporte único, §4/§7): sin estado, sin periodo, sin vencimiento.
-- Tabla separada de memberships a propósito (ver comentario arriba).
create table supporter_contributions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references profiles(id) on delete cascade,
  amount               numeric(10,2) not null check (amount >= 1),
  currency             text not null,
  provider             text not null,
  provider_payment_id  text not null,
  created_at           timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
grant all on public.supporter_contributions to service_role;

alter table memberships              enable row level security;
alter table membership_periods       enable row level security;
alter table supporter_contributions  enable row level security;

create index idx_membership_periods_user on membership_periods(user_id, period_start desc);
create index idx_supporter_contributions_user on supporter_contributions(user_id);

create policy "memberships read own" on memberships for select using (auth.uid() = user_id);
create policy "membership_periods read own" on membership_periods for select using (auth.uid() = user_id);
create policy "supporter_contributions read own" on supporter_contributions for select using (auth.uid() = user_id);

-- These 3 tables are created after the blanket "grant ... to authenticated"
-- near the top of this file, so that grant doesn't cover them (GRANT ON ALL
-- TABLES only affects tables that already exist when it runs) — grant
-- select explicitly instead of insert/update/delete too: the RLS policies
-- above only cover select, so there's no write grant for authenticated to
-- piggyback on even if a future policy mistake tried to allow it. Writes
-- only ever happen via the webhook's service_role key, which Supabase
-- grants full access to automatically at the platform level.
grant select on memberships, membership_periods, supporter_contributions to authenticated;

-- Entitlements centralizados (§7, §4 "Propuesta de niveles"): único lugar
-- que conoce las cuotas por tier, para que UI y Supabase lean el mismo
-- resultado. Cuotas sin validar todavía (§4: "son una hipótesis") —
-- check_build_limit() abajo ya las usa igual, porque sin ninguna fila en
-- memberships (nadie se suscribió todavía) todo resuelve a 'free' = 50,
-- el mismo límite de hoy para toda cuenta existente.
create function build_limit_for_tier(p_tier membership_tier) returns int
language sql immutable as $$
  select case p_tier
    when 'artisan' then 100
    when 'forger'  then 250
    when 'master'  then 1000
    else 50 -- free y apprentice
  end;
$$;

create function featured_build_limit_for_tier(p_tier membership_tier) returns int
language sql immutable as $$
  select case p_tier
    when 'artisan' then 2
    when 'forger'  then 3
    when 'master'  then 5
    else 1 -- free y apprentice
  end;
$$;

-- "memberships read own" above deliberately blocks reading anyone else's
-- row (it holds billing fields like provider_customer_id, and RLS is
-- row-level, not column-level, so there's no safe way to let other users'
-- selects through at the table level). A public profile still needs to show
-- someone else's tier badge, so expose only that one column through a
-- security definer function — same shape as get_total_builds_count below.
create function get_public_membership_tier(p_user_id uuid) returns membership_tier
language sql security definer stable as $$
  -- coalesce wraps the whole subquery, not the column: zero rows (no
  -- membership) makes the inner select itself NULL, which bare
  -- `coalesce(tier, 'free')` inside a 0-row query would never reach.
  select coalesce((select tier from memberships where user_id = p_user_id), 'free');
$$;
grant execute on function get_public_membership_tier(uuid) to anon, authenticated;


-- ── Límite de builds por cuenta (por tier, 50 para free/apprentice) ─────
-- before insert (not after) so it blocks the row that would be the 51st —
-- profiles.builds_count is already trigger-synced (sync_builds_count above)
-- and counts every build regardless of visibility. Lock the profile row so
-- simultaneous inserts cannot both pass against the same stale count. No
-- memberships row = 'free' = 50, same as every account today.
create function check_build_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_build_count integer;
  v_build_limit integer;
begin
  perform p.id
  from public.profiles p
  where p.id = new.user_id
  for update;

  if exists (
    select 1
    from public.custom_rank_assignments a
    join public.custom_rank_definitions d on d.id = a.rank_id and d.is_active
    join public.custom_rank_benefits b on b.rank_id = d.id
      and b.benefit_key = 'build_limit' and b.benefit_value = 'unlimited'
    where a.user_id = new.user_id
      and a.starts_at <= now()
      and (a.expires_at is null or a.expires_at > now())
      and (a.revoked_at is null or a.revoked_at > now())
  ) then
    return new;
  end if;

  select coalesce(p.builds_count, 0), greatest(
    public.build_limit_for_tier(coalesce(m.tier, 'free')),
    coalesce((
      select max(b.benefit_value::integer)
      from public.custom_rank_assignments a
      join public.custom_rank_definitions d on d.id = a.rank_id and d.is_active
      join public.custom_rank_benefits b on b.rank_id = d.id and b.benefit_key = 'build_limit'
      where a.user_id = new.user_id
        and a.starts_at <= now()
        and (a.expires_at is null or a.expires_at > now())
        and (a.revoked_at is null or a.revoked_at > now())
    ), 0)
  )
  into v_build_count, v_build_limit
  from public.profiles p
  left join public.memberships m on m.user_id = p.id
  where p.id = new.user_id;

  if v_build_count >= v_build_limit then
    raise exception 'BUILD_LIMIT_REACHED';
  end if;
  return new;
end; $$;
create trigger before_build_insert before insert on builds for each row execute procedure check_build_limit();
revoke all on function public.check_build_limit() from public, anon, authenticated;


-- ── Total de builds del sitio (público+privado) para analytics públicas ─
-- security definer: builds' own RLS only lets a user see public builds +
-- their own, so a plain client-side count(*) would undercount everything
-- else. This function only ever returns a number, never row content, so
-- bypassing RLS here doesn't leak anything.
create function get_total_builds_count() returns bigint language sql security definer stable as $$
  select count(*) from builds;
$$;
grant execute on function get_total_builds_count() to anon, authenticated;


-- ── La Forjadora: registro de usos ──────────────────────────────────
-- Una fila por cada vez que se enciende la forja (start_forge_run). Si llega
-- a "Piezas forjadas", la misma fila se marca terminada (finish_forge_run);
-- las apagadas a mitad quedan con finished = false. Sin IP ni datos del
-- encargo: solo el usuario si tenía sesión y un resumen para estadísticas
-- (intensidad, runas, cuántos mínimos, si se cumplieron, duración). RLS sin
-- políticas: nadie lee ni escribe la tabla directo, solo a través de las
-- funciones security definer de abajo.
create table forge_runs (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  user_id       uuid,
  intensity     text not null check (intensity in ('quick', 'standard', 'master', 'eternal')),
  transcendence boolean not null,
  requirements  smallint not null check (requirements between 0 and 100),
  finished      boolean not null default false,
  all_met       boolean,
  seconds       integer check (seconds between 0 and 86400)
);
grant select, insert, update, delete on public.forge_runs to anon, authenticated, service_role;
alter table forge_runs enable row level security;
create index forge_runs_created_at_idx on forge_runs (created_at);
create index forge_runs_user_idx on forge_runs (user_id, created_at);

create function start_forge_run(p_intensity text, p_transcendence boolean, p_requirements int)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  -- Antispam simple: con sesión, como mucho un encendido cada 3 s por usuario.
  if auth.uid() is not null and exists (
    select 1 from forge_runs where user_id = auth.uid() and created_at > now() - interval '3 seconds'
  ) then
    return null;
  end if;
  insert into forge_runs (user_id, intensity, transcendence, requirements)
  values (auth.uid(), p_intensity, p_transcendence, least(greatest(p_requirements, 0), 100))
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function start_forge_run(text, boolean, int) to anon, authenticated;

create function finish_forge_run(p_id bigint, p_all_met boolean, p_seconds int)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Solo la misma sesión que la encendió, una sola vez y dentro del día.
  update forge_runs
     set finished = true, all_met = p_all_met, seconds = least(greatest(p_seconds, 0), 86400)
   where id = p_id and not finished
     and user_id is not distinct from auth.uid()
     and created_at > now() - interval '1 day';
end; $$;
grant execute on function finish_forge_run(bigint, boolean, int) to anon, authenticated;


-- ── Stats de comunidad para la barra de Explorar: usuarios, builds, builds
-- públicas, vistas totales, builds de esta semana, likes, en un solo round
-- trip. profiles ya es público (RLS "for select using (true)"), pero builds'
-- RLS solo deja ver las públicas + las propias del caller, así que el
-- conteo total y la suma de vistas siguen necesitando security definer
-- (misma razón que get_total_builds_count arriba). Solo devuelve números,
-- nunca contenido de filas, así que saltarse RLS acá no filtra nada.
create function get_community_stats()
returns table(
  users_count          bigint,
  builds_count         bigint,
  public_builds_count  bigint,
  likes_count          bigint,
  views_count          bigint,
  builds_this_week     bigint,
  forge_runs_count     bigint,
  forge_finished_count bigint
)
language sql security definer stable as $$
  select
    (select count(*) from profiles),
    (select count(*) from builds),
    (select count(*) from builds where visibility = 'public'),
    (select count(*) from build_likes),
    (select coalesce(sum(view_count), 0) from builds),
    (select count(*) from builds where created_at >= now() - interval '7 days'),
    (select count(*) from forge_runs),
    (select count(*) from forge_runs where finished);
$$;
grant execute on function get_community_stats() to anon, authenticated;


-- ── View deduplicado (RPC llamada desde la app) ──────────────────────
create function record_view(p_build_id uuid, p_user_id uuid, p_ip_hash text)
returns void language plpgsql security definer as $$
begin
  if not exists (
    select 1 from build_view_events
    where build_id = p_build_id
      and (user_id = p_user_id or ip_hash = p_ip_hash)
      and viewed_at > now() - interval '1 hour'
  ) then
    insert into build_view_events(build_id, user_id, ip_hash)
    values (p_build_id, p_user_id, p_ip_hash);
    update builds set view_count = view_count + 1 where id = p_build_id;
  end if;
end; $$;


-- ── Slug auto-generado ────────────────────────────────────────────────
create function generate_slug(p_name text)
returns text language plpgsql as $$
declare
  base      text;
  candidate text;
  suffix    int := 0;
begin
  base := lower(regexp_replace(trim(p_name), '[^a-z0-9]+', '-', 'gi'));
  base := trim(both '-' from base);
  base := left(base, 50);
  loop
    candidate := case when suffix = 0 then base else base || '-' || suffix end;
    exit when not exists (select 1 from builds where slug = candidate)
           and not exists (select 1 from slug_redirects where old_slug = candidate);
    suffix := suffix + 1;
  end loop;
  return candidate;
end; $$;


-- ═══════════════════════════════════════════════════════════════
-- TAGS SEMILLA
-- ═══════════════════════════════════════════════════════════════

insert into tags (name, category) values
  -- Playstyle
  ('pvp',       'playstyle'),
  ('pvm',       'playstyle'),
  ('xp',        'playstyle'),
  ('kolo',      'playstyle'),
  ('treasure',  'playstyle'),
  ('boss',      'playstyle'),
  ('dofus',     'playstyle'),
  -- Elemento
  ('air',       'element'),
  ('fire',      'element'),
  ('earth',     'element'),
  ('water',     'element'),
  ('neutral',   'element'),
  ('omni',      'element'),
  -- General
  ('critical',  'general'),
  ('wisdom',    'general'),
  ('budget',    'general'),
  ('endgame',   'general'),
  ('meta',      'general'),
  ('fun',       'general'),
  ('leveling',  'general');



-- CUSTOM RANKS
create table if not exists public.custom_rank_definitions (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  name         text not null check (char_length(btrim(name)) between 1 and 40),
  description  text not null default '' check (char_length(description) <= 180),
  icon         text not null check (icon in (
    'alarm_clock', 'anvil', 'aperture', 'award', 'axe', 'badge', 'badge_alert',
    'badge_cent', 'badge_check', 'badge_plus', 'bell', 'bird', 'blocks', 'book_marked',
    'book_open', 'bot', 'briefcase', 'brush', 'bug', 'building', 'cable', 'camera',
    'candy', 'castle', 'cat', 'chart', 'chess_king', 'circle_dollar', 'circle_gauge',
    'circle_star', 'clapperboard', 'cloud_lightning', 'cloud_moon', 'cloud_sun',
    'cloud_sun_rain', 'club', 'clover', 'code', 'coffee', 'cog', 'coins', 'command',
    'compass', 'cpu', 'crosshair', 'crown', 'cylinder', 'dna', 'door', 'egg', 'eye',
    'factory', 'feather', 'file_badge', 'fingerprint', 'flag', 'flame', 'flame_kindling',
    'flask', 'flask_round', 'flower', 'footprints', 'gamepad', 'gem', 'ghost', 'gift',
    'glasses', 'globe', 'graduation_cap', 'guitar', 'hammer', 'hand_coins', 'handshake',
    'headphones', 'headset', 'heart', 'heart_handshake', 'heart_pulse', 'house',
    'infinity', 'joystick', 'key', 'keyboard', 'landmark', 'lamp', 'lamp_desk', 'leaf',
    'lightbulb', 'medal', 'microscope', 'moon', 'moon_star', 'mountain', 'mountain_snow',
    'music', 'network', 'orbit', 'palette', 'panel_top', 'paw', 'piggy_bank', 'pickaxe',
    'puzzle', 'rabbit', 'radio', 'rocket', 'satellite', 'scissors', 'scroll', 'shield',
    'shield_check', 'shield_ellipsis', 'ship', 'shopping_bag', 'shovel', 'skull',
    'snowflake', 'sparkle', 'sparkles', 'sprout', 'squirrel', 'star', 'sun', 'sword',
    'swords', 'target', 'telescope', 'tent_tree', 'ticket', 'tree', 'trophy', 'turtle',
    'umbrella', 'users', 'wand', 'waves', 'wind', 'wine', 'wrench', 'zap'
  )),
  color        text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_public    boolean not null default true,
  is_active    boolean not null default true,
  sort_order   smallint not null default 100 check (sort_order between 0 and 999),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
grant all on public.custom_rank_definitions to service_role;

create table if not exists public.custom_rank_benefits (
  rank_id       uuid not null references public.custom_rank_definitions(id) on delete cascade,
  benefit_key   text not null,
  benefit_value text not null,
  created_at    timestamptz not null default now(),
  primary key (rank_id, benefit_key),
  constraint custom_rank_benefits_catalog_check check (
    (benefit_key = 'profile_badge_style' and benefit_value in (
      'standard', 'founder', 'creator', 'royal', 'neon', 'crystal', 'holographic',
      'obsidian', 'minimal', 'arcane', 'vintage', 'champion', 'celestial', 'infernal',
      'emerald', 'sapphire', 'ruby', 'bronze', 'silver', 'platinum', 'carbon', 'aurora',
      'cosmic', 'toxic', 'gold_foil', 'royal_seal', 'blue_steel', 'copper', 'pearl',
      'marble', 'enamel', 'runic', 'dragonfire', 'frost', 'storm', 'oceanic', 'forest',
      'desert', 'sakura', 'twilight', 'bloodmoon', 'prismatic', 'glitch', 'matrix',
      'velvet', 'champagne', 'coral', 'lavender', 'moss', 'ancient', 'relic', 'crimson',
      'amethyst', 'opal', 'rose_gold', 'black_tie', 'obsidian_gold', 'sapphire_glass',
      'ruby_facet', 'emerald_facet', 'ice_crystal', 'solar_flare', 'nebula', 'void',
      'thunder', 'emberglow', 'soulfire', 'deep_space', 'royal_purple', 'monsoon',
      'bamboo', 'leatherbound', 'silk', 'porcelain', 'steel_engraved', 'constellation'
    ))
    or (benefit_key = 'build_limit' and (
      benefit_value ~ '^[1-9][0-9]{0,4}$' or benefit_value = '100000' or benefit_value = 'unlimited'
    ))
  )
);
grant all on public.custom_rank_benefits to service_role;

create table if not exists public.custom_rank_assignments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  rank_id       uuid not null references public.custom_rank_definitions(id) on delete restrict,
  assigned_by   uuid references public.profiles(id) on delete set null,
  starts_at     timestamptz not null default now(),
  expires_at    timestamptz,
  revoked_at    timestamptz,
  revoked_by    uuid references public.profiles(id) on delete set null,
  internal_note text not null default '' check (char_length(internal_note) <= 500),
  created_at    timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at)
);
grant all on public.custom_rank_assignments to service_role;

create index if not exists custom_rank_definitions_active_order_idx
  on public.custom_rank_definitions (is_active, sort_order, name);
create index if not exists custom_rank_assignments_user_history_idx
  on public.custom_rank_assignments (user_id, created_at desc);
create index if not exists custom_rank_assignments_current_idx
  on public.custom_rank_assignments (user_id, starts_at, expires_at)
  where revoked_at is null;
create unique index if not exists custom_rank_one_open_assignment_per_user_idx
  on public.custom_rank_assignments (user_id)
  where revoked_at is null;

alter table public.custom_rank_definitions enable row level security;
alter table public.custom_rank_benefits enable row level security;
alter table public.custom_rank_assignments enable row level security;

drop policy if exists "custom ranks admin read" on public.custom_rank_definitions;
create policy "custom ranks admin read" on public.custom_rank_definitions
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
drop policy if exists "custom ranks admin insert" on public.custom_rank_definitions;
create policy "custom ranks admin insert" on public.custom_rank_definitions
  for insert to authenticated with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
drop policy if exists "custom ranks admin update" on public.custom_rank_definitions;
create policy "custom ranks admin update" on public.custom_rank_definitions
  for update to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "custom rank benefits admin read" on public.custom_rank_benefits;
create policy "custom rank benefits admin read" on public.custom_rank_benefits
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
drop policy if exists "custom rank benefits admin insert" on public.custom_rank_benefits;
create policy "custom rank benefits admin insert" on public.custom_rank_benefits
  for insert to authenticated with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
drop policy if exists "custom rank benefits admin update" on public.custom_rank_benefits;
create policy "custom rank benefits admin update" on public.custom_rank_benefits
  for update to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
drop policy if exists "custom rank benefits admin delete" on public.custom_rank_benefits;
create policy "custom rank benefits admin delete" on public.custom_rank_benefits
  for delete to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "custom rank assignments admin read" on public.custom_rank_assignments;
create policy "custom rank assignments admin read" on public.custom_rank_assignments
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

grant select, insert, update on public.custom_rank_definitions to authenticated;
grant select, insert, update, delete on public.custom_rank_benefits to authenticated;
grant select on public.custom_rank_assignments to authenticated;
revoke all on public.custom_rank_definitions, public.custom_rank_benefits, public.custom_rank_assignments from anon;

create or replace function public.get_public_custom_rank(p_user_id uuid)
returns table (
  rank_name text,
  rank_description text,
  rank_icon text,
  rank_color text,
  badge_style text
)
language sql
security definer
stable
set search_path = public
as $$
  select d.name, d.description, d.icon, d.color, coalesce(b.benefit_value, 'standard')
  from public.custom_rank_assignments a
  join public.custom_rank_definitions d on d.id = a.rank_id
  left join public.custom_rank_benefits b
    on b.rank_id = d.id and b.benefit_key = 'profile_badge_style'
  where a.user_id = p_user_id
    and a.starts_at <= now()
    and (a.expires_at is null or a.expires_at > now())
    and (a.revoked_at is null or a.revoked_at > now())
    and d.is_active
    and d.is_public
  order by a.starts_at desc, d.sort_order, d.created_at
  limit 1;
$$;
revoke all on function public.get_public_custom_rank(uuid) from public;
grant execute on function public.get_public_custom_rank(uuid) to anon, authenticated;

create or replace function public.admin_assign_custom_rank(
  p_user_id uuid,
  p_rank_id uuid,
  p_starts_at timestamptz,
  p_expires_at timestamptz,
  p_internal_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
  v_starts_at timestamptz := coalesce(p_starts_at, now());
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.custom_rank_definitions d where d.id = p_rank_id and d.is_active) then
    raise exception 'rank_not_active' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= v_starts_at then
    raise exception 'expiry_must_follow_start' using errcode = '22023';
  end if;
  if char_length(coalesce(p_internal_note, '')) > 500 then
    raise exception 'note_too_long' using errcode = '22023';
  end if;

  -- Close the previous assignment at the scheduled start, keeping history intact.
  update public.custom_rank_assignments
     set revoked_at = least(coalesce(expires_at, v_starts_at), v_starts_at),
         revoked_by = auth.uid()
   where user_id = p_user_id and revoked_at is null;

  insert into public.custom_rank_assignments
    (user_id, rank_id, assigned_by, starts_at, expires_at, internal_note)
  values
    (p_user_id, p_rank_id, auth.uid(), v_starts_at, p_expires_at, btrim(coalesce(p_internal_note, '')))
  returning id into v_assignment_id;

  return v_assignment_id;
end;
$$;
revoke all on function public.admin_assign_custom_rank(uuid, uuid, timestamptz, timestamptz, text) from public;
grant execute on function public.admin_assign_custom_rank(uuid, uuid, timestamptz, timestamptz, text) to authenticated;

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
   where id = p_assignment_id and revoked_at is null;
end;
$$;
revoke all on function public.admin_revoke_custom_rank(uuid) from public;
grant execute on function public.admin_revoke_custom_rank(uuid) to authenticated;

commit;

-- ── Moderación (M58) ─────────────────────────────────────────────────
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

-- ── Notificaciones (M57) ─────────────────────────────────────────────
-- Las crean triggers security definer (la RLS de notifications solo deja al
-- dueño leer/escribir las suyas). Nunca se avisa de acciones propias, y el
-- mismo aviso (tipo + autor + build/comentario) no se repite en 24 h, así
-- dar y quitar like varias veces no llena la campanita.
create or replace function push_notification(p_user uuid, p_type notification_type, p_actor uuid, p_build uuid, p_comment uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_actor is null or p_user = p_actor then return; end if;
  if exists (
    select 1 from notifications
    where user_id = p_user and type = p_type and actor_id = p_actor
      and build_id is not distinct from p_build and comment_id is not distinct from p_comment
      and created_at > now() - interval '1 day'
  ) then return; end if;
  insert into notifications (user_id, type, actor_id, build_id, comment_id)
  values (p_user, p_type, p_actor, p_build, p_comment);
end; $$;
revoke all on function push_notification(uuid, notification_type, uuid, uuid, uuid) from public, anon, authenticated;

create or replace function notify_build_like() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform push_notification((select user_id from builds where id = NEW.build_id), 'build_liked', NEW.user_id, NEW.build_id, null);
  return null;
end; $$;
drop trigger if exists notify_on_build_like on build_likes;
create trigger notify_on_build_like after insert on build_likes for each row execute procedure notify_build_like();

create or replace function notify_build_comment() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform push_notification((select user_id from builds where id = NEW.build_id), 'build_commented', NEW.user_id, NEW.build_id, NEW.id);
  return null;
end; $$;
drop trigger if exists notify_on_build_comment on build_comments;
create trigger notify_on_build_comment after insert on build_comments for each row execute procedure notify_build_comment();

create or replace function notify_build_rating() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform push_notification((select user_id from builds where id = NEW.build_id), 'build_rated', NEW.user_id, NEW.build_id, null);
  return null;
end; $$;
drop trigger if exists notify_on_build_rating on build_ratings;
create trigger notify_on_build_rating after insert on build_ratings for each row execute procedure notify_build_rating();

-- Remix: avisa al autor del original, con link al remix (solo si no es privado)
create or replace function notify_build_fork() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.fork_of is not null and NEW.visibility <> 'private' then
    perform push_notification((select user_id from builds where id = NEW.fork_of), 'build_forked', NEW.user_id, NEW.id, null);
  end if;
  return null;
end; $$;
drop trigger if exists notify_on_build_fork on builds;
create trigger notify_on_build_fork after insert on builds for each row execute procedure notify_build_fork();

create or replace function notify_comment_like() returns trigger language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select user_id, build_id into c from build_comments where id = NEW.comment_id;
  perform push_notification(c.user_id, 'comment_liked', NEW.user_id, c.build_id, NEW.comment_id);
  return null;
end; $$;
drop trigger if exists notify_on_comment_like on comment_likes;
create trigger notify_on_comment_like after insert on comment_likes for each row execute procedure notify_comment_like();

create or replace function notify_follow() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform push_notification(NEW.following_id, 'new_follower', NEW.follower_id, null, null);
  return null;
end; $$;
drop trigger if exists notify_on_follow on follows;
create trigger notify_on_follow after insert on follows for each row execute procedure notify_follow();

-- ── Notificaciones en vivo (0.3.123, antes Postgres Changes en 0.3.112) ──
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

-- ── Integridad y permisos (0.3.113) ───────────────────────────────────

-- 1. Profile counters (followers / following / builds) were frozen: the guard
--    that stops users from editing their own counters also reverted the
--    counter triggers, since inside a trigger the JWT role is still
--    'authenticated'. It now only applies to direct API writes (roles anon /
--    authenticated, not from another trigger); the counter triggers, the
--    service role and the SQL editor (the resync below) pass. Security
--    invoker on purpose, so current_user is the caller's role.
create or replace function protect_profile_system_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if pg_trigger_depth() <= 1 and current_user in ('anon', 'authenticated') then
    NEW.role            := OLD.role;
    NEW.followers_count := OLD.followers_count;
    NEW.following_count := OLD.following_count;
    NEW.builds_count    := OLD.builds_count;
  end if;
  return NEW;
end;
$$;

-- Resync the frozen counters.
update profiles p set
  followers_count = s.followers, following_count = s.following, builds_count = s.builds
from (
  select pr.id,
    (select count(*) from follows f where f.following_id = pr.id) as followers,
    (select count(*) from follows f where f.follower_id  = pr.id) as following,
    (select count(*) from builds b  where b.user_id      = pr.id) as builds
  from profiles pr
) s
where s.id = p.id
  and (p.followers_count, p.following_count, p.builds_count) is distinct from (s.followers, s.following, s.builds);

-- 2. Build owners could write their own counters (like_count, avg_rating,
--    view_count…) with a direct PATCH/INSERT. Only the editable columns stay
--    writable; counters are reset on insert. The counter triggers are
--    security definer, so they keep working.
revoke update on builds from authenticated;
grant update (name, description, slug, game_version, class_slug, gender, level, visibility, snapshot) on builds to authenticated;

create or replace function reset_build_counters()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  NEW.like_count        := 0;
  NEW.bookmark_count    := 0;
  NEW.comment_count     := 0;
  NEW.view_count        := 0;
  NEW.avg_rating        := 0;
  NEW.rating_count      := 0;
  NEW.moderation_hidden := false;
  return NEW;
end;
$$;
drop trigger if exists before_build_insert_counters on builds;
create trigger before_build_insert_counters before insert on builds for each row execute procedure reset_build_counters();

-- 3. Like / bookmark / follow / comment-like rows could be UPDATEd (moving a
--    like to another build), which the INSERT/DELETE counter triggers don't
--    see. Those rows are insert/delete only; a rating can only change its value.
revoke update on build_likes, build_bookmarks, follows, comment_likes from authenticated;
revoke update on build_ratings from authenticated;
grant update (rating) on build_ratings to authenticated;

-- 4. Comments: authors could un-hide a moderated comment or edit like_count
--    (the app never edits comments), and hidden comments plus comments on
--    private builds were readable through the API.
revoke update on build_comments from authenticated;
drop policy if exists "comments read" on build_comments;
create policy "comments read" on build_comments for select using (
  deleted_at is null
  and exists (select 1 from builds b where b.id = build_id
              and (b.visibility in ('public', 'unlisted') or b.user_id = auth.uid()))
);
drop policy if exists "comments mod read" on build_comments;
create policy "comments mod read" on build_comments for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')));

-- Resync build counters that the update paths above could have skewed.
update builds b set
  like_count = s.likes, bookmark_count = s.bookmarks, comment_count = s.comments,
  rating_count = s.ratings, avg_rating = s.avg
from (
  select bb.id,
    (select count(*) from build_likes     l where l.build_id = bb.id) as likes,
    (select count(*) from build_bookmarks k where k.build_id = bb.id) as bookmarks,
    (select count(*) from build_comments  c where c.build_id = bb.id and c.deleted_at is null) as comments,
    (select count(*) from build_ratings   r where r.build_id = bb.id) as ratings,
    coalesce((select round(avg(r.rating)::numeric, 2) from build_ratings r where r.build_id = bb.id), 0) as avg
  from builds bb
) s
where s.id = b.id
  and (b.like_count, b.bookmark_count, b.comment_count, b.rating_count, b.avg_rating)
      is distinct from (s.likes, s.bookmarks, s.comments, s.ratings, s.avg);

-- 5. generate_slug ran as the caller, so RLS hid other users' private slugs
--    and publishing could collide with one (unique violation).
alter function generate_slug(text) security definer;
alter function generate_slug(text) set search_path = public;

-- 6. record_view trusted the user id sent by the client and counted views
--    of builds the caller can't see.
create or replace function record_view(p_build_id uuid, p_user_id uuid, p_ip_hash text)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if not exists (select 1 from builds where id = p_build_id
                 and (visibility in ('public', 'unlisted') or user_id = v_user)) then
    return;
  end if;
  if not exists (
    select 1 from build_view_events
    where build_id = p_build_id
      and (user_id = v_user or ip_hash = p_ip_hash)
      and viewed_at > now() - interval '1 hour'
  ) then
    insert into build_view_events(build_id, user_id, ip_hash)
    values (p_build_id, v_user, p_ip_hash);
    update builds set view_count = view_count + 1 where id = p_build_id;
  end if;
end; $$;

-- 7. security definer functions must pin search_path (Supabase linter:
--    function_search_path_mutable).
alter function handle_new_user()               set search_path = public;
alter function sync_like_count()               set search_path = public;
alter function sync_rating_stats()             set search_path = public;
alter function sync_bookmark_count()           set search_path = public;
alter function sync_comment_count()            set search_path = public;
alter function sync_comment_like_count()       set search_path = public;
alter function sync_follow_counts()            set search_path = public;
alter function get_public_membership_tier(uuid) set search_path = public;
alter function get_total_builds_count()        set search_path = public;
alter function get_community_stats()           set search_path = public;


-- 0.3.114 — updating a build failed with 42P17 "infinite recursion detected
-- in policy for relation builds" (every owner update since 0.3.112).
-- Idempotent: safe to run more than once.

-- Postgres refuses a policy on `builds` whose subquery reads `builds` when
-- the policies applied to that inner read have a subquery of their own. The
-- "builds update" WITH CHECK read `builds b`, and since 0.3.112 the SELECT
-- policy "builds mod read" has an EXISTS on profiles, so every UPDATE failed.
--
-- auth.uid() and is_moderator() are wrapped in (select …) so Postgres runs
-- them once per query (an InitPlan) instead of once per row — Supabase's
-- RLS performance guidance. The wrapper reads no table, so it cannot recurse.

-- 1. Moderator check as a function, so no builds policy reads another table.
create or replace function is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('moderator', 'admin'));
$$;
grant execute on function is_moderator() to anon, authenticated;

drop policy if exists "builds read" on builds;
create policy "builds read" on builds for select
  using (visibility in ('public', 'unlisted') or (select auth.uid()) = user_id);

drop policy if exists "builds mod read" on builds;
create policy "builds mod read" on builds for select using ((select is_moderator()));

drop policy if exists "builds insert" on builds;
create policy "builds insert" on builds for insert
  with check ((select auth.uid()) = user_id and is_featured = false);

-- 2. The UPDATE policy no longer reads builds. is_featured and
--    moderation_hidden are outside the column-level UPDATE grant (0.3.113),
--    so owners can't change them anyway; a hidden build must stay private.
drop policy if exists "builds update" on builds;
create policy "builds update" on builds for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (not moderation_hidden or visibility = 'private'));

drop policy if exists "builds delete" on builds;
create policy "builds delete" on builds for delete
  using ((select auth.uid()) = user_id);

-- 3. Every failed update attempt archived a copy of the unchanged build in
--    build_snapshots (the app archived before updating; fixed in the app).
--    Drop those copies: keep the oldest of identical versions per build.
delete from build_snapshots s
using build_snapshots t
where s.build_id = t.build_id
  and s.snapshot = t.snapshot
  and s.label is not distinct from t.label
  and (s.created_at, s.id) > (t.created_at, t.id);


-- 0.3.114 — rating a build failed with "permission denied for table
-- build_ratings" since 0.3.113.
-- Idempotent: safe to run more than once.

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


-- 0.3.115 — unlisted builds by link only, moderation restore / feature,
-- remix notifications when a remix goes public.
-- Idempotent: safe to run more than once.

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

-- Sequences of serial / identity columns (tags.id, forge_runs.id): the API
-- roles need them for inserts, as the old default grants gave.
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- ── Rendimiento: updated_at, índices y RLS (0.3.123, M140) ───────────
-- Va al final a propósito: el bloque de RLS reescribe todas las políticas
-- ya creadas arriba.
-- 0.3.123 — performance pass (M140): content-only builds.updated_at, the
-- indexes the app's queries and FK cascades were missing, and RLS that
-- evaluates auth.uid() / is_moderator() / requested_build_id() once per
-- query instead of once per row. Idempotent.

-- 1. builds.updated_at moved on every view, like, rating and comment (the
--    counter triggers UPDATE builds), and the Worker uses it as the OG
--    image ?v= — so each view re-rendered the preview image and busted
--    Discord/WhatsApp caches. Only content changes count now.
create or replace function public.touch_build_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (NEW.name, NEW.description, NEW.slug, NEW.game_version, NEW.class_slug, NEW.gender, NEW.level, NEW.visibility, NEW.snapshot)
     is distinct from
     (OLD.name, OLD.description, OLD.slug, OLD.game_version, OLD.class_slug, OLD.gender, OLD.level, OLD.visibility, OLD.snapshot) then
    NEW.updated_at = now();
  end if;
  return NEW;
end; $$;
drop trigger if exists builds_updated_at on public.builds;
create trigger builds_updated_at before update on public.builds
  for each row execute procedure public.touch_build_updated_at();

-- 2. Explore sorts by <metric> desc, id asc. The "all classes" view had no
--    usable index (all four started with class_slug) and the class ones
--    lacked the id tie-breaker.
drop index if exists public.idx_builds_explore_rating;
drop index if exists public.idx_builds_explore_likes;
drop index if exists public.idx_builds_explore_recent;
drop index if exists public.idx_builds_explore_views;
create index if not exists idx_builds_public_rating on public.builds(avg_rating desc, id) where visibility = 'public';
create index if not exists idx_builds_public_likes  on public.builds(like_count desc, id) where visibility = 'public';
create index if not exists idx_builds_public_recent on public.builds(created_at desc, id) where visibility = 'public';
create index if not exists idx_builds_public_views  on public.builds(view_count desc, id) where visibility = 'public';
create index if not exists idx_builds_class_rating  on public.builds(class_slug, avg_rating desc, id) where visibility = 'public';
create index if not exists idx_builds_class_likes   on public.builds(class_slug, like_count desc, id) where visibility = 'public';
create index if not exists idx_builds_class_recent  on public.builds(class_slug, created_at desc, id) where visibility = 'public';
create index if not exists idx_builds_class_views   on public.builds(class_slug, view_count desc, id) where visibility = 'public';

-- My Builds orders by created_at; nothing orders builds by updated_at.
drop index if exists public.idx_builds_user;
create index if not exists idx_builds_user_created on public.builds(user_id, created_at desc);

-- 3. Lookups by build/comment/user that only had the (user_id, …) primary
--    key: history on every detail view, rating stats on every rating, the
--    profile comment count, a user's collections, and the FK columns that
--    ON DELETE CASCADE / SET NULL scan when a build, comment or profile goes.
create index if not exists idx_build_snapshots_build  on public.build_snapshots(build_id, created_at desc);
create index if not exists idx_build_ratings_build    on public.build_ratings(build_id);
create index if not exists idx_build_likes_build      on public.build_likes(build_id);
create index if not exists idx_build_bookmarks_build  on public.build_bookmarks(build_id);
create index if not exists idx_comment_likes_comment  on public.comment_likes(comment_id);
create index if not exists idx_comments_user          on public.build_comments(user_id) where deleted_at is null;
create index if not exists idx_collections_user       on public.collections(user_id, updated_at desc);
create index if not exists idx_build_tags_tag         on public.build_tags(tag_id);
create index if not exists idx_build_reports_build    on public.build_reports(build_id);
create index if not exists idx_comment_reports_comment on public.comment_reports(comment_id);
create index if not exists idx_notifications_build    on public.notifications(build_id) where build_id is not null;
create index if not exists idx_notifications_comment  on public.notifications(comment_id) where comment_id is not null;
create index if not exists idx_notifications_actor    on public.notifications(actor_id) where actor_id is not null;
create index if not exists idx_profiles_pinned_build  on public.profiles(pinned_build_id) where pinned_build_id is not null;

-- Same columns as their primary key: pure write overhead.
drop index if exists public.idx_slug_redirects;
drop index if exists public.idx_follows_follower;

-- 4. A bare auth.uid() in a policy runs once per row; wrapped in a scalar
--    subquery Postgres runs it once per query (initPlan). Rewrites every
--    public policy as it currently stands in the database, so later
--    migrations' policy changes are kept; already-wrapped calls (deparsed
--    as "( SELECT auth.uid() AS uid)") are left alone.
do $$
declare
  p record;
  fn constant text := '(?<!SELECT )((?:auth\.uid|(?:public\.)?is_moderator|(?:public\.)?requested_build_id)\(\))';
  q text;
  c text;
begin
  for p in select schemaname, tablename, policyname, qual, with_check from pg_policies where schemaname = 'public' loop
    q := regexp_replace(p.qual, fn, '(select \1)', 'g');
    c := regexp_replace(p.with_check, fn, '(select \1)', 'g');
    if q is distinct from p.qual then
      execute format('alter policy %I on %I.%I using (%s)', p.policyname, p.schemaname, p.tablename, q);
    end if;
    if c is distinct from p.with_check then
      execute format('alter policy %I on %I.%I with check (%s)', p.policyname, p.schemaname, p.tablename, c);
    end if;
  end loop;
end $$;

-- ── Rendimiento: trabajo del cliente al servidor (0.3.123, M140) ──────
-- 0.3.123 — performance pass (M140): work the client did in several round
-- trips moves into the database. Run it BEFORE deploying 0.3.123: the new
-- client no longer archives versions itself. (The old client keeps working
-- on top of it: it sees the version already archived and skips its copy.)
-- Idempotent.

-- 1. Version history. updateBuild made 5–6 requests per save (read the old
--    snapshot, update, read the newest archived one, insert, list the stale
--    ones, delete them) and downloaded two snapshots. A trigger does it in
--    the update itself. jsonb equality ignores key order, so a snapshot that
--    only differs in key order isn't archived.
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
        select id from build_snapshots where build_id = OLD.id order by created_at desc, id offset 20
      );
    end if;
  exception when others then
    -- History is best effort: never fail the save because of it.
    null;
  end;
  return null;
end; $$;
revoke all on function public.archive_build_version() from public, anon, authenticated;
drop trigger if exists archive_build_version on public.builds;
create trigger archive_build_version after update of snapshot on public.builds
  for each row when (OLD.snapshot is distinct from NEW.snapshot)
  execute procedure public.archive_build_version();

-- 2. Views. Anonymous visitors had no identity (the client always sent
--    p_ip_hash = null), so every refresh inserted an event and bumped
--    view_count, and build_view_events was never pruned. Anonymous visitors
--    are now told apart by a per-build, per-day hash of IP + user agent from
--    the request headers (neither is stored), and each recorded view prunes
--    that build's events older than the 1-hour window, the only part read.
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
    if v_ip is not null then
      v_visitor := md5(p_build_id::text || current_date::text || v_ip || coalesce(v_headers->>'user-agent', ''));
    end if;
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
delete from public.build_view_events where viewed_at <= now() - interval '1 hour';

-- 3. Community stats: 8 full aggregates (3 scans of builds, 2 of the
--    append-only forge_runs log) on every Explore visit. Cached in one row
--    for 5 minutes; the first call after that recomputes it.
create table if not exists public.community_stats_cache (
  id           boolean primary key default true check (id),
  stats        jsonb not null,
  refreshed_at timestamptz not null default now()
);
grant select, insert, update, delete on public.community_stats_cache to service_role;
alter table public.community_stats_cache enable row level security;

create or replace function public.get_community_stats()
returns table(
  users_count          bigint,
  builds_count         bigint,
  public_builds_count  bigint,
  likes_count          bigint,
  views_count          bigint,
  builds_this_week     bigint,
  forge_runs_count     bigint,
  forge_finished_count bigint
)
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  select c.stats into v from community_stats_cache c where c.refreshed_at > now() - interval '5 minutes';
  if v is null then
    select to_jsonb(s) into v from (
      select
        (select count(*) from profiles)                                            as users_count,
        (select count(*) from builds)                                              as builds_count,
        (select count(*) from builds where visibility = 'public')                  as public_builds_count,
        (select count(*) from build_likes)                                         as likes_count,
        (select coalesce(sum(view_count), 0) from builds)                          as views_count,
        (select count(*) from builds where created_at >= now() - interval '7 days') as builds_this_week,
        (select count(*) from forge_runs)                                          as forge_runs_count,
        (select count(*) from forge_runs where finished)                           as forge_finished_count
    ) s;
    insert into community_stats_cache (id, stats, refreshed_at) values (true, v, now())
      on conflict (id) do update set stats = excluded.stats, refreshed_at = excluded.refreshed_at;
  end if;
  return query select
    (v->>'users_count')::bigint, (v->>'builds_count')::bigint, (v->>'public_builds_count')::bigint,
    (v->>'likes_count')::bigint, (v->>'views_count')::bigint, (v->>'builds_this_week')::bigint,
    (v->>'forge_runs_count')::bigint, (v->>'forge_finished_count')::bigint;
end; $$;
grant execute on function public.get_community_stats() to anon, authenticated;

-- 4. Build detail: the signed-in viewer's like, bookmark, rating and liked
--    comments in one round trip instead of four. Security invoker: the
--    same RLS as the four separate queries applies.
create or replace function public.get_build_viewer_state(p_build_id uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'liked',      exists (select 1 from build_likes where build_id = p_build_id and user_id = (select auth.uid())),
    'bookmarked', exists (select 1 from build_bookmarks where build_id = p_build_id and user_id = (select auth.uid())),
    'rating',     (select rating from build_ratings where build_id = p_build_id and user_id = (select auth.uid())),
    'comment_likes', coalesce((
      select jsonb_agg(cl.comment_id)
      from comment_likes cl join build_comments c on c.id = cl.comment_id
      where c.build_id = p_build_id and cl.user_id = (select auth.uid())
    ), '[]'::jsonb)
  )
$$;
revoke all on function public.get_build_viewer_state(uuid) from public, anon;
grant execute on function public.get_build_viewer_state(uuid) to authenticated;

-- 5. Public profile: builds count + likes received, public comment count,
--    membership tier and custom rank in one round trip instead of four.
--    Security invoker: the same RLS as the separate queries applies.
create or replace function public.get_public_profile_summary(p_user_id uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'tier',          get_public_membership_tier(p_user_id),
    'rank',          (select to_jsonb(r) from get_public_custom_rank(p_user_id) r limit 1),
    'build_count',   (select count(*) from builds where user_id = p_user_id and visibility = 'public'),
    'like_count',    (select coalesce(sum(like_count), 0) from builds where user_id = p_user_id and visibility = 'public'),
    'comment_count', (select count(*) from build_comments c join builds b on b.id = c.build_id
                      where c.user_id = p_user_id and c.deleted_at is null and b.visibility = 'public')
  )
$$;
revoke all on function public.get_public_profile_summary(uuid) from public;
grant execute on function public.get_public_profile_summary(uuid) to anon, authenticated;


-- ══ 0.3.135 — security audit fixes (supabase/migrations/20261027000000_security_audit_fixes.sql) ══

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
