# Technical SEO findings: dofusforge.com

Audit date: 2026-11-22. Method: every URL in `https://dofusforge.com/sitemap.xml` (2,348 URLs, all 4 locales, all 14 page types) was fetched once and parsed for status, title, meta description, H1, canonical, meta robots, hreflang, `<html lang>`, internal links, word count and JSON-LD. On top of that: `transport_check.py` (TLS, headers, redirects), `render_page.py --mode always` (raw vs rendered HTML) on 4 page types, `page_checks.py` on 4 pages, `preload_check.py` on a set page, and manual probes of redirects, error paths and crawler user agents. Chromium ran with its sandbox on. Core Web Vitals field data (CrUX/PSI) was **not** measured.

## Technical score: 84/100

| Category | Status | Score | Checks behind the score |
|---|---|---|---|
| Crawlability | pass | 88 | robots.txt valid and open; sitemap valid and declared; 2,348/2,348 sitemap URLs 200 with no redirect; no orphans; max click depth 3. Minus: locales linked to each other only through hreflang. |
| Indexability | warn | 72 | 2,348/2,348 self-canonical, `index, follow`, `<html lang>` correct, hreflang identical to sitemap. Minus: soft 404 on any unknown path; post-deploy builds served with conflicting hreflang; a few duplicate titles/descriptions. |
| Security | warn | 80 | HTTPS enforced (301, 1 hop), TLS 1.3, valid cert (43 days left, auto-renewed), nosniff, XFO, Referrer-Policy, Permissions-Policy. Minus: HSTS 30 days at the edge, CSP report-only. |
| URL structure | pass | 90 | Lowercase, hyphenated, ≤68 chars, no parameters, trailing slash and www 301 to canonical. Minus: http://www is 2 hops; `.html` variants 307. |
| Mobile | pass | 95 | Viewport meta on 2,348/2,348 pages, no zoom lock. Touch targets not measured here. |
| Core Web Vitals | not measured | n/a | No field data. Lab hints only (see M3). |
| Structured data | pass | 95 | 456 JSON-LD blocks on 120 sampled pages, 0 parse errors, all in raw HTML (WebSite, WebApplication, BreadcrumbList, ItemList). Validation in depth belongs to the schema audit. |
| JS rendering | pass | 100 | Prerendered (SSG). `js_gap` on home, set, class and build pages: 0 words, 0 links, title/canonical/robots unchanged. |
| IndexNow | fail | 0 | No key file or submission code found. Low weight. |

Weighted overall (crawl 20, index 25, security 10, URL 10, mobile 10, SD 10, JS 10, IndexNow 5): **84**.

## What works

- Every page that matters is real prerendered HTML: raw and rendered DOM are identical (0-word JS gap on home, `/es/sets/gobball-set`, `/fr/classes/iop`, a build page).
- All 2,348 sitemap URLs return 200 directly, with a self-referencing canonical, `index, follow`, the right `<html lang>`, and exactly one H1.
- hreflang is complete and reciprocal on every page (en/es/fr/pt + x-default), and the `<head>` set is byte-identical to the sitemap's `xhtml:link` set on all 2,348 URLs.
- Canonical host and slash policy are enforced with 301s: `/explore/` → `/explore`, `/es/` → `/es`, `www` → apex, `http` → `https` (one hop on the apex).
- `/en/*` mirrors resolve (200) but canonicalize to the bare English URL and are not linked or listed.
- `/sets/<unknown>` and `/classes/<unknown>` return a real 404 (`PRERENDERED_ONLY` in `src/worker/index.ts`).
- `noindex, follow` on `/my-builds` and `/account`, which are excluded from the sitemap.
- Click depth: every indexable page is within 3 clicks of its locale home (1: 9 hubs, 2: 570, 3: 7 builds). 0 orphan pages; every set page has 2–107 internal inlinks (median 7).
- TLS 1.3, Google Trust Services cert covering apex + wildcard; X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy on every response.
- Structured data in raw HTML, valid JSON. Viewport tag on every page. Titles are unique across 2,318 of 2,348 URLs.
- Pages are edge-cached (`CF-Cache-Status: HIT`, zstd), HTML ≤ 705 KB (largest: `/sets` index), well under Googlebot's 2 MB fetch cap.

---

## High

