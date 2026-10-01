# Dofus Forge — Redesign Audit (Phase 1)

Read-only audit. No code changed as part of this document. Written in response to a
122-point "premium RPG redesign" spec the user pasted in, before any implementation —
per that spec's own Phase 1 instruction ("analyze, document, don't touch code yet").

## 0. The most important finding: this already happened once

`docs/DESIGN.md` (38KB) is a pre-existing, bespoke design-system doc written specifically
for this app, not a generic template. Git history shows it was substantially **implemented**,
not just planned — a "Grimoire & Forge" effort in commits `cd2c771` (token consolidation),
`fb97c6c` (core UI primitives), `ad1d337`/`df34032` (parchment/"Crucible" visual pass).

Confirmed already live, matching `DESIGN.md` spec exactly:
- **Typography**: Cinzel (display) + Inter (body) + JetBrains Mono (all numbers) — loaded in
  `index.html:121-124`, mapped in `tailwind.config.ts:12-15`. The mega-spec's "numbers should
  feel precise, monospaced" (§20) is already done.
- **Color system**: full layered surface scale (void/stone/panel/parchment/raised), gold accent
  ramp, 4 elemental colors + glow/dim variants, 7-tier item rarity scale (`--rarity-0..6`),
  semantic positive/negative/warning — all in `src/index.css`, single source of truth, confirmed
  no competing token definitions exist anywhere else in the codebase.
- **Material system**: `Frame.tsx` implements exactly §15's "different visual materials" idea
  (stone/parchment/raised/panel variants, bevel shadows, gold top-border).
- **Motion tokens**: `--ease-out/-inout/-forge`, `--dur-fast/-base/-slow/-cinematic` already
  defined in `index.css`, used by item-equip/slot-equip/tooltip-in keyframes.
- **Item rarity visual treatment** (§11): tokens exist; not yet wired into every item-rendering
  surface (see gaps below).

