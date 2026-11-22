# On-Page SEO — dofusforge.com

Audit date: 2026-11-22. I parsed 32 sampled pages with `parse_html.py`, plus title and description for 28 more set pages (60 in all). The pages are prerendered, so the raw HTML and the rendered DOM have the same `<head>` (`is_spa: false`).

## Score

**On-Page SEO: 68 / 100**

| Area | Score | Notes |
|---|---|---|
| Titles | 13/20 | Unique and descriptive on every page, with the right vocabulary per locale. FR titles run 63–78 characters and get truncated. |
| Meta descriptions | 11/15 | Unique and data-rich, but 100% of set descriptions are over 160 characters (164–224). |
| Headings | 9/15 | One H1 per page. The class-page H1 renders as "FecaStrength". The home repeats its H2s, and every page ends with footer H2s. |
| Internal linking | 10/20 | Sets are well meshed. Class pages are nearly orphaned. Guides link nowhere in their body text. |
| Canonical / hreflang / robots | 15/15 | Self-canonicals throughout. `/en/*` canonicalizes to the bare URL. hreflang has 4 locales plus x-default, both on the page and in the sitemap. |
| Structured data | 10/15 | Valid WebApplication, WebSite, BreadcrumbList and ItemList, and FAQPage on About. Guides have no Article schema, and the damage-guide FAQ has no FAQPage. |

## What works

- **Every page has a unique, hand-shaped title and description**, localized per language, with no templated CTA spam (`metadata_template.py`: `site_risk low`, `templated_ratio 0.0`).
- **Set titles carry the official localized name, the level and "Dofus 3"**: "Panoplie du Bouftou Royal (Niv. 32) — …", "Set de Jalató Real (Nv. 32) — …". Descriptions include the actual full-set bonuses ("+1 PA, +370 Vitalité…"), which helps click-through.
- **FR class titles use "build et stuff"**, matching how French players search.
- **Canonicals, hreflang and robots are clean.** `/en/sets/ougaa-set` correctly canonicalizes to `/sets/ougaa-set`. Every page returns `index, follow` with a self-canonical. The sitemap carries `xhtml:link` alternates.
- **The set mesh is strong.** The sets index links all 521 sets. Each set links 6 similar sets and its class page (for class sets), and has BreadcrumbList and ItemList JSON-LD.
- **The damage guide title and H1 are well matched**: "How Dofus Damage Works: the real formula".

## Findings

### O1. Class-page H1 renders as "FecaStrength" — High
- **Evidence:** `<h1><span class="rd-class-title"><img alt=""/>Feca<span class="rd-element">Strength</span></span></h1>`. Text extraction reads it as "FecaStrength" (EN), "FécaForce" (FR), "FecaFuerza" (ES), "SramAgilité", "XelorAgility". The H1 never says "build", "guide", "stuff" or "Dofus 3", although the title does ("Feca Build Guide Dofus 3 — …"). This affects all 76 class URLs.
- **Recommendation:** Make the H1 a real phrase, for example `t('class_guide_h1', { class })` → "Feca build guide — Dofus 3" (FR "Guide build et stuff Féca — Dofus 3"). Move the element badge out of the `<h1>` into the kicker or meta line. If the badge must stay visually inside, wrap it in a separate element after the H1, or at least add a separator (" · ").
- **Source:** `src/pages/ClassGuidePage.tsx:87-91` (`title` prop passed to `Reading`), new key in `public/locales/{es,en,fr,pt}/translation.json`.

### O2. FR titles are truncated in the market that matters most — High
- **Evidence:** Titles with a ≈60-character display budget:

  | Page | Characters | Title |
  |---|---|---|
  | `/fr/sets` | 78 | "Toutes les panoplies Dofus 3 — Bonus, objets et stats par niveau \| Dofus Forge" |
  | `/fr/classes/*` | 77 | "Guide build et stuff Féca Dofus 3 — Meilleures panoplies par élément et sorts" |
  | `/fr/damage-guide` | 75 | — |
  | FR set pages | up to 75 | for example "Panoplie du Vénérable Endormi (Niv. 200) — Bonus, objets et stats \| Dofus 3" |

  23 of 38 sampled set titles are over 60 characters. The "| Dofus 3" qualifier at the end is what gets cut. France has the worst average position (9.9) of the target markets.
- **Recommendation:** Front-load and shorten:
  - Set: `{{name}} Dofus 3 (niv. {{level}}) : bonus et objets` (about 50–60 characters).
  - Class: `Stuff {{class}} Dofus 3 : meilleures panoplies par élément` (about 55 characters).
  - Sets index: `Panoplies Dofus 3 : bonus et stats par niveau`.
  - Apply the same pattern to EN, ES and PT ("Ougaa Set Dofus 3 (Lvl 185): Bonuses & Items").
- **Source:** keys `set_page_seo_title`, `class_guide_seo_title`, `sets_seo_title`, `dmgguide_seo_title` in `public/locales/*/translation.json`.