### H1. Soft 404: unknown paths, missing builds and missing profiles return 200 + `index, follow`
- **Severity:** High
- **Evidence:**
  - `https://dofusforge.com/this-page-does-not-exist` → 200, title "Dofus Forge — Dofus 3 Build Planner…", `robots: index, follow`, canonical `https://dofusforge.com`
  - `https://dofusforge.com/es/this-does-not-exist` → 200, same
  - `https://dofusforge.com/Explore` (wrong case) → 200, home title, canonical home
  - `https://dofusforge.com/build/abc` and `/build/00000000-0000-0000-0000-000000000000` → 200, home title, canonical home, 5 words of body
  - `https://dofusforge.com/u/nonexistentuser123` → 200, same
  - `https://dofusforge.com/admin`, `https://dofusforge.com/c/abc` → 200, `index, follow`
- **Why it matters:** a build or profile that is deleted or made private after Google indexed it never returns 404/410; it turns into a 200 copy of the home page, so Google keeps re-crawling it and reports "Soft 404" or "Duplicate, Google chose different canonical" instead of dropping it. Any typo or junk link creates another indexable home duplicate.
- **Recommendation:** in the Worker, answer with the SPA fallback **and status 404** (plus `X-Robots-Tag: noindex`) unless the path matches a known client-only route. Concretely: `serveAsset` should return 200 only for `^(/(en|es|fr|pt))?/(c/[^/]+|admin(/.*)?|my-builds|account)?$`-style allowlisted SPA routes and 404 otherwise; `serveBuildPage` should return 404 (or 410) when `fetchBuildPageMeta` finds no row; `serveProfilePage` 404 when `profileExists` is false. Private builds can keep the 200 app shell but should carry `X-Robots-Tag: noindex`. The existing `public/404.html` (already `noindex`) is unused by the Worker today.
- **Source:** `src/worker/index.ts` (`serveAsset` lines ~58–65, `serveBuildPage` ~77–94, `serveProfilePage` ~96–104, `PRERENDERED_ONLY` regex); `wrangler.jsonc` (`not_found_handling: "none"`, `run_worker_first`).

## Medium

### M1. Builds not yet prerendered are served with the home page's hreflang set and an empty body
- **Severity:** Medium
- **Evidence:** the SPA fallback (`https://dofusforge.com/build/abc` raw HTML) carries `<link rel="alternate" hrefLang="en" href="https://dofusforge.com"/>` … `x-default` → home, `robots: index, follow`, 5 words of body text. For a real public build published after the last deploy, `rewriteBuildMeta` rewrites title, description, canonical and OG tags, but **not** the hreflang links, so the page declares `canonical=/build/<id>` while its alternates point at `/`, `/es`, `/fr`, `/pt`. All content is then client-rendered.
- **Recommendation:** add `link[rel="alternate"][hreflang]` handlers to the `HTMLRewriter` chain (en/es/fr/pt/x-default → `/{lang}/build/<id>`), and for `unlisted` builds add `<meta name="robots" content="noindex">` there too. Longer term, regenerate prerendered build pages more often (see sitemap finding S1).
- **Source:** `src/worker/index.ts` `rewriteBuildMeta` (~lines 208–250); fallback head from `src/root.tsx` (line ~159).

### M2. Language versions are not linked to each other with crawlable `<a href>`
- **Severity:** Medium
- **Evidence:** a breadth-first crawl of `<a href>` links from `https://dofusforge.com` reaches 587 of 2,348 sitemap URLs, all English; the same holds from `/es`, `/fr`, `/pt` (587 each, own locale only). The language switcher is a `navigate()` call inside the settings modal, not a link.
- **Why it matters:** Google can still find the other locales via hreflang and the sitemap, so this is not blocking, but crawl priority and internal PageRank for `/es`, `/fr`, `/pt` pages rely entirely on those two hints, and other engines/AI crawlers that ignore hreflang only see one language.
- **Recommendation:** render a small language list in the footer (or header) as plain `<a href="/es/sets/gobball-set" hreflang="es" lang="es">Español</a>` links to the equivalent page, reusing `seoTags(lang, path).alternates`.
- **Source:** `src/ui/LanguageSwitcher.tsx` (uses `useNavigate`), `src/components/SettingsModal.tsx`, footer component under `src/components/`.

### M3. Page-weight hints that can hurt LCP/CLS (lab only, no field data)
- **Severity:** Medium (potential; confirm with CrUX/PSI)
- **Evidence:**
  - `https://dofusforge.com/sets/gobball-set`: 25 `<link rel="preload" as="image">` to `assets.dofusforge.com/items/*.png`, none with `fetchpriority="high"` (`preload_check.py` score 50). React 19 emits these automatically for every server-rendered `<img>` without `loading="lazy"`.
  - Home: 48 preload/modulepreload hints.
  - `page_checks.py`: `images-missing-dimensions` on set, class and explore pages (e.g. `<img src=".../16041-128.png" alt="Gobball Headgear" decoding="async"/>` with no width/height); `first-image-lazy-loaded` on `/` and `/es/explore`.
