# Free-Tier Capacity Analysis

Companion to `request-consumption-audit.md`. All figures below are estimates
unless marked **(measured)** — no production telemetry was available from
this environment. See "Instrumentation needed" at the end before treating
any of this as a committed capacity plan.

## Quota identification

| Provider | Metric | Free-tier limit | Billing period | What actually counts |
|---|---|---|---|---|
| Cloudflare Workers | Worker invocations | 100,000/day | daily, resets ~UTC midnight | Only `run_worker_first` paths (`/build/*`, `/u/*`), `/og/*`, `/img/item/*` fallback, `/char/*`, and unmatched paths (SPA fallback). Static asset serves (JS/CSS/HTML/`/data/*`) do **not** count. |
| Supabase | DB size | 500 MB | — | all tables, indexes, Storage metadata |
| Supabase | Egress (bandwidth) | 5 GB/month | monthly | query results + Storage downloads |
| Supabase | Monthly Active Users | 50,000 | monthly | unique authenticated users |
| Supabase | Realtime concurrent connections | 200 | instantaneous | open WebSocket channels (notifications) |
| Supabase | Project pause | after 7 days with zero activity | — | not a capacity concern for an active project |

The dashboard figure "1,042 / 100,000" is the **Cloudflare Workers** number
— confirmed from `wrangler.jsonc`'s Workers Assets config (see
`request-consumption-audit.md`), not Supabase or GitHub Pages. Supabase's
binding constraints (egress, DB size, Realtime connections) are not visible
from source and were not measured here.

## Current usage (as reported, not independently measured)

| Metric | Current | Source |
|---|---|---|
| Worker requests/day | 1,042 | dashboard (as given) |
| Daily quota remaining | 98,958 (98.96%) | derived |
| Requests per page load (static page) | ~0 Worker invocations (asset-served) | derived from `run_worker_first` config |
| Requests per page load (`/build/:id`, `/u/:username`) | 1 Worker invocation | `run_worker_first` includes these |
| Requests per `/og/*` miss | 1 Worker invocation + parallel internal fetches to `env.ASSETS.fetch()` for equipment/sets/translation JSON (not counted separately — internal to the one invocation) | `src/worker/index.ts:121-126,165-170,212` |

Because static-asset traffic is free against this quota, **"requests per
page load" is not a meaningful growth driver** for the 100k number the way
it would be on a traditional server. The quota scales with the volume of
`/build/*`, `/u/*`, and `/og/*` hits specifically — i.e., with how often
people view/share individual builds and profiles, not with total page views.

## Projected usage at different DAU levels

Assumptions (explicitly estimates, not measurements):
- Each daily active user views ~3 builds or profiles on average
  (browsing + their own) → ~3 `/build/*`/`/u/*` Worker hits/user/day.
- 1 in 20 users shares a build, each share causing ~1-2 `/og/*` renders
  (first view generates the cache, subsequent views of the same build+
  game-version hit the edge cache, not the Worker).
- SPA-fallback/404 misses: negligible (~0.1/user/day) once routing is
  correct.

| DAU | Est. `/build/*` + `/u/*` hits | Est. `/og/*` Worker hits (cache misses only) | Est. total Worker requests/day | % of 100k quota |
|---|---|---|---|---|
| 100 (current rough order, given 1,042 reported) | ~300 | ~5-10 | ~350-400 | <1% |
| 500 | ~1,500 | ~25-50 | ~1,600-1,700 | ~1.6-1.7% |
| 1,000 | ~3,000 | ~50-100 | ~3,100-3,200 | ~3.1-3.2% |
| 5,000 | ~15,000 | ~250-500 | ~15,500-16,000 | ~15.5-16% |

**These numbers don't match the reported 1,042 at face value** — if current
DAU is well under 100, the per-user estimate above is too low, or more
traffic is landing on `/og/*`/SPA-fallback than assumed. This gap is exactly
why the Cloudflare Analytics path breakdown (see Instrumentation below) is
needed before trusting any projection here.

Even at the high end of plausible growth (5,000 DAU), projected usage stays
under 20% of the Worker quota given the current architecture — the
asset-bypass design (Workers Assets + R2-backed `/img/item/*` via
`VITE_ASSETS_URL`) is the reason this project can scale page-view traffic
essentially for free against this particular limit.

## Worst-case scenarios

- **Viral build share (Discord/Reddit raid)**: concentrated `/build/:id` and
  `/og/*` traffic for one build. `/build/*` is uncacheable by design
  (visibility must be checked live — see `caching-strategy.md`), so this is
  the one scenario where Worker invocations scale close to 1:1 with
  viewers. At 10,000 simultaneous viewers of one build in a day, that's
  10,000 Worker invocations from `/build/*` alone — 10% of quota from a
  single event. Still survivable, but worth knowing the ceiling.
- **OG render storm without rate limiting (R-3 in the audit doc)**: if many
  *different* builds are shared at once (each a distinct cache key), every
  first view is a Worker invocation running an SVG→PNG render. No
  `OG_RATE_LIMITER` binding is currently configured
  (`wrangler.jsonc` has no `ratelimits` block). Low likelihood, but
  unbounded — recommend provisioning before a marketing push.
- **Scraper/bot crawl of `/build/*` or `/u/*`**: these routes aren't
  cacheable and have no visible bot-protection beyond Cloudflare's platform
  defaults. A sufficiently aggressive crawler hitting build/profile pages
  could consume quota disproportionately. Not found to be happening, not
  measured — flagged as a plausible worst case given the architecture.

## Bottleneck ranking

1. **Cloudflare Worker quota** is not the near-term bottleneck given current
   usage and the asset-bypass architecture — see projections above.
2. **Supabase egress (5 GB/month)** is the more plausible constraint to hit
   first as traffic grows, since every authenticated read/write and Storage
   download counts against it, and it wasn't measurable from source. Check
   the Supabase dashboard directly.
3. **Supabase Realtime concurrent connections (200)** could be hit by
   multi-tab power users before egress or DB size become issues, though the
   existing visibility-gating in `NotificationBell.tsx` (confirmed during
   this audit — see `request-consumption-audit.md` R-4) already mitigates
   idle-tab connections.

## Instrumentation needed before trusting these numbers

1. **Cloudflare Workers Analytics**, path-level breakdown (dashboard →
   Workers & Pages → this Worker → Analytics, or the GraphQL Analytics API)
   for at least one full day — needed to decompose "1,042" into
   `/build/*` vs `/u/*` vs `/og/*` vs `/img/item/*` fallback vs SPA-fallback
   misses, and to sanity-check the DAU-based projections above against real
   traffic.
2. **Supabase dashboard**: current DB size, monthly egress-to-date, and
   Realtime concurrent-connection peak. None of these are inferable from
   the codebase.
3. **Actual DAU**, from whatever analytics this project uses (not found in
   this audit's scope) — needed to pick which row of the projection table
   reflects reality today.

Until (1) is available, treat the "100k is fine for a long time" conclusion
above as architecturally sound (the asset-bypass design is real and
verified) but numerically unconfirmed.
