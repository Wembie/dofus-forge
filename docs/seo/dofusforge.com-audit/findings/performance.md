# Performance findings: dofusforge.com

Audit date: 2026-11-22. Pages tested:

- Home: https://dofusforge.com/
- Class: https://dofusforge.com/classes/feca
- Set: https://dofusforge.com/sets/gobball-set
- Guide: https://dofusforge.com/damage-guide
- Also /es, for a cross-check

## Performance score: 55 / 100

The score is an estimate from lab data. Most of the first-party build is fast: local Lighthouse 13.6 runs from 2026-10-31 in `lighthouse-reports/` scored 98-100 on 127.0.0.1. Production loses points for four reasons:

1. A React hydration failure on every page. On desktop, while AdSense is loading, it comes with a CLS of about 1.0.
2. Four large WOFF web fonts that are revalidated on every view. Their swap pushes LCP later and causes layout shifts.
3. About 490 KB of third-party JavaScript: GTM and AdSense.
4. A 4.8 MB equipment JSON that the home page downloads (541 KB as brotli) and parses on load.

## Method and data limits

- **PageSpeed Insights failed.** Every request returned "PSI rate limit exceeded" because no API key was set and the shared keyless quota was used up. So there is **no CrUX field data and no PSI Lighthouse run**. Before acting on the CLS numbers below, check the Search Console Core Web Vitals report.
- **Local Lighthouse (`npx lighthouse`) was blocked** by the session's permission policy.
- **Fallback:** a Playwright and Chromium lab harness. It used:
  - PerformanceObserver for LCP, CLS, long tasks and paint.
  - CDP throttling for mobile: 4x CPU, 1.6 Mbps, 150 ms RTT, 412x823 viewport.
  - Desktop settings: no CPU throttling, 10 Mbps, 40 ms RTT, 1350x940 viewport.
  - A cold cache on every run.
- **The vantage point was near Cloudflare's MIA PoP.** That location is outside every consent-mode region, so AdSense and GTM run fully.
- **Each page was run 2-18 times. Values are ranges.**
- **TBT stands in for INP.** INP needs real interactions, so it cannot be measured in the lab.
- **The browser sandbox stayed on** for every render (`sandbox: true`).

## Metrics

| Page | Device | TTFB | FCP | LCP | TBT (INP proxy) | CLS | Requests / transfer |
|---|---|---|---|---|---|---|---|
| Home | Mobile | 0.52 s | 1.96-2.82 s | **1.96-3.75 s** (text: class picker `<p>`) | 290-480 ms | 0.002 | 121 / 2.2 MB |
| Home | Desktop | 0.50 s | 1.16 s | **1.5-8.9 s** (late repaint of `P.bonus-empty`) | 0 ms | **1.006 in 14 of 18 runs** (0.006 otherwise) | 125 / 2.3 MB |
| Class | Mobile | 0.40 s | 2.0-2.9 s | 2.0-2.9 s | **410-780 ms** | 0.001 | 129 / 1.9 MB |
| Class | Desktop | 0.37 s | 0.94 s | 1.9 s | 0 ms | 0.001 | 164 / 2.3 MB |
| Set | Mobile | 0.38 s | 2.2 s | 2.2 s | **920 ms** | 0.001 | 107 / 1.6 MB |
| Set | Desktop | 0.40 s | 1.17 s | 2.6 s | 0 ms | 0.002 | 109 / 1.6 MB |
| Guide | Mobile | 1.83 s (cold), later 0.41-0.56 s (HIT) | 3.2 s | 3.2 s | 290 ms | 0.027-0.036 | 81 / 1.5 MB |
| Guide | Desktop | 0.42 s | 1.27 s | 1.3-1.6 s | 0 ms | 0.022-0.045, **0.76 in one run** | 85 / 1.5 MB |
| /es home | Mobile | n/a | n/a | n/a | n/a | **0.32** (one run) | n/a |

Core Web Vitals status (lab, against the thresholds LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1):

- **LCP:** borderline on mobile and fails on desktop home.
- **INP:** at risk on mobile, where long tasks reach 290 ms.
- **CLS:** fails on desktop home, guide and /es.

## Findings

### P1. React hydration error #418 on every page; with AdSense loaded, desktop CLS reaches 1.0. Severity: Critical

**Evidence**

