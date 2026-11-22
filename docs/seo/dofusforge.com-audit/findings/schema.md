# Schema / Structured Data — dofusforge.com

Audit date: 2026-11-22 · Scope: JSON-LD, Microdata, RDFa · Method: raw HTML fetch of 30 sitemap URLs (+ `/classes`) (all four locales, every route type) plus a Playwright render of 2 URLs to compare raw and rendered output.

## Score: 68 / 100

| Area | Weight | Score | Note |
|---|---|---|---|
| Validity (parses, `@context`, absolute URLs, no placeholders) | 25 | 25 | 77/77 blocks parse (31 URLs); all `https://schema.org`; all URLs absolute |
| Coverage per page type | 25 | 13 | Sets and classes are covered; guides, builds, profiles, explore and legal pages carry only the global blocks |
| Rich-result eligibility | 20 | 10 | BreadcrumbList is the only type that can still produce a SERP feature. FAQPage was retired; WebApplication lacks the rating or review it needs |
| Entity graph and locale correctness | 20 | 10 | No `@id`s and no WebPage nodes; global blocks are English-only on es/fr/pt |
| Server rendering | 10 | 10 | All JSON-LD is in the prerendered HTML; the render adds nothing and duplicates nothing |

## Sample and detection

No Microdata or RDFa anywhere. Every block is JSON-LD and every block parses.

| URL (sample) | Blocks found |
|---|---|
| `/`, `/es`, `/fr`, `/pt` | WebApplication (+Offer, Person, VideoGame), WebSite (+Organization, ImageObject) |
| `/explore`, `/es/explore`, `/how-to-use`, `/pt/how-to-use`, `/forge-guide`, `/es/forge-guide`, `/damage-guide`, `/fr/damage-guide`, `/shortcuts`, `/privacy`, `/terms`, `/build/{id}`, `/es/build/{id}`, `/u/wembie`, `/pt/u/wembie` | Global pair only |
| `/about`, `/fr/about` | Global pair + **FAQPage** (5 Q&A) |
| `/sets`, `/es/sets` | Global pair + BreadcrumbList (2) |
| `/sets/gobball-set`, `/es/sets/gobball-set`, `/fr/sets/glacial-set`, `/pt/sets/glacial-set` | Global pair + ItemList (set pieces, names only) + BreadcrumbList (3) |
| `/classes/feca`, `/es/classes/feca`, `/fr/classes/osamodas` | Global pair + BreadcrumbList (2) |
| `/classes` (not in sitemap) | SPA fallback: global pair, canonical points to `https://dofusforge.com` |

Raw HTML and the Playwright render return the same blocks (`/es/sets/gobball-set`: 4 and 4; `/damage-guide`: 2 and 2), so crawlers that do not run JS see everything. The browser ran with its sandbox on.

Images referenced from schema resolve: `brand/og-v04-en.jpg` returns 200 as a 1200×630 JPEG, and `brand/icon-512.png` returns 200 as a 512×512 PNG.

## What works

- The JSON-LD is server-rendered on all 2,348 sitemap URLs (prerendered by React Router). None of it waits for hydration.
- The `<` escaping in `serialize()` (`src/seo/JsonLd.tsx`) stops a set or item name from breaking out of the script tag.
- BreadcrumbList is built by the same component as the visible breadcrumb (`Breadcrumbs` in `src/seo/JsonLd.tsx`), so markup and visible trail cannot drift. Breadcrumb URLs are locale-correct (`/es/sets/gobball-set`) and match the canonicals.
- On set pages, the ItemList `url` matches the canonical exactly, and the set and piece names are localized (`Set de jalató`, `Sombrero de jalató`).
- The separate WebSite node with a publisher logo gives Google a site-name and logo source, and it appears on the home page as required.
- The FAQPage answers match the visible `<dl>` on `/about` word for word, which passes the content-parity rule.
- There is no fake `aggregateRating` or `review`.
- A unit test (`src/pages/__tests__/SetPages.test.tsx`) pins the set-page schema types.

## Findings

