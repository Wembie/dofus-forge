# Performance testing strategy for Dofus Forge

## Architecture and risk assessment

The repository is a Vite 6 + React 18 + TypeScript single-page app with a static data layer and a browser-side optimizer. The most relevant implementation points are:

- `src/App.tsx` defines the public route tree and lazy-loads the heavy pages (`ExplorePage`, `BuildDetailPage`, `UserProfilePage`, etc.) so route-level navigation is the main user-facing entry point.
- `src/store/authStore.ts` shows that authenticated journeys are backed by Supabase (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`), while anonymous browsing stays entirely in the browser.
- `src/features/builds/api.ts` confirms the real first-party API surface: public build listings, detail lookups, publish/update operations, and view tracking all flow through Supabase tables and RPCs. These endpoints are the natural subject of protocol-level load tests when a real environment is available.
- `public/data/` is the bulk static JSON dataset used by the builder, item catalog, class guides, and spell lists. This is the largest non-network dependency in the browser and is a clear performance-risk area under cold loads.
- `public/wasm/dofus_forge_optimizer.js` / `rust-optimizer/` show that the expensive stat optimization work is browser-side, offloaded to a WASM worker. This is highly sensitive to main-thread load and large build state, so browser-level checks are essential.
- `README.md` confirms the app deploys as a static site with GitHub Actions and a preview build pipeline; there is no server-rendered backend or bespoke performance service in-repo.

### Relevant user journeys

Anonymous and public:
- Open the home page and browse the builder
- Visit the class guide and item catalog pages
- Explore public community builds and individual build details
- Open static information pages (About, How to Use, Privacy, Terms)

Authenticated and state-changing:
- Sign in / sign up
- Save or publish a build
- Update build visibility and metadata
- Browse own builds and account pages

### Operational risk areas

1. Browser startup cost: the app loads a large static data set, lazily mounts pages, and initializes Supabase only when auth/cloud-build features are touched.
2. Main-thread pressure: the optimizer is CPU-heavy and directly impacts input responsiveness when the build planner is active.
3. Network variability: public data and Supabase-backed build operations can experience CDN, auth, or database latency spikes.
4. Data correctness under load: a valid performance suite must measure request success and business-level checks, not just average latency.

## Test suite design

The repository does not expose a custom back-end API for synthetic tests, so the k6 suite exercises the real public routes and the same browser behaviors the app already supports. We intentionally avoid fake endpoints or mock-only flows that would hide genuine bottlenecks.

### A. Protocol-level load tests

Use k6 HTTP scenarios against a real preview or staging environment that serves the built app. The smoke and normal-load profiles cover:

- home page and builder entry
- public catalog and explore routes
- class pages and public static pages
- dynamic content that depends on static JSON asset loading
- auth-aware and build-publish paths only when a real test account/environment is available

### B. Browser performance tests

Keep a small number of Chromium journeys in a separate browser suite to capture real-user interactivity and rendering quality. This closes the gap between protocol-level throughput and the experience of a user actually interacting with the builder and optimizer.

### C. Workload profiles

The suite supports multiple k6 profiles:

- `smoke` — quick pass/fail validation on the main user paths
- `normal-load` — realistic steady-state traffic
- `peak` — short-burst expected peak behavior
- `stress` — intentionally higher load to expose saturation boundaries
- `soak` — sustained traffic to reveal memory leaks or thermal drift

### D. Dependency handling

The app depends on several external resources that should be isolated intentionally:

- static game data under `public/data/` — served locally and included in the app build
- Supabase for auth and build persistence — tested against a real environment only when credentials are available
- hosted Dofus item art / CDN assets — where possible, use the same preview/test build that the app uses in production and treat CDN latency as a real variable rather than a synthetic dependency

## Metrics and acceptance thresholds

These are initial budgets for first-party app behavior and should be calibrated against a measured baseline in the target environment.

- HTTP failure rate: below 1%
- Read-operation p95: below 500 ms
- Build-save p95: below 800 ms
- First-party endpoint p99: below 1,500 ms
- Check pass-rate: above 99%
- Dropped iterations: zero unless the scenario explicitly models a failure window

The k6 thresholds are configurable through environment variables so the same test suite can be run against local preview, staging, and production-like environments without hardcoded engineering assumptions.

## Capacity discovery procedure

1. Start with a baseline smoke run and record request/latency/error profile.
2. Move to normal-load and peak profiles in stages, holding each stage long enough to collect stable percentile and failure data.
3. Increase workload gradually while tracking page latency, throughput, and browser-side responsiveness.
4. Capture the highest measured workload where all thresholds remain satisfied, then keep a safety margin for sustainable operations.
5. When a limit is hit, correlate the failure with CPU, memory, API saturation, CDN caching, or main-thread bottlenecks before changing capacity assumptions.

## k6 implementation in this repo

The repo includes a reusable k6 harness under `k6/`:

- `k6/config.js` — shared base URL, routes, stage definitions, and tuning knobs
- `k6/common.js` — HTTP helpers, checks, and route param utilities
- `k6/smoke.js` — fast smoke verification for public pages
- `k6/normal-load.js` — steady-state traffic model
- `k6/peak.js` — expected peak burst for the public journey mix
- `k6/browser-smoke.js` — a small real-browser route check for document readiness and user-visible navigation

## CI integration

A dedicated GitHub Actions workflow in `.github/workflows/performance.yml` runs the smoke suite against a local preview build, then exits non-zero if the configured thresholds fail. This keeps performance validation in the same PR pipeline as build, lint, and tests without requiring a full production-scale test environment for every change.

## Summary

The Dofus Forge performance strategy is intentionally conservative and evidence-driven: it measures the real app, isolates the real bottlenecks, and makes the workload profiles and thresholds explicit so that regressions are visible before they reach users.