- Every page tested throws `Minified React error #418 (args: text, "")` on load. That covers home, class, set, guide and /es, on both mobile and desktop. React therefore drops the prerendered DOM and re-renders the whole document on the client.
- **With third parties allowed:** desktop home measured CLS 1.006 in 14 of 18 runs. The guide measured 0.76 once, /es desktop 1.02 and /es mobile 0.32.
- **With third-party hosts blocked:** 0 of 9 runs showed the spike, and CLS was 0.006.
- **Inside the shift:**
  - `BODY` moves from y=8/h=932 to y=0/h=940. A y of 8 px is the browser's default body margin, so for one frame the page painted without its CSS, a flash of unstyled content.
  - The desktop grid `DIV.hidden lg:grid …` goes from 0x0 to 716 px tall.
  - The AdSense `<ins class="adsbygoogle adsbygoogle-noablate">` and `aswift_0` iframe are present when it happens.
- The spike happens between 1.3 and 4.3 s, which is when AdSense is loading.
- **Likely cause:** the whole-document client render triggered by #418 collides with AdSense inserting nodes into `<body>`.
- **Partial lead:** a text diff of the no-JS and hydrated DOM shows that only `Sign in` (AuthButton) and the footer `· 110 days online` appear after hydration. Both are gated on the client on purpose, so the mismatched text node is somewhere else. Find it with a non-minified build.

**Recommendation**

1. Run `pnpm build` with React in development mode, or open `pnpm dev` and load `/`. Read the full #418 message, which names the mismatched text node, and remove the server/client difference. Typical causes:
   - i18n text that differs before the locale loads
   - `Date`- or `localStorage`-based text
   - conditional text inside `<head>`
2. After the fix, check desktop CLS again with AdSense enabled.
3. As a backstop, inject `adsbygoogle.js` after hydration, once `document.documentElement.dataset.hydrated` is set, instead of in `<head>`.

**Source**

- `src/root.tsx:191`: the AdSense script in `<head>`
- `src/root.tsx:237-243`: `data-hydrated`
- `src/components/SiteFooter.tsx:35-38,101-105`
- `src/components/SiteHeader.tsx:73-74`

### P2. Web fonts: four uncompressed WOFF files (544 KB), revalidated on every view; the swap delays LCP and causes CLS. Severity: High

**Evidence**

| Font | Transfer |
|---|---|
| `SourceSans3-v04.woff` | 228 KB |
| `Alegreya-v04.woff` | 205 KB |
| `IBMPlexMono-Medium-v04.woff` | 57 KB |
| `BarlowCondensed-SemiBold-v04.woff` | 51 KB |

- These are WOFF (zlib), not WOFF2, and they are not subset.
- They are served with `Cache-Control: public, max-age=0, must-revalidate`, because `public/_headers` has no `/fonts/*` rule. Every page view pays a revalidation round trip.
- **With `.woff` blocked:**
  - Desktop home LCP drops from 3.1-8.9 s to **1.36 s**. The same `P.bonus-empty` element is reported again at a larger size (18515 to 19462 px²) once Source Sans swaps in.
  - Guide CLS drops from 0.022-0.045 to **0.0004**. The shifts were in `DIV.rd-eq` and `DIV.rd-layout`.
- Alegreya draws the H1 and every heading but is not preloaded.

**Recommendation**

1. Convert all four fonts to WOFF2 and subset them to Latin plus Latin-1/Latin Extended-A, which covers EN, ES, FR and PT. Expect a 60-75% size cut. Source Sans and Alegreya should each land around 50-70 KB.
2. Add `/fonts/*  Cache-Control: public, max-age=31536000, immutable` to `public/_headers`. The `-v04` file names already work as a cache buster.
3. Add metric-matched fallbacks to stop the swap from reflowing text: `@font-face { font-family: 'Source Sans 3 Fallback'; src: local('Arial'); size-adjust/ascent-override/… }`.
4. Preload the Alegreya WOFF2 next to Source Sans. Consider `font-display: optional` for Barlow and IBM Plex.

**Source**

- `src/ui/design-v04.css:1-4`
- `src/root.tsx:224-225`. The comment there still describes a print-media font stylesheet that no longer exists.
- `public/_headers`

### P3. Third-party JavaScript (GTM + AdSense) adds about 490 KB and 100-400 ms of main-thread blocking. Severity: High

**Evidence**

| Script | Transfer |
|---|---|
| `gtm.js` (GTM-M8TP3WDV, `private, max-age=900`) | 197 KB |
| `show_ads_impl_fy2021.js` / `show_ads_impl.js` | 166-189 KB |
| `adsbygoogle.js` | 56-65 KB |
| adtrafficquality (2 hosts) | 28 KB |
| Cloudflare Insights | 10 KB |

