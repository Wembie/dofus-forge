-- ═══════════════════════════════════════════════════════════════════════
-- Dofus Forge — schema completo
-- Fuente de verdad: docs/DATABASE.md (edítalo ahí, no aquí directamente,
-- y vuelve a copiar este archivo si cambias algo)
-- Pega esto entero en Supabase Dashboard → SQL Editor → Run. Una sola vez.
-- ═══════════════════════════════════════════════════════════════════════

begin;

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
  search_vector   tsvector generated always as (
    -- 'simple' (no stemming), no 'spanish': nombres/descripciones son texto libre del
    -- usuario en cualquiera de los 4 idiomas de la app (es/en/fr/pt) — un config de
    -- idioma fijo stemea mal los otros 3
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- FK circular profiles ↔ builds
alter table profiles
  add constraint fk_pinned_build
  foreign key (pinned_build_id) references builds(id) on delete set null;


-- ═══════════════════════════════════════════════════════════════
-- ITEMS EQUIPADOS
-- ═══════════════════════════════════════════════════════════════

create table build_items (
  build_id  uuid not null references builds(id) on delete cascade,
  -- = ALL_SLOTS en buildStore.ts, exacto
  slot      text not null check (slot in (
    'hat','cape','amulet','ring1','ring2','belt','boots',
    'weapon','shield','companion','sidekick',
    'dofus1','dofus2','dofus3','dofus4','dofus5','dofus6'
  )),
  item_id   int not null,
  primary key (build_id, slot)
);


-- ═══════════════════════════════════════════════════════════════
-- CARACTERÍSTICAS BASE
-- ═══════════════════════════════════════════════════════════════

create table build_characteristics (
  build_id      uuid primary key references builds(id) on delete cascade,
  vitality      smallint not null default 0 check (vitality >= 0),
  strength      smallint not null default 0 check (strength >= 0),
  intelligence  smallint not null default 0 check (intelligence >= 0),
  chance        smallint not null default 0 check (chance >= 0),
  agility       smallint not null default 0 check (agility >= 0),
  wisdom        smallint not null default 0 check (wisdom >= 0),
  vit_scrolled  boolean not null default false,
  str_scrolled  boolean not null default false,
  int_scrolled  boolean not null default false,
  cha_scrolled  boolean not null default false,
  agi_scrolled  boolean not null default false,
  wis_scrolled  boolean not null default false
);


-- ═══════════════════════════════════════════════════════════════
-- RUNAS
-- ═══════════════════════════════════════════════════════════════

create table build_runes (
  build_id                uuid not null references builds(id) on delete cascade,
  slot                    text not null,
  runes                   jsonb not null default '{}',
  forjamago_name          text,
  -- WeaponTransform = {element, ratio} en buildStore.ts — element nunca es 'neutral'
  weapon_transform        text check (weapon_transform in ('earth','fire','water','air')),
  weapon_transform_ratio  smallint check (weapon_transform_ratio in (85, 68, 50)),
  primary key (build_id, slot),
  constraint weapon_transform_pair check (
    (weapon_transform is null) = (weapon_transform_ratio is null)
  )
);


-- ═══════════════════════════════════════════════════════════════
-- TAGS
-- ═══════════════════════════════════════════════════════════════

create table tags (
  id         serial primary key,
  name       text unique not null check (name ~ '^[a-z0-9-]{2,20}$'),
  category   text not null default 'general',
  created_by uuid references profiles(id) on delete set null
);

create table build_tags (
  build_id  uuid references builds(id) on delete cascade,
  tag_id    int  references tags(id)   on delete cascade,
  primary key (build_id, tag_id)
);


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


-- ═══════════════════════════════════════════════════════════════
-- SLUG REDIRECTS
-- ═══════════════════════════════════════════════════════════════

create table slug_redirects (
  old_slug   text primary key,
  build_id   uuid not null references builds(id) on delete cascade,
  created_at timestamptz default now()
);


-- ═══════════════════════════════════════════════════════════════
-- SOCIAL: LIKES, RATINGS, BOOKMARKS
-- ═══════════════════════════════════════════════════════════════

create table build_likes (
  user_id    uuid references profiles(id) on delete cascade,
  build_id   uuid references builds(id)  on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, build_id)
);

create table build_ratings (
  user_id    uuid references profiles(id) on delete cascade,
  build_id   uuid references builds(id)  on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, build_id)
);

create table build_bookmarks (
  user_id    uuid references profiles(id) on delete cascade,
  build_id   uuid references builds(id)  on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, build_id)
);


-- ═══════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════

create table build_view_events (
  build_id   uuid references builds(id) on delete cascade,
  user_id    uuid,
  ip_hash    text,
  viewed_at  timestamptz default now()
);


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

create table comment_likes (
  user_id    uuid references profiles(id) on delete cascade,
  comment_id uuid references build_comments(id) on delete cascade,
  primary key (user_id, comment_id)
);


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