- **Recommendation:** give item `<img>` explicit `width`/`height` (64 or 128); add `loading="lazy"` to item images below the first viewport so React stops preloading them; mark the one true hero image `fetchPriority="high"`; don't lazy-load the first image on home/explore. Then verify with PageSpeed Insights / CrUX.
- **Source:** `src/pages/SetPage.tsx` line ~90 (`<img src={it.image_url} alt={it.name} decoding="async" />`), class/explore card components.

## Low

### L1. HSTS is 30 days at the edge, overriding the repo's 1-year value
- **Severity:** Low
- **Evidence:** every response: `Strict-Transport-Security: max-age=2592000`. The repo sets `max-age=31536000` in `public/_headers` and `src/worker/securityHeaders.ts`, so the live value comes from the Cloudflare dashboard HSTS setting (SSL/TLS → Edge Certificates), which replaces the origin header. No `includeSubDomains`.
- **Recommendation:** raise the dashboard HSTS to 12 months with includeSubDomains (all subdomains such as `assets.` are HTTPS), or turn the dashboard setting off so the repo header applies. Preload only after that.
- **Source:** Cloudflare dashboard; `public/_headers`, `src/worker/securityHeaders.ts`.

### L2. Content-Security-Policy is report-only
- **Severity:** Low (security, not ranking)
- **Evidence:** `content-security-policy-report-only: … script-src 'self' 'unsafe-inline' …`; no enforcing CSP.
- **Recommendation:** switch to enforcing as planned once reports are clean (comment in `securityHeaders.ts`, `docs/security/CLOUDFLARE_HARDENING.md`).
- **Source:** `src/worker/securityHeaders.ts`, `public/_headers`.

### L3. Meta descriptions too long on 93% of pages; titles long on 60%
- **Severity:** Low (display heuristic, not a ranking rule)
- **Evidence:** 2,183/2,348 descriptions exceed 160 chars. Median by type: set pages 203 (max 233), home 192, how-to-use 180, forge-guide 181, sets index 182. 1,413 titles exceed 60 chars, 238 exceed 70 (max 89: `/fr/sets/eternal-gardens-sanctuary-set` "Panoplie du Sanctuaire des Jardins Éternels (Niv. 200) — Bonus, objets et stats | Dofus 3"). Class titles median 71, sets index 76.
- **Recommendation:** front-load the key terms and keep descriptions ≈150 chars; for set pages drop the trailing generic sentence after the full-set totals; shorten the " — Bonus, objets et stats | Dofus 3" suffix for long set names.
- **Source:** `META` in `src/seo/useSeoMeta.ts`; set/class/sets SEO strings in `public/locales/*/translation.json` used by `src/pages/SetPage.tsx`, `ClassGuidePage.tsx`, `SetsPage.tsx`.

### L4. Duplicate titles and descriptions
- **Severity:** Low
- **Evidence:**
  - Two different in-game sets share a name: `/sets/abyss-set` and `/sets/abyss-set-956` both "Abyss Set (Lvl 200) — Bonuses, Items & Stats | Dofus 3" (also duplicate in `/pt/`). In Spanish, `/es/sets/depths-set` and `/es/sets/chasm-set` both "Set de la sima (Nv. 200)…".
  - Profile titles are identical across the 4 locales (`wembie — Dofus Forge` on `/u/wembie`, `/es/u/wembie`, …) for all 6 profiles (24 URLs).
  - Build pages without a user description share a template description: 17 Sram builds have "Dofus 3 Sram build at level 200 — view equipment, stats and set bonuses…" (per locale, 16 groups / 104 URLs).
