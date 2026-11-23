# Content Quality / E-E-A-T — dofusforge.com

Audit date: 2026-11-22. Sample: 32 pages fetched raw (prerendered HTML) plus 28 more set pages, 60 pages in all. Page types: 4 locale homes, sets index (en, fr), 13 set pages (en/es/fr/pt), 5 class pages (en/es/fr/pt), forge-guide, damage-guide, how-to-use, about (en, fr), shortcuts, explore, 1 build page, 1 user profile, and locale variants of build/user/explore/how-to-use/class pages. Tools: `render_page.py --mode never` (trafilatura `extracted_text`), `parse_html.py`, `content_quality.py`, `metadata_template.py`.

Sitemap inventory (2,348 URLs, not ~145): 2,088 set pages (522 × 4 locales), 124 build pages (31 × 4), 76 class pages (19 × 4), 24 user profiles (6 × 4), 36 static/guide pages (9 × 4). No item, monster or dungeon pages exist.

## Score

**Content Quality: 62 / 100**

| Factor (internal weight) | Score | Notes |
|---|---|---|
| Experience (20%) | 60 | About names the maker (Juan / Wembie), the Tal Kasha test server and an in-game helper. The damage guide shows worked numbers. Templated pages carry no first-hand signal. |
| Expertise (25%) | 65 | The damage and forge guides are specific and original, with numeric examples and correct order of operations. They have no byline, date, or "how we verified this" note. |
| Authoritativeness (25%) | 45 | Fan tool, no external citations or mentions on-page, no links out to sources. The data source (DofusDude API) is named only on About. |
| Trustworthiness (30%) | 75 | Footer says it is not affiliated with Ankama and has a contact address. Privacy and terms pages exist, the site is free with no account wall, and the game version shows on the home page ("Dofus 3.7.12.12 data"). |

AI-citation readiness: **55 / 100**. The damage guide is very citable (numbered steps, formula, FAQ). Set pages give clean facts (level, pieces, totals). Class pages and the home page have almost no quotable prose.

`content_quality.py` (extracted text): home 81 (93 tokens only), FR home 80, class Feca 75 (information density 0.31, repetition 30), damage guide 90, about 80, how-to-use 84. No filler or AI-pattern matches anywhere.

`metadata_template.py` over 60 title/description pairs: `site_risk: low`, `templated_ratio: 0.0`, no shared CTA phrase. Only secondary flag: `brand_suffix_in_description` ("Dofus 3" repeated in title and description) on set pages.

## What works

- **Damage guide** (`/damage-guide`, about 1,150 words of main content) is the best content on the site: original, step-ordered, with numeric examples and a 4-question FAQ. It is properly localized (FR "Comment fonctionnent les dégâts", 1,384 words) and is exactly the kind of page AI answers cite.
- **Forge guide** (about 1,560 words) is thorough product documentation.
- **Set pages** are fully localized with official in-game names ("Panoplie du Bouftou Royal", "Set de Jalató Real", "Conjunto do Papatudo Real"). They have real data tables: full-set totals, bonus per number of pieces, item stats, similar sets. They are not thin, at 450–670 words.
- **Locale versions are real translations**, not machine-swapped templates. FR class titles even add the native term "stuff".
- **Trust basics are in place**: Ankama non-affiliation disclaimer, contact mailto, maker named, data source named, game version visible on home.
- There is no filler, keyword stuffing or AI-slop phrasing in the sampled copy.

## Findings

