# Images — dofusforge.com

Audit date: 2026-11-22. Method: I parsed the raw prerendered HTML of 30 sitemap URLs (all 4 locales, every route type). `parse_html.py --probe-images` then fetched each image the way a browser would, to see the format actually served. I checked every distinct OG image for HTTP status, magic bytes and pixel size, and ran a WebP/AVIF conversion test on 8 real item icons with `sharp` (the version already in the project).

## Score: 78 / 100

| Area | Weight | Score | Note |
|---|---|---|---|
| Alt text | 20 | 19 | 0 of 7,610 `<img>` lack `alt`; empty alts are decorative icons next to text |
| Format and weight | 20 | 12 | All local icons are WebP; the item icons on R2 are PNG only (−39 % lossless / −69 % lossy as WebP) |
| CLS (dimensions) | 15 | 11 | 83 % have no `width`/`height`, but the CSS sets fixed boxes |
| Loading strategy | 15 | 11 | Below-fold item art is lazy and hero pieces are eager. 2,527 stat icons on `/sets` are eager |
| OG / social images | 20 | 18 | Per-locale and per-entity 1200×630 cards on every route, all resolving |
| Caching / delivery | 10 | 7 | R2 items are immutable for 7 days and data icons cached for 1 day; `/brand/*` (OG and logo) has `max-age=0` |

## Inventory by page type (raw HTML, EN; other locales are identical)

| Page | `<img>` | Formats served | Missing `alt` | `alt=""` | No width/height | `loading=lazy` |
|---|---|---|---|---|---|---|
| `/` (home) | 38 | WebP (class icons 64 px) | 0 | 38 | 0 | 38 |
| `/sets` | 3,048 | 2,521 WebP stat icons, 521 PNG item icons, 6 PNG | 0 | 2,087 | 2,527 | 521 |
| `/sets/gobball-set` | 123 | 85 WebP, 16 PNG stat icons, 22 PNG items | 0 | 103 | 117 | 34 |
| `/classes/feca` | 158 | 75 WebP, 61 PNG items, 22 PNG spells | 0 | 154 | 157 | 102 |
| `/build/{id}` | 167 | 114 WebP, 53 PNG | 0 | 142 | 128 | 27 |
| `/about`, `/explore`, `/u/{user}` | 19 / 24 / 11 | WebP class icons | 0 | all | all | all |
| Guides, `/shortcuts`, `/privacy`, `/terms` | 0 | — | — | — | — | — |

No image is oversized. The biggest content image is a 19.7 KB item icon; the class and stat icons are 1.1–3.2 KB, 64×64. No page uses `srcset`, `<picture>` or `fetchpriority`. No image sits above the fold on the guides, and the item and class icons have fixed display sizes, so neither gap costs anything today.

### OG / Twitter images

| Page type | `og:image` | Served | Size |
|---|---|---|---|
| Home, guides, about, explore, sets index, profiles, legal | `/brand/og-v04-{en,es,fr,pt}.jpg` (per locale) | 200 `image/jpeg`, 1200×630 | 97–105 KB |
| Set pages | `/og/{lang}/set/{slug}.png?v=3.7.12.12-mineral04` | 200 `image/png`, 1200×630 | ~92 KB |
| Class pages | `/og/{lang}/class/{id}.png?v=…` | 200 `image/png`, 1200×630 | ~99 KB |
| Build pages | `/og/{lang}/{uuid}.png?v={updated_at}-…` | 200 `image/png`, 1200×630 | ~88 KB |

Every page declares `og:image:type`, `og:image:width`/`height` (1200/630, which match the real pixels), `og:image:alt`, `twitter:card=summary_large_image`, `twitter:image` and `twitter:image:alt`.

## What works

- **No missing `alt` on any of the 7,610 images.** The empty alts are correct: they sit on stat icons next to the stat name (`<img alt=""><b>+50</b><span>Intelligence</span>`), item icons next to an `<h3>` with the item name, and class portraits next to the class name. Where the image is the only label, it carries a real name: the hero pieces on set pages (`alt="Gobball Headgear"`), the equipment on build pages (`alt="Hat: Malitiamen Hat"`) and the element icons on set cards (`alt="Intelligence"`).
- **Local icons are WebP**: `/data/classes/*.webp` and `/data/stats/*.webp`, at 64×64 and 1–3 KB.
- **Lazy loading is used correctly where it matters.** Item art below the fold is `loading="lazy" decoding="async"`, and the set-page hero pieces (above the fold) are eager.
- **Fixed CSS boxes prevent layout shift** even without attributes. For example, `.sp-tile img { width: 50px; height: 50px }` in `src/features/set-guide/set-pages.css:362`, plus `48×48` attributes on set-card and related-set art.
- **OG cards are per locale and per entity**, have the right size, carry the right MIME type, and use versioned URLs, so link-preview caches refresh after edits (`?v=` in `BuildDetailPage.tsx`, `pageOgImage()`). They are pre-rendered to R2 (`scripts/og-pregenerate.ts`).
- **R2 item art** returns `Cache-Control: public, max-age=604800, immutable` from `assets.dofusforge.com`.

