# Dofus Forge — Database Schema

> **Motor:** PostgreSQL (Supabase)  
> **Última revisión:** 2026-10-18 — incluye los rangos personalizados y sus cuotas
> **Estado:** Esquema actual; las migraciones incrementales están indicadas por función
> **Repo:** público — este archivo no contiene credenciales, URLs de conexión ni API keys

### Cambios de la revisión 2026-09-30

El diseño original (2026-09-01) no se validó contra el código real del builder. 5 desalineaciones encontradas y corregidas en este archivo:

| # | Problema | Antes | Ahora |
|---|---|---|---|
| 1 | `selectedClass` es un **slug** (`'sram'`, `'cra'`...), no un breed id numérico — ver `engine/types.ts` `DOFUS_CLASSES` | `class_id smallint` | `class_slug text` con CHECK de los 19 slugs válidos |
| 2 | `BuildState.gender` (`'male'`\|`'female'`, portrait de clase) no existía en ningún lado del schema | — | `builds.gender text` |
| 3 | `SlotId` real (`buildStore.ts`) es `hat,cape,amulet,ring1,ring2,belt,boots,weapon,shield,companion,sidekick,dofus1-6` — el CHECK tenía `offhand`/`mount` (no existen) y le faltaba `shield` y `sidekick` | `'offhand','mount'`, sin `shield`/`sidekick` | lista exacta de `ALL_SLOTS` |
| 4 | `WeaponTransform = {element, ratio}` — el schema solo guardaba `element`, perdiendo el `ratio` (85/68/50%) | solo `weapon_transform text` | + `weapon_transform_ratio smallint` |
| 5 | `to_tsvector('spanish', ...)` en una app ES/EN/FR/PT hace stemming incorrecto sobre nombres/descripciones en inglés, francés o portugués | `'spanish'` | `'simple'` (sin stemming, agnóstico de idioma) |
| 6 | Sección 6 (RLS) tenía un comentario `-- mismo patrón para build_characteristics, build_runes, build_snapshots, build_tags` en vez del SQL real — esas 4 tablas quedaban con RLS activado y **cero políticas** (nadie, ni el dueño, puede leer/escribir sin una policy) | comentario, sin SQL | 8 policies reales (read+write × 4 tablas) |

**`supabase/schema.sql`** incluye el esquema completo y los rangos personalizados para bases nuevas. En una base existente, ejecuta las migraciones pendientes en orden: `20261018_custom_ranks.sql`, `20261018130000_custom_rank_customization.sql`, `20261018140000_expand_custom_rank_catalog.sql` y `20261018150000_add_custom_rank_premium_finishes.sql`.

---

---

## Tabla de contenidos

