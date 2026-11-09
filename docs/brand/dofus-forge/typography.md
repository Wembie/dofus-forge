# Dofus Forge — Typography

Three families, all open licences, all already loaded by the site (`src/root.tsx` FONTS_URL, `tailwind.config.ts`).

| Role | Family | Weights | Tailwind | Where |
|---|---|---|---|---|
| **Display / logo** | Cinzel | 700 (logo), 400–900 | `font-display` | Wordmark, page titles, section headers, the OG headline |
| **Headings** | Cinzel | 700 | `font-display` | H1–H3, in small caps with 0.1–0.2 em tracking |
| **Body / UI** | Inter | 300–600 | `font-body` (default) | Paragraphs, labels, buttons, navigation |
| **Numbers / data** | JetBrains Mono | 400, 500, 700 | `font-mono` | Every stat, damage value, level, count, version |

Licences: Cinzel — SIL OFL 1.1 (`docs/brand/src/fonts/OFL-Cinzel.txt`), logo use allowed. Inter — SIL OFL 1.1.
JetBrains Mono — SIL OFL 1.1.

## The wordmark

`DOFUS FORGE` is set from the **Cinzel 700 outlines** (`docs/brand/src/fonts/Cinzel-700.ttf`), as paths, never as
live text. Construction (`build.py` → `wordmark()`):

- Cap height 100 units; lowercase letters use Cinzel's small caps, so the word reads `Dᴏꜰᴜs Fᴏʀɢᴇ` — the same
  treatment as every title on the site.
- Tracking 0.05 em. Optical kerning on top of the font's advances: `F·o −0.06 em`, `D·o −0.015 em`,
  `r·g −0.01 em`.
- **The Dofus in the O.** Both small-cap o's are redrawn as a Dofus (`egg_o()`): same height, same stroke contrast
  as Cinzel's o (153 units at the sides, 39 at top and bottom), 6 % narrower, widest below the middle and
  slightly pointed at the crown. It is subtle on purpose: the wordmark stays a Cinzel wordmark at a glance and
  becomes ours on the second look.
- Colour: `--gold` on dark, `#7d5400` on light, white or black in one-colour uses. Never a gradient.

Files: `svg/wordmark.svg`, `wordmark-light.svg`, `wordmark-white.svg`, `png/wordmark-1200.png`.

## Lockups

| Lockup | Rule | File |
|---|---|---|
| Horizontal | Mark height 256 → wordmark cap height 118 (46 %), gap 44, baseline on the mark's optical centre | `lockup-horizontal*.svg` |
| Stacked | Mark 420 wide, wordmark cap 78 below it with a gap of 46 | `lockup-stacked*.svg` |
| Symbol only | Anywhere the name is already present: header (next to live text), favicon, avatars, export card | `mark*.svg`, `favicon.svg` |
| Wordmark only | Text-only contexts (footers, legal, captions) | `wordmark*.svg` |

**Clear space:** the width of the ◆ core (1/8 of the mark's height) on every side.
**Minimum sizes:** symbol 16 px (use `favicon.svg`, the ≤ 48 px cut), horizontal lockup 120 px wide, stacked 72 px wide.

## In the UI

- Page titles: Cinzel 700, uppercase or small caps, `letter-spacing: .12–.2em`, `--gold`.
- Section labels: Inter 600–700, 11–12 px, uppercase, `letter-spacing: .1em`, `--ink-muted` (the
  "CHARACTERISTICS" / "ELEMENTS" labels).
- Data: JetBrains Mono, tabular; big numbers 28–34 px bold in `--gold-bright`, labels 11–13 px below in
  `--ink-muted` (DESIGN.md principle 3: big data, small labels).
- Body: Inter 400, 14–16 px, `--ink`; secondary `--ink-muted`.
- The header: the 34 px `icon.svg` next to the live text `DOFUS FORGE` in Cinzel 700 at 0.82 rem, 0.2 em tracking,
  `--gold`. Live text, not the wordmark image: it paints with the fallback font immediately (LCP) and follows the
  theme.
