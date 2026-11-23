# dofusforge.com — Full SEO Audit (2026-11-22)

Tool: claude-seo v2.6.2. Public data only: no Search Console, CrUX, GA4 or Moz credentials; PageSpeed Insights hit its keyless quota, so performance numbers are lab measurements (Playwright + CDP throttling, local Lighthouse 13.5 for the agentic check). Browser sandbox stayed on.

Business type: free web tool / gaming utility (Dofus 3 build planner), 4 locales (en at `/`, es, fr, pt). 2,348 URLs in the sitemap (2,088 set pages, 124 builds, 76 class pages, 24 profiles, 36 static/guide pages).

**Owner priority: rank the home page `https://dofusforge.com/` (and `/fr`, `/es`, `/pt`) for "dofus planner", "dofus builder", "dofus stuff/stuffeur".**

## SEO Health Score: 69 / 100

| Category | Weight | Score |
|---|---|---|
| Technical SEO | 22% | 84 |
| Content Quality | 23% | 62 |
| On-Page SEO | 20% | 68 |
| Schema / Structured Data | 10% | 68 |
| Performance (CWV, lab) | 10% | 55 |
| AI Search Readiness | 10% | 63 |
| Images | 5% | 78 |

## Top 5 critical issues

1. **React hydration error #418 on every page → desktop CLS ≈ 1.0 on home** (14/18 runs; LCP up to 8.9 s). React discards the prerendered DOM and re-renders; while AdSense loads, desktop paints an unstyled frame. — `src/root.tsx`
2. **Soft 404s**: any unknown path (`/admin`, `/xyz`, deleted builds/profiles) returns 200 with the home title and `index, follow` — duplicates of the home page. — `src/worker/index.ts` (`serveAsset`, `serveBuildPage`, `serveProfilePage`)
3. **Home is ~107 words of real content** (app UI only, rendered twice for desktop/mobile). "What is Dofus Forge", features and FAQ live only on `/about`; FR "stuffeur" appears nowhere. — `src/pages/BuilderPage.tsx`, `src/pages/AboutPage.tsx`
4. **Class pages: H1 renders "FecaStrength"/"FécaForce" on all 76 URLs**, no "build"/"Dofus 3"; pages are weakly linked (only from About and other class pages). — `src/pages/ClassGuidePage.tsx:87-91`, `src/components/SiteFooter.tsx`
5. **Web fonts 544 KB WOFF (not WOFF2, not subset) with `max-age=0`**; with fonts blocked desktop home LCP drops 3–9 s → 1.36 s. — `src/ui/design-v04.css:1-4`, `public/_headers`

## Top 5 quick wins

1. Meta descriptions ≤ 155 chars (93% of pages over 160; home 172–197). — `seo_*` keys in `public/locales/*/translation.json`, `src/seo/useSeoMeta.ts`
2. `_headers` cache rules for `/fonts/*`, `/brand/*`, `/locales/*`.
3. Real `<a href hreflang>` language links (switcher is a `navigate()` in a modal; from `/` only 587/2,348 URLs are reachable by links). — `src/ui/LanguageSwitcher.tsx`
4. Home logo link points to a long `?b=` build URL → point to `/`. — `src/pages/BuilderPage.tsx:58-75`
5. FR titles 63–78 chars get cut before "Dofus 3". — `set_page_seo_title`, `class_guide_seo_title`, `sets_seo_title`, `dmgguide_seo_title`

## Technical SEO — 84

Works: all 2,348 sitemap URLs 200 + self-canonical, `index, follow`, one H1, correct `lang`, reciprocal hreflang matching sitemap, prerendered HTML = rendered HTML, slash/www/http 301, depth ≤ 3, valid sitemap.

Issues: soft 404s (High); new builds served from app shell keep home hreflang and ~5 words (Medium); locales not linked to each other (Medium); 25 auto-preloads per set page (Medium); sitemap refreshes only on deploy (Medium); live HSTS 30 days (Cloudflare overrides repo); CSP report-only; lastmod missing on 140 URLs and identical across set pages; `http://www` takes 2 hops; `.html` → 307; IndexNow not set up. Details: `findings/technical.md`, `findings/sitemap.md`.

## Content Quality — 62

Thin home; class pages are game data, not build guides (SERP for "feca build dofus 3" is all hand-written guides); set pages lack "how to get" (drop/dungeon/recipe) and 84% show an empty Community builds block; guides lack author/date/game version; build/profile pages near-duplicate across locales; no item pages despite item/monster long-tail demand; "meilleurs stuffs par niveau/élément" intent unserved. Strength: damage guide is excellent, citable content. Details: `findings/content.md`, `findings/sxo.md`.

## On-Page SEO — 68

Titles unique and well localized. Problems: descriptions too long, FR titles too long, class H1 concatenation, duplicated H2s on home (desktop + mobile trees), footer H2s on every page, guides with no in-body links, duplicate titles (`abyss-set`/`abyss-set-956`, ES `depths-set`/`chasm-set`), untranslated profile titles, inconsistent smithmagic terminology within a locale. Details: `findings/onpage.md`.

## Schema — 68

Valid everywhere (77 blocks, no fake ratings, breadcrumbs match canonicals). Missing: locale-aware `@graph` with `@id`s, Organization with `sameAs` (X, Discord, GitHub), per-page WebPage with `inLanguage`/`dateModified`, Article for guides, ProfilePage, CreativeWork for builds, richer set ItemList. Same English WebApplication/WebSite + `og-v04-en.jpg` on `/es`, `/fr`, `/pt`. `/classes` serves the app shell with the home canonical. FAQPage on `/about` is valid but FAQ rich results are retired. Details + ready snippets: `findings/schema.md`.

## Performance — 55 (lab)

| Page | Mobile LCP | Mobile TBT | Desktop LCP | Desktop CLS |
|---|---|---|---|---|
| Home | 2.0–3.75 s | 290–480 ms | 1.5–8.9 s | **1.006** |
| /classes/feca | 2.0–2.9 s | 410–780 ms | 1.9 s | 0.001 |
| /sets/gobball-set | 2.2 s | 920 ms | 2.6 s | 0.002 |
| /damage-guide | 3.2 s | 290 ms | 1.3 s | 0.02–0.76 |

Causes: hydration error; 544 KB fonts uncached; GTM + AdSense (~450 KB, 100–400 ms TBT); home loads full `equipment.json` (541 KB br / 4.8 MB parse) before a class is picked; Supabase SDK on every page. Validate CLS against Search Console's Core Web Vitals report. Details: `findings/performance.md`, `findings/visual.md`, `screenshots/`.

## Images — 78

No missing alt, local icons WebP, per-page OG cards 1200×630. Item icons on `assets.dofusforge.com` PNG only (WebP q85 −69%); `/sets` = 688 KB HTML with 3,048 eager images; 83% without width/height; `/brand/*` `max-age=0`; no `twitter:site`; no image sitemap. Details: `findings/images.md`.

## AI Search Readiness — 63

All AI crawlers allowed, content in raw HTML, accessibility tree passes 33/33, Lighthouse Agentic Browsing mobile 2/2, desktop 1/2 (CLS). Gaps: thin entity graph, guides without dates/byline, no answer-first passages, no third-party brand mentions found (Reddit/YouTube), no llms.txt (optional), no Content-Signal. Details: `findings/geo.md`, `findings/agentic.md`.

## Off-site (biggest lever for the home page, not fixable in code)

No external mentions of Dofus Forge were found. Ranking the home for head terms needs links and mentions: Ankama/JOL forums, Reddit r/Dofus, Discord communities, YouTube build creators, fan wikis.
