# Request Consumption Audit

Date: 2026-11-06
Scope: full repo (frontend, Supabase, Cloudflare Worker/deploy config)
Trigger: dashboard metric "Requests today: 1,042 / 100,000"

## Executive summary

That quota is the **Cloudflare Workers free tier (100,000 requests/day)** —
confirmed from `wrangler.jsonc`, not assumed. It is **not** Supabase (no
request cap on Supabase's free tier) and **not** GitHub Pages (which this
project only uses for a `dofusforge.com` redirect, per `CLAUDE.md` — the real
host is the Cloudflare Worker + Workers Assets).

Critically, **the 100k/day quota only counts requests that invoke the Worker
script**. This project uses Cloudflare's Workers-with-static-assets model
(`wrangler.jsonc:6-25`, `assets.directory: ./dist/client`), which serves any
request matching a real file in `dist/client` directly from Cloudflare's edge
asset layer, bypassing the Worker entirely — **except** paths listed in
`run_worker_first: ["/build/*", "/*/build/*", "/u/*", "/*/u/*"]`. That means
all prerendered HTML (143 of 145 pages), every hashed JS/CSS bundle, fonts,
and `public/data/*` JSON never touch the 100k quota, regardless of traffic
volume. Only these routes can consume it:

| Route | Why it hits the Worker | File |
|---|---|---|
| `/build/*`, `/u/*` | explicit `run_worker_first` (checks if a build/profile is private/deleted before serving) | `src/worker/index.ts` `serveBuildPage`/`serveProfilePage` |
| `/og/*` | dynamically rendered PNG, no static file exists | `src/worker/index.ts:357-384` |
| `/img/item/*` | R2-backed item icon route, fallback only (see finding R-1) | `src/worker/index.ts:325-355` |
| `/char/*` | R2-backed character asset route | `src/worker/index.ts:309-319` |
| any unmatched path | SPA fallback (`not_found_handling: "none"`) | `src/worker/index.ts` |

This reframes the whole audit: **1,042/100,000 is a healthy margin that does
not scale with page-view/asset traffic**, only with the handful of dynamic
routes above. The real risk isn't "too many requests today," it's whether a
traffic spike concentrated in `/build/*`, `/u/*`, or `/og/*` (e.g. a build
going viral on Discord) could spike Worker invocations disproportionately to
visitor count. See `free-tier-capacity-analysis.md` for projections.

The codebase itself has already been through at least one dedicated
performance/security pass (`20261022010000_perf_indexes_rls.sql`,
`20261022020000_perf_server_side.sql`, ROADMAP M150 perf audit, M154
security audit) — most request-reduction patterns an audit like this usually
finds (RPC consolidation, debounced search, client-side dedup caches,
realtime-over-polling, static game data as JSON instead of DB-backed) were
already in place and are noted below as **confirmed-good**, not findings.

## Methodology

Three independent read-only investigations (frontend fetch/effect patterns,
Supabase query/RLS/RPC patterns, deploy/caching config), each followed by
direct verification of their top claims against the actual source before
anything was written here or changed. Two claims did not survive
verification and are documented below as corrections — see "Findings that
did not hold up."

No production telemetry (Cloudflare Analytics request breakdown by path,
Supabase dashboard egress/DB-size numbers) was available from this
environment. Every quantitative estimate below is labeled as such.

## Findings

### R-1 — Item icon CDN bypass: verified already correctly configured (not a finding)

Initial pass flagged `/img/item/*` as a suspected Worker-invocation hot path
("an Explore page alone draws hundreds" — comment at `src/data/loaders.ts:69`).
Verified: `.env.production:4` sets `VITE_ASSETS_URL=https://assets.dofusforge.com/`,
which `src/data/loaders.ts:73-78` (`itemImageUrl`) uses to rewrite every item
icon URL to the public R2 bucket domain at build time — served from
Cloudflare's CDN cache, never invoking the Worker. `/img/item/*` in
`src/worker/index.ts` is a fallback only, hit when an icon is missing from
the bucket (`installItemImageFallback`, `loaders.ts:84-91`) or via a stale
cached page/crawler. **No code change needed.** Minor hardening only: that
fallback path doesn't use `caches.default` the way `serveOgImage` does
(`src/worker/index.ts:249-263` vs `325-355`), so a sustained miss (e.g. an
item added after the last `upload-items.mjs` sync, hit repeatedly before the
next sync) would invoke the Worker once per request instead of once per
edge cache TTL. Low priority — P3, since it only affects the fallback path.

### R-2 — `/data/*` game JSON had no explicit Cache-Control (fixed)

`public/_headers` only set `Cache-Control` for `/assets/*` (Vite-hashed
bundles). `public/data/**` (per-locale item/set/index JSON, several hundred
KB–low MB) fell back to Cloudflare's default short-lived caching, meaning
every repeat visit/reload re-validates these large files instead of reading
from the browser/edge cache. Does not affect the 100k Worker quota (these
paths are asset-served, not Worker-invoked, per the summary above) but does
affect bandwidth and page-load latency on repeat visits.

**Fixed** in this audit — see `caching-strategy.md` for the exact headers
added and why `version.json` is deliberately excluded from the longer TTL.