## Findings

### I1. Item icons are PNG-only (about 1,350 requests across the sample) — Medium
**Evidence:** `https://assets.dofusforge.com/items/{id}-128.png` is the only variant (`…-128.webp` → 404). The probe shows `served_format: png` and `negotiated: false` (no `Vary: Accept`), at 8.4–19.7 KB per icon. A set page loads 22 of them, a class page 61, a build page 27, and `/sets` loads up to 521 as the user scrolls. Conversion test on 8 real icons (128×128 RGBA) with `sharp` 0.35.5:

| Format | Total | vs PNG |
|---|---|---|
| PNG (served) | 106,981 B | — |
| WebP lossless | 65,238 B | −39 % |
| WebP q85, alphaQuality 90 | 33,030 B | −69 % |
| AVIF q60 | 25,269 B | −76 % |

At the q85 ratio, a set page drops from ~300 KB to ~95 KB of item art, and a full scroll of `/sets` (521 icons) drops from ~7 MB to ~2.2 MB.
**Recommendation:** In the upload step, also write `{id}-128.webp` next to each PNG with `sharp(png).webp({ quality: 85, alphaQuality: 90, effort: 6 })`. Lossless is the conservative choice if pixel-art edges matter. Then point `itemImageUrl()` at `.webp`. Keep the PNGs, because `scripts/og-pregenerate.ts` (satori) reads them and older caches link them. R2 cannot negotiate formats, so a URL switch is simpler than `<picture>`. If `<picture>` is preferred anyway:

```html
<picture>
  <source srcset="https://assets.dofusforge.com/items/16041-128.webp" type="image/webp">
  <img src="https://assets.dofusforge.com/items/16041-128.png" alt="Gobball Headgear" width="128" height="128" decoding="async">
</picture>
```

Check that every `.webp` returns 200 before flipping the URL. Today it is a 404.
**Source:** `scripts/upload-items.mjs` (R2 upload); `src/data/loaders.ts` lines ~70–74 (`ASSETS_URL`, `ITEM_ASSETS`, `itemImageUrl`); `scripts/lib/normalize.ts:175` (filename convention); tests `src/data/__tests__/itemImages.test.ts`.

### I2. `/sets` ships 3,048 `<img>` (2,527 eager stat icons) in 688 KB of HTML — Medium
**Evidence:** `/sets` and `/es/sets` are 688–697 KB of raw HTML. Each of the 521 set cards repeats element icons and full-set bonus icons: 2,527 `<img>` with no `loading` and no dimensions. They point to about 30 unique files, so the network cost is small after the first fetch. The DOM, though, is about 3,000 image nodes on top of the rest of the markup, which hurts parse, style and decode time, and INP on low-end phones.
**Recommendation:** Add `loading="lazy" decoding="async" width="16" height="16"` (or the real CSS box) to the stat and element icons in the set cards. Better still, stop rendering all 521 cards at once: render the first bracket (Level 200) fully, and server-render the rest as plain links that expand on demand. The `SetsPage` sections are already per level bracket. Keep every set link crawlable.
**Source:** `src/pages/SetsPage.tsx`, `src/features/set-guide/SetGuideUI.tsx` (card bonus and element chips), `.sp-card-pieces img` / `.sp-element img` in `src/features/set-guide/set-pages.css`.

### I3. `width`/`height` attributes missing on 83 % of images — Low
**Evidence:** 6,311 of 7,610 images have no intrinsic size. These include every stat icon, the set-page item tiles, all 22 spell icons on class pages, and the class portraits on `/about`, `/explore` and `/u/*`. The CSS fixes their boxes (for example `.sp-tile img` at 50×50), so measured CLS should be near zero. However, any icon rendered before its stylesheet applies, or in a container without a fixed box, will shift.
**Recommendation:** Add the real file size as attributes (`width="64" height="64"` for `/data/stats`, `/data/classes` and spells; `128` for item art). CSS still controls the display size. The cheapest place is the shared helpers: wherever `statIconUrl()` is rendered, plus the item tile component.
**Source:** `statIconUrl()` call sites (`src/features/set-guide/SetGuideUI.tsx`, `src/pages/ClassGuidePage.tsx`, `src/pages/BuildDetailPage.tsx`), class portraits in `src/pages/AboutPage.tsx` (`<img src={c.imageUrl} alt="" loading="lazy" />`), `src/pages/ExplorePage.tsx`, `src/pages/UserProfilePage.tsx`.

