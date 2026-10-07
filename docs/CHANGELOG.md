# Changelog

All notable changes to Dofus Forge are documented here.  
Game version is read automatically from `public/data/version.json` (currently **3.7.1.0**).

---

## [0.3.47] — 2026-10-07
- **Feature**: shared build links (`/build/:id`) now unfurl with a real, build-specific preview image on Discord/WhatsApp/X/Facebook — build name, class portrait, level, equipped items with their icons, AP/MP/HP/Range, and characteristics, rendered at the edge (Cloudflare Worker, satori + resvg) and cached. Title/description also now reflect the actual build instead of generic copy, injected server-side via `HTMLRewriter` so crawlers see correct metadata without running JS
- **Fix**: shared build page `<title>` now includes the build's own name (when set) instead of only "`<Class>` build (level `N`)"

## [0.3.46] — 2026-10-06
- **Fix**: some items' special ability text showed raw unresolved markup instead of a clean description — e.g. boots showing `{{spell,31858,1::Clarividencia de Meriana}}` literally instead of just "Clarividencia de Meriana". Ankama's API embeds a clickable in-game link reference in that text (`{{category,id,grade::display name}}`), which our plain-text rendering has no way to resolve — now stripped down to just the display name at the data-normalization step. Affected 74 items in the catalog

## [0.3.45] — 2026-10-06
- **Fix**: equipment/sets are finally back on Dofus **3.7.1.0** with real stats — `api.dofusdu.de` fixed the effects outage on their end (reported to them directly; fixed same day). Re-ran the normal `pnpm fetch-data` against the REST API, no code changes needed — confirmed byte-for-byte consistent with items whose stats were already known (Twiggy Sword, Age-Old Amulet). 4073/4095 items now carry real effects, 527/940 sets have bonuses

## [0.3.44] — 2026-10-06
- **Fix**: the equipment/sets endpoints on `api.dofusdu.de` (our third-party game data provider) stopped returning any `effects` at all for any item as of the Dofus 3.7 rollout, on both the bulk list and single-item detail endpoints — every item in the catalog (4095/4095) came back with zero stats. Verified directly against the live API, with no query parameter restoring it — an outage on their side, not something fixable by calling it differently. Rolled equipment/sets/consumables/index back to the last known-good **3.6.12.16** data while the provider's outage lasts
- Spell data and class/stat images stay on **3.7.1.0** — that source (GitHub game-data releases, not this REST API) is unaffected
- A same-day attempt to source equipment/sets from that raw GitHub data too (bypassing the provider entirely) didn't hold up well enough once in daily use, so that approach was reverted — staying on the REST API and waiting for `api.dofusdu.de` to fix the outage instead. Re-run `pnpm fetch-data` once it does; nothing else needs to change on our end

## [0.3.43] — 2026-10-06
- **Chore**: refreshed game data to Dofus **3.7.1.0** — real content changes this time: equipment catalog 4356→4095 items, sets 931→940 (not just a version-string bump like the previous 3.6.12.16 refresh). *(Superseded for equipment by 0.3.44 — see above.)*
- **Fix**: spell effect extraction (`scripts/fetch-spells.ts`) silently broke for this version — the game's raw data renamed the per-effect type field from `effectId` to `actionId` (same numeric ids, confirmed against the effect registry's own unrenamed `id` field), so every ID-based check (trap/glyph damage, push, AP/MP steal, erosion, stacking spell buffs) was comparing against `undefined` and failing. Trap/glyph placement damage resolution dropped from ~172 to exactly 0 under the old field name — a real regression for every trap/glyph spell (Sram, Sadida, Feca, etc.), not just a cosmetic change. Fixed by reading `actionId` instead; verified in the actual rendered Spells panel that trap damage (e.g. Sram's "Miry Trap" 33–37, "Malevolent Trap" charge tiers) displays correctly again
- **Fix**: `scripts/fetch-images.ts` used a shell `mv` command to rename extracted files, which only works under a Unix-like shell — failed outright on a plain Windows `cmd.exe`/PowerShell invocation of the ETL script. Switched to `fs.renameSync`, which works identically regardless of which shell runs the script

## [0.3.42] — 2026-10-05
- **Fix**: the previous fix didn't go far enough — the account menu and your own public profile page (`/u/:username`) still showed the optional display name as the PRIMARY name (e.g. "Juan"), with the username only as a small subtitle. Per the same rule now applied everywhere else, the username is always the primary identity shown; the display name (if set) is now just a small secondary caption underneath it, never the headline
- **Chore**: refreshed game data to Dofus **3.6.12.16** (equipment, sets, mounts, spells, stat/class images) — item/set/mount catalog unchanged (4356/931/308), this was a game patch with no new equipment
- **Fix**: `scripts/fetch-images.ts` used a shell `mv` command to rename extracted files, which only works under a Unix-like shell — failed outright on a plain Windows `cmd.exe`/PowerShell invocation of the ETL script. Switched to `fs.renameSync`, which works identically regardless of which shell runs the script

## [0.3.41] — 2026-10-05
- **Fix**: the account menu (top-right corner) could show ONLY your optional display name, with no username visible anywhere — if you set a real name/alias, your actual public @username was effectively hidden from the one place you look at your own account most. The dropdown now shows your username underneath your name (same pattern as your public profile page), and the button's tooltip includes it too

## [0.3.40] — 2026-10-05
- **Fix**: build and comment attribution ("by X") showed the optional display name instead of the username — if you set a real name/alias in your profile, it replaced your public username everywhere your builds and comments appeared, contradicting the username field's own hint that it's "the name others will see". `BuildCard`, `BuildDetailPage` (build owner + comments) now always show the username, never the display name
- **Polish**: renamed the profile field from "Display name" to "Name (optional)" with a new hint clarifying it only shows on your own profile next to your @username, never as attribution elsewhere. Your own profile page and account menu are unchanged on purpose — showing your chosen name next to your @handle there is the intended feature, not the bug

## [0.3.39] — 2026-10-03
- **Feat**: new Settings option — "Characteristics side" — lets you move the planner's class/characteristics/stats sidebar to the left instead of the right (desktop only; mobile already stacks everything via tabs). Requested by a user whose friend has muscle memory for the sidebar on the left from other build planners. Persisted in `localStorage`, applies instantly without reload, same event-driven settings pattern as the existing theme/sound/cursor/particles toggles

## [0.3.38] — 2026-10-03
- **Perf**: fixed the item-picker modal freezing on low-end PCs, reported by a user whose friend's machine lagged badly whenever reopening the picker with a full set already equipped — turned out to be unrelated to set-completion and purely about how many items got mounted at once (the weapon slot alone has 769 matching items, all rendered as real, hover-handler-laden DOM nodes synchronously on every open)
  - Item grid now renders in pages of 20, growing via infinite scroll (`IntersectionObserver` on a sentinel, no new dependency) as you scroll, with a small loading spinner — opening any slot now mounts at most 20 cards instead of up to 769
  - Each card is now its own memoized component, so toggling a favorite or hovering one card no longer re-renders every other card in the grid
  - `content-visibility: auto` on each card so the browser skips layout/paint for ones scrolled out of view
  - Per-slot derived data (available sets/stats/types for the picker's filters) is now cached per equipment dataset instead of re-scanning the ~4300-item catalog on every single modal open
- **Perf**: fixed a broad Zustand subscription (`useBuildStore(s => s)` / `useBuildStore()` with no selector) in `BuilderPage`, `ShareBar`, `PublishModal`, and `ComparePanel` that re-rendered far more of the page than necessary on every build change (equip, scroll toggle, level, stat point…). The brand-link's "open current build in new tab" href needed the full build (only it does, so it's now isolated into its own small component); the rest only ever used the full state inside a click handler, so they now read it on demand via `useBuildStore.getState()` instead of subscribing to it

## [0.3.37] — 2026-10-03
- **Feat**: M64 — public site-wide build counter on `/about`, showing the total number of builds ever created (public + private combined), via a new `get_total_builds_count()` Postgres function. Built as `security definer` because `builds`' own row-level security only lets a regular query see public builds plus the caller's own — this function returns nothing but a single count, never row content, so bypassing RLS here can't leak anything private
- **Feat**: M64 — hard limit of 50 builds per account, enforced server-side with a `before insert` trigger on `builds` (checks the already trigger-synced `profiles.builds_count`, so no extra table scan). Enforced in the database, not just the UI, since a client-only check can be bypassed by calling the API directly. The Publish modal now shows a clear "limit reached, delete an old one" message when this hits
- **Feat**: M64 — publishing a build now defaults to **public** visibility instead of private, so new builds are discoverable in Explore by default
- Noted for later (not implemented): if the 50-build cap becomes a real problem for someone, a paid tier that raises it is worth evaluating then — tracked in `docs/ROADMAP.md`

## [0.3.36] — 2026-10-03
- **Feat**: proactive "update available" banner. A user reported getting stuck on `404.html`'s "Redirecting…" screen after a deploy with no way out besides manually typing a URL — likely a stale cached `index.html` referencing JS chunk filenames Vite had already deleted on the next build (every chunk is content-hashed, old ones aren't kept around). New `dist/version.json` (generated fresh on every build, from the same `VERSION` file `__APP_VERSION__` is baked from) is fetched with `cache: 'no-store'` on load, every 10 minutes, and whenever the tab becomes visible again — the case that actually matters, a build-detail tab left open across a deploy. On a mismatch, shows a dismissible banner with a reload button instead of letting the user hit the stale-cache failure the hard way
- **Fix**: `404.html`'s redirect now has a visible escape hatch — if the automatic JS redirect hasn't navigated away within 2.5s (same failure as above, or any other reason it stalls), a manual "Go to Dofus Forge" link appears instead of leaving the user staring at "Redirecting…" indefinitely

## [0.3.35] — 2026-10-03
- **Fix**: `translation.json` had no cache-busting — its URL (`/locales/{lang}/translation.json`) never changes between deploys, so the browser's normal HTTP cache could keep serving a pre-deploy copy for its whole `max-age` window after a new version shipped. Any key added or renamed in that window would render as the raw key string (e.g. a tooltip literally showing `build_detail_power_breakdown` instead of its text) until the cache naturally expired — this is almost certainly what made the previous version's new Power-breakdown tooltip look broken right after deploy. Fetch now appends `?v=${__APP_VERSION__}` (the same global already used elsewhere), so every version bump forces a fresh fetch instead of waiting out the cache
- Verified the Power-breakdown vs. scroll-badge tooltip split works as intended (nested `title` attributes, innermost wins): hovering the scroll icon specifically shows "Pergaminado (+1 por punto)", hovering anywhere else on the same row shows the Power breakdown — this was already correct in 0.3.34, the stale-cache bug just made it unreadable