### S1. Global WebApplication and WebSite blocks are identical, English-only and repeated on every page — Medium
**Evidence:** All 30 sampled pages carry byte-identical blocks from `src/root.tsx` (`WEB_APPLICATION_LD`, `WEBSITE_LD`). On `/es`, `/fr` and `/pt` (and on `/fr/about` and every other localized page), WebApplication still has the English `description` ("Dofus 3 build planner and stuff builder — …"), `image: https://dofusforge.com/brand/og-v04-en.jpg` and `url: https://dofusforge.com/`, while `<html lang>`, `og:image` (`og-v04-es.jpg` and so on) and the canonical are localized. WebSite has no `inLanguage`. Neither node has an `@id`, so Google sees two unrelated entities on each page, plus a third (the FAQ, ItemList or breadcrumb) that is not tied to either.
**Impact:** The entity signals are weaker than they could be, and localized pages have structured data that contradicts their language. This blocks no rich result, but it is the main correctness gap.
**Recommendation:** Replace the two static blocks with a single `@graph` built in `Layout` from the `lang` it already has. Emit the WebApplication node only on the four home routes. On every other page, emit a WebPage node that references the site by `@id` (see S2). Snippet for `/es`:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://dofusforge.com/#organization",
      "name": "Dofus Forge",
      "url": "https://dofusforge.com/",
      "logo": {
        "@type": "ImageObject",
        "@id": "https://dofusforge.com/#logo",
        "url": "https://dofusforge.com/brand/icon-512.png",
        "width": 512,
        "height": 512
      },
      "sameAs": ["https://x.com/DofusForgeApp"]
    },
    {
      "@type": "WebSite",
      "@id": "https://dofusforge.com/#website",
      "name": "Dofus Forge",
      "alternateName": ["DofusForge", "dofusforge.com"],
      "url": "https://dofusforge.com/",
      "inLanguage": ["en", "es", "fr", "pt"],
      "publisher": { "@id": "https://dofusforge.com/#organization" }
    },
    {
      "@type": "WebApplication",
      "@id": "https://dofusforge.com/#app",
      "name": "Dofus Forge",
      "url": "https://dofusforge.com/es",
      "inLanguage": "es",
      "description": "Planificador de builds y creador de stuff para Dofus 3: catálogo de objetos, bonus de sets, runas de forjamagia, optimizador de stats y builds compartibles por enlace.",
      "image": "https://dofusforge.com/brand/og-v04-es.jpg",
      "applicationCategory": "GameApplication",
      "operatingSystem": "Web Browser",
      "isAccessibleForFree": true,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "author": { "@type": "Person", "name": "Wembie", "url": "https://dofusforge.com/u/wembie" },
      "publisher": { "@id": "https://dofusforge.com/#organization" },
      "about": {
        "@type": "VideoGame",
        "name": "Dofus",
        "gamePlatform": "PC",
        "sameAs": "https://en.wikipedia.org/wiki/Dofus"
      }
    },
    {
      "@type": "WebPage",
      "@id": "https://dofusforge.com/es#webpage",
      "url": "https://dofusforge.com/es",
      "inLanguage": "es",
      "isPartOf": { "@id": "https://dofusforge.com/#website" },
      "about": { "@id": "https://dofusforge.com/#app" }
    }
  ]
}
```

Take the `description` from the existing localized meta-description keys, never a second hand-written copy. `sameAs` lists only profiles the site already links from `SiteFooter.tsx` (the X account; a Discord invite is not a profile, so leave it out).
**Source:** `src/root.tsx` lines ~100–142 (`WEB_APPLICATION_LD`, `WEBSITE_LD`) and lines 203–204 (render); locale data is available through `langFromPath` and `seoTags(lang)` in `src/seo/useSeoMeta.ts`.

### S2. No per-page WebPage node (name, inLanguage, primaryImageOfPage, dateModified) — Medium
**Evidence:** `usePageSeo` already knows each page's title, description, canonical, language and OG image (the per-set, per-class and per-build cards). None of that reaches the structured data. The only page-level nodes are breadcrumbs and set ItemLists.
**Recommendation:** Emit one WebPage (or a subtype) from `SeoHead`, using the values it already renders into `<head>`. Use `CollectionPage` for `/sets` and `/explore`, `AboutPage` for `/about`, `ProfilePage` for `/u/*` (S4) and `WebPage` elsewhere. Set `primaryImageOfPage` to the OG card. Set `dateModified` on set and class pages from `DOFUS_GAME_VERSION`'s data date, and on build pages from `build.updated_at`. Example for `/fr/sets/glacial-set`:

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://dofusforge.com/fr/sets/glacial-set#webpage",
  "url": "https://dofusforge.com/fr/sets/glacial-set",
  "inLanguage": "fr",
  "isPartOf": { "@id": "https://dofusforge.com/#website" },
  "primaryImageOfPage": {
    "@type": "ImageObject",
    "url": "https://dofusforge.com/og/fr/set/glacial-set.png?v=3.7.12.12-mineral04",
    "width": 1200,
    "height": 630
  },
  "breadcrumb": { "@id": "https://dofusforge.com/fr/sets/glacial-set#breadcrumb" },
  "mainEntity": { "@id": "https://dofusforge.com/fr/sets/glacial-set#pieces" }
}
```

Add `"@id": "<canonical>#breadcrumb"` in `Breadcrumbs` and `"@id": "<canonical>#pieces"` on the set ItemList, so the nodes link together.
**Source:** `src/root.tsx` `SeoHead`; `src/seo/useSeoMeta.ts` (`seoTags`, `readSeoTags`); `src/seo/JsonLd.tsx`.

### S3. Guides have no Article markup and no breadcrumbs — Medium
**Evidence:** `/damage-guide`, `/forge-guide` and `/how-to-use` (×4 locales = 12 URLs) carry only the global pair. These are long editorial pages; the `/damage-guide` H1 is "How Damage Works" and its description is "Dofus 3's real damage formula, explained step by step…". They have no `headline`, `author`, `datePublished` or `dateModified`, so the most citable content on the site has no authorship or freshness signal for Google or AI answer engines.
**Recommendation:** Add `Article` (or `TechArticle`) and a `Breadcrumbs` trail (Home › Guide) to the three guide pages. Do **not** use HowTo: its rich results were removed in 2023. The dates below come from git history (`DamageGuidePage.tsx` was added 2026-11-22; `ForgeGuidePage.tsx` was added 2026-10-24 and last changed 2026-11-18). In code, keep them in a small per-guide constant next to the page, or derive them from `src/data/changelog.ts`, and bump `dateModified` only when the guide text changes.

```json
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "@id": "https://dofusforge.com/damage-guide#article",
  "headline": "How Dofus Damage Works: the real formula",
  "description": "Dofus 3's real damage formula, explained step by step with numeric examples: characteristic, Power, flat damage, % damage, critical, resistance and push damage.",
  "url": "https://dofusforge.com/damage-guide",
  "mainEntityOfPage": { "@id": "https://dofusforge.com/damage-guide#webpage" },
  "inLanguage": "en",
  "image": "https://dofusforge.com/brand/og-v04-en.jpg",
  "datePublished": "2026-11-22",
  "dateModified": "2026-11-22",
  "author": { "@type": "Person", "name": "Wembie", "url": "https://dofusforge.com/u/wembie" },
  "publisher": { "@id": "https://dofusforge.com/#organization" },
  "about": { "@type": "VideoGame", "name": "Dofus", "sameAs": "https://en.wikipedia.org/wiki/Dofus" }
}
```

**Source:** `src/pages/DamageGuidePage.tsx`, `src/pages/ForgeGuidePage.tsx`, `src/pages/HowToUsePage.tsx` (each calls `usePageSeo`; render `<JsonLd>` and `<Breadcrumbs>` from `src/seo/JsonLd.tsx` next to it).

### S4. User profiles and build pages have no page-specific schema — Low
**Evidence:** `/u/{user}` (6 profiles ×4 locales) and `/build/{uuid}` (31 builds ×4 locales) are in the sitemap with only the global pair. Build pages link their author (`href="/u/wembie"`) and know `build.updated_at`. Profiles list a user's public builds.
**Recommendation:**
- Profiles: Google supports `ProfilePage` structured data for creator profiles. Use only counts the page actually shows:

```json
{
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": "https://dofusforge.com/u/wembie#webpage",
  "url": "https://dofusforge.com/u/wembie",
  "inLanguage": "en",
  "isPartOf": { "@id": "https://dofusforge.com/#website" },
  "mainEntity": {
    "@type": "Person",
    "@id": "https://dofusforge.com/u/wembie#person",
    "name": "wembie",
    "alternateName": "wembie",
    "url": "https://dofusforge.com/u/wembie"
  }
}
```

  Add `interactionStatistic` (`InteractionCounter`, `interactionType: https://schema.org/WriteAction`, `userInteractionCount` = the public build count shown on the page) and `dateCreated` only when the page displays them.
- Builds: add `Breadcrumbs` (Home › Explore › build name) and a `CreativeWork` with `name`, `author` → `{"@id": "https://dofusforge.com/u/{user}#person"}`, `dateModified` from `build.updated_at`, `image` from the OG card and `about` the VideoGame. No Google rich result applies, but this connects authorship across the 124 build URLs.

**Source:** `src/pages/UserProfilePage.tsx` (~line 152), `src/pages/BuildDetailPage.tsx` (~line 244).

### S5. Sets index and set pages: ItemList is name-only, and the sets index has none — Low
**Evidence:** The set-page ItemList (`SetPage.tsx` lines 65–71) lists pieces with `name` only: no `url`, no `image`, no `@id`. `/sets` (521 sets) has only a BreadcrumbList. Google's ItemList carousel only applies to summary pages that point to Recipe, Course, Restaurant or Movie detail pages, so neither page can get a carousel. The value here is entity clarity only.
**Recommendation:** On set pages, enrich each `ListItem.item` with `name` and `image` (the item icon URL already on the page). Do **not** type the items as `Product`: that triggers Merchant-listing validation errors because there is no price or availability. On `/sets`, a `CollectionPage` whose `mainEntity` is an `ItemList` of `ListItem { position, url, name }` (one per set, 521 entries, ~40 KB) is optional; cap it per level bracket if HTML weight matters, since that page is already 688 KB.

```json
{
  "@type": "ListItem",
  "position": 1,
  "item": {
    "@type": "Thing",
    "name": "Gobball Headgear",
    "image": "https://assets.dofusforge.com/items/16041-128.png"
  }
}
```

**Source:** `src/pages/SetPage.tsx` (ItemList), `src/pages/SetsPage.tsx` (~line 95, Breadcrumbs).

### S6. FAQPage on /about no longer earns a rich result — Info
**Evidence:** `/about` (×4 locales) carries a valid FAQPage with 5 Q&A pairs that match the visible `<dl>`. Google retired FAQ rich results for all sites on 2026-05-07.
**Recommendation:** It is harmless to keep: the content parity is correct, and AI answer engines may still read it, though that benefit is unconfirmed. Do not add FAQPage elsewhere expecting SERP features. If it is kept, render it through `<JsonLd>` instead of a raw `JSON.stringify`, so it gets the same `<` escaping as every other block (the translation strings are trusted, so this is consistency, not a live risk).
**Source:** `src/pages/AboutPage.tsx` lines 37–45 and 121.

### S7. WebApplication cannot get a software-app rich result — Info
**Evidence:** Google's SoftwareApplication or WebApplication rich result needs `name`, `offers.price` **and** either `aggregateRating` or `review`. The site has neither, and must not invent them.
**Recommendation:** Leave it as is. Add `aggregateRating` only if the site gets a real, visible, first-party rating system (for example, users rating the planner on `/about`), with the values computed from stored votes.
**Source:** `src/root.tsx` `WEB_APPLICATION_LD`.

### S8. Class breadcrumb skips a hub that does not exist; `/classes` serves the SPA fallback with a home canonical — Info
**Evidence:** The class breadcrumbs are `Dofus Forge › Feca`. `https://dofusforge.com/classes` returns 200 (11.9 KB SPA shell) with `canonical: https://dofusforge.com`. It is not in the sitemap, so no harm today.
**Recommendation:** If a classes index page is ever built, give it a CollectionPage and insert it as the middle crumb, as `/sets` does for sets. Until then, the current two-level trail is correct and must not point at `/classes`. The technical audit should note that `/classes` is a soft-404-style URL.
**Source:** `src/pages/ClassGuidePage.tsx` (~line 80).

### S9. Breadcrumb SERP display is desktop-only now — Info
Since early 2025 Google shows only the domain in mobile result URLs, so BreadcrumbList improves the desktop result path and entity understanding but not the mobile snippet. It remains the one structured-data type here that can change the SERP. Keep it, and extend it to guides and builds (S3, S4).

## Priority order

1. S1 + S2: one locale-aware `@graph` with `@id`s in `root.tsx` (`SeoHead`). One change covers all 2,348 URLs.
2. S3: Article and breadcrumbs on the 12 guide URLs.
3. S4: ProfilePage on profiles; breadcrumbs and CreativeWork on builds.
4. S5–S9: enrichment and housekeeping.

Validate after shipping with the Rich Results Test (`/sets/gobball-set`, `/damage-guide`, `/u/wembie`) and the Schema.org validator. Extend `SetPages.test.tsx` to assert `@id` linking and `inLanguage` per locale.
