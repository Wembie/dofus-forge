# UI/UX brief — Dofus Forge

**For:** a senior UI/UX designer taking over the interface.
**Status:** open, 2026-11-10. Screens in [`screens/`](screens/) are the live site on that date.
**Out of scope:** the logo. The identity (R9 "The Core", [`../dofus-forge/`](../dofus-forge/)) is final.

## 1. The ask

Dofus Forge works and is fast. People who try it say so, but they also say it **looks AI-made**. We want an
interface with a point of view: something that reads as designed by a person for Dofus players, not as a
generic "premium fantasy dark mode".

This is a **redesign of the visual system and the key screens**, not a rebuild of the product. Flows, features
and information architecture mostly stay. What changes is how everything looks and where attention goes.

## 2. Product in one minute

- **What:** dofusforge.com, a build planner and optimizer for Dofus 3. Players fill the equipment slots (gear,
  mount, companion, 6 Dofus/trophies), spend characteristic points and see the resulting stats. An optimizer ("La Forjadora")
  finds gear for a target. Players publish builds, browse other people's, and look up sets and class guides.
- **Who:** Dofus players, from casual players to theorycrafters who compare builds number by number.
  The site was built natively in Spanish (also EN, FR, PT), and users value that.
- **Devices:** desktop first (the planner is a two-column workspace), with real use on mobile (bottom tab bar).
- **Main jobs:**
  1. Build or tweak a set of gear and read the totals at a glance.
  2. Compare: is this item or set better than what I have?
  3. Find a build or set that someone else made and load it into the planner.
  4. Share a build (link, image card, Discord).

## 3. Diagnosis: why it reads as AI-made

The current look came from a long generic "premium RPG redesign" spec applied to every component at once.
None of the pieces below is wrong alone; it is the combination, applied uniformly, that reads as generated.

| # | Pattern | Where to see it |
|---|---------|-----------------|
| 1 | **Everything gets the same "premium" treatment**: 1px border, faint gradient fill, rounded corners, pill chips. Nothing outranks anything else. | all screens |
| 2 | **Ornamental glow and gradients**: AP/MP/HP/Range tiles with coloured gradients and glow, element rows tinted with a side bar, radial element-coloured hero on set and class pages, gold glow on the Dofus slots, orbiting element dots around the "?" in the empty planner. | `01`, `02`, `04`, `07`, `08` |
| 3 | **Cinzel letter-spaced small caps on every section label** (CLASE, CARACTERÍSTICAS, ELEMENTOS, SETS ACTIVOS…). It is the default "fantasy" font choice. | all screens |
| 4 | **Gold for everything**: headings, borders, chips, active states, primary CTA, counters. It no longer signals anything. | `05` (nine gold stat pills), `02` |
| 5 | **Rainbow stat text**: every stat line in its own colour, so set and item lists become a wall of colour. The icon already carries the colour. | `03`, `07` |
| 6 | **Three typefaces**, with monospace used decoratively ("Nv. 200", "3pc", "382 objetos") instead of only for tabular numbers. | `03`, `06`, `07` |
| 7 | **Header overload**: up to 12 equal-weight controls, disabled actions always visible, a dev version chip (`v0.3.147 Dofus 3.7.12.12`), a NEW badge. On mobile, 5 icon buttons, 2 of them disabled. | `01`, `01-mobile` |
| 8 | **Vanity metrics as decoration** on Explore ("12 registered forgers", "3 likes given") styled as feature chips. | `05` |
| 9 | **Weak empty state on the home page**: about 60% of a 1920px screen is empty dark canvas, slot icons are barely visible, and the one action that matters (pick a class) lives in the sidebar. | `01` |
| 10 | **Generic icon set** (Lucide) next to the game's painted art. | header, buttons |
| 11 | **Template-like copy** on SEO pages ("Buhoset es un set de Dofus 3 de nivel 200 con 3 items. Su bonus crece…"). | `07`, `08` |
| 12 | **Wide screens are not used**: at 1920 the planner's gear cluster is about 400px wide inside a 1500px panel. | `01`, `02` |

Optional ambient effects (gold particles, a cursor glow) exist but are **off by default**. They are not the
main problem; treat them as optional.

### What already works (do not lose it)

- **Data density.** Theorycrafters want a lot on screen. The redesign should organise density, not remove it.
- **The game art.** Item, class, mount and Dofus images are the strongest thing on the page.
- **Element colours as a language.** Earth, fire, water and air (plus neutral) are how players think.
- **Sets list and build detail structure** (`06`, `04`). The layout is sound; the styling needs the same pass.

## 4. Constraints

**Hard (non-negotiable)**
- **Ankama assets are used as delivered.** We do not redraw, recolour or crop item, class or Dofus art,
  and we never imitate Ankama's own UI or branding. The site must not look official.
- **Element colours keep their hue**: earth `#c98a2b`, fire `#e65f40`, water `#2f93d8`, air `#74b93f`,
  neutral `#b9b3a6`. Lightness and saturation can be tuned per theme for contrast.
- **The R9 logo stays.** It is flat, single-colour capable and works at 16px; the UI should catch up with it.
- **Two themes**: dark (default) and light (parchment). Both must be designed, not derived.
- **Four languages.** French and Portuguese strings often run 20–30% longer than English. No fixed-width labels.
- **Accessibility:** WCAG 2.2 AA contrast for text and icons that carry meaning; colour is never the only
  signal (stats always have icon + label); visible focus states; full keyboard use of the planner.
- **Performance:** CSS only for motion (no animation libraries), no new web fonts beyond what you specify
  in the type system (each one costs load time), `prefers-reduced-motion` respected.

