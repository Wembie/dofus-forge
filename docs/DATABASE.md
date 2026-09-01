# Dofus Forge — Database Schema

> **Motor:** PostgreSQL (Supabase)  
> **Última revisión:** 2026-09-01  
> **Estado:** Diseño validado, pendiente de implementar

---

## Tabla de contenidos

1. [Decisiones de arquitectura](#1-decisiones-de-arquitectura)
2. [Diagrama de entidades](#2-diagrama-de-entidades)
3. [Descripción de cada tabla](#3-descripción-de-cada-tabla)
4. [SQL completo](#4-sql-completo)
5. [Índices y por qué](#5-índices-y-por-qué)
6. [Row Level Security](#6-row-level-security)
7. [Funciones y triggers](#7-funciones-y-triggers)
8. [Casos de uso — queries clave](#8-casos-de-uso--queries-clave)
9. [Casos de borde validados](#9-casos-de-borde-validados)
10. [Tags semilla](#10-tags-semilla)
11. [Roadmap de la DB](#11-roadmap-de-la-db)

---

## 1. Decisiones de arquitectura

### Hosting: Cloudflare Pages (no GitHub Pages)

GitHub Pages no soporta SPA rewrites. Cloudflare Pages (gratis, mismo deploy desde GitHub) permite:

- URLs limpias `/builds/mi-panda-pvp` sin `#`
- OG meta dinámico por Worker (preview en WhatsApp/Discord)
- CDN real en edge
- `_redirects` file: `/* /index.html 200`

Migración = cero código, solo conectar Cloudflare Pages al repo.

### Builds anónimos vs guardados

```
/builder?b=BASE64      ← sin cuenta (backward compatible con links viejos)
/builds/mi-panda-pvp   ← guardado en DB, cuenta requerida
```

### Visibilidad: 3 estados (no boolean)

| Valor | Quién lo ve | Aparece en Explore |
|---|---|---|
| `private` | Solo el dueño | No |
| `unlisted` | Cualquiera con el link | No |
| `public` | Todos | Sí |

`unlisted` es crítico para "compartir sin publicar". Un `is_public boolean` no lo permite.

### Snapshot JSONB + tablas normalizadas

Patrón híbrido:
- `builds.snapshot` (JSONB) → carga completa de un build en 1 query sin JOINs
- `build_items` (normalizado) → permite "¿qué builds usan el Gelano?"
- `build_characteristics` (normalizado) → permite filtrar por stats base asignados
- `build_runes` (JSONB por slot) → demasiado dinámico para columnas; cambia con cada parche

Las tablas normalizadas y el snapshot se sincronizan en cada save desde la app.

### Contadores desnormalizados

`like_count`, `bookmark_count`, `comment_count`, `avg_rating`, `rating_count`, `followers_count`, `following_count`, `builds_count` — todos mantenidos por triggers.

**Por qué:** `ORDER BY like_count DESC` en Explore sobre 10K builds es O(log n) con índice. Un `COUNT(*)` con JOIN sería O(n) en cada request.

**Trade-off:** riesgo de drift si un trigger falla. Aceptable en este escala; se puede reconciliar con un cron si fuera necesario.

### View count con deduplicación

Incrementar `view_count` en cada request genera write contention en builds populares. Solución: RPC `record_view()` que verifica si el mismo user/IP ya vio el build en la última hora antes de incrementar.

### Slug + redirects

- `slug` = URL amigable auto-generada desde el nombre (`wembie-panda-pvp-200`)
- `slug_redirects` = tabla de slugs históricos → si el user renombra, links viejos hacen redirect 301
- Slug garantiza unicidad contra `builds.slug` Y `slug_redirects.old_slug` para evitar colisiones

---

## 2. Diagrama de entidades

```
auth.users (Supabase)
    │
    └──> profiles ──< follows (follower ↔ following, self-check)
              │  └──< notifications
              │
              └──< builds ────────────────────────────────────── fork_of (self-ref)
                    │  visibility ENUM, game_version, search_vector GEN, slug
                    │  snapshot JSONB (estado completo serializado)
                    │  like_count, bookmark_count, comment_count,
                    │  avg_rating, rating_count, view_count (todos trigger-sync)
                    │
                    ├──< build_items         (slot CHECK, item_id → datos estáticos)
                    ├──< build_characteristics (stats ≥ 0 CHECK, scrolls boolean)
                    ├──< build_runes         (JSONB, weapon_transform CHECK)
                    ├──< build_tags    >──── tags (seeded, category)
                    ├──< build_snapshots     (historial de versiones con label)
                    ├──< slug_redirects      (renombrar sin romper links)
                    │
                    ├──< build_likes         ❤️
                    ├──< build_ratings       ⭐ 1-5
                    ├──< build_bookmarks     🔖
                    ├──< build_view_events   👁 (RPC deduplicado 1h)
                    │
                    ├──< build_comments ──< comment_likes
                    │     (soft-delete, parent_id un nivel, trigger → count)
                    │
                    └──< build_reports       🚩 (reason enum + status workflow)

collections ──< collection_builds ──> builds
```

---

## 3. Descripción de cada tabla

### `profiles`
Extiende `auth.users` de Supabase. Se crea automáticamente al registrarse (trigger).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | = auth.users.id |
| `username` | text UNIQUE | Regex `^[a-z0-9_-]{3,30}$` |
| `display_name` | text | Nombre visible (puede tener mayúsculas/espacios) |
| `bio` | text | Descripción del perfil |
| `avatar_url` | text | URL de imagen de perfil |
| `banner_url` | text | URL del banner del perfil |
| `role` | enum | `user` / `moderator` / `admin` |
| `pinned_build_id` | uuid FK | FK circular, añadida post-creación |
| `followers_count` | int | Trigger-sync desde `follows` |
| `following_count` | int | Trigger-sync desde `follows` |
| `builds_count` | int | Trigger-sync desde `builds` |
| `settings` | jsonb | Preferencias: notificaciones, UI, idioma |

---

### `builds`
Entidad principal. Contiene metadatos + snapshot completo.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | Identificador estable, nunca cambia |
| `user_id` | uuid FK | → profiles |
| `name` | text | Nombre del build |
| `description` | text | Descripción libre |
| `slug` | text UNIQUE | URL amigable auto-generada |
| `game_version` | text | Ej: `'3.6'`, `'3.7'` |
| `class_id` | smallint | breed ID del juego |
| `level` | smallint | 1-200 CHECK |
| `visibility` | enum | `private` / `unlisted` / `public` |
| `is_featured` | boolean | Destacado por admin |
| `snapshot` | jsonb | Estado completo serializado |
| `like_count` | int | Trigger-sync |
| `bookmark_count` | int | Trigger-sync |
| `comment_count` | int | Trigger-sync |
| `view_count` | int | RPC `record_view()` |
| `avg_rating` | numeric(3,2) | Trigger-sync |
| `rating_count` | int | Trigger-sync |
| `fork_of` | uuid FK self | Build origen si es fork |
| `search_vector` | tsvector GENERATED | Full-text sobre name+description |

**Formato de `snapshot`:**
```json
{
  "equipped":         { "hat": 12345, "ring1": 67890 },
  "characteristics":  { "vitality": 300, "strength": 100 },
  "scrolls":          { "vitality": true, "strength": false },
  "runes":            { "hat": { "Vitality": 100 } },
  "forjamagoNames":   { "hat": "Sombrero épico" },
  "weaponTransforms": { "weapon": "fire" }
}
```

---

### `build_items`
Items equipados normalizados. Permite query "builds que usan item X".

| Columna | Tipo | Notas |
|---|---|---|
| `build_id` | uuid PK,FK | |
| `slot` | text PK | CHECK en enum de slots válidos |
| `item_id` | int | ID del juego (datos estáticos, no FK) |

**Slots válidos:** `hat`, `amulet`, `ring1`, `ring2`, `belt`, `boots`, `cape`, `weapon`, `offhand`, `mount`, `dofus1`–`dofus6`, `companion`

---

### `build_characteristics`
Stats base asignados. Permite filtrar builds por puntos invertidos.

| Columna | Tipo | Notas |
|---|---|---|
| `build_id` | uuid PK,FK | |
| `vitality`..`wisdom` | smallint | CHECK >= 0 |
| `vit_scrolled`..`wis_scrolled` | boolean | Si el stat está scrolleado |

---

### `build_runes`
Runas por slot. JSONB porque los nombres de stats cambian con parches.

| Columna | Tipo | Notas |
|---|---|---|
| `build_id` | uuid PK,FK | |
| `slot` | text PK | |
| `runes` | jsonb | `{"Vitality": 100, "AP": 1}` |
| `forjamago_name` | text | Nombre dado al forjamago |
| `weapon_transform` | text | CHECK en `earth/fire/water/air/neutral` o NULL |

---

### `build_comments`
Comentarios con un nivel de replies. Soft-delete para preservar contexto.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `build_id` | uuid FK | |
| `user_id` | uuid FK | |
| `parent_id` | uuid FK self | NULL = top-level, NOT NULL = reply |
| `content` | text | CHECK 1-2000 chars |
| `like_count` | int | Trigger-sync |
| `deleted_at` | timestamptz | NULL = activo; NOT NULL = soft-deleted |

**Nota:** Solo 1 nivel de anidado (comentario → reply). No hay reply-de-reply. Suficiente para el caso de uso sin complejidad de `ltree`.

---

### `build_reports`
Denuncias con workflow de moderación.

| Columna | Tipo | Notas |
|---|---|---|
| `reason` | enum | `spam / incorrect_data / inappropriate / other` |
| `status` | enum | `pending → reviewed → actioned / dismissed` |
| `reviewed_by` | uuid FK | Moderador que lo revisó |
| `reviewed_at` | timestamptz | Cuándo fue revisado |

---

### `notifications`
Feed de notificaciones por usuario.

| `type` | Cuándo se dispara |
|---|---|
| `build_liked` | Alguien da like al build |
| `build_commented` | Alguien comenta |
| `build_rated` | Alguien califica |
| `build_forked` | Alguien hace fork |
| `comment_liked` | Alguien da like al comentario |
| `comment_replied` | Alguien responde comentario |
| `new_follower` | Alguien empieza a seguir |

**Nota:** Las notificaciones NO se crean automáticamente con triggers SQL — se crean desde la app o Supabase Edge Functions para evitar exceso de complejidad en la DB.

---

## 4. SQL completo

```sql
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
  game_version    text not null default '3.6',
  class_id        smallint not null,
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
    to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(description, ''))
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
  slot      text not null check (slot in (
    'hat','amulet','ring1','ring2','belt','boots','cape',
    'weapon','offhand','mount',
    'dofus1','dofus2','dofus3','dofus4','dofus5','dofus6',
    'companion'
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
  build_id          uuid not null references builds(id) on delete cascade,
  slot              text not null,
  runes             jsonb not null default '{}',
  forjamago_name    text,
  weapon_transform  text check (weapon_transform in ('earth','fire','water','air','neutral')),
  primary key (build_id, slot)
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
  detail       text,
  status       report_status not null default 'pending',
  reviewed_by  uuid references profiles(id),
  reviewed_at  timestamptz,
  created_at   timestamptz default now(),
  unique (reporter_id, build_id)
);
```

---

## 5. Índices y por qué

```sql
-- ── Explore (queries de listado con filtros + ordenamiento) ──────────
-- Filtrar por clase + ordenar por cada métrica de popularidad
create index idx_builds_explore_rating   on builds(class_id, avg_rating desc)  where visibility = 'public';
create index idx_builds_explore_likes    on builds(class_id, like_count desc)  where visibility = 'public';
create index idx_builds_explore_recent   on builds(class_id, created_at desc)  where visibility = 'public';
create index idx_builds_explore_views    on builds(class_id, view_count desc)  where visibility = 'public';
-- Filtrar por nivel (builds nivel 200, builds leveling, etc.)
create index idx_builds_level            on builds(level) where visibility = 'public';
-- Builds destacados por admin
create index idx_builds_featured         on builds(is_featured, avg_rating desc) where visibility = 'public';
-- Búsqueda full-text sobre nombre + descripción
create index idx_builds_search           on builds using gin(search_vector) where visibility = 'public';
-- Builds del usuario (Mi perfil)
create index idx_builds_user             on builds(user_id, updated_at desc);
-- Lookup por slug (URL → build)
create index idx_builds_slug             on builds(slug) where slug is not null;
-- Forks de un build
create index idx_builds_fork             on builds(fork_of) where fork_of is not null;

-- ── Items ───────────────────────────────────────────────────────────
-- "¿Qué builds usan el Gelano?" → rápido
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
```

---

## 6. Row Level Security

```sql
-- Habilitar en todas las tablas
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

-- Profiles: lectura pública, escritura solo propia
create policy "profiles public read" on profiles for select using (true);
create policy "profiles own write"   on profiles for update using (auth.uid() = id);

-- Builds: público/unlisted visibles a todos; privado solo al dueño
create policy "builds read" on builds for select using (
  visibility in ('public', 'unlisted') or auth.uid() = user_id
);
create policy "builds write" on builds for all using (auth.uid() = user_id);

-- Build_items: read según visibilidad del build padre, write solo dueño
create policy "build_items read" on build_items for select using (
  exists (select 1 from builds where id = build_id
    and (visibility in ('public','unlisted') or auth.uid() = user_id))
);
create policy "build_items write" on build_items for all using (
  exists (select 1 from builds where id = build_id and auth.uid() = user_id)
);
-- (mismo patrón para build_characteristics, build_runes, build_snapshots, build_tags)

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
create policy "reports insert"   on build_reports   for insert with check (auth.uid() = reporter_id);
create policy "tags read"        on tags            for select using (true);
create policy "slugs read"       on slug_redirects  for select using (true);
```

---

## 7. Funciones y triggers

```sql
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


-- ── Auto-crear profile al registrarse ───────────────────────────────
create function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles(id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


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
create function sync_like_count() returns trigger language plpgsql as $$
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
create function sync_rating_stats() returns trigger language plpgsql as $$
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
create function sync_bookmark_count() returns trigger language plpgsql as $$
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
create function sync_comment_count() returns trigger language plpgsql as $$
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
create function sync_comment_like_count() returns trigger language plpgsql as $$
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
create function sync_follow_counts() returns trigger language plpgsql as $$
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
```

---

## 8. Casos de uso — queries clave

```sql
-- Explore: builds públicos de una clase, ordenados por rating
select b.*, p.username, p.avatar_url
from builds b
join profiles p on p.id = b.user_id
where b.visibility = 'public'
  and b.class_id = 1          -- Pandawa
  and b.level between 180 and 200
order by b.avg_rating desc, b.rating_count desc
limit 20 offset 0;

-- Búsqueda full-text
select * from builds
where visibility = 'public'
  and search_vector @@ plainto_tsquery('spanish', 'panda critico pvp')
order by ts_rank(search_vector, plainto_tsquery('spanish', 'panda critico pvp')) desc;

-- ¿Qué builds usan el Gelano (item_id=8023)?
select b.id, b.name, b.slug, b.class_id, b.avg_rating
from builds b
join build_items bi on bi.build_id = b.id
where bi.item_id = 8023 and b.visibility = 'public'
order by b.avg_rating desc;

-- Perfil de usuario: sus builds públicos
select * from builds
where user_id = $1 and visibility = 'public'
order by updated_at desc;

-- Build por slug (con redirect si cambió)
select * from builds where slug = $1
union all
select b.* from builds b
join slug_redirects sr on sr.build_id = b.id
where sr.old_slug = $1;

-- Notificaciones no leídas del usuario
select n.*, p.username as actor_username, p.avatar_url as actor_avatar
from notifications n
left join profiles p on p.id = n.actor_id
where n.user_id = $1 and n.read = false
order by n.created_at desc
limit 20;

-- Comentarios de un build (con replies)
select c.*, p.username, p.avatar_url
from build_comments c
join profiles p on p.id = c.user_id
where c.build_id = $1 and c.parent_id is null and c.deleted_at is null
order by c.created_at asc;

-- ¿El usuario actual dio like/rating/bookmark a este build?
select
  exists(select 1 from build_likes     where user_id=$1 and build_id=$2) as liked,
  exists(select 1 from build_bookmarks where user_id=$1 and build_id=$2) as bookmarked,
  (select rating from build_ratings    where user_id=$1 and build_id=$2) as my_rating;
```

---

## 9. Casos de borde validados

| Caso | Cómo se maneja |
|---|---|
| User borra su cuenta | `on delete cascade` en profiles → borra builds, likes, etc. |
| Build borrado con likes/comments | Cascade borra todo. `notifications` también (cascade en build_id) |
| User se deslogea y vuelve con otro email | Supabase crea nuevo `auth.users` → nuevo profile. Builds del email viejo se pierden (esperado) |
| Slug colisión al renombrar | `generate_slug()` itera sufijos hasta encontrar libre, comprueba también en `slug_redirects` |
| Slug del nuevo build = slug viejo del mismo build | `on conflict (old_slug) do nothing` en insert de redirects |
| Profile pinea un build que luego borra | `on delete set null` en `pinned_build_id` |
| Alguien intenta hacer follow a sí mismo | `check (follower_id != following_id)` en `follows` |
| Rating fuera de rango | `check (rating between 1 and 5)` |
| Characteristic negativa | `check (vitality >= 0)` etc. |
| weapon_transform valor inválido | `check (weapon_transform in ('earth','fire','water','air','neutral'))` |
| Username con caracteres raros | `check (username ~ '^[a-z0-9_-]{3,30}$')` |
| Vista duplicada por el mismo user | `record_view()` verifica ventana de 1 hora antes de incrementar |
| Contador drift si trigger falla | Tolerable a esta escala. Query de reconciliación: `update builds set like_count = (select count(*) from build_likes where build_id = id)` |
| Build unlisted aparece en Explore | Explore siempre filtra `visibility = 'public'` en app. RLS permite SELECT de unlisted (para quien tiene el link) pero la query de Explore no los devuelve |
| Moderador necesita ver reports | `role = 'moderator'` o `'admin'` en profiles; UI admin filtra `build_reports where status = 'pending'` |
| Build con slug que es un redirect viejo de otro build | `generate_slug()` comprueba `slug_redirects` también → nunca asigna ese slug |
| Parche de Dofus cambia stats de ítems | `game_version` en build indica para qué parche fue hecho. App puede mostrar warning si `game_version != current_version` |
| Nivel máximo sube de 200 | `check (level between 1 and 200)` requiere migración. Aceptable — es un cambio de juego que requiere revisión de lógica igual |

---

## 10. Tags semilla

```sql
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
```

---

## 11. Roadmap de la DB

| M# | Feature | Estado |
|---|---|---|
| — | Schema diseñado y documentado | ✅ Hecho |
| M47 | Auth — registro/login/perfil | ⬜ Pendiente |
| M48 | Cloud builds — guardar/cargar desde Supabase | ⬜ Pendiente |
| M49 | Landing page | ⬜ Pendiente |
| M50 | Explore — galería pública con filtros | ⬜ Pendiente |
| M51 | Build page pública — likes, rating, bookmarks | ⬜ Pendiente |
| M52 | Comments — hilo por build | ⬜ Pendiente |
| M53 | Perfiles públicos | ⬜ Pendiente |
| M54 | Collections | ⬜ Pendiente |
| M55 | Follows + Notifications | ⬜ Pendiente |
| M56 | Panel de moderación | ⬜ Pendiente |

---

*Generado: 2026-09-01 — No editar manualmente sin actualizar el SQL en Supabase*
