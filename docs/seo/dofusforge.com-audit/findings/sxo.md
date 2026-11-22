# Search Experience (SXO) — dofusforge.com

Audit date: 2026-11-22. Target pages were fetched with `render_page.py` (`--mode never`; the pages are prerendered, `is_spa: false`). SERP evidence comes from 5 web searches: "dofus planner", "stuffeur dofus 3", "simulateur stuff dofus 3 créer son stuff en ligne", "panoplie bouftou royal dofus 3" and "feca build dofus 3". The rest is intent reasoning, since no SERP API was available. These are separate from the SEO health score, so each is labelled **SXO Gap Score**.

## Limitations

- The search tool is US-located and returns about 10–20 links without positions, SERP features, PAA or AI Overview data. FR results are therefore approximate. In particular, google.fr would weight dofusbook, DofusDB and the official encyclopedia more heavily than this tool showed.
- No click or query data was available beyond the brief: France is the largest market with an average position of 9.9, and set pages get long-tail traffic.
- No above-the-fold screenshots were taken; I read the layout from the prerendered DOM.

## Page-type map: query cluster vs. landing page

| Query cluster | What ranks (SERP consensus) | Landing page today | Page type | Mismatch |
|---|---|---|---|---|
| "dofus planner", "dofus builder", "dofus creator" (EN/ES/PT) | Tools and tool explainers. "Dofus Planner" is also an established French community brand (Millenium partner), so part of this query is **navigational for another site**. | `/` (workshop app) | Tool / Interactive | **ALIGNED** on type. The page carries almost no text (see Content C1). |
| "stuffeur", "créateur de stuff", "simulateur de stuff" (FR) | Mixed. Tool pages (Dofusbook and similar) plus editorial "best stuff for Dofus 3 by level and element" listicles (next-stage, guidactik, breakflip, millenium) and tool how-to articles (gamosaurus "guide Dofusbook"). Roughly 40% tool, 60% editorial. | `/fr` | Tool | **MEDIUM**. The tool type fits half the SERP. The other half wants "meilleurs stuffs par niveau / élément", which `/fr/sets` and `/fr/classes/*` could serve but are not framed that way. |
| "{class} build dofus 3", "stuff {class} dofus 3" | Editorial guides, nearly 100%. Breakflip "guide et stuff du niveau 1 au 200", millenium class guides, the fandom wiki. Each has a human-written role, stat priority, spell variants and stuffs per level bracket. | `/classes/{id}` | Data index (Tool/Hybrid) | **HIGH**. The title promises a "Build Guide", but the page is an auto-ranked set list plus Ankama spell text. |
| "panoplie {name}", "{set} set dofus" | Databases (encyclopedia, DofusDB) and "où drop / comment obtenir la panoplie X" guides. | `/sets/{slug}` | Product-like data page | **MEDIUM**. Bonuses and stats are well covered. There is no "how to obtain" (drops, dungeon, recipe), which is the main intent behind about half of these results. |
| "{item name}", "{monster name} dofus" | Encyclopedia and database item or monster pages. | Nothing, or a set page when the item belongs to a set | — | **CRITICAL (coverage gap)**. There are no item pages. Items outside sets (most weapons, Dofus, trophies, a large share of the catalog) have no landing page at all, and in-set items land on a page about something else. |
| "dofus damage formula", "formule dégâts dofus" | Forum threads, wiki, a few guides. Thin competition. | `/damage-guide` | Blog/Guide | **ALIGNED**. This is the best-fit page on the site. |

## Findings

### S1. Class pages are the wrong page type for "build {class}" queries — High
- **Evidence:** In "feca build dofus 3", every organic result is an editorial guide (breakflip "Feca guide et stuff : nos builds du niveau 1 au 200", millenium class guides, the fandom wiki "Feca/Chance"). `/classes/feca` opens with an H1 reading "FecaStrength", a one-sentence intro, an algorithmic list of 3 sets per level bracket and 22 spell descriptions. It has no "why", no stat priority, no characteristic allocation and no leveling path, and the community builds are empty. Titles promise "Build Guide … Best Sets by Element", and the page cannot keep that promise, which predicts pogo-sticking back to the guides.
- **Recommendation:** Reshape the page as a Hybrid (guide plus tool):
  1. Write a "How to play {class} in Dofus 3" block: role, best elements, stat priority, key spells.
  2. Present "Stuff {class} {element} by level" as the main section, with each bracket showing a complete suggested stuff. The Forger can generate these once per class, element and bracket and prerender them as builds, each with a "Open this stuff in the planner" CTA. That turns the tool into the guide content competitors write by hand.
  3. Keep the spell list but move it last, collapsed.
  4. Fix the H1 (On-Page O1).