### O3. Class pages are almost orphaned; the home links to none of them — High
- **Evidence:** In the sampled HTML, links to `/classes/*` appear only on About (19 links) and on other class pages (23). There are 0 on the home, the sets index, the guides, explore, build pages, the footer and the nav. The only other path is the "Class set" chip on the few class-specific set pages. The home, the strongest page, has 18 internal links, all of them nav and footer. The class picker on the home is made of buttons, not links. The guides (`/damage-guide`, `/forge-guide`) contain no in-body links to the planner, sets or classes. Their 20 links are all nav and footer.
- **Recommendation:**
  1. Add a "Dofus 3 classes" link row (19 `<a href="/{lang}/classes/{id}">` with class names as anchors) to the global footer, or to the home SEO section (Content C1).
  2. On the sets index, link the class-set filter or class names to class pages.
  3. On build pages, link the class name to `/classes/{id}`.
  4. In the damage guide, link "the Forger" to `/forge-guide`, element names to the matching class pages or the set index, and the outro to the planner.
  5. On set pages, add "Fits: Iop Strength, Cra Agility…" links to class pages (see Content C3).
- **Source:** `src/components/SiteFooter.tsx` (Learn / Credits columns), `src/pages/SetsPage.tsx`, `src/pages/BuildDetailPage.tsx`, `src/pages/DamageGuidePage.tsx`, `src/pages/BuilderPage.tsx`.

### O4. Home H1 and visible copy miss the FR/ES target vocabulary — Medium
- **Evidence:** The FR home H1 is "Planificateur de builds Dofus 3" (key `workshop_heading_empty`). The visible body never says "stuff", "stuffeur" or "créateur de stuff". "stuff" appears 19 times on `/fr`, but all of them are in `<title>`, the meta description, OG tags and the JSON-LD `keywords` field, which Google ignores. "stuffeur" appears nowhere in any locale file. EN is similar: "creator" appears only in the head.
- **Recommendation:** Change the FR H1 to "Créateur de stuff Dofus 3" or "Stuffeur et build planner Dofus 3". Then use "stuffeur", "simulateur de stuff" and "créer son stuff" naturally in the home copy block (Content C1). For ES/PT, "Creador de builds de Dofus 3" (the title already says "Creador").
- **Source:** `src/features/workshop/WorkshopBar.tsx:64` → key `workshop_heading_empty` in `public/locales/fr/translation.json` (and es/pt/en).

### O5. Set meta descriptions are all over 160 characters — Medium
- **Evidence:** In 38 sampled set pages, descriptions are 164–224 characters (average 191). The trailing CTA ("Every set bonus, item stats and a one-click test in the build planner." / "Tous les bonus, les stats des objets et un essai en un clic dans le planificateur.") is always cut. "Dofus 3" is repeated from the title (`brand_suffix_in_description`). The FR sets index description is 204 characters, and FR/ES/PT home descriptions are 186–195.
- **Recommendation:** Cap at about 155 characters. Put the bonus summary first, then a short CTA. For example: `{{name}} (niv. {{level}}, {{count}} objets) : {{bonus}}. Bonus par pièce et essai gratuit dans le stuffeur.`
- **Source:** `set_page_seo_description` (`src/pages/SetPage.tsx:35` builds `summary`), `sets_seo_description`, `META` in `src/seo/useSeoMeta.ts:20-41`.

### O6. Duplicate and boilerplate H2s — Low
- **Evidence:** The home outline is H2 "Choose your class", "Equipment", "Equipment", "Choose your class" (desktop and mobile layouts both prerendered), then footer H2s "Dofus Forge", "Learn" and "Credits". Every page ends with those three footer H2s, so "Credits" is an H2 on 2,348 URLs.
- **Recommendation:** Make the footer column titles `<p>` or `<h3>` styled the same (or use `aria-labelledby` on `<nav>`). Render only one of the desktop/mobile workshop blocks in the prerendered HTML, or demote the duplicate's headings.
- **Source:** `src/components/SiteFooter.tsx`, workshop desktop/mobile panels under `src/features/workshop/`.

### O7. The home brand link points to a long `?b=` build URL — Low
- **Evidence:** The prerendered home has `<a href="/?b=v1:eyJ2IjoxLCJjIjoi…(170 chars)" class="site-brand" title="Reset build">`. The `/fr`, `/es` and `/pt` homes have their own variants. Crawlers get a parameterized duplicate of the home as the very first link. The canonical saves it, but it spends crawl budget and dilutes the most important internal link (brand → home).
- **Recommendation:** Render `href="/{lang}"` and keep the reset behavior in `onClick`, which is already there. Build the `?b=` URL only for the copy/share action.
- **Source:** `src/pages/BuilderPage.tsx:58-75` (`BrandLink`).

