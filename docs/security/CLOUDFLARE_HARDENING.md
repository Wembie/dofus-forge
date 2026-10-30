# Cloudflare hardening checklist

How the site is served, what the repository already enforces, and what has to be set in the dashboard. Plan-dependent features are marked; check the plan before relying on one.

**Status legend.** *Repo* means enforced by code or config in this repository. *Unverified* means a dashboard setting nobody has checked from here, because the review had no dashboard access.

## How requests flow

`wrangler.jsonc`: one Worker (`src/worker/index.ts`) with static assets from `dist/`. There is no `run_worker_first`, so:

- A request that matches a file in `dist/` is served straight from assets **without running the Worker**. Headers come from `public/_headers` (copied to `dist/_headers`).
- Anything else runs the Worker:
  - `/og/…` images, `/img/item/…` and `/char/…` from R2;
  - `/build/<id>` meta rewrite;
  - the SPA fallback for unknown paths when the Worker passes the request on to `env.ASSETS`.
  Headers there come from `withSecurityHeaders()` in the Worker. **`_headers` does not apply to responses the Worker builds.**

Both places carry the same header set, and `src/worker/__tests__/headers.test.ts` checks that they agree.

## Security headers

| Header | Value | Status |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000` | Repo (`_headers` + Worker). Add `includeSubDomains` once every `*.dofusforge.com` record is confirmed HTTPS-only; `preload` only after that, since both are hard to undo |
| `X-Content-Type-Options` | `nosniff` | Repo |
| `X-Frame-Options` / `frame-ancestors` | `SAMEORIGIN` / `'self'` | Repo |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Repo |
| `Permissions-Policy` | camera, microphone, geolocation, payment, usb off | Repo |
| `Content-Security-Policy-Report-Only` | see below | Repo (report-only) |

### CSP rollout

The policy ships as **Report-Only** first: it changes nothing for users and only makes browsers log violations to the console. Origins it allows, taken from the source:

- `'self'`
- Supabase project URL: `https` and `wss` (Realtime)
- `assets.dofusforge.com`
- `api.dofusdu.de`: item icon fallback (`src/data/normalize.ts`)
- Google Fonts: `fonts.googleapis.com`, `fonts.gstatic.com`
- Turnstile: `challenges.cloudflare.com`
- AdSense: `pagead2.googlesyndication.com` and the Google ad domains it loads

`'unsafe-inline'` is still needed for `script-src` because `src/root.tsx` has inline bootstrap scripts (stale-asset reload, language redirect, theme) plus React Router's own hydration scripts, and for `style-src` because React style attributes need it.

To make it enforcing:

1. Deploy, browse every page (builder, explore, build page, account, admin, auth modal with Turnstile, a page with ads) and watch the console for `[Report Only]` violations.
2. Add any legitimate origin that is missing.
3. Rename the header to `Content-Security-Policy` in **both** `public/_headers` and `src/worker/index.ts`.

AdSense loads from a long, changing list of Google domains, so an enforcing CSP with ads on may need `https:` in `script-src` / `frame-src`. Decide whether that trade-off is acceptable.

## Dashboard checklist (all **unverified**)

### SSL/TLS
- [ ] SSL/TLS mode **Full (strict)**. The Worker has no separate origin, but other DNS records might.
- [ ] **Always Use HTTPS** on.
- [ ] Minimum TLS version 1.2.
- [ ] HSTS in the dashboard: either leave it off (the headers above already send it) or set the same values. Don't set conflicting values.

### WAF and rate limiting
- [ ] Security → WAF → **Managed rules**: the Free Managed Ruleset is on by default on every plan; confirm it wasn't disabled.
- [ ] **Rate-limiting rule.** Free plan: 1 rule, counted by IP, 10 s period, 10 s mitigation. Pro: 2 rules, periods up to 1 min. Suggested single rule:
  - Expression: `starts_with(http.request.uri.path, "/og/")`
  - Threshold: ~20 requests per 10 s per IP, action Block.
  - Link-preview crawlers fetch an image once per share, so legitimate traffic stays far below this.
  - On Pro or higher, add a second rule for `/img/item/`.
- [ ] Optional, if the Workers rate-limiting binding is available on the account: add to `wrangler.jsonc`:
  ```jsonc
  "ratelimits": [{ "name": "OG_RATE_LIMITER", "namespace_id": "1001", "simple": { "limit": 30, "period": 60 } }]
  ```
  The Worker already uses `env.OG_RATE_LIMITER` when present and otherwise skips it. Limits are per Cloudflare location and approximate. Needs Wrangler ≥ 4.36.

### Bots
- [ ] Security → Bots → **Bot Fight Mode**: it challenges automated traffic, but it can also challenge the link-preview crawlers (Discord, X, WhatsApp) that fetch `/og/` images and `/build/` meta. Test previews after turning it on. On the Free plan it can't be scoped by path.
- [ ] **Block AI bots / AI Crawl Control**: a product decision (SEO and AI visibility vs scraping cost).

### DDoS
- [ ] HTTP DDoS protection is automatic on all plans; nothing to enable.
- [ ] Notifications → **HTTP DDoS Attack Alert** (all plans). See `BUDGET_ALERTS.md`.

### Caching
- [ ] No Cache Rule may cache HTML or any response carrying `Authorization` or cookies. The app has no personalized server responses: all user data goes browser → Supabase directly. Keep it that way.
- [ ] `/og/*`: the Worker caches it itself with a key derived from the build's `updated_at`; no extra Cache Rule needed.

### DNS and origin exposure
- [ ] DNS: every record that serves HTTP is **proxied** (orange cloud).
- [ ] No leftover grey-cloud records pointing at old hosts (GitHub Pages, previews).
- [ ] `assets.dofusforge.com` is an R2 custom domain. Confirm the `dofus-forge-assets` bucket has **public r2.dev access disabled**, so it is only reachable through the custom domain with Cloudflare in front.
- [ ] `dofus-forge-backups` has **no public access** of any kind.
- [ ] Workers & Pages → `dofus-forge` → **Preview URLs**: decide whether `*.workers.dev` previews should be public. They run the same code against the production Supabase project.

### Account
- [ ] 2FA on the Cloudflare account and on every member.
- [ ] API tokens scoped to the minimum: `CLOUDFLARE_API_TOKEN` in GitHub only needs R2 write on the two buckets.