- **Source:** `src/pages/ClassGuidePage.tsx`, `src/data/setGuide.ts` (`GUIDE_ELEMENTS`, `LEVEL_BRACKETS`), keys `class_guide_*`.

### S2. FR "stuff" queries are half editorial, and nothing on the site is framed as "meilleurs stuffs" — High
- **Evidence:** "stuffeur dofus 3" and "simulateur stuff dofus 3" return "Les meilleurs stuff pour DOFUS 3 : guides complets des équipements par niveau et élément" (next-stage), "Tous les meilleurs stuff pour DOFUS 3 Unity" (guidactik) and breakflip leveling-stuff guides next to the tool articles. `/fr/sets` ("Toutes les panoplies Dofus 3 — Bonus, objets et stats par niveau") already groups sets by level and element, but it is framed as a catalog, not a recommendation.
- **Recommendation:** Two options:
  - **(a)** Create `/fr/stuffs` (and an equivalent per locale): "Meilleurs stuffs Dofus 3 par niveau et élément". It would hold 4 elements × 5 level brackets, each a prerendered, one-click-open build generated by the Forger and linked from the home and the class pages.
  - **(b)** Reframe the top of `/fr/sets` with an "Les meilleures panoplies par élément" section above the full list, reusing the class-page ranking logic without the class filter.

  Option (a) matches the SERP better and gives the home's "stuffeur" positioning a supporting hub.
- **Source:** `src/routes.ts` (new route), `src/pages/SetsPage.tsx`, `src/data/setGuide.ts`.

### S3. No landing pages for items or monsters, despite long-tail demand — High (coverage gap)
- **Evidence:** The brief says many long-tail item, monster and set-name queries land on set pages. The site has 2,088 set URLs and 0 item URLs. Item names appear only as H3s inside set pages, so "Ougaamulet" lands on "Ougaa Set", and a weapon outside any set cannot rank at all. Those SERPs are won by database item pages (one item per URL).
- **Recommendation:** Programmatic item pages (`/items/{slug}`) for equipment at level 50 and above at first, to limit index bloat. Each page would carry:
  - stats range
  - set link
  - recipe/obtain
  - "best for: element/class" (computed)
  - "used in N community builds"
  - "Equip in planner" CTA

  Use BreadcrumbList and Product-like JSON-LD with only properties that are valid on a non-commercial item, or `Thing` plus `ItemList` in context. Gate indexation on having unique data beyond Ankama text. Run `/seo programmatic` before building.
- **Source:** `src/routes.ts`, the `writeSitemap()` prerender list in `react-router.config.ts`, `public/data/*/equipment.json`.

### S4. Set pages miss the "how do I get it" intent — Medium
- **Evidence:** "panoplie bouftou royal dofus 3" returns "où drop / comment la drop" guides (gamosaurus, guidactik, millenium) and a breakflip guide. `/fr/sets/royal-gobball-s-set` answers bonuses and stats well, but has no drop, dungeon or recipe information. 84% of sampled set pages show an empty "Community builds" block.
- **Recommendation:** See Content C3: an obtain/recipe block, "fits which classes and elements" links, and hiding empty community sections.
- **Source:** `src/pages/SetPage.tsx`, `scripts/fetch-data.ts`.

### S5. The home serves returning users, not first-time searchers — Medium
- **Evidence:** A first-time "dofus builder" or "stuffeur" visitor lands on an empty workshop ("0 / 17 slots", "SELECT CLASS", "No sets in your build"). There is no one-line value proposition, no example build, and no route into the class guides or the sets index from the page body. The only explanation is on `/about`. "Dofus Planner" is also a competing brand name, so EN "dofus planner" searchers may be looking for that site, and the page should say what Dofus Forge is within one glance.
- **Recommendation:** Keep the workshop above the fold. Add a 1-line subtitle under the H1 (FR: "Créez, simulez et optimisez votre stuff Dofus 3 — gratuit, sans compte"). Add 3 "start from" chips that open prerendered example builds ("Iop Force 200", "Cra Agilité 200", "Stuff leveling 100"). Then add the crawlable section from Content C1 below the fold.
- **Source:** `src/pages/BuilderPage.tsx`, `src/features/workshop/WorkshopBar.tsx`.