1. [Decisiones de arquitectura](#1-decisiones-de-arquitectura)
2. [Diagrama de entidades](#2-diagrama-de-entidades)
3. [Descripción de cada tabla](#3-descripción-de-cada-tabla)
4. [SQL completo](#4-sql-completo)
   - [4b. Storage: bucket de avatares](#4b-storage-bucket-de-avatares)
5. [Índices y por qué](#5-índices-y-por-qué)
6. [Row Level Security](#6-row-level-security)
   - [6b. Grants](#6b-grants)
7. [Funciones y triggers](#7-funciones-y-triggers)
8. [Casos de uso — queries clave](#8-casos-de-uso--queries-clave)
9. [Casos de borde validados](#9-casos-de-borde-validados)
10. [Tags semilla](#10-tags-semilla)
11. [Roadmap de la DB](#11-roadmap-de-la-db)
12. [Notas de seguridad](#12-notas-de-seguridad)
13. [Custom ranks](#13-custom-ranks)

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

### Snapshot JSONB

- `builds.snapshot` (JSONB) → carga completa de un build en 1 query sin JOINs; es la única fuente del build (ítems, características, runas, transformaciones)
- "¿Qué builds usan el Gelano?" se resuelve con una consulta de contención sobre el JSONB (`snapshot->'e' @> '[id]'`), sin tablas aparte

Las antiguas tablas normalizadas `build_items` / `build_characteristics` / `build_runes` nunca se llegaron a sincronizar desde la app y se eliminaron (0.3.110, ver la migración "comunidad").

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

### Núcleo — builds y estructura

```mermaid
erDiagram
    profiles {
        uuid id PK
        text username UK
        text display_name
        user_role role
        uuid pinned_build_id FK
        int followers_count
        int following_count
        int builds_count
        jsonb settings
    }

    builds {
        uuid id PK
        uuid user_id FK
        text name
        text slug UK
        text game_version
        text class_slug
        text gender
        smallint level
        build_visibility visibility
        boolean is_featured
        jsonb snapshot
        int like_count
        int bookmark_count
        int comment_count
        int view_count
        numeric avg_rating
        int rating_count
        uuid fork_of FK
        tsvector search_vector
    }

    build_snapshots {
        uuid id PK
        uuid build_id FK
        jsonb snapshot
        text label
        timestamptz created_at
    }

    slug_redirects {
        text old_slug PK
        uuid build_id FK
        timestamptz created_at
    }

    tags {
        int id PK
        text name UK
        text category
    }

    build_tags {
        uuid build_id PK-FK
        int tag_id PK-FK
    }

    profiles ||--o{ builds : "crea"
    profiles }o--o| builds : "pinea"
    builds   }o--o| builds : "fork de"
    builds ||--o{ build_snapshots : ""
    builds ||--o{ slug_redirects : ""
    builds ||--o{ build_tags : ""
    tags   ||--o{ build_tags : ""
```

### Social — interacciones y comunidad

```mermaid
erDiagram
    profiles {
        uuid id PK
        text username UK
        user_role role
    }

    builds {
        uuid id PK
        text slug UK
        build_visibility visibility
    }

    build_likes {
        uuid user_id PK-FK
        uuid build_id PK-FK
        timestamptz created_at
    }

    build_ratings {
        uuid user_id PK-FK
        uuid build_id PK-FK
        smallint rating
    }

    build_bookmarks {
        uuid user_id PK-FK
        uuid build_id PK-FK
        timestamptz created_at
    }

    build_view_events {
        uuid build_id FK
        uuid user_id
        text ip_hash
        timestamptz viewed_at
    }

    build_comments {
        uuid id PK
        uuid build_id FK
        uuid user_id FK
        uuid parent_id FK
        text content
        int like_count
        timestamptz deleted_at
    }

    comment_likes {
        uuid user_id PK-FK
        uuid comment_id PK-FK
    }

    follows {
        uuid follower_id PK-FK
        uuid following_id PK-FK
        timestamptz created_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        notification_type type
        uuid actor_id FK
        uuid build_id FK
        uuid comment_id FK
        boolean read
    }

    collections {
        uuid id PK
        uuid user_id FK
        text name
        boolean is_public
    }

    collection_builds {
        uuid collection_id PK-FK
        uuid build_id PK-FK
        smallint position
    }

    build_reports {
        uuid id PK
        uuid reporter_id FK
        uuid build_id FK
        report_reason reason
        text detail
        report_status status
        uuid reviewed_by FK
    }

    profiles ||--o{ build_likes     : "da ❤️"
    profiles ||--o{ build_ratings   : "califica ⭐"
    profiles ||--o{ build_bookmarks : "guarda 🔖"
    profiles ||--o{ build_comments  : "escribe 💬"
    profiles ||--o{ build_reports   : "reporta 🚩"
    profiles ||--o{ follows         : "sigue →"
    profiles ||--o{ follows         : "← seguido por"
    profiles ||--o{ notifications   : "recibe 🔔"
    profiles ||--o{ collections     : "crea 📁"

    builds ||--o{ build_likes       : ""
    builds ||--o{ build_ratings     : ""
    builds ||--o{ build_bookmarks   : ""
    builds ||--o{ build_view_events : ""
    builds ||--o{ build_comments    : ""
    builds ||--o{ build_reports     : ""
    builds ||--o{ collection_builds : ""
    builds ||--o{ notifications     : ""

    build_comments ||--o{ comment_likes  : ""
    build_comments ||--o{ build_comments : "reply"
    build_comments ||--o{ notifications  : ""

    collections ||--o{ collection_builds : ""
```

### Vista rápida — árbol de relaciones

```
auth.users (Supabase Auth)
  └─► profiles ──────────────────────────────────────────────────┐
        │                                                         │
        ├──► follows (follower ↔ following)          pinned_build │
        ├──► notifications                                        │
        ├──► collections ──► collection_builds ──────────────► builds
        │                                                         │
        └──► builds ◄─────────────────────── fork_of (self-ref) ─┘
               │
               ├── build_tags ──────► tags (seeded)
               ├── build_snapshots     historial con label
               ├── slug_redirects      redirect 301 al renombrar
               │
               ├── build_likes         ❤️  trigger → like_count
               ├── build_ratings       ⭐  trigger → avg_rating / rating_count
               ├── build_bookmarks     🔖  trigger → bookmark_count
               ├── build_view_events   👁  RPC deduplicado 1h
               │
               ├── build_comments ──► comment_likes
               │     soft-delete · parent_id (1 nivel) · trigger → comment_count
               │
               └── build_reports       🚩  reason enum · status workflow
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
| `game_version` | text | Ej: `'3.6.11.15'` — de `public/data/version.json`, sin default (siempre explícito al guardar) |
| `class_slug` | text | Slug de `DOFUS_CLASSES` (`engine/types.ts`), no un breed id — ej. `'sram'`, `'cra'` |
| `gender` | text | `'male'` / `'female'` — portrait de clase (`BuildState.gender`) |
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

**Formato de `snapshot`** (espejo de `BuildSnapshot` en `codec.ts` — ver esa fuente para el formato compacto real que viaja en la URL; esta es la forma expandida que conviene guardar en JSONB):
```json
{
  "gender":           "male",
  "equipped":         { "hat": 12345, "ring1": 67890 },
  "characteristics":  { "vitality": 300, "strength": 100 },
  "scrolls":          { "vitality": true, "strength": false },
  "runes":            { "hat": { "Vitality": 100 } },
  "forjamagoNames":   { "hat": "Sombrero épico" },
  "weaponTransforms": { "weapon": { "element": "fire", "ratio": 85 } }
}
```

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
```

---

## 4b. Storage: bucket de avatares

`profiles.avatar_url` se llena solo con URLs de este bucket — el front nunca
deja pegar una URL externa arbitraria (evita que alguien meta un tracking
pixel o cualquier dominio ajeno como su avatar). Un archivo, tipo/tamaño
validados client-side (`image/png|jpeg|webp`, ≤2MB, sin SVG — un SVG puede
llevar `<script>`/handlers embebidos).

Ruta de cada archivo: `{user_id}/avatar.{ext}` — el primer segmento del path
es el uid, así las políticas de `storage.objects` solo dejan a cada quien
tocar su propio archivo.

```sql
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
```

---

## 5. Índices y por qué

```sql
-- ── Explore (queries de listado con filtros + ordenamiento) ──────────
-- Filtrar por clase + ordenar por cada métrica de popularidad
create index idx_builds_explore_rating   on builds(class_slug, avg_rating desc)  where visibility = 'public';
create index idx_builds_explore_likes    on builds(class_slug, like_count desc)  where visibility = 'public';
create index idx_builds_explore_recent   on builds(class_slug, created_at desc)  where visibility = 'public';
create index idx_builds_explore_views    on builds(class_slug, view_count desc)  where visibility = 'public';
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
-- SEGURIDAD: el usuario solo puede editar sus campos editables.
-- role, followers_count, following_count, builds_count son solo para
-- service role (admins vía backend) o triggers. Un trigger BEFORE UPDATE
-- los protege contra escritura directa del cliente.
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
-- SEGURIDAD: with check evita que el usuario se auto-feature (is_featured solo
-- lo puede cambiar service role / admin desde backend).
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
```

---

## 6b. Grants

RLS solo decide qué **filas** puede tocar un rol — antes de eso, Postgres
exige un GRANT plano para que el rol pueda siquiera intentar la operación
sobre la tabla. Supabase normalmente configura esto solo al crear el
proyecto; si falta, cualquier query devuelve `403 permission denied for
table X` (código `42501`) sin importar que las policies estén bien.

Amplio a propósito — RLS sigue siendo la barrera real (ej: `authenticated`
recibe UPDATE de toda la tabla `build_reports`, pero la policy "reports
admin update" igual bloquea el update de alguien que no sea admin).

```sql
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;
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


-- ── Auto-crear profile al registrarse (con manejo de colisión de username) ──
create function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  base_username text;
  candidate     text;
  suffix        int := 0;
begin
  -- Limpiar parte local del email a formato válido
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_-]', '_', 'gi'));
  base_username := left(base_username, 25);
  -- Resolver colisiones (ej: dos usuarios con mismo email prefix)
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
-- Evita que un cliente autenticado eleve su propio role o
-- manipule contadores desnormalizados directamente.
-- Los admins usan service role key (bypass RLS) para cambiar roles.
create function protect_profile_system_fields()
returns trigger language plpgsql security definer as $$
begin
  -- Solo service role (role = 'service_role' en JWT) puede cambiar estos campos
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
-- and counts every build regardless of visibility, so this is a single
-- extra PK-indexed left join on top of the original indexed row read, no
-- count(*) scan over builds needed. No memberships row = 'free' = 50, same
-- as every account today.
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
```

---

## 8. Casos de uso — queries clave

```sql
-- Explore: builds públicos de una clase, ordenados por rating
select b.*, p.username, p.avatar_url
from builds b
join profiles p on p.id = b.user_id
where b.visibility = 'public'
  and b.class_slug = 'pandawa'
  and b.level between 180 and 200
order by b.avg_rating desc, b.rating_count desc
limit 20 offset 0;

-- Búsqueda full-text
select * from builds
where visibility = 'public'
  and search_vector @@ plainto_tsquery('simple', 'panda critico pvp')
order by ts_rank(search_vector, plainto_tsquery('simple', 'panda critico pvp')) desc;

-- ¿Qué builds usan el Gelano (item_id=8023)? snapshot.e = ids por slot
select b.id, b.name, b.slug, b.class_slug, b.avg_rating
from builds b
where b.snapshot->'e' @> '[8023]'::jsonb and b.visibility = 'public'
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
| weapon_transform valor inválido | `check (weapon_transform in ('earth','fire','water','air'))` |
| weapon_transform sin su ratio (o viceversa) | `constraint weapon_transform_pair check ((weapon_transform is null) = (weapon_transform_ratio is null))` |
| class_slug inválido | `check (class_slug in (...19 slugs de DOFUS_CLASSES...))` |
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

---

## 12. Notas de seguridad

> Este archivo es público. **Nunca** poner aquí: API keys, JWT secrets,
> database passwords, connection strings, ni ninguna credencial.
> Las credenciales van en `.env` local y en los secrets de GitHub/Cloudflare.

### Vulnerabilidades auditadas y estado

| # | Vulnerabilidad | Severidad | Estado |
|---|---|---|---|
| 1 | Usuario eleva su `role` a admin vía UPDATE directo | 🔴 Crítico | ✅ Corregido — trigger `protect_profile_system_fields` + service role check |
| 2 | Usuario se auto-featuera (`is_featured = true`) | 🔴 Crítico | ✅ Corregido — `with check (is_featured = OLD.is_featured)` en policy de builds |
| 3 | `handle_new_user()` falla si username ya existe | 🔴 Crítico | ✅ Corregido — loop con sufijos numéricos hasta encontrar username libre |
| 4 | Admins no pueden leer `build_reports` | 🟡 Importante | ✅ Corregido — policy `reports admin read` con check de role |
| 5 | `tags` sin política write para moderadores | 🟡 Importante | ✅ Corregido — policy `tags admin write` |
| 6 | `build_reports.detail` sin límite de longitud | 🟠 Menor | ✅ Corregido — CHECK <= 500 chars |
| 7 | `record_view()` acepta `ip_hash` del cliente | 🟠 Menor | ⚠️ Aceptado — view inflation posible; deduplicación 1h es best-effort. view_count es métrica de engagement, no crítica |
| 8 | `build_view_events` crece sin límite | 🟠 Menor | ⚠️ Aceptado para MVP — limpiar eventos > 30 días con Edge Function scheduled |

### Qué NO va en la DB pública

- API keys de Supabase (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- JWT secret
- Connection strings de Postgres (`postgresql://...`)
- Credenciales de OAuth providers (GitHub, Google client secret)

### Roles y permisos por actor

| Actor | Clave usada | Puede hacer |
|---|---|---|
| Cliente anónimo | `anon key` | Leer builds públicos/unlisted, leer perfiles, registrarse |
| Cliente autenticado | `anon key` + JWT | Todo lo anterior + CRUD de sus builds, likes, ratings, bookmarks, comments |
| Moderador | `anon key` + JWT (role=moderator) | Todo lo anterior + leer/actualizar reports, gestionar tags |
| Admin | `anon key` + JWT (role=admin) | Todo lo anterior + cambiar roles, feature builds |
| Backend/Edge Function | `service_role key` | Bypass RLS completo — SOLO en servidor, nunca exponer al cliente |

### Cambio de role (admin → user, user → moderator)

**Nunca desde el cliente.** Solo desde Supabase Dashboard o una Edge Function con `service_role key`:

```sql
-- Ejecutar en Supabase SQL Editor o desde Edge Function con service role
update profiles set role = 'moderator' where username = 'wembie';
```

El trigger `protect_profile_system_fields` verifica que la sesión sea `service_role` antes de permitir el cambio.

*Generado: 2026-09-01, validado y corregido: 2026-09-30 — No editar manualmente sin actualizar el SQL en Supabase*

### Migración manual — registro de usos de La Forjadora (2026-10-15)

Correr en el SQL Editor de Supabase (la base ya existente no se recrea
desde `schema.sql`). Es idempotente y sirve tanto si nunca se corrió la
versión anterior (solo forjas terminadas, `record_forge_run`) como si sí:
las filas viejas quedan como forjas terminadas.

```sql
begin;
-- ── La Forjadora: registro de usos ──────────────────────────────────
-- Una fila por cada vez que se enciende la forja (start_forge_run). Si llega
-- a "Piezas forjadas", la misma fila se marca terminada (finish_forge_run);
-- las apagadas a mitad quedan con finished = false. Sin IP ni datos del
-- encargo: solo el usuario si tenía sesión y un resumen para estadísticas
-- (intensidad, runas, cuántos mínimos, si se cumplieron, duración). RLS sin
-- políticas: nadie lee ni escribe la tabla directo, solo a través de las
-- funciones security definer de abajo.
create table if not exists forge_runs (
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
-- Tabla de la versión anterior: sus filas eran forjas terminadas.
alter table forge_runs add column if not exists finished boolean not null default true;
alter table forge_runs alter column finished set default false;
alter table forge_runs alter column all_met drop not null;
alter table forge_runs alter column seconds drop not null;
alter table forge_runs enable row level security;
create index if not exists forge_runs_created_at_idx on forge_runs (created_at);
create index if not exists forge_runs_user_idx on forge_runs (user_id, created_at);

drop function if exists record_forge_run(text, boolean, int, boolean, int);
create or replace function start_forge_run(p_intensity text, p_transcendence boolean, p_requirements int)
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

create or replace function finish_forge_run(p_id bigint, p_all_met boolean, p_seconds int)
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

-- Cambia el tipo de retorno (columna nueva): "or replace" no alcanza, hay que recrearla.
drop function if exists get_community_stats();
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
commit;
```


## 13. Custom ranks

Custom ranks are separate from `profiles.role` and supporter membership. Apply `20261018_custom_ranks.sql` if the database does not have custom ranks yet, then apply `20261018130000_custom_rank_customization.sql`, `20261018140000_expand_custom_rank_catalog.sql`, and `20261018150000_add_custom_rank_premium_finishes.sql`. The migrations add free-form hex colors, 140 rank icons, 76 badge finishes, and an unlimited saved-build benefit enforced by the database trigger.

For an existing database that already has custom ranks, apply any missing migrations in order, ending with `supabase/migrations/20261018150000_add_custom_rank_premium_finishes.sql`. For a fresh database, `supabase/schema.sql` already contains the current catalog. Migration files: `supabase/migrations/20261018_custom_ranks.sql`, `supabase/migrations/20261018130000_custom_rank_customization.sql`, `supabase/migrations/20261018140000_expand_custom_rank_catalog.sql`, and `supabase/migrations/20261018150000_add_custom_rank_premium_finishes.sql`.

### SQL de implementación

```sql
create table if not exists public.custom_rank_definitions (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  name         text not null check (char_length(btrim(name)) between 1 and 40),
  description  text not null default '' check (char_length(description) <= 180),
  icon         text not null check (icon in (
    'anvil', 'award', 'axe', 'badge_check', 'badge_plus', 'bird', 'book_open',
    'bug', 'castle', 'cat', 'circle_star', 'clover', 'code', 'compass', 'crown',
    'dna', 'feather', 'flame', 'flame_kindling', 'flower', 'gamepad', 'gem',
    'globe', 'hammer', 'handshake', 'headphones', 'heart', 'heart_handshake',
    'heart_pulse', 'landmark', 'leaf', 'medal', 'moon', 'mountain', 'music',
    'orbit', 'palette', 'piggy_bank', 'rabbit', 'rocket', 'scroll', 'shield',
    'shield_check', 'sparkles', 'star', 'sun', 'sword', 'swords', 'target',
    'trophy', 'users', 'wand', 'wrench', 'zap'
  )),
  color        text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_public    boolean not null default true,
  is_active    boolean not null default true,
  sort_order   smallint not null default 100 check (sort_order between 0 and 999),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

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
```

### Migración manual — comunidad: colecciones, notificaciones y reportes (0.3.110)

Correr una vez en el SQL Editor de Supabase. Es idempotente: se puede correr
más de una vez. Hasta que se corra: agregar builds a una colección falla con
un aviso, los comentarios no se pueden reportar, las acciones de moderación no
aplican y la campanita no recibe avisos. El resto de la app funciona igual.

```sql
begin;

-- M56: el dueño de una colección puede agregar/quitar builds
drop policy if exists "col_builds write" on collection_builds;
create policy "col_builds write" on collection_builds for all
  using (exists (select 1 from collections where id = collection_id and auth.uid() = user_id))
  with check (exists (select 1 from collections where id = collection_id and auth.uid() = user_id));

-- M58: reportes de comentarios + acciones de moderación
create table if not exists comment_reports (
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
alter table comment_reports enable row level security;
create index if not exists idx_comment_reports_pending on comment_reports(status) where status = 'pending';
grant select, insert, update on comment_reports to authenticated;

drop policy if exists "creports insert" on comment_reports;
create policy "creports insert" on comment_reports for insert
  with check (auth.uid() = reporter_id);
drop policy if exists "creports mod read" on comment_reports;
create policy "creports mod read" on comment_reports for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')));
drop policy if exists "creports mod update" on comment_reports;
create policy "creports mod update" on comment_reports for update
  using (exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')));

-- Ocultar / borrar contenido reportado. security definer: el moderador no es
-- dueño del build/comentario, así que las políticas normales no lo dejarían.
create or replace function moderate_content(p_kind text, p_target uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin')) then
    raise exception 'not_allowed';
  end if;
  if p_kind = 'build' then
    if p_action = 'hide' then
      update builds set visibility = 'private' where id = p_target;
    elsif p_action = 'delete' then
      delete from builds where id = p_target;
    end if;
  elsif p_kind = 'comment' and p_action in ('hide', 'delete') then
    update build_comments set deleted_at = now() where id = p_target and deleted_at is null;
  end if;
end; $$;
revoke all on function moderate_content(text, uuid, text) from public;
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
revoke all on function push_notification(uuid, notification_type, uuid, uuid, uuid) from public;

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

-- Chore: tablas legacy sin uso (build_items / build_characteristics /
-- build_runes). Todo el build vive en builds.snapshot (jsonb) desde hace
-- mucho; nada en la app, el Worker ni las funciones SQL las lee o escribe.
-- IRREVERSIBLE: borra las tablas y cualquier fila que tuvieran (al revisarlas
-- estaban vacías). Si se quiere conservar algo, hacer un backup antes.
drop table if exists build_runes;
drop table if exists build_characteristics;
drop table if exists build_items;

commit;
```

### Migración manual — correcciones de seguridad y moderación (0.3.112)

También en `supabase/migrations/20261019200000_social_security_fixes.sql`. Correr
una vez en el SQL Editor (idempotente), después de la migración "comunidad":

- `push_notification` deja de poder llamarse desde la API (solo la usan los triggers).
- "Ocultar" de moderación marca `builds.moderation_hidden`: el dueño no puede
  volver a hacerlo público y los moderadores lo siguen viendo.
- Ocultar un comentario descuenta `builds.comment_count`.

```sql
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
```