### O8. Guides have no Article schema; the damage-guide FAQ has no FAQPage — Low
- **Evidence:** `/damage-guide` and `/forge-guide` only emit the site-wide WebApplication and WebSite nodes, with no BreadcrumbList. The damage guide has a 4-item FAQ (`dmgguide_faq_*`), but FAQPage is emitted only on About (`AboutPage.tsx:39`). FAQ rich results are limited to authoritative gov/health sites, so the gain is AI or answer-engine parsing, not SERP features.
- **Recommendation:** Add `Article` (headline, author Person "Wembie", `datePublished`/`dateModified`, `inLanguage`) and `BreadcrumbList` to both guides, and a `FAQPage` node for the damage-guide FAQ, reusing the About pattern.
- **Source:** `src/pages/DamageGuidePage.tsx`, `src/pages/ForgeGuidePage.tsx`, helper in `src/seo/JsonLd.tsx`.

### O9. Generic anchor text on set pages — Low
- **Evidence:** Each set page has "Try it in the planner" twice (`/?set=118`) and "All sets" plus "Dofus 3 Sets" pointing to `/sets`. "Similar sets" use the set names, which is good.
- **Recommendation:** Make the CTA descriptive: "Try the Ougaa Set in the build planner". Drop one of the duplicate `/sets` links.
- **Source:** `set_page_cta_try`, `set_page_cta_all` in `public/locales/*/translation.json`; `src/pages/SetPage.tsx:110-117, 194`.

### O10. Build and profile titles and descriptions — Low
- **Evidence:** Build title: "Selo Full empujes Suerte/Agi — Eliotrope build (level 200) — Dofus Forge" (72 characters, user text first, class buried). Profile: "wembie — Dofus Forge" with a 46-character description.
- **Recommendation:** Builds: "Eliotrope build Chance/Agility lvl 200 — {name}", which puts the class and elements first. Profiles: see Content C5 (noindex when thin).
- **Source:** `src/pages/BuildDetailPage.tsx`, `src/pages/UserProfilePage.tsx` (`usePageSeo`).

## Sampled URL table

| URL | Title chars | Desc chars | H1 | Words* |
|---|---|---|---|---|
| / | 62 | 172 | Dofus 3 build planner | 248 |
| /es | 58 | 186 | Planificador de builds de Dofus 3 | 230 |
| /fr | 55 | 192 | Planificateur de builds Dofus 3 | 254 |
| /pt | 58 | 195 | Planejador de builds de Dofus 3 | 249 |
| /sets | 64 | 160 | Dofus 3 Sets | 7,596 |
| /fr/sets | 78 | 204 | Panoplies Dofus 3 | 7,936 |
| /sets/royal-gobball-s-set | 63 | 182 | Royal Gobball's Set | 646 |
| /fr/sets/royal-gobball-s-set | 70 | 215 | Panoplie du Bouftou Royal | 663 |
| /es/sets/royal-gobball-s-set | 60 | 206 | Set de Jalató Real | 670 |
| /pt/sets/royal-gobball-s-set | 67 | 209 | Conjunto do Papatudo Real | 642 |
| /sets/ougaa-set | 54 | 171 | Ougaa Set | 532 |
| /fr/sets/ougaa-set | 63 | 210 | Panoplie du Ougah | 555 |
| /sets/crocoburio-s-soul | 61 | 190 | Crocoburio's Soul | 454 |
| /sets/tengu-snowfoux-set | 63 | 173 | Tengu Snowfoux Set | 651 |
| /sets/light-set | 54 | 164 | Light Set | 568 |
| /sets/young-adventurer-set | 63 | 191 | Young Adventurer Set | 513 |
| /classes/feca | 56 | 159 | **FecaStrength** | 1,294 |
| /fr/classes/feca | 77 | 176 | **FécaForce** | 1,392 |
| /es/classes/feca | 65 | 162 | **FecaFuerza** | 1,412 |
| /classes/xelor | 57 | 161 | **XelorAgility** | 1,491 |
| /fr/classes/sram | 77 | 176 | **SramAgilité** | 1,293 |
| /damage-guide | 54 | 160 | How Damage Works | 1,248 |
| /fr/damage-guide | 75 | 189 | Comment fonctionnent les dégâts | 1,384 |
| /forge-guide | 56 | 187 | The Forger | 1,562 |
| /fr/forge-guide | 65 | 181 | La Forgeuse | 1,627 |
| /how-to-use | 22 | 177 | How to Use Dofus Forge | 267 |
| /about | 17 | 124 | About Dofus Forge | 450 |
| /fr/about | 23 | 155 | À propos de Dofus Forge | 545 |
| /shortcuts | 43 | 164 | Shortcuts & controls | 494 |
| /explore | 38 | 137 | Explore builds | 771 |
| /build/19c6054f-… | 72 | 100 | Selo Full empujes Suerte/Agi | 620 |
| /u/wembie | 20 | 46 | wembie | 369 |

\*`parse_html.py` word count, which includes nav and footer.