**Technical (helps handoff)**
- React + Tailwind CSS, themed through CSS custom properties (`--surface-*`, `--ink-*`, `--gold*`,
  element and stat colours). Name your tokens so they map 1:1 to CSS variables; we will implement them.
- Current tokens and component specs: [`../../DESIGN.md`](../../DESIGN.md) and `src/index.css`. They are
  a reference for what exists, not a constraint on what you propose.

## 5. Scope

### Screens, by priority

| P | Screen | Why it matters | Captures |
|---|--------|----------------|----------|
| 1 | **Planner, empty** (home page) | first impression and first action | `01-*` |
| 1 | **Planner, filled** | where users spend their time | `02-*` |
| 1 | **Item picker** (slot catalog modal) | the most-used interaction | `03-*` |
| 2 | **Build detail** (public build page) | what gets shared | `04-*` |
| 2 | **Explore** (community builds) | discovery, social proof | `05-*` |
| 2 | **Header + mobile tab bar** | on every page | all |
| 3 | **Sets list / set detail** | top SEO entry points | `06-*`, `07-*` |
| 3 | **Class guide** | SEO entry point | `08-*` |

Not in this round: account, admin, legal pages, settings, the optimizer's internal panels, and
the share/OG image cards (they follow once the system is set).

### Components to specify (with all states: default, hover, focus, active, disabled, empty, loading)

Equipment slot · stat row (characteristic, damage, resistance) · headline stat tiles (AP/MP/HP/Range) ·
element table · set bonus card · item card (picker) · build card (Explore) · chip/tag · tabs/segmented
control · buttons (primary, secondary, ghost, icon) · inputs and number steppers · search · modal ·
tooltip (item tooltip is heavily used) · header and its overflow menu · mobile tab bar · section header ·
toasts · empty states.

## 6. Deliverables

1. **Direction exploration:** two distinct directions applied to the **filled planner** (`02`) at 1920×1080,
   dark theme. One page each with the rationale in a few lines. We pick one.
2. **Foundations** for the chosen direction: type scale (families, sizes, weights, where mono is allowed),
   colour tokens for both themes (surfaces, ink, accent, elements, stats, semantic), spacing scale,
   radius scale (two or three values, not more), elevation/borders, iconography rules (which set, size,
   stroke; how it sits next to game art), motion principles (durations, what moves and what does not).
3. **Components** from section 5, with states, in both themes.
4. **Screens** from section 5 at **1920×1080** (desktop) and **390×844** (mobile), dark and light.
   Also check the planner at 1366×768, a common laptop size.
5. **Handoff:** Figma file with tokens as variables named for CSS, components as variants, and annotated
   redlines for anything non-obvious (responsive breakpoints, truncation, long FR/PT strings).

## 7. Direction: what we want and what to avoid

**Want**
- **One accent, used sparingly**: the primary action and the active state, nothing else.
- **Hierarchy you can read squinting**: the totals (AP, MP, HP, main damage) dominate; labels are quiet.
- **Flat, honest surfaces**: structure from spacing, alignment and a small number of tones, not from
  borders, glows and gradients on every box.
- **Colour only where it means something**: an element, a stat type, a negative value.
- **A recognisable signature of our own**, coherent with the R9 mark. Something a player could recognise
  from a cropped screenshot.
- **Typography with a job**: if a display face stays, it is for one or two places, not every label.

**Avoid**
- Glow, bloom, gradient fills and coloured shadows as decoration.
- Letter-spaced uppercase serif labels everywhere.
- Pills for everything; equal border weight on every element.
- Particles, sparkles and "magic" effects as atmosphere.
- Stock-SaaS look (shadcn/Lucide defaults left untouched).
- Imitating Ankama's in-game UI or any other fan site.

## 8. Process

1. **Kick-off (call):** walk through this brief and the live site; agree on the two directions.
2. **Directions** (deliverable 1). One round of feedback, then pick.
3. **Foundations + components** (2, 3). Review at the halfway point.
4. **Screens** (4). Review P1 screens first, then P2 and P3.
5. **Handoff** (5). We implement; you review the first built screens for fidelity.

Feedback comes from the owner, consolidated in one message per round, with screenshots annotated.

## 9. Open questions for the designer

- Does a display typeface earn its place at all, or should the game art carry the "fantasy" alone?
- Should the light theme be a true equal of the dark one, or a secondary mode?
- How far can we push the planner layout on wide screens (side-by-side stats, a third column for sets)?
- What is the right home for the optimizer entry point, which is currently a header button with a NEW badge?

## Appendix

**Screen index.** `screens/NN-name-<variant>.png`, with variant `desktop` (1920×1080, dark),
`desktop-light` (1920×1080, light) and `mobile` (390×844, dark).

| NN | Screen | URL |
|----|--------|-----|
| 01 | Planner, empty | `/es` |
| 02 | Planner, filled | a published build loaded into the planner |
| 03 | Item picker | planner → hat slot |
| 04 | Build detail | `/es/build/<id>` |
| 05 | Explore | `/es/explore` |
| 06 | Sets list | `/es/sets` |
| 07 | Set detail | `/es/sets/<slug>` |
| 08 | Class guide | `/es/classes/cra` |

**Recapture** (from the repo root, needs Playwright's Chromium):

```sh
node docs/brand/ui-brief/capture.mjs                    # live site
node docs/brand/ui-brief/capture.mjs http://localhost:4173   # local preview
```

**Related docs:** [`../../DESIGN.md`](../../DESIGN.md) (current UI system),
[`../../REDESIGN_AUDIT.md`](../../REDESIGN_AUDIT.md) (previous pass),
[`../BRIEF.md`](../BRIEF.md) and [`../dofus-forge/`](../dofus-forge/) (identity, colours, type).
