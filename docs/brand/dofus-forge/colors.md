# Dofus Forge — Colour

The brand palette is the product palette. Every value below is a CSS custom property in `src/index.css`
(docs/DESIGN.md §2), so the logo, the site and the social cards are literally the same colours.

## Brand colours

| Role | Token | HEX | Use |
|---|---|---|---|
| **Primary — Forge Gold** | `--gold` | `#c9a24b` | The brand colour. Wordmark, headings, the mark's body plate, active borders, primary CTAs |
| Lit gold | `--gold-bright` | `#eccb78` | The mark's lit plate, highlights, hover, number emphasis |
| Shade gold | `--gold-deep` | `#7f6428` | The mark's shade plate (the crucible), borders and rules. Not for text on dark (2.9 : 1) |
| Molten | — | `#fff1c9` | Only the ◆ core and the spark of the mark. Never a UI colour |
| **Secondary — Void** | `--surface-void` | `#0a0d13` | The page. The mark's seams are this colour because they are empty: the mark is transparent there |

The three golds are **flat facets, not a gradient**. Light comes from the upper left: lit plate left, body plate
right, shade plate below. That rule is the same one `src/ui/slotIcons.ts` uses for the equipment slot icons
(`lit` facets over a `base` silhouette), so every icon on the site is cut from the same metal.

## Surfaces

| Token | HEX | Use |
|---|---|---|
| `--surface-void` | `#0a0d13` | Page background, maskable icon |
| `--surface-stone` | `#11151e` | Header, app-icon tile, OG slot disc |
| `--surface-panel` | `#171c28` | Cards, panels |
| `--surface-parchment` | `#1c2130` | Raised cards |
| `--surface-raised` | `#212636` | Inputs, chips |

## Text

| Token | HEX | Contrast on void | Use |
|---|---|---|---|
| `--ink` | `#e9e5da` | 15.5 : 1 | Body text |
| `--ink-muted` | `#9aa0b0` | 7.4 : 1 | Secondary text |
| `--ink-faint` | `#848ea5` | 5.6 : 1 | Labels, metadata (AA up to `--surface-raised`) |
| `--gold` | `#c9a24b` | 8.3 : 1 | Headings, wordmark |
| `--gold-muted` | `#a6864a` | — | Gold text on light surfaces (4.5 : 1 on parchment) |

## Borders

| Token | HEX | Use |
|---|---|---|
| `--metal-edge` | `#2b3446` | Default border |
| `--metal-edge-strong` | `#3a465e` | Hover / emphasised border |
| `--gold-deep` | `#7f6428` | Active / brand border, the app-icon hairline |

## Semantic

| Token | HEX | Meaning |
|---|---|---|
| `--positive` | `#5fae54` | Success, bonus, "updated" pill |
| `--negative` | `#e0604f` | Error, malus |
| `--warning` | `#d9a441` | Caution |
| `--info` | `#4d8fd0` | Information |

## Element colours (game semantics only)

| Element | Token | HEX |
|---|---|---|
| Earth | `--earth` | `#c98a2b` |
| Fire | `--fire` | `#e65f40` |
| Water | `--water` | `#2f93d8` |
| Air | `--air` | `#74b93f` |
| Neutral | `--neutral` | `#b9b3a6` |

These are the game's language, not decoration (DESIGN.md principle 2). The brand never uses them for mood,
and the mark never carries them: a Dofus in element colours would claim an element.

## Light theme

`[data-theme="light"]` darkens the golds so they pass on paper: `--gold #7d5400`, `--gold-bright #a87000`,
`--gold-deep #5a3a00`. The light mark (`mark-light.svg`) uses exactly those three, with `#c9a24b` as the molten
core. Wordmark on light: `#7d5400`.

## Rules

- Gold on void is the identity. One gold per surface for text; the three-tone facet is reserved for the mark and
  the slot icons.
- No gradients, glows or drop shadows on the logo. Glow is allowed in the UI (`--glow-gold`) around interactive
  slots, never on the mark itself.
- Backgrounds for the mark: void, stone, panel, white, paper (`#f3efe4`). Never on a photo without the tile.
- Minimum contrast for text: 4.5 : 1 (AA). `--gold-deep` is borders only.