create table collection_builds (
  collection_id  uuid references collections(id) on delete cascade,
  build_id       uuid references builds(id)      on delete cascade,
  position       smallint not null default 0,
  added_at       timestamptz default now(),
  primary key (collection_id, build_id)
);


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
create index idx_build_items_item on build_items(item_id);

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
alter table build_items       enable row level security;
alter table build_characteristics enable row level security;
alter table build_runes       enable row level security;
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

-- Profiles: lectura pública
create policy "profiles public read" on profiles for select using (true);
create policy "profiles own write" on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Builds: público/unlisted visibles a todos; privado solo al dueño
create policy "builds read" on builds for select using (
  visibility in ('public', 'unlisted') or auth.uid() = user_id
);
create policy "builds insert" on builds for insert
  with check (auth.uid() = user_id and is_featured = false);
create policy "builds update" on builds for update
  using (auth.uid() = user_id)
  -- Aliased subquery on purpose: an unaliased `builds where id = builds.id`
  -- self-correlates to `id = id` (always true) and returns every row instead
  -- of the one being updated, raising "more than one row returned by a
  -- subquery" — this is what broke rating a build (sync_rating_stats()'s
  -- UPDATE on builds runs as the calling user, so this WITH CHECK applies).
  with check (auth.uid() = user_id and is_featured = (select b.is_featured from builds b where b.id = builds.id));
create policy "builds delete" on builds for delete
  using (auth.uid() = user_id);

-- Build_items: read según visibilidad del build padre, write solo dueño
create policy "build_items read" on build_items for select using (
  exists (select 1 from builds where id = build_id
    and (visibility in ('public','unlisted') or auth.uid() = user_id))
);
create policy "build_items write" on build_items for all using (
  exists (select 1 from builds where id = build_id and auth.uid() = user_id)
);

-- Mismo patrón read/write que build_items para las demás tablas hijas de un build
create policy "build_characteristics read" on build_characteristics for select using (
  exists (select 1 from builds where id = build_id
    and (visibility in ('public','unlisted') or auth.uid() = user_id))
);
create policy "build_characteristics write" on build_characteristics for all using (
  exists (select 1 from builds where id = build_id and auth.uid() = user_id)
);

create policy "build_runes read" on build_runes for select using (
  exists (select 1 from builds where id = build_id
    and (visibility in ('public','unlisted') or auth.uid() = user_id))
);
create policy "build_runes write" on build_runes for all using (
  exists (select 1 from builds where id = build_id and auth.uid() = user_id)
);

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
-- Reports: insert para cualquier user autenticado; SELECT solo para moderadores/admins
create policy "reports insert" on build_reports for insert
  with check (auth.uid() = reporter_id);
create policy "reports admin read" on build_reports for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')));
create policy "reports admin update" on build_reports for update
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


-- ── Límite de builds por cuenta (50, regardless of visibility) ─────────
-- before insert (not after) so it blocks the row that would be the 51st —
-- profiles.builds_count is already trigger-synced (sync_builds_count above)
-- and counts every build regardless of visibility, so this is a single
-- indexed row read, no count(*) scan over builds needed.
create function check_build_limit() returns trigger language plpgsql as $$
begin
  if (select builds_count from profiles where id = new.user_id) >= 50 then
    raise exception 'BUILD_LIMIT_REACHED';
  end if;
  return new;
end; $$;
create trigger before_build_insert before insert on builds for each row execute procedure check_build_limit();


-- ── Membresía / tiers (PLANTEADO, NO IMPLEMENTADO) ──────────────────────
-- Si el límite fijo de 50 builds/cuenta arriba termina siendo un problema
-- real para alguien, la idea es un tier pago que lo suba en vez de tocar
-- el límite global. Boceto de cómo encajaría, sin crear nada todavía:
--
--   create type membership_tier as enum ('free', 'plus');
--   alter table profiles add column membership_tier membership_tier not null default 'free';
--   -- check_build_limit() arriba pasaría a leer el tope según el tier:
--   --   case (select membership_tier from profiles where id = new.user_id)
--   --     when 'plus' then 200 else 50 end
--   -- en vez del 50 fijo que tiene hoy.
--
-- No crear el enum/columna ni tocar check_build_limit() hasta que haya
-- una necesidad real — ver nota en docs/ROADMAP.md.


-- ── Total de builds del sitio (público+privado) para analytics públicas ─
-- security definer: builds' own RLS only lets a user see public builds +
-- their own, so a plain client-side count(*) would undercount everything
-- else. This function only ever returns a number, never row content, so
-- bypassing RLS here doesn't leak anything.
create function get_total_builds_count() returns bigint language sql security definer stable as $$
  select count(*) from builds;
$$;
grant execute on function get_total_builds_count() to anon, authenticated;


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

commit;
