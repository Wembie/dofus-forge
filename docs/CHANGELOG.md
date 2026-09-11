# Changelog

All notable changes to Dofus Forge are documented here.  
Game version is read automatically from `public/data/version.json` (currently **3.6.10.11**).

---

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
- Fix: opening a shared compare link (`?c=...`) already loaded Build B and set `compareStore.active = true` via `useCompareUrl`, but the scroll-into-view for the compare panel only ran inside the manual "Comparar" button's `onClick` — landing on the link left the user at the top of the page with no visible indication the comparison loaded. Moved the scroll into a `useEffect` in `BuilderPage.tsx` that watches `compareActive` directly, so it fires the same way regardless of whether compare mode was triggered by a click or by a URL

## [0.2.124] — 2026-09-08
- Fix: `ComparePanel.tsx`'s `handleLoadUrl` parsed pasted URLs by manually splitting on `#`, a leftover from the HashRouter era — with the current path-based format (`…/es/?b=...`, no `#`) it fell through to treating the ENTIRE URL as the encoded build string, always failing with "URL inválida o build corrupto". Rewrote using the native `URL` API: reads `?b=` directly off `url.searchParams` for current links, falls back to parsing inside `url.hash` for old shared links
- Fix: `handleShare` (compare mode's "share comparison" button) still built the old `#/?b=...&c=...` hash link — now builds the correct per-language path, matching the fix already applied to `ShareBar`/`brandHref` in 0.2.109/0.2.111

## [0.2.123] — 2026-09-07
- Fix: `stats.ts` aggregated the generic "Damage" stat (all elements, e.g. Aguja de Psikopomzopato's +4-6 Daño) into its own `block.damage` field but never applied it to the 5 elemental damage totals — `ElementSection` in the stats panel showed Air/Earth/Fire/Water/Neutral Damage without this bonus, even though the type comment already said "generic (all elements)". Now added into each of `neutralDamage`/`earthDamage`/`fireDamage`/`waterDamage`/`airDamage` right after all item/set/rune effects are aggregated

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
- Fix: weapon attack effects now correctly classified — added id=233 (Steals MP per hit), id=238 (MP steal on attack, stat='MP' negative), and id=261 (Fire heals weapon attack) to WEAPON_ATTACK_IDS; these were previously appearing under EFECTOS instead of ATAQUE DE ARMA
- Fix: item tooltip in EquipmentGrid and SetDetailModal now has max-height (min(82vh, 640px)) with overflow-y scroll — tall items like high-level weapons no longer clip effects at viewport bottom (e.g. Wisdom and Fire Damage were not visible)

## [0.2.103] — 2026-09-02
- Redesign: RuneModal add-controls (rune picker → selected rune + quick values + qty input + Add button) are now in a fixed panel above the scrollable area — always visible without scrolling; rune grid, active runes, weapon transform, and forjamago signature remain in the scroll
- Add: "Clear all runes" button in the active runes header row — removes all magesmithy runes for the slot at once

## [0.2.102] — 2026-09-02
- Fix: Range badge now shows overcap indicator (▲N) when range exceeds the cap of 6 — same behavior as AP (cap 12) and MP (cap 6); added rangeRaw to StatBlock and computed pre-cap raw value in stats engine
## [0.2.101] — 2026-09-02
- Fix: Range badge in StatsPanel now shows '+' prefix (e.g. '+1' instead of '1') — Range is a pure item bonus, not a base stat like AP/MP

## [0.2.100] — 2026-09-02
- Feat: item tooltip now shows CONDICIONES section — requirements like "Strength > 249" listed with stat icon and color; extracted from DofusDude API conditions tree and saved per-item in normalized data; visible in both slot hover tooltip and SetDetailModal item hover tooltip
- Fix: stat values in item tooltip now show "+" prefix for positive values (e.g. "+1 Range", "+1 MP", "+351–400 Vitality") — replaced raw number display with fmtValue() in both StatLine components

## [0.2.99] — 2026-09-01
- Feat: ItemCatalog "Ver Set" now opens the full SetDetailModal — replaced the old basic local set modal (basic list, no progress bar, no equip-all, no hover tooltips) with the proper SetDetailModal component used everywhere else; removed ~180 lines of duplicate code

## [0.2.98] — 2026-09-01
- UX: set name in slot tooltip is now a clickable link — clicking the blue "Set de X" text in the item tooltip opens the SetDetailModal for that set; removed the separate Eye button since the set name covers that action; tooltip stays pointer-events-none except for that specific button

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
- UX: RuneModal resistance section split into two labeled rows — "Resistencias" (flat: 5 elemental + Crit + Push) and "% Resistencias" (% elemental + % Melee + % Ranged); clean visual separation of flat vs percentage runes

## [0.2.91] — 2026-08-31
- Fix: Summons moved to Primarias section in RuneModal (was in Secundarias)
- UX: RuneModal wider (640px max) with auto-fill column grid — desktop shows ~8 runes per row, mobile keeps 5 columns

## [0.2.90] — 2026-08-31
- Feat: RuneModal — 15 missing runes added (AP/MP Parry, % Spell/Weapon/Melee/Ranged Damage, % Melee/Ranged Resistance, Pushback Damage/Resistance, Trap Damage, Power (traps), Summons, Pod, reflected damage)
- Feat: RuneModal — rune picker reorganized into 4 labeled sections: Primarias / Daños / Resistencias / Secundarias; 5-column grid per section replaces flat 7-column grid
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
- StatsPanel: columna RES% muestra overcap — si la resistencia % supera el cap de 50%, el valor aparece en dorado con badge `▲N` indicando cuántos puntos no aplican en juego

## [0.2.79] — 2026-08-27
- StatsPanel: tabla elemental agrega columna ✦ % (forjamagia RES%) — muestra en azul (#38a7cf) solo la contribución de runas de resistencia %, separada del RES% base del equipo; `—` cuando no hay runas de ese tipo
- RuneModal: agrega soporte para runas de % Resistencia elemental (Neutral, Tierra, Fuego, Agua, Aire)

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
- New "⚡ Equipar el mejor build" button auto-equips top result from results page
- i18n: all 4 locales updated with new optimizer keys

## [0.2.67] — 2026-08-18
- Fix: rune badge repositioned outside slot to the right — was at `left: px-3` (overlapping slot); now `left: px+2` (clearly outside, visible beside the slot)

## [0.2.66] — 2026-08-18
- M42 — La Forjadora (Build Optimizer): botón en header abre modal
- Configurar pesos soft (sliders 1–10) para maximizar cualquier stat del build
- Configurar requeridos hard (≥ mínimo) — builds que no cumplen se descartan del top-3
- Checkboxes Exo PA/PM/Rango (preparación para futura integración de ítems forjamagiados)
- Nivel máximo configurable y slots a optimizar seleccionables por slot
- Algoritmo beam search (width=50) con pre-filtro greedy top-25 por slot
- Web Worker: cálculo no bloquea la UI — barra de progreso con % en tiempo real
- Resultados top-3: imágenes de ítems, stats clave, botón "Cargar este build"
- i18n: ES / EN / FR / PT con nombre localizado (La Forjadora / The Forger / La Forgeuse / A Forjadora)

## [0.2.65] — 2026-08-18
- WeaponCard: ícono de poción de transformación (Wildfire/Earthquake/Tsunami/Hurricane) aparece en esquina inferior derecha de la imagen del arma cuando hay transform activo

## [0.2.64] — 2026-08-18
- Fix: badge de transformación elemental ya no aparece en armas sin daño Neutro (estado obsoleto del store)
- Fix: efectos de empuje (effect_id 225) excluidos de las filas de daño de WeaponCard — evitaba NaN en el cálculo y "TOTAL NaN-NaN"

## [0.2.63] — 2026-08-17
- Feat: forjamagia de arma — transforma daño Neutro a elemental (Fuego/Tierra/Agua/Aire) al 85%, 68% o 50%
- RuneModal: sección "Transformación Elemental" con iconos de poción (Wildfire/Earthquake/Tsunami/Hurricane) y botones de ratio
- WeaponCard: aplica la transformación en la tabla de daños — el daño neutro se reemplaza por el elemento elegido con la fórmula correcta
- WeaponCard: badge de elemento+% en el header cuando hay transformación activa
- URL share: `wt` field preserva la transformación al compartir/guardar build

## [0.2.62] — 2026-08-17
- UI: efectos quemados (robo PA, robo PM, ganar PA, ganar PM, empuje, erosión, mod curas, buff de hechizo) ahora aparecen como chips coloreados con icono de stat
- UI: icono correcto por efecto — ap_reduction para robo PA, mp_reduction para robo PM, ap para ganar PA, mp para ganar PM, push_damage para empuje, damage_reflect para erosión, heals para curación
- UI: fila de curas (steal ♥) reemplaza símbolo ♥ por icono heals.webp en SpellCard, WeaponCard y filas Σ

## [0.2.61] — 2026-08-17
- Fix: buffs y descripción del hechizo ahora aparecen en el idioma seleccionado (el overlay de lang copiaba solo el nombre)
- Fix: ETL filtra buffs con placeholders sin resolver (#3, #4) — "Disparos Lejanos" ya no genera 70+ entradas de estado
- Fix: ETL filtra buffs con IDs de estado de 5+ dígitos embebidos en el texto
- Fix: ETL deduplica buffs idénticos por texto en cada nivel (e.g. Flecha Explosiva "-2 Alcance" ya no aparece dos veces)
- UI: buffs como chips coloreados — rojo para debuffs (−), azul/aire para buffs (+), oro para neutros; iconos de stat cuando aplica

## [0.2.60] — 2026-08-17
- Feat: ETL extrae buffs/debuffs genéricos (rango, crítico, curas, etc.) usando effects.json + templates por idioma; se muestran como texto en la SpellCard debajo de los daños
- Feat: ETL extrae description del hechizo (spell.descriptionId) y la muestra al pie de la SpellCard en texto pequeño/itálico
- Feat: renderEffectLabel — motor de templates ({{~1~2}}, pluralización, #1/#2, sufijo NT) para convertir effectId+valores a string legible por idioma

## [0.2.59] — 2026-08-17
- Fix: Flecha de Expiación (y similares) — Carga 2 ahora muestra el doble del bonus de Carga 1: cuando todos los spell_buff tienen el mismo min, se escala por ratio de stack (min × stack/baseStack) en vez de usar el valor plano
- Fix: hechizos "mixed" (Bumerán Pérfido y similares) — no muestran Σ porque cada hit aplica un elemento aleatorio (no acumulativo); solo se muestran las filas por elemento

## [0.2.58] — 2026-08-17
- Fix: daño de empuje (colisión) — coeficiente corregido a floor(nivel/6) por celda (era ×3/20=0.15, correcto es ÷6≈0.1667) — a nivel 200: 33/celda × 3 celdas = 99, coincide exactamente con el juego

## [0.2.57] — 2026-08-17
- Fix: daño de empuje (colisión) ahora usa fórmula determinista — floor(nivel×3/20 + pushbackDamage/4) por celda, sin dados — coincide con lo que muestra el juego (~30/celda a nivel 200)
- Fix: Σ↷ crit ya no doble-suma critDamage — ya estaba incluido en critTotalMin vía calcEffects
- Fix: bestElemDamage incluido en flatBonus — la stat "best-element damage" no se aplicaba a la fórmula

## [0.2.56] — 2026-08-16
- Fix: daño crítico (critDamage stat) ahora se suma como flat bonus en efectos críticos de hechizos
- Fix: Σ↷ crit incluye critDamage en el daño de colisión de empuje

## [0.2.55] — 2026-08-16
- SpellCard: empuje muestra "(si colisión: min–max)" por celda con fórmula completa incluyendo base por nivel
- Σ↷: fila separada que suma elemental + colisión total (todas celdas bloqueadas)
- Σ normal no incluye empuje — el daño de empuje solo ocurre en colisión, no en push libre

## [0.2.54] — 2026-08-16
- Fix: daño de empuje corregido — fórmula 25% por celda (antes era /3 ≈ 33%)

## [0.2.53] — 2026-08-16
- Fix: hechizos con Descarga ya no muestran Σ — los daños por nivel de carga no son acumulativos sino alternativos (carga 3 = solo 916, no 498+707+916)

## [0.2.52] — 2026-08-16
- Fix: Σ en hechizos con Descarga ya no suma la fase de robo (carga) + la descarga juntos
- Σ solo muestra el total del daño de descarga — la fase de robo no se acumula en un solo cast
- Heal Σ (♥) en el bloque Σ también eliminado para hechizos con Descarga (cada robo sana por separado)

## [0.2.51] — 2026-08-16
- Veneno (DoT): efectos con `triggers=TE` y `effectTriggerDuration>0` detectados como `kind:poison` en el ETL
- SpellCard: label "Veneno (Xt)" antes del primer efecto DoT cuando hay también daño normal en el mismo hechizo
- Flecha Tiránica / similares: daño normal + separador Veneno (2t) + daño DoT — sin confundir con daño directo
- Fórmula de daño aplicada a poison igual que damage (se amplifica con maestría del personaje)
- ETL regenerado: 19 clases con `kind:poison` + `turns` en todos los efectos DoT

## [0.2.50] — 2026-08-16
- SpellCard: deduplica efectos idénticos (elemento+tipo+min+max) — elimina duplicados de multi-hit AoE y cargas repetidas (64 hechizos afectados en todas las clases)
- Tyrannical Arrow / similares: 3 efectos fuego [28-32, 20-22, 28-32] ahora muestra 2 filas (el duplicado se colapsa)
- Descarga: separador entre la fase de robo (carga) y la fase de daño (descarga) en hechizos tipo Devouring Arrow

## [0.2.49] — 2026-08-16
- Hechizos de carga: daños calculados por nivel de carga en SpellCard
- Cargas explícitas (ej. Flecha Castigadora ×1/×2): filas "Carga 1", "Carga 2" con normal y crítico
- Cargas acumulativas (ej. Flecha Helada stack=0): muestra hasta min(turns,3) filas con bonus × N
- El bonus de carga suma al base RAW antes de la fórmula — se amplifica con maestría del personaje

## [0.2.48] — 2026-08-16
- Comparar: rediseño completo — hero cards con portrait + badges (AP/MP/PV/Alcance/Crítico) de ambos builds
- Equipment diff: filas por slot alineadas (item A ← icono slot → item B), mismos items atenuados, diferentes resaltados
- Tabla de stats: secciones agrupadas (Core/Chars/Daño/Robo/Res/Combate/Mods), cada fila A | stat | B | Δ con colores verde/rojo
- Botón Compartir: codifica ambos builds en URL #/?b=A&c=B, copia al portapapeles
- Auto-carga Build B desde parámetro c= de la URL via nuevo hook useCompareUrl
- Estado vacío para Build B: input URL + lista de builds guardados
- Modal overlay para cambiar Build B cuando ya hay uno cargado

## [0.2.47] — 2026-08-16
- Catálogo: armas muestran sección "Ataque de Arma" separada de "Efectos" — igual que el tooltip del slot equipado
- Misma lógica de clasificación por effect_id (WEAPON_ATTACK_IDS) aplicada en las tarjetas del catálogo

## [0.2.46] — 2026-08-16
- Brand "Dofus Forge": click derecho / botón medio abre nueva pestaña con el build actual codificado en la URL
- Click izquierdo sigue reseteando el build como antes

## [0.2.45] — 2026-08-16
- Comparar: clic en ⚖ hace scroll automático al panel de comparación
- Comparar: campo para pegar URL de un build compartido — carga Build B sin necesitar builds guardados localmente

## [0.2.44] — 2026-08-16
- Fix: companion/mount slot now shows items in all languages (ES/FR/PT/DE)
- Root cause: ETL stored localized type names (e.g. "Dragopavo" in ES), but slotConfig apiTypes filter checks English names
- Fix: ETL fetches EN type names first, then applies them as canonical type+slot for all languages
- Sidekick slot also fixed by the same change

## [0.2.43] — 2026-08-16
- Modo Comparar builds: botón "⚖ Comparar" en header activa panel de comparación completo
- Panel muestra equipo de Build A vs Build B (lado a lado) con iconos y nombres de items
- Tabla de stats A vs B con columna Δ coloreada (verde = B mejor, rojo = A mejor)
- Build B se carga desde builds guardados via dropdown — persiste hasta limpiar manualmente
- Stats de Build B se recalculan automáticamente al cambiar idioma (mismo engine que Build A)

## [0.2.42] — 2026-08-16
- Spell effects validated and fixed: AP/MP steal vs gain correctly distinguished (effectIds 84/111/127/128/169)
- New spell effect kinds rendered: +PA gain, +PM gain, % Erosión, Curas ×%, stacking spell buffs (⭐ SpellName: +N base)
- ETL regenerated: all 19 classes + common spells with correct effectId mappings across EN/ES/FR/PT

## [0.2.41] — 2026-08-15
- Equipped slot tooltip now shows special ability (gold box) and lore description on hover
- i18n fix: ability and description text now uses selected language (was always English before)
- Filtered noise effects: "-special spell-" and "Attitude" (effect_id 163/98) hidden from tooltip

## [0.2.40] — 2026-08-15
- Layout full-width: removed max-w-7xl constraint — no more empty side margins on wide screens (1920px+)
- Right sidebar widened from 300px to 360px for more room in stats and characteristics panels

## [0.2.39] — 2026-08-15
- Fix: "Ataque de Arma" solo muestra daños reales del arma — stats pasivos (ej. +Daño Aire) van a "Efectos"
- Root cause: mismo nombre de stat ("Air damage") tenía dos IDs en API — id=189 = ataque, id=47 = bonus pasivo
- Solución: effect_id guardado en JSON, clasificación por ID (funciona en todos los idiomas)
- Stats panel: cálculo de stats de arma corregido — bonuses pasivos de daño ya no se excluyen

## [0.2.38] — 2026-08-15
- Forjamagia deshabilitada para Dofus (1–6) y Montura — botón ✦ no aparece en esos slots

## [0.2.37] — 2026-08-15
- Toast al equipar: notificación "Slot: Item" aparece abajo a la derecha por 2.8s, click para cerrar
- Dofus sin duplicados: equipar un dofus ya puesto en otro slot lo mueve (no duplica)
- Slot labels con número: "Dofus 1"–"Dofus 6", "Anillo 1"/"Anillo 2" en todas las lenguas

## [0.2.36] — 2026-08-15
- Fix: armas en idiomas no inglés (Arco, Espada, etc.) ahora tienen slot:weapon correcto — efectos de ataque aparecen en "Ataque de Arma" y no en "Efectos"
- ETL normalizeItem usa is_weapon del API en lugar de mapear el nombre del tipo (que varía por idioma)
- EquipmentGrid tooltip usa ap_cost != null como check adicional de arma

## [0.2.35] — 2026-08-15
- SetDetailModal: items separados en "Ya tienes" / "Te falta" con headers colored
- Items faltantes muestran badge con slot (ej. "🎩 Sombrero") para saber qué hay que liberar
- Bonuses del set: colores y tamaños iguales al panel de sets activos

## [0.2.34] — 2026-08-15
- Sets activos: 3 columnas para 3+ sets (2 columnas para exactamente 2)
- Stats panel: títulos de sección "Elementos" y "Combate" más grandes (9px → 11px)

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