### S6. The damage guide fits its query and could feed the tool — Info (opportunity)
- **Evidence:** The informational query is served with a numbered formula, worked examples and an FAQ. It is the strongest SXO match on the site. It has no in-body links (On-Page O3).
- **Recommendation:** Add "See it in your build" links to the planner's damage view, and link the guide from class pages ("why Power matters for {class}").
- **Source:** `src/pages/DamageGuidePage.tsx`.

## SXO Gap Scores

| Page | Page type /15 | Depth /15 | UX /15 | Schema /15 | Media /15 | Authority /15 | Freshness /10 | **SXO Gap Score** |
|---|---|---|---|---|---|---|---|---|
| `/fr` (target "stuffeur") | 9 | 3 | 10 | 9 | 10 | 6 | 6 | **53** |
| `/` (target "dofus planner/builder") | 12 | 3 | 10 | 9 | 10 | 6 | 6 | **56** |
| `/fr/classes/feca` ("stuff féca dofus 3") | 5 | 8 | 9 | 9 | 10 | 5 | 5 | **51** |
| `/fr/sets/royal-gobball-s-set` ("panoplie bouftou royal") | 11 | 9 | 11 | 12 | 11 | 5 | 5 | **64** |
| `/damage-guide` ("dofus damage formula") | 14 | 13 | 12 | 7 | 9 | 7 | 5 | **67** |

## User stories (signal-cited)

1. **Awareness.** As a French player gearing a new character, I want to see "the best stuff for my level and element" so I can farm the right set. *Signal: next-stage/guidactik/breakflip "meilleurs stuffs par niveau et élément" in the "stuffeur" and "simulateur de stuff" SERPs.*
2. **Consideration.** As a player choosing a class build, I want a stat priority and a stuff per level bracket so I don't waste kamas. *Signal: 100% editorial "guide et stuff niveau 1 à 200" results for "feca build dofus 3".*
3. **Decision.** As a player who knows the set I want, I want to know where it drops or how it's crafted. *Signal: "où drop / comment drop la panoplie X" titles in the "panoplie bouftou royal" SERP.*
4. **Decision.** As a returning theorycrafter, I want a free planner with current Dofus 3 data that I can share by link. *Signal: tool-explainer articles (gamosaurus) and the mention that older tools are "plus à jour".*
5. **Awareness.** As a player wondering why my damage is low, I want the actual formula with numbers. *Signal: the informational query has no strong editorial owner.*

## Persona scores (Relevance / Clarity / Trust / Action, 25 each)

| Persona (journey stage) | Landing page | R | C | T | A | Total | Top fix |
|---|---|---|---|---|---|---|---|
| FR gear-seeker, "meilleur stuff niv. X" (Awareness) | `/fr` or `/fr/sets` | 10 | 8 | 15 | 14 | **47** | S2 "meilleurs stuffs" hub |
| Class-build researcher (Consideration) | `/fr/classes/*` | 12 | 10 | 14 | 15 | **51** | S1 hand-written guide block plus prerendered stuffs |
| Drop hunter for a set or item (Decision) | `/fr/sets/*` | 13 | 16 | 15 | 12 | **56** | S4/C3 obtain block; S3 item pages |
| First-time "dofus builder" searcher (Awareness) | `/` | 15 | 9 | 15 | 17 | **56** | S5 subtitle, example builds, crawlable intro |
| Returning theorycrafter (Decision) | `/` | 23 | 20 | 18 | 23 | **84** | Already well served |
| Mechanics learner (Awareness) | `/damage-guide` | 23 | 20 | 16 | 15 | **74** | Byline/date (C4) and links into the planner |

The weakest personas are the FR gear-seeker and the class-build researcher, so fix those pages first. They are also the queries where France, the largest market, sits at position 9.9.