- The page connects to 10 third-party hosts.
- **Mobile class page:** TBT 410-780 ms with third parties, 208-257 ms with them blocked.
- **Mobile home:** total transfer 2.2 MB with third parties, 1.74 MB without.
- AdSense is a parser-inserted async script high in `<head>`. It competes for bandwidth with the critical CSS, the fonts and the 50 module preloads.

**Recommendation**

1. Load `gtm.js` on `requestIdleCallback` or after `load`, or use the smaller `gtag.js` directly. GTM is only used for GA4.
2. Delay `adsbygoogle.js` until after hydration or the first interaction. For site verification, add `<meta name="google-adsense-account" content="ca-pub-…">` to the head; none exists today, so the in-head script is doing that job.
3. Turn off Auto ads formats that inject into the layout (anchor, vignette, in-page) on the workshop route. Use fixed-size manual units with reserved `min-height` instead.

**Source**

- `src/root.tsx:84-98` (`ANALYTICS_SCRIPT`)
- `src/root.tsx:191`

### P4. Home downloads and parses the full 4.8 MB equipment catalog on first load. Severity: High

**Evidence**

- `/data/en/equipment.json?v=3.7.12.12` is 541 KB as brotli and 4,770,642 bytes once decompressed. `sets.json` (58 KB) and `index.json` (54 KB) also load on `/` before the user has picked a class.
- The Fetch total on home is 707 KB of the page's 2.2 MB.
- JSON.parse of about 4.8 MB on a 4x-throttled CPU adds to the 120-290 ms long tasks measured on mobile home.

**Recommendation**

1. Fetch equipment only when the item catalog or slot picker opens. Alternatively, split it by slot or level band.
2. Strip fields the builder never shows. Language-independent stats could move to one shared file.
3. Parse in a Web Worker. The project already ships `worker-src 'self' blob:`.

**Source**

- `src/data/loaders.ts:97`, which fetches `data/${lang}/equipment.json`
- `public/data/en/equipment.json`

### P5. The Supabase SDK (228 KB raw / 59 KB gz) loads on every page for anonymous visitors. Severity: Medium

**Evidence**

- `App` calls `useAuthStore.getState().init()` in a mount effect (`src/root.tsx:238-239`). That calls `getSupabase()`, which dynamically imports `@supabase/supabase-js`. The resulting chunk is `assets/index-D5bMjAqh.js`: 227,805 bytes raw, 61 KB transferred.
- When it resolves, the lazy `AuthButton` (Suspense fallback `null`) swaps in the "Sign in" button. That causes the small `DIV.site-actions` / `NAV.site-nav` shift (0.0004-0.0006) recorded on every page.

**Recommendation**

1. Initialise auth only when `localStorage` holds an `sb-*-auth-token`, or when the user clicks Sign in. Otherwise render a static Sign in link.
2. If that is not possible, run init in `requestIdleCallback`.
3. Give the auth slot a fixed width so the button swap does not shift the header.

**Source**

- `src/store/authStore.ts:119-163`
- `src/lib/supabase.ts:12`
- `src/components/SiteHeader.tsx:73-74`

### P6. Item icons are 128 px PNGs drawn at 20-42 px; almost no images have width/height attributes. Severity: Medium

**Evidence**

- `assets.dofusforge.com/items/{id}-128.png` (about 10-19 KB each) is drawn at 22x22 on class pages and 42x42 on set pages.
  - Class page: 107 of 158 images are oversized by more than 2.5x.
  - Set page: 117 of 123 images are oversized by more than 2.5x.
- Images on the desktop class page add up to about 851 KB over 88 requests.
- Width and height attributes are missing from 157 of 158 images on the class page and 117 of 123 on the set page. CLS is low today only because CSS sizes them.
- The cross-origin icons send no `Timing-Allow-Origin`, so RUM tools cannot measure them.

**Recommendation**

1. Publish 32, 48 and 64 px WebP or AVIF variants on R2 and use `srcset`/`sizes`. Stat icons (`/data/stats/*.webp`, 64 px drawn at 20 px) also qualify.
2. Add `width`/`height` attributes.
3. Add `Timing-Allow-Origin: https://dofusforge.com` to the assets worker.

**Source**

- The item icon component that builds `assets.dofusforge.com/items/*-128.png`
- `statIconUrl()`

### P7. Home preloads 50 JS modules; first-party JS is about 300-350 KB brotli on every page. Severity: Medium

**Evidence**

- The `/` HTML has 50 `<link rel="modulepreload">` entries, including BuilderPage, spellCalc, ItemFacts and about 20 single-icon lucide chunks.
- First-party script transfer per page:

| Page | First-party JS (brotli) |
|---|---|
| Home | 347 KB |
| Class | 308 KB |
| Set | 312 KB |
| Guide | 305 KB |

- The largest chunks:

| Chunk | Gzip | Notes |
|---|---|---|
| `react` | 69 KB | |
| `index` (supabase) | 59 KB | |
| `router` | 41 KB | |
| `ChangelogModal` | 43 KB | Loaded on demand, so it is fine as is |

- With third parties blocked, the long tasks that remain on mobile are 120-260 ms. That points to hydration of an 860-1100-node DOM.

**Recommendation**

1. Fold the lucide icon chunks into one shared `icons` manualChunk.
2. Keep the Optimizer, Changelog and Compare code out of the route's preload set.
3. Break up hydration-time work: defer the stores' `persist` rehydration and data loaders to after first paint.

**Source**

- `vite.config.ts:93-103` (`manualChunks`)
- The route modules under `src/pages/`

### P8. Caching gaps: locale JSON and fonts get `max-age=0`. Severity: Low

**Evidence**

- `/locales/en/translation.json?v=0.4.8` (47 KB) is served with `public, max-age=0, must-revalidate` although its URL is versioned.
- Fonts have the same problem; see P2.
- Correct already:
  - `/assets/*` is immutable for 1 year.
  - `/data/*` gets 1 day plus `stale-while-revalidate=604800`.
  - HTML gets `max-age=0, must-revalidate` but is a CF-Cache HIT.

**Recommendation**

Add `/locales/*  Cache-Control: public, max-age=86400, stale-while-revalidate=604800` (or longer) to `public/_headers`.

**Source**

`public/_headers`

### P9. No Speculation Rules. Severity: Low

**Evidence**

- `preload_check.py` scored 50/100 on all four pages: no `speculationrules`, no `fetchpriority` hint.
- bfcache is safe: no `no-store`, no `unload` or `beforeunload` listeners.
- The LCP element is text on every page, so `fetchpriority` on an image does not apply.

**Recommendation**

Add `<script type="speculationrules">` with `prefetch` (moderate eagerness) for internal `/classes/*`, `/sets/*` and guide links. Because pages are prerendered, a prefetched navigation paints almost instantly.

**Source**

`src/root.tsx` (`Layout`)

### P10. First guide visit had a 1.8 s TTFB. Severity: Info

**Evidence**

- One cold request to `/damage-guide` took 1,831 ms to first byte.
- Repeat requests were CF-Cache HITs at 0.41-0.56 s.
- Other pages measured 0.37-0.52 s, well under the 0.8 s "good" threshold.

**Recommendation**

Keep an eye on it. Consider Cloudflare Tiered Cache, or a warm-up after each deploy for the 145 prerendered paths.

**Source**

`wrangler.jsonc`

## What works

- Prerendered (SSG) HTML at about 10.7 KB brotli (68 KB raw), served from Cloudflare's edge cache. TTFB is 0.37-0.56 s.
- The LCP element is server-rendered text, not a client-fetched image. Mobile FCP equals LCP on every page.
- Render-blocking CSS is small: 5 files, about 32 KB brotli.
- Hashed `/assets/*` are immutable for 1 year, and the game data sits behind a version query string with `stale-while-revalidate`.
- Brotli is used for JS and JSON. bfcache-friendly. Images are small WebP class portraits with width/height set.
- Desktop TBT is 0 ms on every page. Without throttling, the first-party build scores 98-100 on local Lighthouse (`lighthouse-reports/`).
- Mobile CLS is ≤0.002 on home, class and set when the hydration/AdSense spike does not fire.
- Consent mode v2 defaults run before GTM, and GTM only loads on the production host.

## Prioritised actions

| Action | Fixes | Expected impact |
|---|---|---|
| Fix hydration #418 and load AdSense after hydration | P1 | Desktop CLS 1.0 → about 0.01 |
| Fonts: WOFF2, subset, immutable cache, fallback metrics | P2 | About 400 KB saved; desktop home LCP from 3-9 s to about 1.4 s; guide CLS → 0 |
| Delay GTM and AdSense | P3 | Mobile TBT down 100-400 ms; better INP |
| Lazy-load the equipment catalog | P4 | 541 KB transfer and a 4.8 MB parse removed from home first load |
| Load the Supabase SDK only when needed | P5 | 61 KB less per page; no header shift |
| Smaller icon variants | P6 | 50-70% less image weight on class and set pages |
