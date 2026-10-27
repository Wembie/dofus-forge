# Cost inventory and budget alerts

What Dofus Forge can cost, which alerts exist, and, importantly, **which of them actually stop spending**. Prices and plan limits change; this file names the metric and where to look, not amounts. Check the provider's pricing page when setting thresholds.

"Verified" below means confirmed from the repository or from the provider's documentation on 2026-10-27. Nothing here was checked in the dashboards, because this review had no dashboard access. **Every plan and every alert in the "Status" column needs the owner to confirm it in the dashboard.**

## Four different things

| Mechanism | What it does | Stops charges? |
|---|---|---|
| Usage alert / notification | Emails when a metric crosses a threshold | **No** |
| Budget alert | Emails when the account's usage-based spend crosses a dollar amount | **No**. Cloudflare's docs say they are "informational only" and "do not pause or cap usage" |
| Quota | A plan limit; behaviour past it depends on the product | Sometimes: the product may stop serving instead of billing |
| Spend cap | Blocks billable overage | **Yes**, for the items it covers |

## Inventory

| Service | Used for (source) | Billing metric(s) | Past the limit | Alerts available | Status |
|---|---|---|---|---|---|
| Cloudflare Workers | `src/worker/index.ts`: OG image render (satori + resvg), build page meta, R2 proxy (`wrangler.jsonc`) | Requests, CPU time | **Free**: 100,000 requests/day, then error 1027 or fail-open (route setting); 10 ms CPU per request. **Paid**: billed per request and CPU ms beyond included usage | Budget alerts (pay-as-you-go accounts); `.github/workflows/usage-watch.yml` (opt-in, below) | Plan **unverified**. An OG render almost certainly needs more than 10 ms CPU, which suggests the Paid plan; confirm |
| Cloudflare R2 | `dofus-forge-assets` (item icons, character assets; public domain `assets.dofusforge.com`); `dofus-forge-backups` (nightly DB dumps, `db-backup.yml`) | Storage GB-month, Class A ops (writes), Class B ops (reads). Egress is not billed | Billed beyond the free tier | Budget alerts | Usage **unverified**. Backups grow by one dump per day with no lifecycle rule in the repo; add one (below) |
| Cloudflare zone (`dofusforge.com`) | DNS, CDN, WAF | Plan subscription | n/a | HTTP DDoS Attack Alert (all plans); usage-based billing notifications (Pro and up) | Plan **unverified** |
| Supabase | Auth, Postgres, Storage (`avatars`), Realtime | Database size, egress, MAU, storage, realtime messages | **Free**: not charged, but services can be restricted past quotas. **Pro**: Spend Cap on = overage blocked; Spend Cap off = billed per unit | Usage page and upcoming invoice. The Spend Cap itself sends no notifications | The `db-backup.yml` comment says the project is on the **Free** plan; confirm |
| GitHub Actions | CI, hourly `update-data.yml`, nightly `db-backup.yml` | Runner minutes, artifact storage | Standard runners are free for public repositories | Billing → Spending limit (defaults to $0 for paid features) | Repo is public per `CLAUDE.md`; confirm spending limit is $0 |
| Domain | `dofusforge.com` | Yearly renewal | Domain lapses | Registrar renewal emails | Registrar **unknown**; turn on auto-renew |
| api.dofusdu.de, api.dofusdb.fr | Game data, item image fallback (`src/worker/index.ts`) | None (free third-party) | Their own limits | n/a | Not a cost; an availability dependency |
| Google AdSense, Google Fonts, Turnstile | Ads, fonts, captcha | None | n/a | n/a | Not a cost |
| X API | Credentials exist only in local `.env`; `scripts/prepare-x-post.mjs` only drafts text and calls no API | Paid tiers if used | n/a | n/a | No API use in source |
| Discord webhook | `release.yml` announcements | None | n/a | n/a | Not a cost |

## Alerts to set up (manual, owner)

1. **Cloudflare budget alert.** Manage Account → Billing → Billable Usage → *Create budget alert*. Use two alerts, e.g. 50% and 100% of what you are willing to spend in a month. Requires a pay-as-you-go account.
2. **Cloudflare HTTP DDoS Attack Alert.** Notifications → Add → DDoS Protection → *HTTP DDoS Attack Alert*. All plans.
3. **Cloudflare usage-based billing notification** (Pro plan or higher). Notifications → Add → Billing → *Usage Based Billing*.
4. **Supabase.** On Free, check Organization → Usage weekly or after any traffic spike. On Pro, keep **Spend Cap on** unless you consciously accept overage. That is the only mechanism in this list that actually blocks charges.
5. **GitHub.** Settings → Billing and plans → confirm the Actions spending limit is `$0`.
6. **R2 lifecycle for backups.** R2 → `dofus-forge-backups` → Settings → Object lifecycle rules → delete objects under `db/` older than N days (e.g. 30). This caps storage growth and also limits how long old account data lives.
7. **Workers Free plan only.** Workers & Pages → `dofus-forge` → Settings → decide fail-open vs fail-closed for the daily request limit. Fail-open bypasses the Worker: static assets still work, but OG images and build meta don't.

## Opt-in usage watch (repository)

`.github/workflows/usage-watch.yml` runs daily. It reads the last 24 h of Workers requests and errors for the `dofus-forge` script from Cloudflare's GraphQL Analytics API and fails the run when a threshold is crossed. A failed scheduled run emails the repository owner through normal GitHub notifications. It is a **notification only** and does not stop any traffic or charges.

Setup:

1. Create a Cloudflare API token with **Account Analytics: Read** only, scoped to the account.
2. Add the repository secret `CLOUDFLARE_ANALYTICS_TOKEN`. `CLOUDFLARE_ACCOUNT_ID` already exists for `db-backup.yml`.
3. Add repository **variables** (not secrets): `USAGE_MAX_DAILY_REQUESTS` and `USAGE_MAX_DAILY_ERRORS`. Set them from the observed baseline, for example 3× a normal day.

Without the secret, the workflow logs a notice and exits successfully. The workflow has not been run against the live API from this repository yet; check the first run's summary.

## Baseline

Thresholds without a baseline are guesses. Before setting them, record a normal week:

- Cloudflare → Workers & Pages → `dofus-forge` → Metrics: requests/day, CPU time p50/p99.
- Cloudflare → R2 → each bucket → Metrics: storage, Class A/B operations.
- Supabase → Reports: database size, egress, auth MAU.