## [0.3.34] — 2026-10-03
- **Fix**: `BuildDetailPage`'s characteristics grid showed the raw `Strength`/`Intelligence`/`Chance`/`Agility` values without the `Power` stat's bonus added in — these 4 double as their matching element's damage stat in Dofus 3, so `Power` boosts them directly. The planner's own `CharacteristicsPanel` already applies this (shown inline as "980 +290 =1,270"); `BuildDetailPage` was reading the unboosted base straight off the computed `StatBlock` and never added `Power` on top, under-reporting these 4 stats for any build with a `Power` source equipped
- **Polish**: unlike the planner (which shows the full "base +power =total" breakdown inline since you're actively tuning it), the read-only build page just shows the final total — the breakdown is a hover tooltip instead, since nobody's editing it. Verified end-to-end with Playwright using a real low-level item with a real `Power` effect (not a fabricated one): Agility showed the correctly-summed total, with "50 + 7 (Power)" in the tooltip; Vitality/Wisdom (unaffected by Power) got no tooltip

## [0.3.33] — 2026-10-03
- **Feat**: `BuildDetailPage`'s read-only characteristics grid now shows a small scroll icon next to any stat the build's author scrolled (pergamino) — this was only ever visible in the editable planner's own `ScrollToggles`, with no equivalent when viewing someone else's published build. `scrolled` is now computed in its own `useMemo` (just unpacking the snapshot's bitmask, no equipment/sets data needed) instead of being a throwaway local inside the `computedStats` memo, so it's available for display without changing what `recompute()` was already fed. Verified with Playwright with a known bitmask (vitality+wisdom scrolled, others not) — exactly those two rows show the icon

## [0.3.32] — 2026-10-03
- **Feat**: M52 — bookmarks. Save/unsave button on `BuildDetailPage` (next to Like, same optimistic update/rollback pattern), using the existing `build_bookmarks` table — its RLS is owner-only (`using (auth.uid() = user_id)`, unlike `build_likes`/`follows` which are publicly readable), so bookmarks are private by design, no change needed there
- **Feat**: new "Bookmarked" tab on `MyBuildsPage` (alongside the existing "My Builds" tab) listing everything the user has bookmarked — reuses `BuildCard` (the read-only Explore/profile card), not `MyBuildCard`, since these are other people's builds with no edit/delete/visibility controls to offer. Fetched lazily, only once the tab is actually opened
- **Chore**: `fetchMyBookmarkedBuilds` joins `build_bookmarks` to `builds` via `builds!inner(...)` using the same `LIST_COLUMNS` as every other build list query, ordered by when it was bookmarked (most recent first)

## [0.3.31] — 2026-10-02
- **Feat**: M51 — follow users. Follow/unfollow button on `/u/:username`, using the `follows` table and `profiles.followers_count`/`following_count` (already trigger-synced — no schema change needed, just the UI). Optimistic update with rollback on error, same pattern as the existing like button; disabled with a tooltip when logged out, hidden entirely on your own profile
- **Fix**: M50's search used `plainto_tsquery`, which only matches whole words — typing "Emp" would never find "Empujes" since it's not a complete word, which is a poor "as you type" search experience. Switched to a per-word prefix query (`word:*`, AND-joined) built manually and passed to `.textSearch()` with no `type` — still hits the exact same GIN index, no new migration needed. Considered plain `ilike '%x%'` for true substring matching instead, but there's no trigram index on `builds.name` yet, so it would force a full sequential scan on every keystroke; left as a documented follow-up if real substring matching (not just prefix) is wanted later

## [0.3.30] — 2026-10-02
- **Feat**: M50 — full-text search in Explore. Uses `builds.search_vector`, a `tsvector` column already generated and indexed server-side (`idx_builds_search`, a GIN index) — no schema change needed, zero extra write cost. Query via `.textSearch('search_vector', q, { type: 'plain', config: 'simple' })`, matching the exact config the column itself was generated with (no language stemming, since names/descriptions are free text in any of the app's 4 languages). Input is debounced 350ms — verified with Playwright that 4 rapid keystrokes fire exactly one network request, not four. Results stay ordered by whatever sort the user picked (rating/likes/recent/views); true relevance ranking (`ts_rank`) would need a dedicated RPC, out of scope for this pass
- First of the M50-M59 batch tracked in `docs/ROADMAP.md` for using the remaining unused Supabase tables — implementing one at a time

## [0.3.29] — 2026-10-02
- **Fix**: `BuildCard`'s whole-card gold border-glow fired on hovering the owner name too (both were inside the same `<div>` with the hover handler), making the username link look like part of the same click target as the build. Moved the hover handlers to the "go to build" `Link` specifically (via `buildHover` state instead of direct DOM mutation, since now two different zones need independent hover feedback) and gave the owner link its own distinct treatment — a small background chip + underline on hover — so the two destinations read as visually different kinds of links, not one blended surface
- **Fix**: the comment author's name on `BuildDetailPage` had an inline `style={{ color: 'var(--ink) }}` that permanently beat its own `hover:text-gold` Tailwind class — inline styles win over any stylesheet rule regardless of pseudo-state, so hovering it never visibly changed anything despite being a working link underneath. Replaced the inline color with the `text-ink` utility class so the `hover:` variant can actually take over; added `hover:underline` to both this link and the build-header owner link for clearer, consistent affordance that these are clickable

## [0.3.28] — 2026-10-02
- **Feat**: `BuildCard` (used by Explore, My Builds, and the new profile page) now also links its owner name to `/u/:username` — the previous version flagged this as a follow-up since the whole card was already a `<Link>` to the build, and nesting a second `<a>` inside it produces invalid, unreliably-clickable HTML. Restructured: the card's outer element is now a `<div>` carrying the hover/border styling, with two independent `Link`s inside it — one for the owner row, one wrapping everything else (portrait, name, equipment preview, stats) to the build detail. Verified with Playwright: zero nested anchors, both links navigate independently

## [0.3.27] — 2026-10-02
- **Feat**: new public profile page at `/u/:username` — routed by username, never the internal uuid, even though `profiles` is already publicly readable (`for select using (true)`). Shows username, avatar, join date, and three stats: public builds count, total likes received, and comments posted — all computed from what the user published themselves. Deliberately excludes anything about their activity on OTHER people's content (likes/ratings given), since that's browsing behavior, not something they created; this was an explicit scope decision, not an oversight
- **Feat**: the build owner's name and each comment author's name on `BuildDetailPage` are now links to their `/u/:username` profile (previously plain text) — the only entry points into the new page besides typing the URL directly
- **Perf**: profile stats are a separate lightweight query (`fetchUserPublicStats` — just `id, like_count` for aggregation) instead of pulling full build rows (snapshot JSON included) just to count them. The profile's build list itself reuses `fetchPublicBuilds` (now also accepting a `userId` filter) with the same pagination/page size Explore already uses, instead of fetching up to 60 builds with full snapshots in one shot — a user with many public builds doesn't load snapshots for builds that aren't even visible yet
- **Chore**: comment counts are scoped to comments left on `visibility = 'public'` builds only (`build_comments.builds!inner(visibility)` filter) — comments on private/unlisted builds aren't inferable from a public profile even as a bare number
- Not added to `sitemap.xml`/postbuild static generation — same reasoning as `build/:id`: unbounded, DB-backed, no way to enumerate every username from a static sitemap. Discoverable via the new links on `BuildDetailPage` instead

## [0.3.26] — 2026-10-02
- **Fix**: `LanguageSwitcher` (used by the Settings panel on every page) always navigated to the bare language root, regardless of the page you were actually on — switching language from `/classes/cra` or `/about` bounced you back to the planner. Same failure mode as `RootRoute`'s redirect bug fixed in 0.3.21, just in a different component: hardcoded `/` or `/${code}/` instead of preserving `location.pathname`'s sub-path. Now strips the current language prefix (if any) and re-prefixes with the new one, keeping you on the same page. Verified with Playwright: `/es/classes/cra/` → FR now lands on `/fr/classes/cra/`, not `/fr/`
- **Polish**: `ClassGuidePage`'s spell cards were cramped and unclear — bare icon+number badges with no labels, a 2-column grid kicking in at `sm` (too narrow, squeezing descriptions into awkward wraps). Reworked: grid now goes 2-column at `lg` instead of `sm`, more padding, and every stat is labeled in words (AP/Range/Damage + element name) instead of bare icons — a cold visitor from Google has no reason to already know this app's icon language. Added a grade badge ("Lvl 3 (max)") next to each spell name and a one-line note clarifying the numbers are base values at max spell level, not live stat-adjusted damage

## [0.3.25] — 2026-10-02
- **Fix**: `AboutPage`'s class list always showed the English/display name from `classData.ts` regardless of the active language (e.g. "Sacrier" on the French page instead of "Sacrieur") — it read `CLASS_DATA[].name` directly instead of going through the existing per-language resolver (`resolveClassName`, already used by `ClassPicker`/`BuildCard`/etc. since an earlier version). Root cause: `AboutPage` never called `useLoadGameData()`, so `classNames` (the per-language name table) was never loaded, and the resolver's fallback (the English name) was all it ever had. Now loads the data and resolves names correctly — verified es/fr now show Sacrógrito/Sacrieur, Hipermago/Huppermage, etc. instead of the same English list on every language
- **Feat**: new `/classes/:id` page — a standalone, read-only spell guide per class, distinct from the planner's `SpellsPanel` (which needs a full build — equipped items, allocated characteristics — to compute live damage numbers). Shows each spell's base data instead: name, description, AP cost, range and raw min–max effect numbers at max grade, no build required. Pilot: only Cra/Ocra/Crâ for now (`src/pages/ClassGuidePage.tsx`, linked from `AboutPage`'s class list via `CLASS_GUIDE_PILOT`) — real indexable content per class is a strong long-tail SEO play ("[class] dofus spells"), but 19 classes × 4 languages is the biggest page-count jump yet, so validating the format on one class first before generating the other 18
- **Fix**: an invalid `/classes/:id` showed the build-detail page's "this build doesn't exist" copy (reused by mistake) — now has its own "this class doesn't exist" message
- **Chore**: `scripts/postbuild-lang-pages.mjs` and `sitemap.xml` extended for `/classes/cra` (all 4 languages + the `/en` mirror)

## [0.3.24] — 2026-10-02
- **Fix**: the previous version only trimmed the homepage's marketing block (removed the features grid and "how it works" list) but left the intro paragraph, class list and FAQ behind — the actual ask was for NONE of it to live on the planner anymore, all of it on `/about`/`/how-to-use` instead. `SeoContent.tsx` deleted entirely; the remaining class list (with its real `?class=` deep links) and FAQ (with its `FAQPage` JSON-LD) moved into `AboutPage.tsx`, joining the features grid that was already moved there last version. The planner's homepage now has zero marketing copy below it — just the tool and the footer

## [0.3.23] — 2026-10-02
- **Fix**: `ShareBar` rendered its own "My Builds" link right next to `BuilderPage`'s own header nav/mobile-menu/command-palette "My Builds" entries — same destination, shown twice side by side on wide viewports. Removed the `ShareBar` copy entirely (it's only ever mounted inside `BuilderPage`, so nothing lost); `ShareBar` now only has Export and Share
- **Feat**: proper favicon for search engines — added PNG fallbacks (`favicon-48.png`, `favicon-192.png`, `apple-touch-icon.png`, rendered from the existing `favicon.svg` via a Playwright screenshot since no image-conversion tool is available) alongside the SVG. Per Google's favicon guidelines (square, multiple of 48px, referenced via `<link rel="icon">`), the SVG-only setup was a plausible reason Google was showing a generic fallback icon/site name ("GitHub Pages documentation") for this freshly-indexed site instead of Dofus Forge's own branding
- **Feat**: added a `WebSite` + `Organization`(`logo`) JSON-LD block to `index.html`, separate from the existing `WebApplication` entry — gives Google an explicit site name and logo to resolve instead of falling back to a generic label while the site is still thinly crawled
- **Polish**: `SeoContent.tsx` (the block below the planner on the homepage) duplicated content that now has its own, more complete pages — the "What you can do" features grid and the 4-step "How it works" list. Removed both from the homepage (kept: the one-line pitch, the class list with its `?class=` deep links, and the FAQ — none of those are duplicated elsewhere) and added About/How to Use links to its CTA row. The features grid itself wasn't just deleted — moved into `AboutPage.tsx` (its "what you can do" section), since it was better-written there than inventing something new for About

## [0.3.22] — 2026-10-02
- **Feat**: two new pages, `/about` and `/how-to-use`, in all 4 languages — real content (not a stub): About covers why the tool exists, where the data comes from, free/no-account model and who makes it; How to Use is an 8-step walkthrough of every real feature (class/level, equipping, stats/set bonuses, forgemagie runes, the optimizer, compare, share/publish, My Builds), each step naming the actual UI control. Both get their own `usePageSeo` title/description and are in `sitemap.xml`
- **Feat**: new `SiteFooter.tsx`, shared by the planner, Explore, My Builds, build detail, About and How to Use — a consistent internal-link nav (Home/About/How to Use/Explore/My Builds) on every page instead of only the planner having a footer. Replaces `BuilderPage`'s inline footer
- **Feat**: `SiteHeader`'s mobile menu and command palette (`Ctrl/Cmd+K`) gained About/How to Use entries; `BuilderPage`'s own header menu/palette too
- **Fix**: `SiteHeader`'s brand mark was an `<h1>`, duplicating the real page `<h1>` on every page it's mounted on (Explore, My Builds, build detail already had this; About/How to Use would have too) — demoted to a `<span>`, each page keeps exactly one `<h1>`
- **Fix**: `RootRoute`'s language-preference redirect hardcoded a trailing `/`, silently dropping the actual sub-path (`/explore`, `/how-to-use`, etc.) and bouncing a returning non-English visitor to the bare language root instead of the page they actually requested — only became obvious once there were sub-routes worth deep-linking to directly. Now preserves `location.pathname`
- **Chore**: removed the "not affiliated with Ankama" / Ankama-attribution disclaimer entirely (previous `disclaimer` i18n key and footer line, plus that framing from the new About copy) — explicit request, previously used as standard fan-project trademark-safety boilerplate
- **Chore**: `scripts/postbuild-lang-pages.mjs` refactored into one `generateRoute(slug, meta)` helper instead of duplicated per-route loops, and extended to also generate `/about` and `/how-to-use` static files (all 4 languages + the `/en` mirror) so they get a real 200 on GitHub Pages like every other route since 0.3.21

## [0.3.21] — 2026-10-02
- **Fix**: every route under a language prefix (`/explore`, `/my-builds`, `/build/:id`) inherited the homepage's title/description/canonical — `LangRoute` set them once for the whole layout and no page ever overrode them. Replaced with `usePageSeo(lang, path, opts)` (`src/seo/useSeoMeta.ts`), called by each page with its own path so canonical/hreflang/og/twitter meta are now correct per route instead of all pointing at `/`. `BuildDetailPage` gets a build-specific title/description (class + level); `MyBuildsPage` (private, auth-gated) now sends `noindex, follow` since there's nothing public to rank there
- **Fix**: `/explore` and `/my-builds` had no physical file on GitHub Pages — only the language roots (`/es/`, `/fr/`, `/pt/`) got a pre-generated `index.html` after the `0.3.x` fix for that; sub-routes still 404'd on direct load/crawl (same failure mode, never extended). `scripts/postbuild-lang-pages.mjs` now also generates `dist/<lang>/explore/index.html` and `dist/<lang>/my-builds/index.html` for all 4 languages, each with correct baked-in title/description/canonical/hreflang (and `noindex` for `my-builds`) — Google can't index a 404-status page regardless of its body, so this was silently blocking `/explore` (public, meant to be found) from ever ranking
- **Feat**: added a crawlable "what is this / features / classes / how it works / FAQ" content section (`src/components/SeoContent.tsx`) below the planner on the homepage, with a `FAQPage` JSON-LD block — the planner itself is a canvas-driven tool with almost no indexable text, so this is the only real keyword-matching copy Google has to rank the site against queries like "dofus build planner" or "dofus sets". Content in all 4 languages. The classes section links to the planner with `?class=<id>`, a new real deep-link (`BuilderPage.tsx` reads it on mount and preselects that class via `setClass`, skipped once a build is already underway) — not just decorative text
- **Fix**: `index.html`'s static `og:locale` was `es_ES` as primary with `en_US` as the only alternate — backwards, since the root `/` (and `x-default` hreflang) serves English. Now `en_US` primary with `es_ES`/`fr_FR`/`pt_PT` as alternates, matching the JSON-LD `inLanguage` order
- **Chore**: `sitemap.xml` now lists `/explore` in all 4 languages (public, meant to be indexed). `/my-builds` deliberately excluded (private) and `/build/:id` deliberately excluded (DB-backed, unbounded ids — no way to enumerate them from a static sitemap without a build-time Supabase export); those stay discoverable via internal links from Explore instead
- **Chore**: expanded `index.html`'s JSON-LD (`keywords`, `featureList`) and the `<meta name="keywords">` tag with terms across all 4 languages (panoplies/forgemagie/équipement for FR, conjuntos/forjamagia/equipamento for PT, etc.) — low-impact on its own (Google has ignored the keywords meta tag for ranking since ~2009), kept for completeness; the real per-language signal is each locale's own title/description/content above
- **Feat**: `/en` is now also a reachable route (`App.tsx`), matching `/es` `/fr` `/pt` — kept `/` as the canonical English URL (no change to `LanguageSwitcher`/internal nav, still point at `/`). Every page under `/en/*` self-declares its canonical as the no-prefix URL (`usePageSeo`'s `PATH['en']` was already `''`), so this adds addressability without creating duplicate-content competition with `/`. `scripts/postbuild-lang-pages.mjs` generates real static files for `/en/`, `/en/explore/` and `/en/my-builds/` too, same as the other 3 languages

## [0.3.20] — 2026-10-02
- **Fix**: `MyBuildsPage`'s cards behaved differently from Explore's — clicking a card loaded it straight into the planner, skipping the detail/rating/comments view that Explore's cards go to. Unified: clicking a My Builds card now opens the detail page too, and loading it into the planner moved to an explicit "Editar" button in the card's footer

## [0.3.19] — 2026-10-01
- **Feat**: single "Ajustes" (Settings) panel, opened from a gear icon in both headers — consolidates language, theme, sound, magic cursor and particles into one place instead of separate loose icon buttons. Language reuses the existing `LanguageSwitcher`; theme/sound reuse `toggleTheme()`/`toggleSound()`
- **Feat**: magic cursor and particle field now each have a real on/off toggle (`src/lib/motionSettings.ts`, localStorage-persisted) — previously they only ever respected `prefers-reduced-motion`/`pointer: coarse` with no explicit user control
- **Chore**: removed the standalone `ThemeToggle`/`SoundToggle` button components — dead code now that everything lives in the Settings panel; their underlying `toggleTheme()`/`toggleSound()` functions are unchanged and still used by the command palette
- **Fix**: sound, magic cursor and particles defaulted to ON for first-time visitors — now OFF by default (theme was already dark by default, unchanged). A new visitor gets a quiet, static experience and opts in via the Settings panel, instead of sound/motion firing without ever having been asked

## [0.3.18] — 2026-10-01
- **Feat**: equipment slots now visually distinguish set items from regular items — a gold/water-tinted border+glow instead of the same flat gold treatment for everything. Note: this replaces "item rarity" from the original redesign spec — Dofus 3's data (confirmed via `scripts/fetch-data.ts`'s documented API schema, and the raw `equipment.json`/`index.json` payloads) has no rarity field at all, so a 7-tier rarity system would have been fabricated. Set membership (`item.set_id`) is the closest real signal available
- **Feat**: "Dofus Sanctum" — the 6 Dofus slots now pulse with a slow ambient gold glow when equipped (`--dofus-aura`/`dofus-pulse` keyframe), visually distinct from regular equipment slots, no new image assets required
- **Fix**: `stat-tick` keyframe existed in `index.css` since an earlier design pass but was never wired to anything — `StatValue.tsx` now flashes it whenever its value actually changes (equip/unequip/characteristic change), so stat changes have visible feedback instead of silently updating text
- **Feat**: `ItemCatalog` is now a true bottom-sheet on mobile (slides up from the bottom edge, rounded top corners, drag-handle affordance) instead of a floating panel with reduced insets — desktop keeps the floating-panel behavior
- **Feat**: command palette (`Ctrl/Cmd+K`) — a searchable list of the same actions already reachable through the header/menu buttons (navigate, publish, optimizer, sets, compare, undo/redo, reset build, theme), filterable by typing, navigable with arrow keys, run with Enter. Mounted in both `SiteHeader` (nav + theme) and `BuilderPage` (full action set). `ThemeToggle.tsx` exports a standalone `toggleTheme()` so the palette's "theme" command stays in sync with the header's own toggle button instead of going stale
- **Feat**: magic cursor — a small gold glow trails the real mouse cursor and expands over interactive elements. The system cursor is never hidden/replaced (accessibility: nothing is lost for assistive-tech or non-mouse users), and it's skipped entirely on touch devices and under `prefers-reduced-motion`. Position updates write straight to the DOM via a ref, never through React state, so mouse movement can't trigger re-renders
- **Feat**: ambient particle field — a hand-rolled canvas (no library, per this project's existing bundle-size-first stance) of slow-drifting gold motes behind all page content. Density scales with viewport area, capped at 42 particles; pauses entirely when the tab isn't visible; skipped under `prefers-reduced-motion`
- **Feat**: sound — equipping/unequipping gear and selecting a class now play a short synthesized tone (Web Audio oscillators, no audio asset files, ~0 KB added to the bundle). New mute/unmute toggle in both headers and a matching command-palette entry; off state persists in localStorage
- **Fix**: unrelated pre-existing React dev-warning in `EquipmentGrid.tsx` ("mix shorthand and non-shorthand properties") from setting both `background` and `backgroundImage` inline on the same element — merged into a single `background` shorthand with the solid color as the last layer. Found while testing the above, not part of the original redesign scope

This closes out the "big scope" items from the premium-redesign request (particles/cursor/sound/command-palette) that the original audit (`docs/REDESIGN_AUDIT.md`) recommended skipping for bundle-size/perf reasons — built anyway per explicit request, each kept as cheap and skippable as the pattern allows (no new dependencies, hard caps, reduced-motion/touch opt-outs, mute toggle).

## [0.3.17] — 2026-10-01
- **Fix**: every counter-sync trigger function (`sync_like_count`, `sync_rating_stats`, `sync_bookmark_count`, `sync_comment_count`, `sync_comment_like_count`, `sync_follow_counts`) ran as the calling user, not `security definer` — unlike `handle_new_user()`/`record_view()`, which already had it. Since these `UPDATE builds`/`profiles`/`build_comments` rows belonging to someone OTHER than the actor (liking/commenting/rating on someone else's build), the owner-only RLS `UPDATE` policies on those tables silently matched 0 rows whenever the actor wasn't the row's owner — no error, the counter just never moved. Confirmed live: a real comment from another user showed up fine, but `comment_count` stayed at 0. Added `security definer` to all 6 (left `sync_builds_count` alone — it only ever updates the actor's own profile, never broken). Needs these 6 functions re-run (`create or replace function ...`) once in the Supabase SQL editor to fix existing counts going forward (doesn't backfill already-wrong historical counts — those need a one-off recompute if it matters)
- **Fix**: below `sm`/`lg` breakpoints, the header's extra actions (`SiteHeader`'s Explore/My Builds nav at `sm`, `BuilderPage`'s Publish/Explore/My Builds/Optimizer/Sets/Compare/Undo/Redo at `lg`) were `hidden` with no replacement — on mobile and tablet there was no way to reach any of them besides the URL bar. New `components/HeaderMenuButton.tsx`, a small dropdown behind a hamburger icon, used in both headers for exactly the items that vanish at each breakpoint. `BuilderPage` also gained a desktop "My Builds" button next to Explore — it had none before, even at full width
- **Fix**: `SiteHeader`'s Explore/My Builds nav links looked identical regardless of which page you were actually on — added an active-route gold highlight (`useLocation().pathname`) to both the desktop links and the new mobile menu's items
- **Fix**: `MyBuildsPage`'s visibility button silently cycled private→unlisted→public with no way to see the other two options before clicking — replaced with a small dropdown showing all 3 explicitly, click one to switch directly
- **Fix**: `MyBuildsPage`'s delete button had the exact same faint color/weight as the safe view-detail/copy-link buttons next to it — now tinted `--negative` so a destructive, irreversible action doesn't blend in. Added explicit `aria-label`s to all 3 icon-only action buttons (previously only `title`, invisible on touch)
- **Polish**: `BuildCard.tsx` and `MyBuildsPage`'s cards were a bare flat `<div>` (flat background + 1px border) bypassing the app's own "forge" treatment used everywhere else (bevel shadow, gold-top border, glow on hover) — now use the same recipe as `Frame`, plus the build name promoted to bold gold text instead of the same weight as the class/level line beneath it
- **Fix**: on the build detail page, the average rating (header) and "your rating" stars (bottom of sidebar, separated by the whole equipment column) were split across the page — merged into one row directly under the average, so seeing a score and rating it are in the same place
- **Fix**: posting a comment gave no feedback beyond a briefly-disabled button — submit button now reads "Posting..." while in flight

## [0.3.16] — 2026-10-01
- **Fix**: `my_builds` i18n key was just "Builds" in all 4 locales (a leftover from the old cramped `ShareBar` button) — now "My Builds"/"Mis Builds"/"Mes Builds"/"Meus Builds", shown in `SiteHeader.tsx`'s nav
- **Feat**: `MyBuildsPage.tsx`'s cards gained a comment-icon button (`handleViewDetail`) that navigates straight to that build's detail page — previously the only way to reach a build's ratings/comments/likes from My Builds was to go through Explore and find it again manually, since clicking the card itself loads the snapshot into the planner (kept as-is, still the fastest path to editing)
- **Feat**: `MyBuildRow` (`features/builds/api.ts`) and `fetchMyBuilds()`'s select now also include `comment_count`, shown on the same cards next to rating/likes/views — lets you see at a glance whether a build has new comments worth checking before clicking through. `BuildRow`/`LIST_COLUMNS` already had `comment_count` from the original Explore work but `BuildCard.tsx` never displayed it — added there too, for the same reason

## [0.3.15] — 2026-09-30
- **Fix**: `ExplorePage.tsx`, `MyBuildsPage.tsx` and `BuildDetailPage.tsx` each built their own minimal header (just a "back to planner" link) — no logo, no way to switch language/theme, no account menu, no way to jump between Explore/My Builds without going back through the builder first. New `components/SiteHeader.tsx` — same brand/nav/language/theme/auth controls as `BuilderPage`'s header, without the build-editing tools — now shared by all three

## [0.3.14] — 2026-09-30
- **Feat**: replaced `BuildItemsList` (a flat row-per-item list, one iteration ago) with `BuildCharacterView.tsx` — the same character-centered arrangement as the live `EquipmentGrid` (portrait + name + level in the middle, `LEFT_SLOTS`/`RIGHT_SLOTS` columns, extras row, dofus row below), now exported from `EquipmentGrid.tsx` so both stay in sync. Hovering a slot shows `ItemHoverTooltip` same as before (runes/forjamago included)
- **Feat**: active sets now show on the build detail page. `SetBonusesPanel.tsx` split into a pure `computeActiveSets()` + `ActiveSetsGrid` (no store reads) reused by both the live panel (interactive, opens `SetDetailModal`) and the read-only detail page (`onOpenSet` omitted — a viewer clicking "view set" must never be able to equip/unequip into the *viewer's own* unrelated live build, which is what would've happened reusing the interactive panel as-is)

## [0.3.13] — 2026-09-30
- **Feat**: `BuildDetailPage.tsx`'s equipment grid replaced with `BuildItemsList.tsx` — full rows styled like `SetDetailModal`'s item list (image, name, level, up to 6 stat chips) instead of a bare icon grid. Hovering a row shows the same `ItemHoverTooltip` used everywhere else, now extended with optional `runes`/`forjamagoName` props so it also renders the magesmithy section (and "Modificado por: <craftsman>") when the snapshot has runes on that slot — previously only `EquipmentGrid`'s own duplicated inline tooltip could show that
- **Feat**: added the missing 6 base characteristics (Vitality/Wisdom/Strength/Intelligence/Chance/Agility) to the build detail page's stats panel — `StatsFromBlock` (reused from the live planner) only ever showed derived stats, never these, since the live planner shows them separately in `CharacteristicsPanel`'s allocation UI. Verified the whole page end-to-end with Playwright against a mocked build (real item ids, a rune, a craftsman name) since this sandbox has no network egress to the real Supabase project

## [0.3.12] — 2026-09-30
- **Polish**: `BuildEquipmentPreview.tsx` was a flat, cramped grid — bare squares with thin borders, 26px icons packed tight. Reworked to match `EquipmentGrid`'s actual slot styling: gradient background, gold glow border, inset shadow, subtle diagonal highlight overlay on equipped slots. Bumped card preview size 26px → 34px, gap 1.5 → 2
- **Feat**: `BuildDetailPage.tsx`'s compact 4-badge/6-characteristic summary replaced with the real `StatsPanel` — `StatsFromBlock` (the pure, store-free inner half of `StatsPanel.tsx`: badges, elemental DMG/RES/RES% table, crit, combat grid, magesmithy totals, % damage modifiers) exported and reused as-is, so a viewed build shows literally the same stat sheet the owner sees while editing it. `MagesmithySummary` (previously read `useBuildStore(s => s.runes)` directly) now takes `runes` as a prop instead — the one piece of `StatsFromBlock` that wasn't actually pure yet, fixed as part of making this reuse possible. Page layout widened to a 2-column grid (`lg:grid-cols-[1fr_360px]`, equipment left / stats right) matching the real planner's layout instead of a single narrow column

## [0.3.11] — 2026-09-30
- **Fix**: `PublishModal.tsx` always did an `insert` — publishing a build you'd already published (e.g. just to change its visibility) silently created a second row instead of updating the first. `buildStore.ts` gains `linkedBuildId` (cleared on `reset()`/`applySnapshot()`, set when loading a build you own — from `MyBuildsPage`'s cards, or your own build's `BuildDetailPage`, never when loading someone else's). `PublishModal` now calls the new `updateBuild()` (`features/builds/api.ts`) instead of `publishBuild()` whenever a build is linked, prefilling the modal from the real current row instead of defaulting back to "private"

## [0.3.10] — 2026-09-30
- **Fix**: rating a build (`build_ratings` insert/upsert) failed with a 500 (`21000 more than one row returned by a subquery used as an expression`). Root cause: `sync_rating_stats()`'s trigger `UPDATE builds SET avg_rating=...` runs as the calling (non-admin) user, so builds' `"builds update"` RLS policy applied — and its `WITH CHECK`'s `is_featured = (select is_featured from builds where id = builds.id)` had no alias, so `builds.id` inside the subquery self-correlated to `id = id` (always true) and matched every row in `builds` instead of the one being updated. Fixed by aliasing the subquery's `builds` reference (`select b.is_featured from builds b where b.id = builds.id`) in both `schema.sql` and `docs/DATABASE.md`. Not related to rating your own build — that was always allowed; needs the corrected policy re-run once in the Supabase SQL editor (`drop policy` + re-`create policy`, since `create or replace` doesn't apply to policies)
- **Feat**: new `BuildEquipmentPreview.tsx` — read-only equipment grid (same slot order as `EquipmentGrid`, no click/drag handlers) rendering real item icons from a `BuildSnapshot`. Used in `BuildCard.tsx` (compact, `hideEmpty`, Explore) and `BuildDetailPage.tsx` (full grid). `LIST_COLUMNS` in `features/builds/api.ts` now includes `snapshot` so list queries can render it too, not just the detail fetch
- **Feat**: `BuildDetailPage.tsx` computes real stats from the build's snapshot — `buildStore.ts`'s internal `recompute()` exported and reused (no duplicated stat-calculation logic) to turn `{allocated, scrolled, equipped, runes}` + loaded equipment/sets data into a `StatBlock`, shown as HP/AP/MP/Range badges + the 6 characteristics. New `data/useLoadGameData.ts` hook (extracted from `BuilderPage`'s inline effect) loads item/set data for `ExplorePage`, `BuildDetailPage` and `MyBuildsPage`, none of which go through the builder first
- **Feat**: "My Builds" promoted from `ShareBar`'s small dropdown to its own page (`pages/MyBuildsPage.tsx`, route `/{lang}/my-builds`) — stat row (total/public/likes received), bigger cards with equipment icons, a visibility badge that cycles private→unlisted→public on click (`updateBuildVisibility()`, new in `features/builds/api.ts`), copy-link and delete (with a confirm prompt — a destructive DB action, unlike the old instant-delete local list). `ShareBar`'s button is now a plain link to this page

## [0.3.9] — 2026-09-30
- **Feat**: `ShareBar.tsx`'s "My Builds" panel dropped its local (localStorage) save/list entirely — it now shows only the signed-in user's own DB rows (`fetchMyBuilds()`, any visibility, RLS-gated to the owner), consistent with everything else now living server-side. No sign-in → a sign-in prompt instead of an empty local list. `savedBuilds.ts` trimmed to just `listBuilds()` (kept read-only — `ComparePanel.tsx`'s "Build B" picker still reads pre-existing local saves); `saveBuild()`/`deleteBuild()`/`renameBuild()` deleted, they had zero callers left

## [0.3.8] — 2026-09-30
- **Feat**: `ShareBar.tsx`'s "My Builds" panel now has a second list — your published cloud builds (`fetchMyBuilds()`, `features/builds/api.ts`), regardless of visibility (RLS already lets the owner see their own private/unlisted/public rows). Each row shows a visibility badge, clicking loads its snapshot into the planner the same way local saved builds do, trash icon calls `deleteBuild()` (RLS-gated to the owner)

## [0.3.7] — 2026-09-30
- **Fix**: publishing a build then opening it (Explore card or the detail link) failed with `PGRST201`: `builds` embeds `profiles` through more than one relationship — the owner FK (`builds_user_id_fkey`), `fk_pinned_build`, and transitively through `build_likes`/`build_ratings`/`build_bookmarks` as many-to-many junctions — so PostgREST rejected the bare `profiles(...)` embed in `features/builds/api.ts`'s `LIST_COLUMNS` as ambiguous. Same risk existed in `fetchComments()` (`comment_likes` joins `build_comments` to `profiles` as a second path). Both now name the exact FK: `profiles!builds_user_id_fkey(...)` and `profiles!build_comments_user_id_fkey(...)`

## [0.3.6] — 2026-09-30
- **Feat (M47 — Publish)**: new `src/features/publish/PublishModal.tsx` + `src/features/builds/api.ts`'s `publishBuild()` — inserts into `builds` with the current build's `BuildSnapshot` stored directly as the `snapshot` jsonb column (refactored `codec.ts`'s `encodeBuild()` to expose `buildSnapshotFromState()` so both the URL-encoder and the cloud-publish path share the same snapshot-building logic instead of duplicating it). Requires sign-in; name + visibility (private/unlisted/public) picked in the modal; slug generated server-side via the existing `generate_slug()` RPC. New "Publicar" header button (next to "Explorar"), disabled until a class is picked, same as the other build-dependent actions
- **Feat (M48 — Explore)**: new route `/{lang}/explore` (`src/pages/ExplorePage.tsx`) lists public builds (`visibility = 'public'`) with a class filter and 4 sort modes (rating/likes/recent/views) mapped directly to the `idx_builds_explore_*` partial indexes already in `schema.sql`. `BuildCard.tsx` shows the class portrait, name, level, owner (avatar/username), and like/rating/view counts. Paginated via `range()` + a "Load more" button (24 per page)
- **Feat (M49 — Build detail)**: new route `/{lang}/build/:id` (`src/pages/BuildDetailPage.tsx`) — owner info, a live-editable 1-5 star rating (`build_ratings`, upserted on its composite PK), a like toggle (`build_likes`), a flat comment thread (`build_comments`, `content` 1-2000 chars), and a "Load into planner" button that calls the existing `buildStore.applySnapshot()` and navigates back to the builder — reuses 100% of the existing equipment/stats UI instead of building a second read-only renderer. View count increments via the `record_view()` RPC already in `schema.sql` (anonymous view dedup is best-effort only — no IP hashing on the client, out of scope for this pass)
- **Chore**: `App.tsx`'s routing restructured from one catch-all route per language (`es/*` → always `BuilderPage`) into nested routes per language (`index` → `BuilderPage`, `explore`, `build/:id`, plus a `*` fallback to `BuilderPage` for old deep links) — React Router v6 ranks static/dynamic segments over the wildcard automatically, so this didn't need any route-ordering care. `RootRoute` (the `/` → `/{lang}/` returning-visitor redirect) now renders `<Outlet/>` instead of `<BuilderPage/>` directly so English gets the same nested sub-routes

## [0.3.5] — 2026-09-30
- **Fix**: some accounts got `403 permission denied for table profiles` (code `42501`) on `AuthButton`'s profile fetch, still showing the raw email in the header — RLS's "profiles public read" policy (`using (true)`) was fine, but that's a row-level filter that only applies AFTER Postgres confirms the role can touch the table at all. That base GRANT was missing — Supabase normally configures it automatically for every table on a new project, and it looks like this project never got it. Added an explicit `## 6b. Grants` section to `docs/DATABASE.md` (mirrored in `schema.sql`): broad `select/insert/update/delete` to `authenticated`, `select` to `anon`, on purpose — RLS stays the real access-control layer, this only unblocks the attempt. Needs to be run once in the Supabase SQL editor to fix existing accounts

## [0.3.4] — 2026-09-30
- **Feat**: `ProfileModal.tsx` replaces `EditUsernameModal.tsx` — one place to edit username, display_name and bio (already existed as columns on `profiles`, no UI before), plus a read-only builds/followers/following count row. Opened from the account menu ("My Profile" instead of "Change Username")
- **Fix**: `authStore.ts`'s `fetchProfile()` swallowed its error and silently fell back to `profile: null`, which made `AuthButton` show the raw email with zero indication anything was wrong. Now logs the actual Postgres/PostgREST error via `console.error` so a real failure (missing row, RLS, etc.) is debuggable instead of looking identical to "just hasn't loaded yet"
- **Chore (avatar upload, disabled)**: went through a free-text avatar URL field first, then closed the resulting CodeQL alerts ("DOM text reinterpreted as HTML" on `<img src={avatarUrl}>`) by replacing it with a real file upload to a new `avatars` Supabase Storage bucket (`docs/DATABASE.md` § 4b, mirrored in `schema.sql` — public read, RLS restricts insert/update/delete to each user's own `{user_id}/avatar.{ext}`). `authStore.ts` has `uploadAvatar()` (png/jpg/webp only, no svg, 2MB cap) and `ProfileModal.tsx`'s avatar circle is upload-ready, but gated behind `AVATAR_UPLOAD_ENABLED = false` until the bucket + policies are actually created in the Supabase project — flip that one constant once they are
- **Fix**: `ProfileModal.tsx`'s username/display_name/bio/avatar fields seeded their local state once, from `useState(profile?.x ?? '')` — but `AuthButton` mounts this modal unconditionally (`open` only toggles visibility), so that first render almost always happens before the async profile fetch resolves. Result: fields stayed blank forever even once the profile loaded, no matter how many times you reopened it. Added a `useEffect` keyed on `[open, profile]` that resyncs every field whenever the modal opens or the profile data changes

## [0.3.3] — 2026-09-30
- **Feat**: sign-up now asks for a username directly (required, `[a-z0-9_-]{3,30}`) instead of auto-generating one from the email prefix. `authStore.signUp()` pre-checks availability against `profiles` before calling `supabase.auth.signUp()` and passes it via `options.data.username`; `handle_new_user()` trigger (`schema.sql`) now reads `raw_user_meta_data->>'username'` when present and falls back to the old email-derived logic only when it's missing (existing accounts unaffected). Needs the updated `handle_new_user()` function re-run in the Supabase SQL editor (`create or replace function`, safe on an existing DB)

## [0.3.2] — 2026-09-30
- **Fix**: `RootRoute` in `App.tsx` redirects a returning visitor with a saved language preference from `/` to `/{lang}/`, but only carried `location.search` — dropping `location.hash` entirely. Supabase's confirmation link lands on `/` with `#access_token=...` in the hash; if you had a saved non-English preference, that redirect fired before the auth client ever saw the token, landing you on the real page but never actually signed in
- **Feat**: change your own username from the account menu (top-right, next to sign out) — `EditUsernameModal.tsx` + `authStore.ts`'s `updateUsername()`. `AuthButton` already showed `display_name`/`username` instead of the raw email everywhere (the `profiles` row is auto-created on signup with a sanitized username via the `handle_new_user` trigger); this just lets you pick your own instead of the auto-generated one
- **Polish**: `supabase/email-templates/confirm-signup.html` is now in English (universal default) instead of Spanish — Supabase's dashboard only supports one template per email type, not a variant per locale. Considered stacking all 4 app languages in one email first, but it looked cluttered; English alone reads cleaner

## [0.3.1] — 2026-09-30
- **Fix**: account confirmation emails redirected to `http://localhost:3000` (Supabase's default "Site URL" on a fresh project) instead of the real deployed site, throwing `otp_expired`/`access_denied` when clicked. `authStore.ts`'s `signUp()` now passes `options.emailRedirectTo` explicitly (`window.location.origin + BASE_URL`) instead of relying on the dashboard's Site URL setting
- **Polish**: redesigned `AuthModal` — branded header (icon + gold accent, replacing the modal's plain text title), mail/lock icons inside the email/password fields, a proper success screen after signing up (icon + message), and a hint to check the spam/junk folder if the confirmation email doesn't show up

## [0.3.0] — 2026-09-30
- **Feat**: cloud accounts, powered by Supabase — first step towards saved/shareable builds in the cloud. Full roadmap (profiles, likes, comments, follows, Explore...) in `docs/DATABASE.md`
- **Feat (M47)**: sign up / sign in / sign out with email+password. `src/store/authStore.ts` (session + profile state, `onAuthStateChange` subscription), `src/features/auth/AuthModal.tsx` + `AuthButton.tsx` (new account button in the header, top-right next to the language switcher). `@supabase/supabase-js` is lazy-loaded (`src/lib/supabase.ts`'s `getSupabase()`, dynamic `import()`) so it never bloats the eager main bundle for visitors who don't touch auth
- **Chore**: full Postgres schema designed and validated line-by-line against the real app data model (`buildStore.ts`, `engine/types.ts`) — 19 tables, RLS policies, triggers. Found and fixed 6 real mismatches between the original design and the actual code (wrong `class_id`→`class_slug` type, missing `gender` column, wrong slot names, missing `weapon_transform_ratio`, wrong full-text search language config, and 4 tables that had RLS enabled with zero policies). `docs/DATABASE.md` has the full writeup; `supabase/schema.sql` is the whole thing ready to paste into the Supabase SQL Editor in one shot
- CI: `deploy.yml` now passes `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from GitHub Actions repo secrets into the build step

## [0.2.138] — 2026-09-17
- **Fix (data)**: "Cire Momore's Curse" (id 507) showed three unlabeled bonuses per tier — "+19 Max.", "+23 Max.", "+26 Max." — with no icon and, worse, the wrong number. Queried `api.dofusdu.de` directly and confirmed the bug lives entirely upstream: dofusdude's own API returns `type:{name:"Max.",id:166}` for this Ankama effect (never given a real name), and — unlike every other effect — its `int_minimum`/`int_maximum` fields are reversed: `int_minimum` holds the **Ankama characteristic id being capped** (not a value), `int_maximum` holds the real number. Cross-referenced `dofus3-main`'s `characteristics.json` to resolve the ids: `1`=AP, `19`=Range, `23`=MP, `26`=Summons — this specific set's three lines were `19/23/26` (Range/MP/Summons), each with the real value in `int_maximum` (4 at 2pc, down to 2 at 6pc)
- `scripts/lib/normalize.ts`: added `normalizeRawEffect()` — detects effect type id 166 and rebuilds the effect as `{stat: "Range Max." | "MP Max." | "AP Max." | "Summons Max.", min: <real value>, max: 0}`, used by both `normalizeItem` and `normalizeSet`. Added matching `STAT_META` entries (`statDisplay.ts`) with the AP/Range/MP/Summons icons and new `stat_*_cap` i18n keys (all 4 locales) so it now shows "Range Max." / "MP Max." / "Summons Max." with an icon, instead of a bare "Max."
- Deliberately **not** wired into `STAT_MAP` (the engine's additive stat aggregation) — the real game mechanic looks like an absolute cap/limit on Range/MP/Summons, not a flat bonus, and our engine only supports additive effects; adding it as `+N` could silently produce wrong Range/MP/Summons totals. It displays correctly everywhere (set/item tooltips) but isn't summed into the character sheet, which is the safe choice until the exact mechanic is confirmed. Scanned the full item+set catalog: this effect type appears in exactly one place, this set (15 effect instances = 3 stats × 5 tiers)
- Re-ran `pnpm fetch-data --force` against game version 3.6.11.15 to regenerate `equipment.json`/`sets.json`/`consumables.json`/`mounts.json` for all 5 languages

## [0.2.137] — 2026-09-15
- **Fix (data/ETL)**: trap-placing spells (Sram's "Trampas", Cra's "Bruma" glyph) showed only a "Coloca una trampa"/"Places a trap" badge with zero damage numbers, even though every one of them clearly deals damage in-game. Their `spell_levels.json` entry legitimately has no elemental-damage effects at all — the trap's real damage lives on a completely separate, hidden trigger spell (e.g. Miry Trap's placement spell has no damage; a hidden spell called "Piège" does, cast when the trap activates). Reverse-engineered the link by downloading and cross-referencing the raw `dofus3-main` `spells.json`/`spell_levels.json`: **effectId 400**'s `diceNum`/`diceSide` on the placement spell are the hidden trigger spell's id and grade — the same "reference another spell by id" pattern already used for `spell_buff` (effectId 293)
- `scripts/fetch-spells.ts`: added a `TRAP_PLACEMENT_ID` (400) detection in `buildLevels()` that stashes `{spellId, grade}` on the level (`_trapRef`, an internal field like `_rawBuffs`), then a second pass — once every spell's levels exist in `levelsBySpell` — resolves it and merges the trigger spell's already-fully-built `effects`/`critEffects` (damage, steal, poison, push, even its own charge/`spell_buff` mechanic) into the visible placement spell, remapping any self-referencing `spell_buff.spellId` from the hidden trigger spell to the placement spell so `SpellCard`'s charge-set detection still recognizes it. The original "Coloca una trampa" flavor badge is kept alongside the new damage row
- Re-ran `pnpm fetch-spells --force`: **172 trap/glyph placement levels** across every class resolved to real damage. Re-verified with the charge-monotonicity script (78 charge-having spell levels now, up from 75 — 3 traps have their own charge mechanic) and the fixed-value-effect script (482 unchanged) — zero regressions

## [0.2.136] — 2026-09-15
- **Fix (big one)**: `calcEffects()` (`spellDamage.ts`) computed `calcMax` by calling `calcDamage(e.max, ...)` directly. Fixed-value (non-range) damage/steal/poison effects store `max: 0` in the data as the "no range, use min" convention — `WeaponCard`'s `computeRow` already normalizes this (`e.max > 0 ? e.max : e.min`), but `calcEffects` never did, and `calcDamage()` returns 0 for any base ≤ 0. Result: every fixed-value spell effect showed a broken range like "104–0" instead of a single "104" — confirmed across **82 spells** in the dataset (every class), e.g. Reprisal, Reflex, Misfortune, Bravado, Perception, Luck, Nerve, Fate of Ecaflip. Added the same `e.max > 0 ? e.max : e.min` fallback used by weapons. Since `calcEffects` is the single shared function for base damage, crit damage, and charge-level damage, this one fix covers all three call sites at once
- Verification: extended the earlier charge-audit script to scan every `damage`/`steal`/`poison` effect (and `critEffects`) in the full dataset for `max === 0 && min > 0` — found 482 individual effects across those 82 spells, confirmed all now collapse to a single correct value instead of "value–0"

## [0.2.135] — 2026-09-15
- Fix: `chargeSets`' `calcSet()` in `SpellsPanel.tsx` computed the charge-level crit row via `calcEffects(chargedCFx, stats, spellPct)` — missing the 4th argument (`stats.critDamage`, the flat crit bonus) that the base/uncharged crit row (`critDisplayEffects`) already passes. Every charge level's crit therefore showed LESS damage than the uncharged crit, even though the underlying per-hit base damage (and the normal row) correctly increased with charge — reported on "Ojo por Ojo" (charge 1 crit 540–586 vs base crit 605–652)
- Verification: wrote a standalone script replicating `calcDamage`/`calcEffects`/`chargeSets` exactly and ran it against every spell level with a self-charge buff in the real dataset (75 across all classes+common), checking crit ≥ normal and monotonic non-decreasing damage across charge levels. After the fix, zero regressions (the only "crit < normal" cases left are DoT/poison spells with no `critEffects` at all — expected, poison ticks don't crit in the real game either)

## [0.2.134] — 2026-09-11
- Polish: `PvpArena`'s attack picker dumped every damage-dealing spell (class normal + variant + common) into one flat, horizontally-scrolling row with no labels. Grouped it into `PickerGroup`/`AttackIcon` sections matching the main spell list's own categories (`spell_col_normal`, `spell_col_variant`, `common_spells`, plus a weapon group using `weapon_attack`), each wrapping via `flex-wrap` instead of `overflow-x-auto` so nothing hides off-screen on narrow widths. Added `pvp_arena_resist_label`/`pvp_arena_attack_label` section headers above the resistance grid and the target+picker block for clearer visual separation

## [0.2.133] — 2026-09-11
- Fix: `BuilderPage.tsx`'s header controls (undo/redo, La Forjadora, Sets catalog, Compare, version badge, dividers) switched from hidden to visible at Tailwind's `sm` breakpoint (640px), but the main content only switches from the single-tab mobile layout to the 2-column desktop grid at `lg` (1024px). Between 640–1023px wide the header looked fully desktop (all buttons with labels) while Characteristics/Stats were hidden behind the mobile bottom tabs — reported as "characteristics panel missing". Changed all of those header elements from `sm:` to `lg:` so both switch at the same width
- Feat: `PvpArena` (the PvP simulator section in Spells) is now collapsed by default — its header is a toggle; resistance inputs and the attack picker only render once expanded

## [0.2.132] — 2026-09-11
- Redesign: M40's PvP simulator moved from scattered inline 🎯 lines on every spell/weapon damage row into its own dedicated arena (`src/features/pvp/PvpArena.tsx`), per feedback that it should be "a separate section where you pick the spell you want to hit with, see its image, and clicking it fires at a punching-ball dummy":
  - Reverted the inline dummy sub-rows in `SpellCard`/`WeaponCard` (`SpellsPanel.tsx`) — back to their pre-M40 rendering
  - Extracted the pure spell/weapon math shared by both the normal cards and the arena into `src/features/spells/spellCalc.ts` (`spellGrade`, `ELEM_COLOR`, `WEAPON_ATTACK_STAT`, `IS_STEAL`, `fmtRange`, `rangePct`, `dedupEffects`) to avoid a circular import between `SpellsPanel.tsx` and the new arena
  - New `src/features/pvp/simulate.ts`: `simulateSpellHit`/`simulateWeaponHit` collapse a spell level or weapon (transform-aware) into one resisted damage range, reusing `calcEffects`/`calcDamage`/`applyResist`
  - `PvpArena`: resistance inputs (unchanged math) + a horizontal picker of every damage-dealing spell at the current grade plus the equipped weapon, each shown with its real icon; clicking one rolls a random value in its resisted range (respecting crit chance) and pops a floating number over a target glyph with a hit-shake animation (new `dummy-hit` keyframe)
  - Simplified `usePvpStore` — dropped the now-unused `enabled` flag, deleted the standalone `DummyPanel.tsx`
  - Charge-set spells (stacking buffs like Punitive/Frozen Arrow) still aren't covered — same scope note as 0.2.131

## [0.2.131] — 2026-09-10
- Feat: **M40 — PvP dummy simulator**. New `DummyPanel` (`src/features/pvp/`) at the top of the Spells section — a collapsible panel where you type a target's fixed + % resistance per element (`usePvpStore`, not part of the shared build URL, scratch-only). `applyResist(damage, resist)` in `pvpMath.ts` applies the real Dofus PvP formula: `(damage - fixed) × (1 - percent/100)`, clamped to 0. When enabled:
  - `SpellCard`: every damage/steal effect row (normal + crit) gets an extra 🎯 sub-row with the resisted value, using that effect's own element; the Σ group total gets the same treatment summed across the group's effects
  - `WeaponCard`: every elemental damage row and steal row gets a 🎯 sub-row, and the Total row gets a 🎯 line summed across all rows
  - Charge-set rows (stacking buffs like Punitive/Frozen Arrow) are not covered yet — scoped out of this first pass

## [0.2.130] — 2026-09-09
- Feat: search boxes were case-insensitive but not accent-insensitive — searching "ambar" for the "Ámbar" set/items found nothing. Added `normalizeSearch()` (`src/ui/normalize.ts`, `s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()`) and used it in every name/stat search: `ItemCatalog` (item name search, set-search dropdown), `SetsCatalog` (set name search), `StatFilter` and `StatPicker` (stat name search). Works for any language's accented characters (é, ñ, ç, ã, etc.), not just Spanish

## [0.2.129] — 2026-09-09
- Fix: 0.2.126 only fixed the Dofus SLOT ICON (`DofusIcon()` in `EquipmentGrid.tsx`, the equip-slot button on the character silhouette). Every other place that renders a slot glyph still used `SlotConfig.icon`, which is the 🥚 emoji for dofus1-6 — `ItemCatalog.tsx`'s fallback thumbnail (shown when an item has no `image_url`), `SetDetailModal.tsx`'s item-list fallback thumbnail and the not-equipped slot badge, all three "equipped!" toast icons (`ItemCatalog`, `SetsCatalog`, `SetDetailModal`), and `ComparePanel.tsx`'s per-row slot column. Added `slotImageIcon(id)` to `slotConfig.ts` (returns `statIconUrl('dofus')` for dofus1-6, `null` otherwise) and used it everywhere the egg could still show, falling back to the emoji for every other slot as before. Toasts previously only supported an emoji glyph (`Toaster.tsx` rendered `toast.icon` as plain text) — now renders an `<img>` when the icon string is a path

## [0.2.128] — 2026-09-08
- Fix: `WeaponCard` in `SpellsPanel.tsx` fed weapon effect_id 238 ("removes N–N MP on hit", e.g. Espada diablina) through the elemental damage-mastery pipeline (`computeRow` → `calcDamage`). That effect's `stat` is `'MP'`, which has no entry in `WEAPON_ATTACK_STAT`, so `elem` resolved to `undefined` — `mastery()`/`flatBonus()` returned `undefined`, poisoning the math to `NaN` for the crit column and corrupting the weapon total (`NaN–NaN`), while the row label rendered the raw untranslated key `elem_mp` (built from `t(\`elem_${stat.toLowerCase()}\`)`). Effect is now split into its own `mpEffects` row — shown as a plain value with the existing `mp_reduction` icon and `stat_mp_removal` label (both already used for the same stat elsewhere), excluded from the damage-mastery calc and from the weapon total
- Feat: "Attracts by N cell" spell buffs (all 4 languages: "Atrae", "Attracts", "Attire", "Atrai") now show the `pull` icon (`pull.png`) instead of falling back to the plain ▲ triangle — added `pull` to `statDisplay.ts`'s `PNG_ICONS` set since the file is a `.png`

## [0.2.127] — 2026-09-08
- Fix: `buffIcon()` in `SpellsPanel.tsx` (maps a spell's raw buff text to an icon) had several regex gaps around accented words, verified empirically against every buff string in all 4 locales' spell data (6,096 total): "% Crítico" (es/pt, `/crit/i` didn't match the accented "crít"), Portuguese "Inteligência" (accent on a different vowel than assumed) and "Sorte" (Chance stat, word never included), and "vida" (es/pt life-transfer buffs, e.g. "Transfiere 30% de su vida") all fell through to the generic ▲/▼ triangle instead of their real icon
- Fix: "best-element steal"/"best-element damage" spell buffs (all 4 languages) had no icon-matching rule at all — now map to the `power` icon, same as this stat everywhere else in the app
- Remaining icon-less buff texts (movement/positioning, glyph/trap/rune placement, teleport, kill target, switch positions, effect duration reduction, etc.) are intentional — these already have no icon anywhere else in the app (see `isIgnored()` in `statDisplay.ts`), matching the real game's own tooltip behavior

## [0.2.126] — 2026-09-08
- Fix: `DofusIcon()` in `EquipmentGrid.tsx` was a hand-drawn SVG ellipse — literally an egg shape standing in for the Dofus item icon. Replaced with the real `dofus.png` image (added `dofus` to `statDisplay.ts`'s `PNG_ICONS` set since it's a `.png`, not `.webp`)
- Fix: the Erosion spell effect (`SpellsPanel.tsx`) used `statIconUrl('damage_reflect')` as a placeholder icon — now uses the correct `erosion.webp`

## [0.2.125] — 2026-09-08
- Fix: opening a shared compare link (`?c=...`) already loaded Build B and set `compareStore.active = true` via `useCompareUrl`, but the scroll-into-view for the compare panel only ran inside the manual "Compare" button's `onClick` — landing on the link left the user at the top of the page with no visible indication the comparison loaded. Moved the scroll into a `useEffect` in `BuilderPage.tsx` that watches `compareActive` directly, so it fires the same way regardless of whether compare mode was triggered by a click or by a URL

## [0.2.124] — 2026-09-08
- Fix: `ComparePanel.tsx`'s `handleLoadUrl` parsed pasted URLs by manually splitting on `#`, a leftover from the HashRouter era — with the current path-based format (`…/es/?b=...`, no `#`) it fell through to treating the ENTIRE URL as the encoded build string, always failing with "URL inválida o build corrupto". Rewrote using the native `URL` API: reads `?b=` directly off `url.searchParams` for current links, falls back to parsing inside `url.hash` for old shared links
- Fix: `handleShare` (compare mode's "share comparison" button) still built the old `#/?b=...&c=...` hash link — now builds the correct per-language path, matching the fix already applied to `ShareBar`/`brandHref` in 0.2.109/0.2.111

## [0.2.123] — 2026-09-07
- Fix: `stats.ts` aggregated the generic "Damage" stat (all elements, e.g. Aguja de Psikopomzopato's +4-6 Damage) into its own `block.damage` field but never applied it to the 5 elemental damage totals — `ElementSection` in the stats panel showed Air/Earth/Fire/Water/Neutral Damage without this bonus, even though the type comment already said "generic (all elements)". Now added into each of `neutralDamage`/`earthDamage`/`fireDamage`/`waterDamage`/`airDamage` right after all item/set/rune effects are aggregated

## [0.2.122] — 2026-09-07
- Fix: elemental weapon transform (EquipmentGrid.tsx + SpellsPanel.tsx) rounded the transformed damage range UP (`Math.ceil`) instead of down. Verified against a real in-game tooltip: Aguja de Psikopomzopato's base 45-53 Neutral damage at 85% air transform should show 38-45 (`floor(45*0.85)=38`, `floor(53*0.85)=45`), but showed 39-46 with ceil. Both transform sites now use `Math.floor`

## [0.2.121] — 2026-09-07
- Feat: new "Forjamagia" section in `StatsPanel.tsx`, rendered right below Combat — aggregates every rune stat across all equipped items into one combined total per stat (e.g. Vitality runes on a ring + a hat show as one summed row), styled to match the existing Damage % section (colored left-border rows, icon + label + value). Hidden when no runes are applied

## [0.2.120] — 2026-09-07
- Fix: clicking the "Dofus Forge" brand/logo called `reset()` + `clearHistory()` but never touched the URL — `useBuildUrl`'s subscriber skips updating the URL once `selectedClass` is `null` (nothing to encode), so the stale `?b=<encoded>` query stayed stuck in the address bar even though the build was visibly reset. Now explicitly navigates to the clean, basename-relative language path (`useLocation().pathname`, not `window.location.pathname`, which would double up the `/dofus-forge` basename) after resetting

## [0.2.119] — 2026-09-07
- Fix: class names were always shown in English (hardcoded in `classData.ts`) regardless of the active locale — a Huppermage always read "Huppermage" even in Spanish, where the real in-game name is "Hipermago". Class names genuinely differ per language in Dofus (Sacrier/Sacrieur, Rogue/Roublard/Tymador/Ladino, Iop/Yopuka, Ecaflip/Zurcarák, Cra/Ocra, ...) — not something safe to hand-translate.
  - `scripts/fetch-spells.ts` now extracts `breed.shortNameId` per language from Ankama's own text tables (the same mechanism already used for spell names) and writes `public/data/class-names.json` (`classSlug -> { lang -> name }`)
  - New `src/features/class-picker/useClassName.ts` (hook + plain `resolveClassName` for loops) resolves the localized name, falling back to the English `classData.ts` name if the data file is missing
  - Updated all display sites: `ClassPicker.tsx` (selected card + full picker grid), `EquipmentGrid.tsx`'s central character name, `ComparePanel.tsx` (both build A and B), and `ShareBar.tsx`'s exported build image label

## [0.2.118] — 2026-09-07
- Feat: build naming — new `buildName` field in `buildStore`, editable inline input under the class name/element in `ClassPicker`'s selected-class card (max 60 chars). Carried through the shared build URL (`BuildSnapshot.n`, optional for backward compatibility with old links) and through `applySnapshot`/`reset`
- Fix: `ClassPicker.tsx` displayed `classInfo.element` raw (e.g. literal "multi" for Huppermage) instead of translating it — now uses `t(\`elem_${element}\`)`, matching the pattern already used in `SpellsPanel.tsx`. Added missing `elem_multi` key (the `Element` type uses `'multi'`, distinct from the existing `elem_mixed` key used elsewhere) to all 4 locales

## [0.2.117] — 2026-09-06
- Chore: `StatFilter.tsx` — added Range, Summons, and % Critical to `PRIMARY_ORDER` (Main Effects section); removed % Critical from the Damage % set to avoid duplication

## [0.2.116] — 2026-09-06
- Fix: `ItemCatalog`'s stat filter only checked whether an item HAD an effect matching the selected stat, not its sign — filtering by "Range" matched a hat with -1 Range. Now uses the same effective-value formula as the stat engine (`stats.ts`'s `applyEffect`) and only matches values > 0
- Fix: `StatFilter.tsx`'s dropdown categorization mixed flat damages, % damage mods, fixed resistances, and % resistances all into one generic "secondary" bucket alongside unrelated stats (Initiative, Lock, Dodge, etc). Split into 4 explicit categories — Damage, Damage %, Resistance, Resistance % — each its own labeled section, in that order, so searching/scanning the dropdown no longer mixes unrelated concepts

## [0.2.115] — 2026-09-06
- Feat: Sets Catalog card interaction redesigned — clicking a card now directly equips the full set (one atomic `equipMultiple()` call) instead of opening the detail modal; a new eye icon button opens `SetDetailModal` for browsing/equipping individual items, viewing all tier bonuses, etc. A hint line explains both actions
- Feat: hovering an item thumbnail in the Sets Catalog now shows the same full item tooltip (effects, weapon attack, conditions, lore) as `SetDetailModal`'s item list — thumbnails enlarged from 36px to 56px for easier targeting
- Refactor: extracted the item hover tooltip (previously private to `SetDetailModal.tsx`) into `src/features/equipment/ItemHoverTooltip.tsx`, shared by both `SetDetailModal` and `SetsCatalog`

## [0.2.114] — 2026-09-06
- Feat: new Sets Catalog (`SetsCatalog.tsx`) — a full browsable catalog of every set in the game, opened from a new "Sets" button in the desktop header (next to the Optimizer button). Search by name, filter by level range and piece count (dynamically derived from the actual data), sort by level/name/piece-count. Each card shows: item thumbnails (up to 6 + overflow count), the top-tier bonus stat icons as a preview, level range, and a live "X/Y equipped" progress badge that highlights complete sets in gold. Clicking a card opens the existing `SetDetailModal` for full detail + equip-all. Lazy-loaded, not part of the eager bundle

## [0.2.113] — 2026-09-06
- Fix: `rune_picker` i18n key was never added to any of the 4 locale files — RuneModal's rune-grid divider showed the literal string "rune_picker" instead of a translated label. Added to es/en/fr/pt

## [0.2.112] — 2026-09-06
- Fix: "Equip All" (SetDetailModal) on a set with 2+ items sharing a slot type (e.g. a set with 2 rings) — each item was equipped via a separate `equipItem()` call, so `useHistory`'s subscriber pushed one history snapshot per item instead of one for the whole action. A single Undo only reverted the last item, leaving e.g. one ring still equipped instead of reverting the entire "Equip All". Added `equipMultiple()` to buildStore — one atomic state update for the whole batch, `handleEquipAll` now simulates slot assignment locally (so item 2's target slot correctly accounts for item 1 already claiming a slot) and calls it once

## [0.2.111] — 2026-09-03
- Perf: main JS bundle 676KB → 376KB gzip 202KB → 115KB (-44%), driven by PageSpeed Insights findings (mobile Performance was 61):
  - Removed `motion`/framer-motion entirely (~170KB) — `Tabs.tsx`'s sliding indicator (previously `layoutId` shared-layout animation) now uses `ResizeObserver` + CSS `transition: left/width`; `Modal.tsx` and `Toaster.tsx`'s enter/exit animations now use a hand-rolled mount-transition pattern (opacity/transform + CSS `transition`, double-rAF for enter, delayed unmount for exit)
  - Removed `i18next-http-backend` + its `cross-fetch` polyfill dependency (~37KB) — replaced with a ~15-line custom i18next backend (`src/i18n/fetchBackend.ts`) using native `fetch`
  - Split `DOFUS_GAME_VERSION` out of `changelog.ts` into `src/data/gameVersion.ts` — `BuilderPage`'s eager import no longer drags in the full ~28KB `CHANGELOG` array just to read one constant
  - Lazy-loaded `ItemCatalog`, `RuneModal`, `SetDetailModal`, `SpellsPanel`, `ComparePanel` (all conditionally-mounted) and dynamic-`import()`'d `ExportCard`+html-to-image (only needed on export click)
- Perf: fixed render-blocking Google Fonts — moved from a CSS `@import` (which chains HTML → CSS → Google Fonts CSS → font files serially) to a non-blocking `<link rel=preload>` + `media=print` swap in `index.html`; est. 380ms (desktop) to 1650ms (mobile) saved
- Fix: `--ink-faint` color token failed WCAG AA contrast (3.14:1 dark, 2.28:1 light — needs 4.5:1) — adjusted to `#7a849c` (dark) / `#67646b` (light), both now pass on every background they're used against
- Fix: characteristic point allocator `<input>` had no accessible name — added `aria-label`
- Fix: `ShareBar`'s `shareUrl()` still built the legacy `#/?b=` HashRouter link (same bug class as `brandHref` fixed in 0.2.109) — now builds the correct per-language path

## [0.2.110] — 2026-09-02
- Fix: clicking EN in the language switcher looped back to the previous language instead of switching. `RootRoute` reads `localStorage.dofus-forge-lang` to bounce returning visitors to their preferred language, but i18next's own detector re-caches whatever language is currently active into that exact key — so navigating to `/` always saw the language you were just leaving, not English. `LanguageSwitcher` now marks its navigation with `state: { explicit: true }`, which `RootRoute` checks to skip the stored-preference redirect for a deliberate language choice

## [0.2.109] — 2026-09-02
- Feat: real multi-language URLs — `/`, `/es/`, `/fr/`, `/pt/` are now genuine static files (generated at build time by `scripts/postbuild-lang-pages.mjs`), each with its own `<title>`, meta description, canonical URL, and hreflang set — indexable and rankable per language, unlike the previous single-URL JS-language-switch which Google could only ever see as one language
- Feat: switched `HashRouter` → `BrowserRouter` with `es/*` `fr/*` `pt/*` routes wrapped in `LangRoute`, which sets `i18n.language` from the URL path (source of truth) and injects per-language SEO meta client-side too (`useSeoMeta.ts`)
- Feat: `LanguageSwitcher` now navigates to the language's path instead of only swapping i18next state in place
- Fix: `useBuildUrl`'s history sync hard-coded `navigate('/?b=...')`, silently bouncing users on `/es/` etc. back to the English root on every build mutation — now preserves `location.pathname`
- Fix: `brandHref` (logo link) in `BuilderPage` built a stale `#/?b=` hash URL; now builds the correct path for the active language
- Chore: added `public/404.html` (GitHub Pages SPA fallback for any path outside the 4 known language roots) and a legacy-hash-link compatibility script in `index.html` so old shared URLs (`#/?b=...`) keep working
- Chore: `public/sitemap.xml` lists all 4 URLs with `xhtml:link` hreflang annotations

## [0.2.108] — 2026-09-02
- Chore: added Google Search Console HTML verification file (public/google77a75c10cc4e1e3c.html)

## [0.2.107] — 2026-09-02
- Add: public/og-preview.png — social share image referenced by og:image / twitter:image, 1200x630, custom forged anvil-and-hammer emblem design matching brand tokens

## [0.2.106] — 2026-09-02
- SEO: complete meta tag suite in index.html — description, keywords, canonical URL, Open Graph (og:title/description/image/locale), Twitter Card, JSON-LD WebApplication schema
- SEO: added public/robots.txt (Allow: * + Sitemap pointer) and public/sitemap.xml

## [0.2.105] — 2026-09-02
- Polish: removed "unofficial" label from footer disclaimer, export card watermark, and all 4 locale strings; replaced with neutral Ankama attribution
- Docs: full README rewrite — feature list, tech table, clean presentation; removed GitHub Pages mentions

## [0.2.104] — 2026-09-02
- Fix: weapon attack effects now correctly classified — added id=233 (Steals MP per hit), id=238 (MP steal on attack, stat='MP' negative), and id=261 (Fire heals weapon attack) to WEAPON_ATTACK_IDS; these were previously appearing under EFFECTS instead of WEAPON ATTACK
- Fix: item tooltip in EquipmentGrid and SetDetailModal now has max-height (min(82vh, 640px)) with overflow-y scroll — tall items like high-level weapons no longer clip effects at viewport bottom (e.g. Wisdom and Fire Damage were not visible)

## [0.2.103] — 2026-09-02
- Redesign: RuneModal add-controls (rune picker → selected rune + quick values + qty input + Add button) are now in a fixed panel above the scrollable area — always visible without scrolling; rune grid, active runes, weapon transform, and forjamago signature remain in the scroll
- Add: "Clear all runes" button in the active runes header row — removes all magesmithy runes for the slot at once

## [0.2.102] — 2026-09-02
- Fix: Range badge now shows overcap indicator (▲N) when range exceeds the cap of 6 — same behavior as AP (cap 12) and MP (cap 6); added rangeRaw to StatBlock and computed pre-cap raw value in stats engine
## [0.2.101] — 2026-09-02
- Fix: Range badge in StatsPanel now shows '+' prefix (e.g. '+1' instead of '1') — Range is a pure item bonus, not a base stat like AP/MP

## [0.2.100] — 2026-09-02
- Feat: item tooltip now shows a CONDITIONS section — requirements like "Strength > 249" listed with stat icon and color; extracted from DofusDude API conditions tree and saved per-item in normalized data; visible in both slot hover tooltip and SetDetailModal item hover tooltip
- Fix: stat values in item tooltip now show "+" prefix for positive values (e.g. "+1 Range", "+1 MP", "+351–400 Vitality") — replaced raw number display with fmtValue() in both StatLine components

## [0.2.99] — 2026-09-01
- Feat: ItemCatalog "Ver Set" now opens the full SetDetailModal — replaced the old basic local set modal (basic list, no progress bar, no equip-all, no hover tooltips) with the proper SetDetailModal component used everywhere else; removed ~180 lines of duplicate code

## [0.2.98] — 2026-09-01
- UX: set name in slot tooltip is now a clickable link — clicking the blue "X's Set" text in the item tooltip opens the SetDetailModal for that set; removed the separate Eye button since the set name covers that action; tooltip stays pointer-events-none except for that specific button

## [0.2.97] — 2026-09-01
- Feat: hover tooltip in SetDetailModal — hovering any item row now shows the full item tooltip (name, level, ability, weapon attacks, all stats, lore) via a fixed-position portal that escapes the modal's overflow-y:auto clip; auto-positions right or left based on available screen space

## [0.2.96] — 2026-09-01
- UX: CharacteristicsPanel split into two groups — Vitality/Wisdom (top, no power), then a Power divider badge, then Strength/Intelligence/Chance/Agility showing base | +power | =effective when power > 0; divider renders as an inline chip with gold glow when power is active

## [0.2.95] — 2026-09-01
- Feat: drag & drop between compatible slots — drag an equipped item to any slot of the same type (ring1↔ring2, dofus1–dofus6) to swap or move it; runes, forjamago name and weapon transform travel with the item; drag-over target highlights with a gold glow; cursor changes to grab during drag

## [0.2.94] — 2026-08-31
- Fix: rune badge (mini rune icons on slot) now renders inside the slot top-right corner — was placed to the right of the slot using a fixed pixel offset that broke in grid layouts where cells are wider than the slot button, causing the badge to be clipped or misaligned

## [0.2.93] — 2026-08-31
- Fix: equipping or unequipping an item now clears all runes, forjamago name and weapon transform for that slot — rune data from a previous item no longer carries over to the new one

## [0.2.92] — 2026-08-31
- UX: RuneModal resistance section split into two labeled rows — "Resistance" (flat: 5 elemental + Crit + Push) and "% Resistance" (% elemental + % Melee + % Ranged); clean visual separation of flat vs percentage runes

## [0.2.91] — 2026-08-31
- Fix: Summons moved to Primary section in RuneModal (was in Secondary)
- UX: RuneModal wider (640px max) with auto-fill column grid — desktop shows ~8 runes per row, mobile keeps 5 columns

## [0.2.90] — 2026-08-31
- Feat: RuneModal — 15 missing runes added (AP/MP Parry, % Spell/Weapon/Melee/Ranged Damage, % Melee/Ranged Resistance, Pushback Damage/Resistance, Trap Damage, Power (traps), Summons, Pod, reflected damage)
- Feat: RuneModal — rune picker reorganized into 4 labeled sections: Primary / Damage / Resistance / Secondary; 5-column grid per section replaces flat 7-column grid
- Fix: % damage runes (Spell/Weapon/Melee/Ranged) now use [1,2,3,4,5] quick-value presets like % resistance runes; % Critical also corrected to [1,2,3,4,5]

## [0.2.89] — 2026-08-31
- Feat: full mobile responsiveness — flat equipment grid (no character center on mobile), compact 5-column slot layout, icon-only ShareBar, hidden undo/redo/optimizer/compare on small screens
- Fix: unequip × always visible on touch devices (hover-only before); rune button visible when active on mobile
- Fix: viewport minimum-scale=1 prevents browser zoom-out on overflow; body overflow-x hidden; iOS auto-zoom on inputs prevented

## [0.2.88] — 2026-08-31
- Feat: "All" button in ScrollToggles activates/deactivates all 6 characteristic scrolls at once — gold when all active, neutral when any is inactive
- Fix: allocation input no longer commits on every keystroke — typing in the +/- field now only applies on blur or Enter, preventing mid-type jumps

## [0.2.87] — 2026-08-28
- Fix: weapon AP cost (effect_id=179) no longer applied as character stat — weapons like Mekstagob Spade had -1 AP in their attack cost which was incorrectly reducing the player's AP total; eid=179 added to WEAPON_ATTACK_IDS
- Fix: AP/MP badge no longer shows MAX at exactly the cap — only shows ▲N when truly above the cap

## [0.2.86] — 2026-08-28
- CharacteristicsPanel: allocation grid (+/- buttons) always visible — removed hover-to-reveal behavior; grid is now permanently shown below the compact stat rows

## [0.2.85] — 2026-08-28
- RuneModal: smart quick-value presets per rune type — % Resistance runes show [1,2,3,4,5]; AP/MP/Range show [1]; all others keep [1,5,10,25,50,100]; selecting a rune type auto-sets addValue to the first preset

## [0.2.84] — 2026-08-28
- Fix: RES% and AP/MP overcap badges now show real excess — previously stats were capped before reaching display (always showed 50%/12/6 max), never triggering ▲N; now raw pre-cap values are saved in StatBlock and used for overcap calculation

## [0.2.83] — 2026-08-28
- StatsPanel: RES% overcap badge (▲N) now appears only on hover — table stays clean; hover over any gold RES% value above 50% to see the wasted excess

## [0.2.82] — 2026-08-28
- StatsPanel: RES% cell now shows `MAX` badge when resistance % hits exactly the 50% cap (previously only showed gold color, no badge; ▲N still shows when above cap)

## [0.2.81] — 2026-08-28
- StatsPanel: AP and MP badges show overcap indicator — gold `▲N` pill when value exceeds in-game cap (AP≥12 → MAX or ▲N, MP≥6 → MAX or ▲N)

## [0.2.80] — 2026-08-27
- StatsPanel: RES% column now shows overcap — if % resistance exceeds the 50% cap, the value appears in gold with a `▲N` badge indicating how many points don't apply in-game

## [0.2.79] — 2026-08-27
- StatsPanel: elemental table gains a ✦ % column (magesmithy RES%) — shows in blue (#38a7cf) just the contribution from % resistance runes, separate from the item-based base RES%; `—` when there are no runes of that type
- RuneModal: adds support for elemental % Resistance runes (Neutral, Earth, Fire, Water, Air)

## [0.2.78] — 2026-08-18
- Optimizer repair: expanded pool — for each constrained stat, top-60 items ranked by THAT stat are added to the repair candidate pool (not just beam's score-sorted top-50); this ensures the best items for satisfying constraints are always accessible during repair
- Optimizer repair: now tries ALL violated constraints each pass, not just the worst one — makes progress even when the most-violated stat has no single-slot improvement
- Increased repair passes (10→25) and builds-to-repair (12→20) for more thorough recovery

## [0.2.77] — 2026-08-18
- Optimizer config persists across sessions — last search settings (stat minimums, exo, max level, locked slots) are saved to localStorage and restored on reopen; groups with active stats auto-expand; "Limpiar" resets everything

## [0.2.76] — 2026-08-18
- Optimizer: exclude GM/test items — items with "(MJ)" in name are filtered out before optimization

## [0.2.75] — 2026-08-18
- Optimizer: stat cards show description tooltip on hover (all 53 stats, 4 locales) — explains what each stat does, clarifies confusing ones like PV vs Vitalidad, bestElemDmg, Potencia, etc.

## [0.2.74] — 2026-08-18
- Fix: stat inputs now accept continuous typing — Modal focus trap was re-firing on every render due to unstable onClose ref; split useEffect so initial focus only fires on open, not on re-renders
- Fix: "Exo Rango" renamed to "Exo Alcance" in Spanish locale to match actual Dofus terminology

## [0.2.73] — 2026-08-18
- Optimizer modal enlarged to 4xl (896px) — stat grid fully visible, no cut-off cards
- Validation: error shown if all slots are locked (nothing to optimize)
- Added '3xl' and '4xl' size options to Modal component

## [0.2.72] — 2026-08-18
- Optimizer: greedy repair phase — when no beam result meets constraints, top builds are iteratively repaired by swapping the slot that gains the most toward the most-violated constraint, up to 10 passes per build
- Repair uses adjusted constraints (minVal minus character base stats) so it correctly knows how much items must contribute
- This guarantees constraint satisfaction whenever a valid solution exists in the item pool

## [0.2.71] — 2026-08-18
- Optimizer UI redesign: all stats always visible, organized in 9 collapsible groups (Core, Characteristics, Elemental Damage, Critical, % Damage, Elemental Steal, Fixed/% Resistances, Combat)
- Slots config moved to collapsible panel; max level + exo inline in top bar
- "Clear all" button resets all minimums
- Algorithm: stats pre-initialized at weight=0 treated as unconfigured (BASE_WEIGHT); active stats (minVal > 0) auto-weighted at 5
- BuildResultCard now shows only active stats (minVal > 0) in result summary

## [0.2.70] — 2026-08-18
- Optimizer: dual beam search — primary beam optimizes score, constraint beam (6× boost on minVal stats) finds builds that meet hard requirements; both merged before final eval
- Pre-filter now merges normal top-50 + constraint-biased top-30 per slot to prevent pruning items critical for satisfying constraints
- Result card now shows constraint-satisfying builds first, then best-score builds

## [0.2.69] — 2026-08-18
- Fix: optimizer min input now uses type="text" + inputMode="numeric" — fixes browser quirks with controlled number inputs that prevented continuous typing

## [0.2.68] — 2026-08-18
- Optimizer redesign: merged Maximize+Required into single stat rows (weight slider + min value per stat)
- Algorithm fix: ring1/ring2 now filter ring items; dofus1–6 now filter dofus items; companion/sidekick properly filtered
- Algorithm improvement: all stats get BASE_WEIGHT=0.3 so high-level diverse items score higher; level bonus (×0.1) prevents level-10 items beating level-200 ones
- Increased TOP_K 25→50 and BEAM_WIDTH 50→120 for better coverage
- UX fix: min input uses local string state — no longer loses focus/value when typing
- New "⚡ Equip best build" button auto-equips top result from results page
- i18n: all 4 locales updated with new optimizer keys

## [0.2.67] — 2026-08-18
- Fix: rune badge repositioned outside slot to the right — was at `left: px-3` (overlapping slot); now `left: px+2` (clearly outside, visible beside the slot)

## [0.2.66] — 2026-08-18
- M42 — La Forjadora (Build Optimizer): header button opens the modal
- Configure soft weights (sliders 1–10) to maximize any build stat
- Configure hard requirements (≥ minimum) — builds that don't meet them are dropped from the top 3
- Exo AP/MP/Range checkboxes (groundwork for future forged-item integration)
- Configurable max level and per-slot selection of which slots to optimize
- Beam search algorithm (width=50) with a greedy top-25-per-slot pre-filter
- Web Worker: computation doesn't block the UI — real-time % progress bar
- Top-3 results: item images, key stats, "Load this build" button
- i18n: ES / EN / FR / PT with a localized name (La Forjadora / The Forger / La Forgeuse / A Forjadora)

## [0.2.65] — 2026-08-18
- WeaponCard: transformation potion icon (Wildfire/Earthquake/Tsunami/Hurricane) now appears in the bottom-right corner of the weapon image when a transform is active

## [0.2.64] — 2026-08-18
- Fix: elemental transformation badge no longer appears on weapons with no Neutral damage (stale store state)
- Fix: pushback effects (effect_id 225) excluded from WeaponCard's damage rows — was causing NaN in the calculation and "TOTAL NaN-NaN"

## [0.2.63] — 2026-08-17
- Feat: weapon magesmithy — transforms Neutral damage into an element (Fire/Earth/Water/Air) at 85%, 68%, or 50%
- RuneModal: "Elemental Transformation" section with potion icons (Wildfire/Earthquake/Tsunami/Hurricane) and ratio buttons
- WeaponCard: applies the transformation in the damage table — Neutral damage is replaced by the chosen element using the correct formula
- WeaponCard: element+% badge in the header when a transformation is active
- URL share: `wt` field preserves the transformation when sharing/saving a build

## [0.2.62] — 2026-08-17
- UI: hardcoded effects (AP steal, MP steal, AP gain, MP gain, pushback, erosion, heal mod, spell buff) now appear as colored chips with a stat icon
- UI: correct icon per effect — ap_reduction for AP steal, mp_reduction for MP steal, ap for AP gain, mp for MP gain, push_damage for pushback, damage_reflect for erosion, heals for healing
- UI: heal row (steal ♥) replaces the ♥ symbol with the heals.webp icon in SpellCard, WeaponCard and Σ rows

## [0.2.61] — 2026-08-17
- Fix: spell buffs and description now appear in the selected language (the lang overlay only copied the name)
- Fix: ETL filters out buffs with unresolved placeholders (#3, #4) — "Disparos Lejanos" no longer generates 70+ status entries
- Fix: ETL filters out buffs with 5+ digit status IDs embedded in the text
- Fix: ETL deduplicates identical buffs by text at each level (e.g. Flecha Explosiva's "-2 Range" no longer appears twice)
- UI: buffs shown as colored chips — red for debuffs (−), blue/air for buffs (+), gold for neutral; stat icons where applicable

## [0.2.60] — 2026-08-17
- Feat: ETL extracts generic buffs/debuffs (range, crit, heals, etc.) using effects.json + per-language templates; shown as text in SpellCard below the damage rows
- Feat: ETL extracts the spell's description (spell.descriptionId) and shows it at the bottom of SpellCard in small italic text
- Feat: renderEffectLabel — a template engine ({{~1~2}}, pluralization, #1/#2, NT suffix) that converts effectId+values into a readable per-language string

## [0.2.59] — 2026-08-17
- Fix: Flecha de Expiación (and similar) — Charge 2 now shows double the Charge 1 bonus: when every spell_buff shares the same min, it now scales by the stack ratio (min × stack/baseStack) instead of using the flat value
- Fix: "mixed" spells (Bumerán Pérfido and similar) — no longer show a Σ total, since each hit applies a random element (not additive); only the per-element rows are shown

## [0.2.58] — 2026-08-17
- Fix: pushback (collision) damage — coefficient corrected to floor(level/6) per cell (was ×3/20=0.15, correct is ÷6≈0.1667) — at level 200: 33/cell × 3 cells = 99, matching the game exactly

## [0.2.57] — 2026-08-17
- Fix: pushback (collision) damage now uses a deterministic formula — floor(level×3/20 + pushbackDamage/4) per cell, no dice rolls — matches what the game actually shows (~30/cell at level 200)
- Fix: Σ↷ crit no longer double-counts critDamage — it was already included in critTotalMin via calcEffects
- Fix: bestElemDamage included in flatBonus — the "best-element damage" stat wasn't being applied to the formula

## [0.2.56] — 2026-08-16
- Fix: critical damage (critDamage stat) now added as a flat bonus in spell critical effects
- Fix: Σ↷ crit now includes critDamage in pushback collision damage

## [0.2.55] — 2026-08-16
- SpellCard: pushback now shows "(on collision: min–max)" per cell, with the full formula including the per-level base
- Σ↷: separate row that sums elemental + total collision damage (all cells blocked scenario)
- Normal Σ no longer includes pushback — pushback damage only occurs on collision, not on a free push

## [0.2.54] — 2026-08-16
- Fix: corrected pushback damage — formula is 25% per cell (was /3 ≈ 33%)

## [0.2.53] — 2026-08-16
- Fix: Discharge spells no longer show a Σ total — damage per charge level is alternative, not additive (charge 3 = just 916, not 498+707+916)

## [0.2.52] — 2026-08-16
- Fix: Σ for Discharge spells no longer sums the steal (charge) phase + the discharge together
- Σ now only shows the discharge damage total — the steal phase doesn't accumulate in a single cast
- Heal Σ (♥) also removed from the Σ block for Discharge spells (each steal heals separately)

## [0.2.51] — 2026-08-16
- Poison (DoT): effects with `triggers=TE` and `effectTriggerDuration>0` now detected as `kind:poison` in the ETL
- SpellCard: "Poison (Xt)" label shown before the first DoT effect when the same spell also has normal damage
- Flecha Tiránica / similar: normal damage + Poison (2t) separator + DoT damage — no longer confused with direct damage
- Damage formula applied to poison the same as regular damage (amplified by character mastery)
- ETL regenerated: 19 classes with `kind:poison` + `turns` on every DoT effect

## [0.2.50] — 2026-08-16
- SpellCard: deduplicates identical effects (element+type+min+max) — removes duplicates from multi-hit AoE and repeated charges (64 spells affected across all classes)
- Tyrannical Arrow / similar: 3 fire effects [28-32, 20-22, 28-32] now shown as 2 rows (the duplicate is collapsed)
- Discharge: separator between the steal phase (charge) and the damage phase (discharge) on spells like Devouring Arrow

## [0.2.49] — 2026-08-16
- Charge spells: damage now calculated per charge level in SpellCard
- Explicit charges (e.g. Flecha Castigadora ×1/×2): "Charge 1", "Charge 2" rows with normal and crit values
- Stacking charges (e.g. Flecha Helada stack=0): shows up to min(turns,3) rows with bonus × N
- Charge bonus is added to the base RAW value before the formula — amplified by character mastery

## [0.2.48] — 2026-08-16
- Compare: full redesign — hero cards with portrait + badges (AP/MP/HP/Range/Crit) for both builds
- Equipment diff: aligned per-slot rows (item A ← slot icon → item B), matching items dimmed, differing ones highlighted
- Stats table: grouped sections (Core/Characteristics/Damage/Steal/Res/Combat/Mods), each row A | stat | B | Δ with green/red coloring
- Share button: encodes both builds into the URL as #/?b=A&c=B, copies to clipboard
- Auto-loads Build B from the URL's c= parameter via the new useCompareUrl hook
- Empty state for Build B: URL input + list of saved builds
- Modal overlay to switch Build B once one is already loaded

## [0.2.47] — 2026-08-16
- Catalog: weapons now show a "Weapon Attack" section separate from "Effects" — same as the equipped-slot tooltip
- Same effect_id-based classification logic (WEAPON_ATTACK_IDS) applied to catalog cards

## [0.2.46] — 2026-08-16
- Brand "Dofus Forge": right-click / middle-click opens a new tab with the current build encoded in the URL
- Left-click still resets the build as before

## [0.2.45] — 2026-08-16
- Compare: clicking ⚖ now auto-scrolls to the compare panel
- Compare: field to paste a shared build's URL — loads Build B without needing locally saved builds

## [0.2.44] — 2026-08-16
- Fix: companion/mount slot now shows items in all languages (ES/FR/PT/DE)
- Root cause: ETL stored localized type names (e.g. "Dragopavo" in ES), but slotConfig apiTypes filter checks English names
- Fix: ETL fetches EN type names first, then applies them as canonical type+slot for all languages
- Sidekick slot also fixed by the same change

## [0.2.43] — 2026-08-16
- Compare builds mode: "⚖ Compare" header button activates the full comparison panel
- Panel shows Build A vs Build B equipment (side by side) with item icons and names
- A vs B stats table with a colored Δ column (green = B better, red = A better)
- Build B loads from saved builds via a dropdown — persists until manually cleared
- Build B's stats automatically recalculate on language change (same engine as Build A)

## [0.2.42] — 2026-08-16
- Spell effects validated and fixed: AP/MP steal vs gain correctly distinguished (effectIds 84/111/127/128/169)
- New spell effect kinds rendered: +AP gain, +MP gain, % Erosion, Heals ×%, stacking spell buffs (⭐ SpellName: +N base)
- ETL regenerated: all 19 classes + common spells with correct effectId mappings across EN/ES/FR/PT

## [0.2.41] — 2026-08-15
- Equipped slot tooltip now shows special ability (gold box) and lore description on hover
- i18n fix: ability and description text now uses selected language (was always English before)
- Filtered noise effects: "-special spell-" and "Attitude" (effect_id 163/98) hidden from tooltip

## [0.2.40] — 2026-08-15
- Layout full-width: removed max-w-7xl constraint — no more empty side margins on wide screens (1920px+)
- Right sidebar widened from 300px to 360px for more room in stats and characteristics panels

## [0.2.39] — 2026-08-15
- Fix: "Weapon Attack" now only shows the weapon's real damage — passive stats (e.g. +Air Damage) go to "Effects"
- Root cause: the same stat name ("Air damage") had two IDs in the API — id=189 = attack, id=47 = passive bonus
- Fix: effect_id saved in the JSON, classification done by ID (works in every language)
- Stats panel: weapon stat calculation fixed — passive damage bonuses are no longer excluded

## [0.2.38] — 2026-08-15
- Magesmithy disabled for Dofus (1–6) and Mount slots — the ✦ button no longer appears on those slots

## [0.2.37] — 2026-08-15
- Equip toast: a "Slot: Item" notification appears bottom-right for 2.8s, click to dismiss
- No duplicate Dofus: equipping a Dofus already placed in another slot moves it instead of duplicating it
- Numbered slot labels: "Dofus 1"–"Dofus 6", "Ring 1"/"Ring 2" in every language

## [0.2.36] — 2026-08-15
- Fix: weapons in non-English languages (Arco, Espada, etc.) now get the correct slot:weapon — attack effects now show under "Weapon Attack" instead of "Effects"
- ETL's normalizeItem now uses the API's is_weapon flag instead of mapping the type name (which varies per language)
- EquipmentGrid tooltip now also checks ap_cost != null as an extra weapon check

## [0.2.35] — 2026-08-15
- SetDetailModal: items split into "You Have" / "Still Need" with colored headers
- Missing items show a slot badge (e.g. "🎩 Hat") so you know what to free up
- Set bonuses: colors and sizes now match the active-sets panel

## [0.2.34] — 2026-08-15
- Active sets: 3 columns for 3+ sets (2 columns for exactly 2)
- Stats panel: "Elementos" and "Combate" section titles made larger (9px → 11px)

## [0.2.33] — 2026-08-15
- Spell cards enlarged: bigger icon (52px), larger name, stat icons and AP/range/crit/max text, damage values and column headers scaled up
- Active sets panel enlarged: bigger dots, text, tier badge, Eye icon, 2-column grid

## [0.2.32] — 2026-08-15
- Stats panel combat section: single column so full stat names are visible (no truncation)

## [0.2.31] — 2026-08-15
- Stats panel: larger element icons and combat stat rows

## [0.2.30] — 2026-08-15
- HP badge: removed truncate class that was showing "4,..." — number now fully visible

## [0.2.29] — 2026-08-14
- Desktop layout: 3 columns → 2 columns (equipment + spells left, sidebar right with class + characteristics + stats)
- HP badge: removed overflow-hidden clip, font sizes scale down to prevent number overflow

## [0.2.27] — 2026-08-14
- i18n complete: every user-visible string translated in EN / ES / FR / PT
- Fixed: Undo/Redo labels, modal close aria-labels, sort labels, SpellsPanel abbreviations, LanguageSwitcher

## [0.2.26] — 2026-08-14
- i18n: Modal, ClassPicker, CharacteristicsPanel, SetDetailModal, ItemCatalog, EquipmentGrid
- Magesmith signature persists in share URL

## [0.2.25] — 2026-08-13
- Tooltip: weapon attack effects separated from item stats

## [0.2.24] — 2026-08-13
- Catalog: multi-select stat filter across all equipment
- Dofus slots auto-advance to next slot after equipping (dofus1 → dofus6)

## [0.2.23] — 2026-08-12
- Reusable StatFilter component with categorized stat groups
- Stat filter includes all non-ignored stats

## [0.2.22] — 2026-08-11
- Active sets panel with per-tier bonuses
- Weapon tooltip with damage table (normal / critical)

## [0.2.20] — 2026-08-10
- Export build as PNG image
- Share build via URL

## [0.2.15] — 2026-08-05
- Magesmithy: add runes to equipped items
- Spells panel with damage calculation from character stats

## [0.2.0] — 2026-07-20
- Item catalog with search, filters and sorting
- Stats panel with full character calculation
- Multi-language support: ES / EN / FR / PT

## [0.1.97] — 2026-08-11
- Fix: prospecting/summons base, air damage, HP display

## [0.1.96] — 2026-08-10
- M16 — full visual rebuild: JetBrains Mono font, dominant badges, bigger slots

## [0.1.95] — 2026-08-10
- Single hover panel for all 6 characteristic allocators, removed steal column

## [0.1.94] — 2026-08-10
- Fix: instant popover close + unified scroll toggles

## [0.1.93] — 2026-08-10
- Hover popover for allocation controls + HP badge font fix

## [0.1.92] — 2026-08-10
- Fix: remove 100% cap on effective crit display — crit can exceed 100% in Dofus 3

## [0.1.91] — 2026-08-10
- Fix: remove critChance cap — crit% has no official limit in Dofus 3

## [0.1.90] — 2026-08-10
- Fix: apply official Dofus 3 stat caps in computeStats

## [0.1.89] — 2026-08-10
- Fix: row overflow — two-row layout for stat rows

## [0.1.88] — 2026-08-10
- M17 — steal/heal rows, shield condition group, fixed Σ total

## [0.1.87] — 2026-08-10
- Fix: correct push damage formula — floor(pushbackDamage/3) × cells

## [0.1.86] — 2026-08-10
- Fix: match crit effects by index, not by element

## [0.1.85] — 2026-08-10
- Fix: apply weapon crit_bonus as base damage amplified by the mastery formula

## [0.1.84] — 2026-08-10
- Weapon Mastery — checkbox toggle with separate normal/crit values

## [0.1.83] — 2026-08-10
- Fix: use meleeDamagePercent for weapons/spells with maxRange <= 1

## [0.1.82] — 2026-08-10
- Fix: include weapon crit_bonus in critical damage calculation

## [0.1.81] — 2026-08-10
- Redesigned WeaponCard — table layout, steal/heal split, Weapon Mastery

## [0.1.80] — 2026-08-09
- Fix: show equipment bonus delta per characteristic

## [0.1.79] — 2026-08-09
- Fix: widen right stats panel from 240px to 300px

## [0.1.78] — 2026-08-09
- Fix: fix all broken Tailwind opacity-modifier classes in catalog/modal

## [0.1.77] — 2026-08-09
- Fix: replace all broken Tailwind opacity-modifier classes in visible UI

## [0.1.76] — 2026-08-09
- Spells visual polish — element left-border, gold accent section labels

## [0.1.75] — 2026-08-09
- Compact selected-class header with progressive disclosure

## [0.1.74] — 2026-08-09
- Eliminate duplicate stat display across left/right panels

## [0.1.73] — 2026-08-09
- Phase 3 — visual overhaul: TopBadge, SectionHeader, Crucible, parchment

## [0.1.72] — 2026-08-09
- Phase 3 — Grimoire & Forge visual identity: The Crucible and materiality

## [0.1.71] — 2026-08-09
- Phase 2 — migrate ItemCatalog and RuneModal to CSS var tokens

## [0.1.70] — 2026-08-09
- Design system Phase 1 — core UI primitives (Grimoire & Forge)

## [0.1.69] — 2026-08-09
- Design system Phase 0 — token consolidation (Grimoire & Forge)

## [0.1.68] — 2026-08-09
- Fix: weapon crit damage uses stats.critDamage, not crit_bonus

## [0.1.67] — 2026-08-09
- Fix: load spell names in the selected language

## [0.1.66] — 2026-08-09
- Fix: show push damage value in spell card

## [0.1.65] — 2026-08-09
- Fix: +1 AP bonus at level 100 (Dofus 2 mechanic)

## [0.1.64] — 2026-08-09
- Fix: weapon attack damage excluded from passive stat block; per-slot forjamago name; tooltip hover timer

## [0.1.63] — 2026-08-09
- Set view button, equip-all, forjamago signature, i18n name fixes

## [0.1.62] — 2026-08-09
- Fix: Wisdom also derives AP/MP Removal

## [0.1.61] — 2026-08-09
- Fix: add Chance → Prospecting derivation (+1 per 10 Chance)

## [0.1.60] — 2026-08-09
- Fix: remove Power double-count; derive secondary stats from characteristics

## [0.1.59] — 2026-08-09
- Fix: apply % melee/ranged damage bonus in spell and weapon calculations

## [0.1.58] — 2026-08-09
- Fix: correct damage formula — multiplicative, not additive

## [0.1.57] — 2026-08-09
- Redesigned element rows — CSS grid chips with per-column icons

## [0.1.56] — 2026-08-09
- Three-icon element rows: mastery, damage and resistance per column

## [0.1.55] — 2026-08-09
- Fix: show melee/ranged resistance % in CharacteristicsPanel modifiers

## [0.1.54] — 2026-08-09
- Fix: use statIconUrl() in CharacteristicsPanel, StatsPanel and ExportCard

## [0.1.53] — 2026-08-09
- Fix: add Water steal mapping and i18n keys, audit all stat names

## [0.1.52] — 2026-08-09
- Fix: add % Spell/Weapon Resistance entries with placeholder icons

## [0.1.51] — 2026-08-09
- Fix: use dedicated element damage icons for damage/steal stats

## [0.1.50] — 2026-08-09
- Fix: wire new webp stat icons, fix broken icon mappings

## [0.1.49] — 2026-08-09
- M30 — critical damage display in SpellCard and WeaponCard

## [0.1.48] — 2026-08-09
- M29 — rune images throughout the Forjamagia UI

## [0.1.47] — 2026-08-09
- M27+M28 — weapon attack card + common spells panel

## [0.1.46] — 2026-08-09
- Push/AP/MP effects + Support badge for utility spells

## [0.1.45] — 2026-08-09
- Fix: rewrite image_url to include BASE_URL at fetch time

## [0.1.44] — 2026-08-09
- Two-column spell redesign with images and variants

## [0.1.43] — 2026-08-09
- Set modal stays open on equip/unequip, added unequip button

## [0.1.42] — 2026-08-09
- Fix: i18n negative range separator via range_sep_neg key

## [0.1.41] — 2026-08-09
- Fix: negative ranges display the smaller absolute value first

## [0.1.40] — 2026-08-09
- Fix: equip any set item from the set modal, not just the current slot

## [0.1.39] — 2026-08-08
- Set detail modal — click a set name to view its items, bonuses and equip

## [0.1.38] — 2026-08-08
- Fix: version-based cache busting for all JSON data files

## [0.1.37] — 2026-08-08
- Fix: description/ability visibility — colors were too dark to read

## [0.1.36] — 2026-08-08
- Item description, passive ability and lore shown in catalog cards

## [0.1.35] — 2026-08-08
- Auto type-filter tabs for all multi-type slots

## [0.1.34] — 2026-08-08
- Fix: rename companion slot label to Mount/Montura in all locales

## [0.1.33] — 2026-08-08
- Merge pet/petsmount/mount into a single companion slot with type filter tabs

## [0.1.32] — 2026-08-08
- M23 — card grid layout with all stats visible

## [0.1.31] — 2026-08-08
- Petsmount, Mount and Sidekick slots added to the equipment grid

## [0.1.30] — 2026-08-08
- Fix: translate item stat labels in tooltips, stat filter and rune modal

## [0.1.29] — 2026-08-08
- Footer credits added: server Tal Kasha, creator Juan/Wembie, in-game Raik-Luck

## [0.1.28] — 2026-08-08
- M22 — mobile responsive layout with bottom tab navigation

## [0.1.27] — 2026-08-08
- Fix: full i18n pass — all hardcoded EN/ES strings replaced with t()

## [0.1.26] — 2026-08-08
- M18 — export build as PNG image

## [0.1.25] — 2026-08-08
- Fix: multilingual data — English base with translated names overlay

## [0.1.24] — 2026-08-08
- Fix: always load EN data as base; persist runes in URL snapshot

## [0.1.23] — 2026-08-08
- Fix: set bonuses apply only at the highest tier; Power displays without %

## [0.1.22] — 2026-08-08
- M15 polish — Magesmithy UX redesign + game-faithful tooltip

## [0.1.21] — 2026-08-08
- Fix: Power distributes flat to elemental stats, not as a percentage multiplier

## [0.1.20] — 2026-08-08
- M15 — Magesmithy (Forjamagia) rune system: per-slot rune management integrated into the stat engine

## [0.1.19] — 2026-08-08
- Fix: tooltip shows all stats, side positioning (right/left/top) avoids overflow-hidden clipping
- Fix: use max value for ranged item stats in stat computation

## [0.1.18] — 2026-08-08
- Fix: fmtValue uses dash instead of French "à"; SetBonusesPanel redesigned with tier cards, dots and modal button

## [0.1.17] — 2026-08-08
- M14 — item favorites (star toggle + favorites-only filter)
- M20+M21 — grade selector (1-6) + calculated damage from build stats

## [0.1.16] — 2026-08-07
- Fix: remove unused ALL_SLOTS import, static-ify codec import in useHistory

## [0.1.15] — 2026-08-06
- M08+M09+M10 — set badge, set filter, set detail modal
- M24 — set name and progress in slot hover tooltip
- M12 — stat filter with icon dropdown in item catalog
- M17 — undo/redo (Ctrl+Z/Y) with header buttons, 40-state history
- M11 — improved comparison delta (icons + color + label)

## [0.1.14] — 2026-08-06
- Version bump only — no associated code change in this commit

## [0.1.13] — 2026-08-05
- Game-faithful stats panel + item stat icons + element filters

## [0.1.12] — 2026-08-05
- Correct stat icons + full combat stats panel

## [0.1.11] — 2026-08-05
- Gender toggle, real female portraits, spell element filter with expand

## [0.1.10] — 2026-08-05
- Dofus-faithful redesign: real game icons, direct stat input, bigger equipment slots

## [0.1.9] — 2026-08-05
- Dofus-style characteristic icons + dynamic point allocation (hold-to-repeat, shift/ctrl click)

## [0.1.8] — 2026-08-05
- Fix: resolve class slugs from en.json instead of the current language
- Dofus-faithful character screen layout (left/center/right columns matching the real game UI)

## [0.1.7] — 2026-08-05
- M7 — spells viewer with per-class lazy loading

## [0.1.6] — 2026-08-05
- M6 — set bonuses panel, element filter, stat delta, virtual list, keyboard navigation

## [0.1.5] — 2026-08-05
- M5 — i18n (ES/EN/FR/PT), dark/light theme, accessibility and reduced-motion support

## [0.1.4] — 2026-08-05
- M4 — URL sharing and localStorage saved builds

## [0.1.3] — 2026-08-05
- M3 — Builder UI core: class picker, equipment grid, characteristics panel, stats panel

## [0.1.2] — 2026-08-05
- M2 — pure stat engine with 27 Vitest tests (characteristics, stat map, computeStats)

## [0.1.1] — 2026-08-05
- M1 — ETL pipeline fetching live DofusDude data (equipment, sets, mounts, consumables for ES/EN/FR/PT/DE)

## [0.1.0] — 2026-08-05
- M0 — initial scaffold: Vite 6 + React 18 + TypeScript, TailwindCSS with forge color palette, Zustand/i18next/react-router, GitHub Actions CI (deploy + weekly data update), ETL skeleton
- App version injected from VERSION file via Vite define