### C1. The home page has about 100 words of real content, and the explanatory copy lives on /about — High
- **Evidence:** trafilatura text of `/` is 107 words, all of it UI chrome ("Choose your class", "0 / 17 slots", "SELECT CLASS", "Active Sets…"). The same block appears twice because the desktop and mobile layouts are both in the DOM. `/fr` is the same at 111 words. The keyed SEO copy (`seo_about_title`, `seo_about_body`, `seo_features_*`, `seo_faq_*`, "What is Dofus Forge?") renders only on `/about`. The home targets "dofus planner / builder / creator / stuffeur", the most competitive queries on the site, and gives Google nothing but a title, a meta description and an empty app shell.
- **Recommendation:** Below the workshop (or after the fold on mobile), render a crawlable section on the home in each locale with:
  - a 2–3 sentence "what it is" paragraph that uses the locale's vocabulary (FR: "créateur de stuff", "stuffeur", "simulateur de stuff"; ES/PT: "creador / simulador de builds")
  - the feature list
  - the 4–5 FAQ items
  - links to the 19 class pages, `/sets` and the two guides (see On-Page O3)
  Aim for 300–500 words of real copy. Reuse the existing `seo_*` keys rather than writing new ones.
- **Source:** `src/pages/BuilderPage.tsx` (home route), `src/pages/AboutPage.tsx` (currently owns the `seo_*` sections), `public/locales/*/translation.json` keys `seo_about_*`, `seo_feature_*`, `seo_faq_*`.

### C2. Class pages are algorithmic lists plus Ankama spell text, with no build advice — High
- **Evidence:** `/classes/feca` has 686 words of extracted text. About 70% is spell descriptions copied from game data, the same text DofusDB, the encyclopedia and the wiki publish. The rest is an auto-ranked set list per element ("ranked by their full-set stats for that element"). The page offers no stat priorities, role (tank/support/DPS), PvP vs PvM notes, recommended spell variants, characteristic allocation or leveling path. Community builds are empty ("No public Feca build yet"). Information density is 0.31 (lowest sampled). The title promises a "Build Guide", but the content is a data index. All 19 classes × 4 locales (76 URLs) share the same skeleton.
- **Recommendation:** Add a short, hand-written per-class block (150–300 words per class per locale) covering:
  - role
  - the 1–2 strongest elements and why
  - the stat priority order
  - a recommended characteristic split
  - 2–3 key spells
  Put it above the set ranking, then link 1–2 curated "reference builds" (published by the owner or a trusted player) so the community-builds section is never empty. Collapse the spell list behind a `<details>`, or move it below, so the advice leads. If hand-writing 19 × 4 is too much, start with the FR pages of the 5 most-searched classes (Iop, Cra, Sram, Eniripsa, Pandawa).
- **Source:** `src/pages/ClassGuidePage.tsx`, keys `class_guide_*` in `public/locales/*/translation.json`; class metadata `src/features/class-picker/classData.ts`.

### C3. Set pages answer "what are the bonuses" but not "how do I get it" — High
- **Evidence:** Long-tail item, monster and set-name queries land on set pages. The SERPs for those queries (for example "panoplie bouftou royal") are dominated by "où drop / comment l'obtenir" guides. The set page has no drop source, dungeon, monster, recipe/craft, or profession. The only unique text is one templated sentence (`set_page_intro`). The rest is Ankama flavor text ("The tag on this belt says…"), duplicated on every database site. In 32 of 38 sampled set pages (84%), the "Community builds" section shows the empty state ("No public build uses X yet — be the first…").
- **Recommendation:**
  1. Add a "How to obtain" block per item: recipe ingredients and profession/level. The DofusDude API exposes recipes, so this fits `scripts/fetch-data.ts`. Add the source monster or dungeon where data allows.
  2. Add a computed "Who is this set for" line: which elements and classes it fits, and its AP/MP/Range contribution versus other sets at that level. The data already exists for the class-page ranking.
  3. When no community build exists, hide the section, or replace it with "Best classes for this set" links, instead of shipping an empty state on about 1,750 URLs.
- **Source:** `src/pages/SetPage.tsx` (sections `sp-builds`, intro `set_page_intro`), `scripts/fetch-data.ts` (no recipe/drop fields fetched today), `public/data/*/equipment.json`.