### R-3 — OG image rate limiting not configured (flagged, not fixed)

`src/worker/index.ts:19-20,254-256` reads an optional `OG_RATE_LIMITER`
binding to throttle `/og/*` PNG renders, but `wrangler.jsonc` has no
`ratelimits` block — the binding is currently undefined in production, so
OG renders are bounded only by the per-game-version cache key
(`serveOgImage`, `:249-263`). A burst of unique build-share links (e.g. a
Discord raid sharing many different builds at once) could multiply Worker
invocations with no backpressure. **Not fixed here** — adding a Cloudflare
Rate Limiting binding is an infrastructure change (`wrangler.jsonc` +
Cloudflare dashboard rate-limit rule), out of scope for a code-only pass.
Classified **P1** — recommend adding before the next marketing push that
would drive OG-image traffic.

### R-4 — Notifications realtime subscription: verified already correctly gated (not a finding)

Initial pass flagged `subscribeToNotifications` (`src/features/builds/api.ts:459-472`)
as holding one realtime WebSocket per tab with no visibility gating, risking
Supabase Realtime's concurrent-connection cap from idle background tabs.
Verified against the actual component: `NotificationBell.tsx:44,56-65,67-77`
already ties the subscription to `document.visibilityState`, with a 60s
grace period (`HIDDEN_GRACE_MS`) before tearing down the channel on tab
hide, falling back to a 120s poll while disconnected. **No code change
needed** — this was already a deliberate, documented design (comment at
`NotificationBell.tsx:12-18`).

### R-5 — `select('*')` on two admin-only tables (not fixed, low priority)

`AdminRanksPage.tsx:138-140,157,269-270` selects all columns from
`custom_rank_definitions`/`custom_rank_benefits`/`custom_rank_assignments`
(the last capped at `.limit(300)` with no real pagination). Admin-only
surface, low traffic, small tables — **P3**, not worth the diff churn
standalone; bundle with other admin-page work if that page is touched again.

### Confirmed-good (no action needed)

- Static reference game data (items/classes/spells/monsters) is static JSON
  under `public/data/`, not Supabase-backed — zero DB requests for the
  catalog browsing that makes up most page views.
- Supabase client is a lazy singleton (`src/lib/supabase.ts`), not
  recreated per call.
- No N+1 query patterns; batched `.in()` used where needed
  (`AdminRanksPage.tsx:157`).
- Aggregation/privacy-sensitive reads go through RPCs
  (`get_public_profile_summary`, `get_community_stats`,
  `get_total_builds_count`, `get_build_viewer_state`) instead of raw table
  selects, minimizing round trips.
- `record_view` is deduped client-side via `sessionStorage` to one RPC call
  per build per hour (`src/features/builds/api.ts:594-611`, tested).
- Realtime notifications use `broadcast` (server-triggered push), not
  `postgres_changes` (which polls Postgres) — a deliberate prior fix
  (comment at `api.ts:454-455`).
- RLS policies wrap function calls as `(select is_moderator())` to avoid
  per-row re-evaluation (`schema.sql:1576`) — already the correct Postgres
  optimization, part of the `20261022010000_perf_indexes_rls.sql` migration.
- `fetchCommunityStats`/`fetchTags`/`fetchVersionSnapshot` all have
  client-side TTL caches or in-flight-promise dedup
  (`src/features/builds/api.ts:195-212, 540-560, 984-994`).
- Item catalog/set catalog filtering happens client-side over data already
  loaded into `dataStore`, not re-fetched per filter change.

## Priority summary

| ID | Finding | Priority | Status |
|---|---|---|---|
| R-2 | `/data/*` missing Cache-Control | P1 | **Fixed** (`public/_headers`) |
| R-3 | `OG_RATE_LIMITER` binding not configured | P1 | Flagged — needs infra change |
| R-1 | `/img/item/*` fallback not edge-cached | P3 | Flagged, optional |
| R-5 | `select('*')` on 2 admin tables | P3 | Flagged, optional |

## Remaining risks

- No production telemetry was available to confirm the 1,042/day breakdown
  by path. If a large share of it turns out to be `/build/*`/`/u/*` (not
  `/og/*`), the rate-limiter gap (R-3) is lower priority than it looks here.
- `run_worker_first` includes `/build/*` and `/u/*` specifically so the
  Worker can check build/profile visibility (private/deleted) before
  serving — this is correct behavior, not a bug, but means those two routes
  will always scale 1:1 with page views, unlike the rest of the site.

## Recommended monitoring

1. Pull Cloudflare Workers Analytics' path breakdown (dashboard or GraphQL
   Analytics API) for one real day to decompose "1,042" into
   `/build/*` vs `/u/*` vs `/og/*` vs `/img/item/*` vs SPA-fallback misses.
   This is the single highest-value next step — every estimate in
   `free-tier-capacity-analysis.md` is bounded by not having this.
2. Check Supabase dashboard for actual egress/DB-size numbers — the binding
   constraint on Supabase's free tier is egress and DB size, not request
   count, and neither is visible from source.
3. Confirm via Cloudflare dashboard whether `OG_RATE_LIMITER` should be
   provisioned (R-3) before any marketing push likely to drive build-share
   traffic.
