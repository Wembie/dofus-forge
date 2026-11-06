# Caching Strategy

Companion to `request-consumption-audit.md`. Covers what is cached, where,
and why — browser, CDN, application, and Supabase layers.

## Browser / CDN caching (Cloudflare Workers Assets + `public/_headers`)

Static files under `dist/client` are served by Cloudflare's asset edge layer
(Workers Assets, `wrangler.jsonc:6-25`), not the Worker script, for every
path except `run_worker_first` routes. Headers for these come from
`public/_headers`, mirrored for Worker-built responses by
`src/worker/securityHeaders.ts` (kept in sync by
`src/worker/__tests__/headers.test.ts`).

| Path | Cache-Control | Cache key | Invalidation | Public/private | Notes |
|---|---|---|---|---|---|
| `/assets/*` | `public, max-age=31536000, immutable` | filename (Vite content hash) | new hash on content change — old URL never revalidated | public | pre-existing, correct |
| `/data/*` (new) | `public, max-age=86400, stale-while-revalidate=604800` | path (+ `?v=<bust>` on most loads) | redeploy changes the file; SWR serves stale up to 7d while refetching | public | **added in this audit** |
| `/data/version.json` (new) | `public, max-age=60, must-revalidate` | path | — | public | **added in this audit**; see rationale below |
| `/img/item/*`, R2 object hit | `public, max-age=604800, immutable` | key | re-sync via `upload-items.mjs` changes the R2 object, not the key — relies on the 7-day TTL, not a hash | public | pre-existing (`src/worker/index.ts:331`) |
| `/og/*` | edge-cached via `caches.default`, keyed by game-data version | `serveOgImage`, `src/worker/index.ts:249-263` | automatic — new game version = new cache key | public | pre-existing, already correct |

### Why `/data/*` got a shorter TTL than `/assets/*`

`src/data/loaders.ts:5-13` (`fetchJson`) appends `?v=<bust>` to most game-data
requests, where `bust` comes from `loadVersion()` — so in the common case the
URL itself changes when the data does, and an `immutable` cache would be
safe. But:

1. Cloudflare's `_headers` path matching ignores query strings, so the same
   `Cache-Control` rule applies whether or not `?v=` is present.
2. `loadVersion()` itself (`data/version.json`) is fetched **without** a bust
   param — it's the file that tells the client what the current version even
   is, so it must never be cached long enough to hide a real update.
3. Not every call site was verified to always pass a bust value (this audit
   didn't trace every caller) — a bare-path reload must still pick up new
   data within a bounded window rather than being pinned for a year.

`max-age=86400, stale-while-revalidate=604800` gives same-day visitors a warm
cache while guaranteeing data is never more than ~1 day stale, with SWR
smoothing the revalidation cost. `version.json` at `max-age=60` keeps the
staleness check itself cheap to serve while never masking an update for more
than a minute.

**If a future change makes every `/data/*` fetch reliably bust-versioned**
(confirm all call sites, not just `loadIndex`), this can be tightened to
`immutable` the same way `/assets/*` is — expected further reduction in CDN
revalidation traffic, no further action taken here since that guarantee
wasn't verified.

## Application-level caching (already in place, confirmed during this audit)

These existed before this audit and are listed for completeness, not as new
work:

| What | Where | Mechanism | TTL |
|---|---|---|---|
| Game data JSON (items/sets/index) | `src/data/loaders.ts:3,7` | module-level `Map`, keyed by `path?v=bust` | session lifetime |
| Community stats | `src/features/builds/api.ts:984-994` | module-scope variable, mirrors a 5-minute server-side cache | 5 min |
| Tag catalog | `api.ts:195-212` | shared in-flight promise, fetched once per session | session lifetime |
| Version snapshots | `api.ts:540-560` | `Map<string, Promise<...>>` dedupes concurrent loads | until resolved, then cached |
| Build view counts | `api.ts:594-611` | `sessionStorage` flag per build | 1 hour |

None of these needed changes — they already follow stale-while-revalidate-
style patterns appropriate to each data shape (none risk cross-user leakage;
all are either public data or deduped per-session, not shared across users).

## Supabase caching

- RLS policies wrap privilege-check function calls as `(select is_moderator())`
  so Postgres caches the result per statement instead of re-evaluating per
  row (`schema.sql:1576`) — already correct.
- Aggregation RPCs (`get_community_stats`, etc.) are documented as
  server-side cached for 5 minutes, matched by the client TTL above — no
  double-caching risk since both windows are the same length and the client
  cache is strictly a subset of the server one.
- No materialized views were found or recommended — current RPC-based
  aggregation is already pre-computed enough for this traffic level; revisit
  only if `free-tier-capacity-analysis.md`'s higher-DAU projections become
  real and Supabase CPU/DB-size metrics show pressure.

## What was deliberately NOT cached

- `data/version.json` — must stay near-fresh; see above.
- Anything user-specific (session, notifications, profile edit state) —
  never cached at the CDN/edge layer; this audit found no instance of
  private data being cached publicly, and introduced none.
- `/build/*`, `/u/*` — intentionally routed through the Worker
  (`run_worker_first`) because visibility (private/deleted) must be checked
  per request; caching these at the edge would risk serving a deleted or
  since-privated build/profile to someone who shouldn't see it. Correct as
  is — not a caching gap, a deliberate correctness/security tradeoff.

## Consistency risks introduced by this audit's changes

`/data/*` at `max-age=86400` means a visitor could see data up to 24h stale
if a data update ships without a full redeploy (e.g. a hotfix that only
touches `public/data/` without rebuilding `dist/client`). If that's a
deployment pattern this project uses, shorten the TTL or confirm data
updates always go through a full build+deploy before relying on this value
in production.
