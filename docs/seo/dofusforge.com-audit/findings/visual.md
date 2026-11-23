# Visual and mobile findings: dofusforge.com

Audit date: 2026-11-22.

**How it was tested**

- Screenshots came from `capture_screenshot.py`: desktop 1920x1080, laptop 1366x768, tablet 768x1024 and mobile 375x812 (2x DPR).
- Above-the-fold and mobile checks came from `analyze_visual.py`.
- A Playwright probe measured tap targets, font sizes and images at 375x812 for home, class and set.
- The browser sandbox stayed on for every render.

## Screenshots

All files are in `docs/seo/dofusforge.com-audit/screenshots/`.

| Page | Files |
|---|---|
| Home (https://dofusforge.com/) | `home-desktop.png`, `home-laptop.png`, `home-tablet.png`, `home-mobile.png` |
| Class page (https://dofusforge.com/classes/feca) | `class-desktop.png`, `class-laptop.png`, `class-tablet.png`, `class-mobile.png` |

## Visual score: 78 / 100

## Above-the-fold

**Home (the workshop), desktop**

The first screen shows:

- The H1 "Dofus 3 build planner"
- A breadcrumb (My workshop / Local draft)
- The section tab row
- The empty equipment grid and character frame
- The full "Choose your class" picker with 19 portraits, gender and level

The primary action, picking a class, is fully visible. The Forger, Compare, Publish and Share buttons are labelled in the top right. The right column is empty below the picker, but that is intentional.

**Home, mobile**

The first screen shows the header, the H1, a row of icon-only actions, a horizontally scrolling section tab strip, and the first 10 class cards. A fixed bottom tab bar (Forge, Equipment, Stats, Compare, Publish) sits at the bottom. The primary action is visible.

**Class page (Feca), desktop**

The first screen shows a breadcrumb, a "Class guide" label, the H1 "Feca" with its portrait, an intro paragraph and the "Build a Feca" primary CTA. Below them are the on-page TOC, a class switcher strip and the first "builds by element" tables. Clean, readable, CTA above the fold.

**Class page, mobile**

The H1, intro and CTA are all inside the first 750 px. The class switcher is 19 portraits that wrap onto 4 rows. Together with a collapsed "On this page" box, they push the first content H2 down to about 760 px, the bottom of the first screen.

`analyze_visual.py` reports `cta_visible: false` on both pages. Its heuristic does not recognise "Build a Feca" or the class picker as CTAs, so this is a tool false negative. It also reports `h1_visible: true`, `viewport_meta: true`, `horizontal_scroll: false`, `touch_targets_ok: true` and a base font of 16 px.

## Findings

### V1. A frame with no styles, and the whole layout jumping on desktop, after a hydration failure. Severity: Critical

**Evidence**

- On desktop, home and /es record a layout shift worth 1.0, the guide one worth 0.76. In it, `BODY` moves from y=8 to y=0 and the desktop grid (`div.hidden lg:grid`) goes from 0 px to 716 px tall.
- A y of 8 px is the browser's default body margin. So for at least one frame after first paint, the page was drawn without its stylesheets: a visible flash of the unstyled or mobile layout.
- It coincides with React error #418, which fires on every page, and needs AdSense to be present. It happened in 14 of 18 desktop home runs and in none of the runs with third-party hosts blocked.
- This is what users see. P1 in `performance.md` has the full trace.

**Recommendation**

Fix the #418 text mismatch so React hydrates the prerendered DOM instead of replacing it. Inject AdSense after hydration.

**Source**

- `src/root.tsx:178-243`
- `src/root.tsx:191`

### V2. Late web-font swap reflows headings and text. Severity: Medium

**Evidence**

- With `font-display: swap`, the 205-228 KB Alegreya and Source Sans WOFF files arrive late. The swap re-lays-out text:
  - Guide CLS is 0.022-0.045 with fonts and 0.0004 with fonts blocked.
  - On desktop home, the "No sets in your build" paragraph repaints larger as late as 3-9 s.
- On slow connections the fallback serif is visible while Alegreya loads.

**Recommendation**

Subset to WOFF2, preload Alegreya, and add fallback `@font-face` rules with `size-adjust`, `ascent-override` and `descent-override`.

**Source**

- `src/ui/design-v04.css:1-4`
- `src/root.tsx:225`

### V3. Tap targets below 44-48 px; breadcrumb links below 24 px. Severity: Medium

**Evidence (375 px viewport)**

| Page | Visible interactive elements | Smaller than 44 px in at least one dimension |
|---|---|---|
| Home | 76 | 35 |
| Class | 60 | 40 |
| Set | 9 | 7 |

- **Home header and toolbar:**
  - Sign in: 38x40
  - Menu: 40x40
  - Undo, Redo, The Forger, Compare, Publish, Share: 38-42 x 40
  - Section tabs: 36 px tall
- **Under WCAG 2.2's 24 px minimum (SC 2.5.8):**
  - Breadcrumb links "Dofus Forge" and "Dofus 3 Sets": 55x17 and 56x17, on the class and set pages
  - The footer "Sets" link: 23x32
- **Class page lists:** set rows are 34 px tall and TOC rows 36 px, with no spacing between them.

**Recommendation**

1. Raise header and toolbar icon buttons to 44x44 or larger. The Lighthouse/Google guidance is 48 px.
2. Pad breadcrumb and footer links to at least 24 px tall, with `padding-block` or `min-height`.
3. Make list rows 40-44 px tall.

**Source**

- `src/components/SiteHeader.tsx:66-78`
- `src/features/workshop/WorkshopBar.tsx`
- The breadcrumb component used by the class and set pages
- `src/components/SiteFooter.tsx`

### V4. Small text on mobile. Severity: Medium

**Evidence**

- On the class page, 89 of 207 visible leaf text nodes are under 12 px at 375 px wide. Examples are the "Level 200" range labels, the level numbers next to sets and the `MAIN` badge.
- The set page has 24 of 163 under 12 px; home has 4 of 69.
- Base body size is 16 px, so this is limited to secondary data, but much of the class page's useful content is in those tables.

**Recommendation**

Raise the table metadata to at least 12 px on small screens, and 13-14 px for the level numbers.

**Source**

- The class page builds-by-element table: `src/features/reading/reading.css` and the class page module
- The set rows in `src/features/equipment/sets.css`

### V5. Mobile workshop toolbar is icon-only, and the section tabs are cut off with no scroll hint. Severity: Low

**Evidence**

- On mobile, The Forger, Compare, Publish and Share are unlabelled icons. Desktop shows labels for them.
- The section tab strip ends mid-word ("Spells and wea…") with no fade or arrow to suggest it scrolls.
- The fixed bottom tab bar repeats some of these actions: Forge, Compare, Publish.

**Recommendation**

1. Remove the duplicate toolbar icons on mobile, or give them short labels.
2. Add an edge fade mask on the scrolling tab strip.

**Source**

`src/features/workshop/WorkshopBar.tsx` and the workshop tab strip.

### V6. Class page on mobile: "On this page" and the class switcher push content down. Severity: Low

**Evidence**

The collapsed "On this page" box (114 px) and the 4-row class portrait grid (about 400 px) sit between the CTA and the first H2. The first content table starts below the fold, at about 760 px of 812.

**Recommendation**

On mobile, make the class switcher one horizontally scrolling row, or move it below the main content. Put the TOC in a compact inline `<details>`.

**Source**

The class page route module in `src/pages/` and `src/features/reading/Reading.tsx`.

### V7. Duplicate skip link, one of them hard-coded in English. Severity: Low

**Evidence**

The prerendered HTML has two `.skip-link` anchors:

- `src/root.tsx:229` hard-codes "Skip to main content"
- `src/components/SiteHeader.tsx:45` uses `t('skip_to_main')`

Keyboard users tab through both. On /es, /fr and /pt the first one is still English.

**Recommendation**

Remove the one in `root.tsx`.

**Source**

- `src/root.tsx:229`
- `src/components/SiteHeader.tsx:45`

### V8. Images: oversized icons and missing dimensions; above-the-fold portraits lazy-loaded. Severity: Low

**Evidence**

- Item icons are 128 px PNGs drawn at 22 px on class pages and 42 px on set pages. Stat icons are 64 px drawn at 20 px.
- Width and height attributes are missing from 157 of 158 images on the class page.
- On home, 14 of the class portraits visible above the fold on mobile have `loading="lazy"`. They are not the LCP element, so the cost is small.

**Recommendation**

- Serve icons at their display size, at 2x DPR.
- Add width and height.
- Use `loading="eager"` for the first row of class portraits.

**Source**

See P6 in `performance.md`.

## Mobile usability summary

| Check | Result |
|---|---|
| Viewport meta | Pass. `width=device-width, initial-scale=1.0, minimum-scale=1.0, viewport-fit=cover`; zoom is not disabled. |
| Horizontal scroll | Pass on home, class and set (`scrollWidth` 375 = viewport). |
| Base font size | Pass: 16 px. Secondary text is small; see V4. |
| Navigation | Pass. Hamburger menu, plus a bottom tab bar on the workshop. |
| Tap targets | Needs work; see V3. |
| Layout stability | Fails on desktop because of hydration and AdSense (V1). Mobile is stable on home, class and set (CLS ≤0.002); /es mobile measured 0.32 once. |
| Overlapping elements or text overflow | None detected. |

## What works

- Each page has one clear H1 above the fold, and the primary action (class picker / "Build a Feca") is visible without scrolling on every viewport tested.
- The dark theme is consistent, with readable contrast in body copy. The real game art (class portraits, item icons) fits the brand without decorative filler.
- No horizontal overflow at 375 px. The responsive layout switches cleanly between the two-column desktop workshop and the single-column mobile flow with a bottom tab bar.
- The prerendered HTML carries the real content: H1, intro and tables are visible with JavaScript disabled.