### C4. Guides have no byline, date or verification note — Medium
- **Evidence:** `/damage-guide` claims "Dofus 3's real formula… the same one the Forger uses internally". It gives no author, publish or update date, game version or method ("verified in-game on Tal Kasha, version 3.7"). The JSON-LD `author` exists only on the site-wide WebApplication node. `htmldate` falls back to a date from asset metadata (2026-08-04). On `/fr` it guessed 2012-07-03, so no reliable date signal is on the page.
- **Recommendation:** Add a visible line under each guide's H1: "By Juan (Wembie) · Updated 2026-11-xx · Checked against Dofus 3.7.12". Back it with `Article` JSON-LD (`author`, `datePublished`, `dateModified`, `about` VideoGame). For the damage guide, add one sentence on how the formula was validated (in-game tests with specific numbers). On set and class pages, add "Data: Dofus {{gameVersion}}" near the H1. `DOFUS_GAME_VERSION` is already imported in `ClassGuidePage.tsx`.
- **Source:** `src/pages/DamageGuidePage.tsx`, `src/pages/ForgeGuidePage.tsx`, `src/features/reading/Reading.tsx` (shared guide layout), `src/data/gameVersion.ts`.

### C5. Build and user-profile pages are 4× near-duplicates — Medium
- **Evidence:** 124 build URLs and 24 profile URLs are 31 builds and 6 users, each mirrored under `/`, `/es`, `/fr`, `/pt`, each self-canonical and indexable. The user-written part (build name, for example "Selo Full empujes Suerte/Agi", and comments) is identical in every locale. Only the chrome and item names change. `/u/wembie` has a 46-character description and a list of build titles. Profiles with 1–2 builds are thin in all four languages.
- **Recommendation:** Keep build pages indexable only in the locale the build was authored in. Canonicalize the other locales to it, or keep them `noindex, follow`, and drop them from the sitemap. Profiles with fewer than about 3 public builds should be `noindex, follow`. Generate a richer profile description (classes played, number of builds, best-rated build).
- **Source:** `src/pages/BuildDetailPage.tsx`, `src/pages/UserProfilePage.tsx` (`usePageSeo` calls), sitemap generator `writeSitemap()` in `react-router.config.ts` (around line 108).

### C6. Inconsistent smithmagic terminology within each locale — Low
- **Evidence:** EN pages use both "Magesmithy" (how-to-use step 4, About feature list, schema featureList) and "forgemagic" (forge guide, H2 "Forgemagic, scrolls and level"). FR UI key `magesmithy` = "Forgesort", but the FR forge guide and meta description say "forgemagie". Players search for "forgemagie" / "fm" (FR) and "smithmagic" (EN).
- **Recommendation:** Keep the production label in the UI if it matches the game, but in indexable prose use the term players search for. Add the other term once in parentheses on the guide pages, as how-to-use already does with "Magesmithy (Forgemagie)".
- **Source:** `public/locales/en/translation.json` (`magesmithy*`, `howto_step4_title`, `seo_feature_runes_*`), `public/locales/fr/translation.json` (`magesmithy` = "Forgesort"), `src/root.tsx:105` (schema description).

### C7. How-to-use repeats the About features and is short — Low
- **Evidence:** `/how-to-use` has 249 words in 8 one-sentence steps. It overlaps with the About feature list and the home has no copy of its own (C1).
- **Recommendation:** Merge the strongest parts into the home section (C1), and expand how-to-use with screenshots (real UI images, no decoration) and one worked example ("level 200 Cra Agility in 5 minutes"). Alternatively, fold it into the forge guide as part 1.
- **Source:** `src/pages/HowToUsePage.tsx`, keys `howto_*`.

### C8. Utility pages indexed in 4 locales — Info
- **Evidence:** `/shortcuts`, `/privacy` and `/terms` × 4 locales are indexable sitemap entries.
- **Recommendation:** This is fine. Optionally remove `privacy`/`terms` from the sitemap so crawl attention goes to sets and classes.
- **Source:** `writeSitemap()` in `react-router.config.ts`.

## Readability

Sentences are short, use plain second person and contain no jargon dumps. The damage guide reads at roughly grade 8–9 despite the math. FR, ES and PT copy is idiomatic, not literal. No readability fixes are needed beyond C6.