- **Recommendation:** disambiguate same-name sets in the title (e.g. add the item count, element, or the slug suffix's distinguishing piece); localize the profile title template ("Builds de wembie — Dofus Forge"); put the build name and key stats (elements, AP/MP) into the build description.
- **Source:** `src/data/setGuide.ts` (`setSlugs`, slug `-956` suffix), `src/pages/SetPage.tsx`, `src/pages/UserProfilePage.tsx` (line ~152), `build_detail_seo_description` key + `src/pages/BuildDetailPage.tsx` (line ~244), `src/worker/index.ts` `rewriteBuildMeta`.

### L5. Thin, near-duplicate locale copies of user content (builds and profiles)
- **Severity:** Low
- **Evidence:** 31 builds × 4 locales = 124 URLs and 6 profiles × 4 = 24 URLs. The H1 and user text are identical across locales (e.g. "Selo Full empujes Suerte/Agi" on all 4 `/build/19c6054f-…` URLs); only interface chrome is translated. Profiles have 167–481 words and 46–62-char descriptions.
- **Recommendation:** acceptable as-is (hreflang ties them together). If Search Console shows these as "Crawled – currently not indexed", consider indexing only the author's language version and `noindex`-ing the others, or enriching profiles (class mix, build count, top build summary).
- **Source:** `react-router.config.ts` (`withPrefixes` over `dynamicPages()`), `src/pages/BuildDetailPage.tsx`, `src/pages/UserProfilePage.tsx`.

### L6. Class guide H1 reads "IopStrength"
- **Severity:** Low
- **Evidence:** `https://dofusforge.com/classes/iop` raw HTML: `<h1><span class="rd-class-title" …><img … alt=""/>Iop<span class="rd-element">Strength</span></span></h1>`; plain text extraction gives "IopStrength" (ES `/es/classes/cra`: "OcraAgilidad"); extractors that insert spaces at element boundaries get "Iop Force" on the FR page. The title says "Iop build & stuff guide", the H1 is only the class name plus an element chip.
- **Recommendation:** make the H1 the topic ("Iop build guide — Dofus 3") and move the element chip outside the `<h1>`, or at least add a space/separator.
- **Source:** `src/pages/ClassGuidePage.tsx` (`title={…}` prop, line ~87) rendered by `src/features/reading/Reading.tsx` line 69.

### L7. Redirect chain on `http://www` and temporary redirects on `.html`
- **Severity:** Low
- **Evidence:** `http://www.dofusforge.com/es/explore` → 301 `https://www.dofusforge.com/es/explore` → 301 `https://dofusforge.com/es/explore` (2 hops). `https://dofusforge.com/index.html` → **307** `/`; `/explore.html` → 307 `/explore`; `/__spa-fallback.html` → 307.
- **Recommendation:** make the www Redirect Rule match `http://www.*` too and target `https://dofusforge.com/${1}` directly; optionally add a 301 rule for `*.html` page paths (Workers assets `html_handling` only emits 307).
- **Source:** Cloudflare dashboard Redirect Rules; `wrangler.jsonc` `html_handling: "drop-trailing-slash"`.

## Info

- **I1. Cloudflare AI Labyrinth is on.** Requests with unverified bot user agents (spoofed Googlebot, bingbot) get a hidden `<a href="/cdn-cgi/content?id=…" rel="nofollow noopener" style="display:none">` injected; normal browsers and GPTBot/OAI-SearchBot/ClaudeBot/PerplexityBot UAs did not. Cloudflare exempts verified search crawlers, so this should not reach real Googlebot/Bingbot; confirm in Search Console's URL Inspection HTML that no `/cdn-cgi/content` link appears.
- **I2. IndexNow not implemented.** No key file or submission code. Adding it (key file in `public/`, a post-deploy ping with changed set/build URLs) speeds Bing/Yandex discovery, which also feeds Copilot.
- **I3. Second `<title>` in the body.** The footer flag SVG contains `<title>COLOMBIAN PRIDE · COFFEE · FLOWERS · BIODIVERSITY</title>` on every page. Search engines use the `<head>` title, but naive parsers/scrapers read the last `<title>`. Use `aria-label` on the SVG instead. (Footer component, see `src/data/changelog.ts` line 655 for the feature.)
- **I4. `og:locale` values** are `es_ES`, `fr_FR`, `pt_PT`; the Portuguese copy reads Brazilian. Consider `pt_BR` (`src/seo/useSeoMeta.ts` line 101). Not a ranking factor.
- **I5. HTML cache policy:** `Cache-Control: public, max-age=0, must-revalidate` with edge HIT; lab TTFB from one location 0.33–1.6 s typical with outliers to 5.5 s on a first MISS. Not field data.
- **I6. robots.txt** is `User-agent: * / Allow: /` + sitemap. No AI-crawler rules, so all search and AI crawlers are allowed (consistent with being cited). `/admin` relies on canonical-to-home rather than a disallow; fixing H1 covers it.
- **I7. Collections (`/c/:id`)** are client-only, canonical to home, and not in the sitemap, so they can never be indexed. Fine if intended.