### I4. `/brand/*` OG images and logo are served with `max-age=0` — Low
**Evidence:** `og-v04-en.jpg`, `og-v04-es.jpg` and `icon-512.png` return `Cache-Control: public, max-age=0, must-revalidate`. `public/_headers` covers `/assets/*` and `/data/*`, but not `/brand/*`. The filenames are already versioned (`v04`).
**Recommendation:** Add a rule to `public/_headers`:

```
/brand/*
  Cache-Control: public, max-age=2592000, stale-while-revalidate=604800
```

Use `immutable` and a year only if every brand file keeps a version in its name. `favicon.svg` and `icon-512.png` are not versioned, hence the 30 days.
**Source:** `public/_headers`.

### I5. Item art carries `alt=""` where a name would add image-search signal — Low
**Evidence:** On set pages the item list repeats the icon next to an `<h3>` (`<img src=".../16041-128.png" alt="">` beside "Gobball Headgear"). Class pages use `alt=""` on set links whose text is the set name, and the `/sets` card lead icon is `alt=""` inside an `aria-hidden` span. All of this is correct for accessibility, because the text is adjacent. But these are the only images on the site that could rank in Google Images for item names ("gobball headgear dofus"), and only the hero copies carry the name.
**Recommendation:** This is optional. On the set-page item list, the `<h3>` already labels the article, so either keep `alt=""` (most accessible) or give the icon the item name and accept one duplicate announcement. If image search is a goal, a better route is an image sitemap (I7) with one entry per item icon on its set page. Do not stuff alts.
**Source:** `src/features/set-guide/SetGuideUI.tsx` (set-page item list), `src/pages/ClassGuidePage.tsx`, `src/pages/SetsPage.tsx`.

### I6. Guides, profiles and explore share the generic brand card; `twitter:site` is missing — Low
**Evidence:** `/damage-guide`, `/forge-guide`, `/how-to-use`, `/explore` and `/u/{user}` all use `og-v04-{lang}.jpg`. Set, class and build pages each get a dedicated card. No page has `twitter:site`, although the footer links `https://x.com/DofusForgeApp`.
**Recommendation:** Add per-guide cards to the existing pre-render pipeline: the formula guide is the most shareable page on the site. Profile cards could reuse the build-card template with the user's top builds. Add `<meta name="twitter:site" content="@DofusForgeApp" />` next to `twitter:card` in `Layout`.
**Source:** `src/root.tsx` (`Layout`, near `twitter:card`), `scripts/og-pregenerate.ts`, `src/worker/index.ts` (OG card routes), `pageOgImage()` in `src/seo/useSeoMeta.ts`.

### I7. No image entries in the sitemap — Info
**Evidence:** `sitemap.xml` (2,348 URLs) declares only the `xhtml` namespace. The 521×4 set cards and 19×4 class cards, all unique 1200×630 images, are discoverable only through `og:image`, which Google Images does not use as a crawl source.
**Recommendation:** Add `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"` and one `<image:image><image:loc>…/og/{lang}/set/{slug}.png</image:loc></image:image>` per set and class URL. Optionally add the item icons of that set. Point the same images at the WebPage `primaryImageOfPage` (schema finding S2).
**Source:** `react-router.config.ts` `writeSitemap()` (lines ~103–135, run on `buildEnd`).

### I8. Home class picker icons are all `loading="lazy"` — Info
**Evidence:** All 38 home `<img>` are 48×48 class icons with `loading="lazy"`. They are 2–3 KB and not the LCP element: the hero is the builder and canvas character. If the picker row is in the first viewport, lazy loading only delays these tiny icons by a frame.
**Recommendation:** Verify in the live layout. If the picker is above the fold, drop `loading="lazy"` from the first row (or all 19 visible icons). No other change is needed.
**Source:** `src/features/class-picker/ClassPicker.tsx:33` (`loading="lazy"` on every class icon).

## Priority order

1. I1: WebP item icons (largest byte saving, every set, class and build page).
2. I2: lighter `/sets` (DOM size and lazy stat icons).
3. I4: cache `/brand/*` (one `_headers` rule).
4. I3, I6: width/height on shared icon helpers, `twitter:site`, guide OG cards.
5. I5, I7, I8: image-search enrichment and verification.
