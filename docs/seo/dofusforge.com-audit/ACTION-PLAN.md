# dofusforge.com — SEO Action Plan (home page first)

Ordered by impact on ranking `https://dofusforge.com/` and its locale homes.

## Phase 1 — Critical (week 1, code only, no design decisions)

- [ ] **Fix React hydration error #418** (text mismatch server vs client) → removes desktop CLS ≈ 1.0. Build non-minified, read the exact node, fix in `src/root.tsx` / shell components. Then load AdSense after hydration.
- [ ] **Real 404 for unknown paths** (status 404 + `noindex`), including deleted builds/profiles. `src/worker/index.ts`.
- [ ] **Fonts**: WOFF2 + subset, `font-display: swap`, cache rule. `src/ui/design-v04.css`, `public/_headers`.
- [ ] **Cache rules** in `public/_headers` for `/fonts/*`, `/brand/*`, `/locales/*`.

## Phase 2 — High (weeks 2–3)

- [ ] Home meta descriptions ≤ 155 chars in 4 locales; FR titles ≤ 60 chars (`seo_*`, `*_seo_title` keys).
- [ ] Home crawlable content block under the app: what it is, features, linked class list, short FAQ, 4 locales, FR uses "stuff"/"stuffeur" naturally. Plain text, no decoration. **Needs owner review of copy/layout before applying.**
- [ ] Home internal links: classes, sets index, guides. Logo on home → `/`.
- [ ] Remove duplicated H2s on home (desktop + mobile trees both in DOM).
- [ ] Locale-aware JSON-LD `@graph`: Organization (`sameAs` X/Discord/GitHub, `@id`), WebSite, WebApplication only on home, WebPage with `inLanguage`. Locale OG image on `/es`, `/fr`, `/pt`. `src/root.tsx`, `src/seo/useSeoMeta.ts`.
- [ ] Language switcher as real `<a href hreflang>` links. `src/ui/LanguageSwitcher.tsx`.
- [ ] Class page H1: "Feca build — Dofus 3" style; link class pages from home and footer. `src/pages/ClassGuidePage.tsx`.
- [ ] Defer `equipment.json` and Supabase SDK until needed on home.

## Phase 3 — Content & authority (month 2)

- [ ] Guides: author, published/updated date, game version, Article schema, in-body links.
- [ ] Set pages: how to obtain (drop/dungeon/recipe); hide empty Community builds block.
- [ ] FR "meilleurs stuffs par niveau/élément" hub (prerendered).
- [ ] Item pages `/items/<slug>` (long-tail item/monster queries).
- [ ] Item icons WebP/AVIF; lazy stat icons on `/sets`.
- [ ] Off-site: Reddit r/Dofus, JOL/Ankama forums, Discord, YouTube creators.

## Phase 4 — Monitoring

- [ ] Connect Search Console + CrUX to claude-seo (`~/.config/claude-seo/google-api.json`) and re-audit.
- [ ] Compare against the 2026-11-04 Search Console baseline ("dofus planner" pos 6.3).
- [ ] IndexNow; sitemap lastmod from real data; HSTS 1 year in Cloudflare dashboard.