**Implication**: treating this as "generic Tailwind SaaS that needs total reinvention" (per the
mega-spec's §74 "no generic design" framing) would be factually wrong and would re-litigate
decisions already made deliberately. The honest framing is: *extend and finish* an existing,
coherent design language — not replace it.

## 1. A second, directly relevant precedent: framer-motion was removed on purpose

Commit `d5003e1` ("perf(bundle): -44% main bundle") deliberately removed framer-motion:
~170KB in the eager bundle for "only ever simple fade/scale/slide UI." Main bundle went
676KB→376KB gzip 202KB→115KB. Replacements were hand-rolled and are still in use:
- `Tabs.tsx` — sliding indicator via `ResizeObserver` + native CSS `transition`, no library
- `Modal.tsx`/`Toaster.tsx` — rAF-flip mount + delayed unmount matching CSS transition duration

`i18next-http-backend` was also removed (+cross-fetch, ~37KB) for a 15-line custom fetch backend.

**Implication for the mega-spec's asks**: §40 (particle engine), §39 (custom cursor), §42
(sound system), §63-64 (command palette) are all real UI patterns, but every one of them adds
JS weight and runtime cost to an app whose team has already measured and rejected that
tradeoff once, explicitly for performance reasons. None of them are free — they'd need to be
justified against this precedent, not bolted on by default because a spec lists them.

## 2. Existing routes / pages

| Path | Component | Purpose |
|---|---|---|
| `/` (lang-prefixed) | `BuilderPage.tsx` | Main planner — class, characteristics, equipment, spells, stats |
| `/explore` | `ExplorePage.tsx` | Browse published builds |
| `/build/:id` | `BuildDetailPage.tsx` | Read-only build view |
| `/my-builds` | `MyBuildsPage.tsx` | Own builds list |

## 3. Feature inventory (do-not-break surface)

~20 feature folders under `src/features/`: auth, builds, changelog, characteristics,
class-picker, compare, equipment (largest: `EquipmentGrid.tsx` 43KB), optimizer (runs via
`workers/optimizer.worker.ts`), publish, pvp, share, spells (largest file in app, 62KB),
stats-panel. 17 shared primitives in `src/ui/` (Button, IconButton, Frame, Modal, Tabs,
Badge, StatRow/Value, Tooltip, ElementGem, StatFilter, + utils).

**Engine/domain logic (`src/engine/`) must not be touched by a visual redesign**:
`stats.ts` (`computeStats`), `statMap.ts` (raw-effect→stat-key tables), `optimizer.ts`,
`characteristics.ts`. Redesign work should only touch render/JSX/className layers that
*consume* `StatBlock` output, never the calculation itself.

**State**: 7 Zustand stores (`buildStore` 15KB/~24 actions is the core one, plus `dataStore`,
`historyStore`, `authStore`, `compareStore`, `pvpStore`, `toastStore`). None of this needs to
change for a visual pass — it's the thing the visual layer renders.

## 4. Data/assets reality check (constrains what's feasible)

- Item/weapon artwork is **not local** — `equipment.json` entries point at a third-party CDN
  (`api.dofusdu.de`). Only class portraits (38 files), rune icons (54), stat icons (57), and
  spell icons (862 files, 6MB) are bundled locally. **There is no "Dofus gem" artwork asset**
  anywhere in the repo — the mega-spec's §12-13 "Dofus Sanctum" with per-Dofus unique art
  (turquoise/crimson/emerald/...) would need those assets sourced or built as CSS/SVG
  abstractions from scratch; nothing to reskin.
- No element-icon directory — `ElementGem.tsx` renders elements without raster assets already,
  which is actually a head start for an abstract/SVG-driven "Dofus Sanctum" treatment.
- Per-language data payload is 8.4-9MB each (`equipment.json` ~5MB alone) — any redesign that
  touches the catalog/armory rendering path should be mindful this is already the single
  biggest thing the app loads; virtualization (`useVirtualList.ts`) already exists and is used.
- `dist/` from a prior build: 57MB total, but `dist/assets` (actual JS/CSS) is 4.5MB — the rest
  is the per-language data payload, not redesign-relevant bloat.
- i18n: 4 locales, ~544 keys each, confirmed in lockstep (no drift). Any new UI copy must go
  through `t()` and all 4 files, per `CLAUDE.md`.

## 5. Real gaps vs. the mega-spec (the parts worth actually doing)

Ranked by (visible impact) ÷ (implementation + perf cost) — highest first:

1. **Equipment slot states are functional but minimal** — `EquipmentGrid.tsx` slots already
   have gradient/gold-glow/inset-shadow treatment (confirmed this session, reused in
   `BuildCharacterView.tsx`), but rarity tokens (`--rarity-0..6`) exist in CSS and are **not**
   driving slot border color — every equipped slot looks the same regardless of item rarity.
   This is a real, cheap, CSS-only win matching DESIGN.md §2.6's own stated intent.
2. **Equip/unequip microinteraction is a single keyframe, not a sequence** — `item-equip`
   keyframe exists (scale+brightness pulse) but there's no stat-change feedback tied to it
   (DESIGN.md's own principle #5, "feedback inmediato ≤120ms", stats should "tick" — not
   fully wired). Cheap: CSS-only number transition on stat change, no library needed.
2. **Mobile is tab-based, not drawer-based for item selection** — selecting gear on mobile
   likely still opens `ItemCatalog` as a full panel, not a bottom-sheet drawer. Worth checking
   against §32-34 — probably the single biggest *feel* difference between "ok mobile" and
   "feels native," and achievable with plain CSS transform/transition, no library.
3. **No Dofus-specific visual distinction** — all 6 Dofus slots currently render through the
   same generic slot component as any other equipment slot. A lightweight "Dofus Sanctum"
   treatment (stronger glow token already exists as `--glow-gold`/rarity glows, could add a
   slow CSS-only pulse) is feasible without new assets or a particle engine.
3. **Header/nav was just reworked this session** (mobile hamburger fallback, active-route
   state, forge-styled build cards) — already partially addresses DESIGN.md's own diagnosed
   "header controls compete with content" complaint. Don't re-do this.
4. **Build Overview / completeness summary** (§47-49) doesn't exist — no single place shows
   "is this build done" at a glance. Plausible, scoped, doesn't touch engine logic.
5. **Catalog/Armory density** — `ItemCatalog.tsx` + `StatFilter.tsx` (11KB) already exist with
   virtualized lists; DESIGN.md already diagnosed "+12 stats en texto plano" as a problem.
   Elevating item cards in the catalog is plausible without new deps.

## 6. Asks from the mega-spec I'd push back on for this app specifically

- **Particle engine, custom cursor, ambient background fog/parallax, sound system, command
  palette** (§39-42, §63-64): each is a real cost (new runtime code, more surface for bugs,
  more QA, perf risk) for a build-planner tool whose users mostly want fast, legible stat
  comparison — not ambiance. Recommend: skip or defer all of these unless there's a specific
  moment identified where it clearly pays for itself (see item 3 above — Dofus glow, cheap,
  CSS-only, worth it; a full WebGL/particle system is not).
- **Reintroducing an animation library**: no. The hand-rolled `Tabs`/`Modal` approach already
  covers what's needed; the bundle-size precedent (§1 above) is a real, measured decision,
  not an oversight to correct.
- **Semantic-versioning reset to 1.0.0** (§118): this project's `CLAUDE.md` has its own
  patch-increment convention already in continuous use (currently 0.3.17) — not touching that.

## 7. Proposed phase order (trimmed, realistic)

Given the above, a sane execution order — each as its own small commit cycle (version bump +
changelog + i18n, per `CLAUDE.md`, as done all session) rather than one giant change:

1. Rarity-aware equipment slot borders/glow (CSS-only, uses existing tokens)
2. Stat-change tick animation on equip/unequip (CSS-only)
3. Dofus slot visual distinction (CSS-only glow/pulse, no new assets required)
4. Mobile item selection as a bottom-sheet drawer instead of full panel
5. Build completeness summary widget
6. Catalog item card visual pass

Anything beyond this list (particles, cursor, sound, command palette, full "Forge Shell"
rebuild) should be a separate, explicit decision — not default-executed because it's in the
pasted spec.
