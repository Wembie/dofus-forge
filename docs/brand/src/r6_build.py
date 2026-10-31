"""Round 6 — Ornament & Tiers: flourished wordmark, retro wooden plaque, membership tier badges.

usage: python r6_build.py <out-dir>
"""
import os, sys
import r2_build as b
import r2_board as rb

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(b.HERE, "..", "rounds", "r6-ornament-tiers")
os.makedirs(OUT, exist_ok=True)
b.OUT = OUT
fmt = b.fmt

# ── Flourish: one scroll arm (drawn to the left of the origin), mirrored for the right ──
ARM = ("M-30 0 C-84 0 -124 -6 -164 -22 C-196 -34 -222 -22 -222 0 C-222 18 -202 26 -190 16 "
       "C-180 8 -186 -4 -196 -2")
ARM_LOW = "M-44 8 C-86 12 -112 22 -132 38 C-146 50 -164 46 -164 34 C-164 26 -154 22 -148 28"
LEAF = "M0 0 C8 -10 26 -12 38 -4 C26 4 8 6 0 0 Z"


def stroke2(d, w, extra=""):
    """Ankama-style inked stroke: dark wide stroke under a gold one."""
    return (f'<path d="{d}" fill="none" stroke="{b.OUTLINE}" stroke-width="{w + 7}" stroke-linecap="round" {extra}/>'
            f'<path d="{d}" fill="none" stroke="url(#goldText)" stroke-width="{w}" stroke-linecap="round" {extra}/>')


def flourish(cx, cy, scale=1.0):
    arm = (stroke2(ARM, 7) + stroke2(ARM_LOW, 4)
           + f'<path d="{LEAF}" transform="translate(-104 -10) rotate(200)" fill="url(#goldText)" stroke="{b.OUTLINE}" stroke-width="3.5"/>'
           + f'<path d="{LEAF}" transform="translate(-92 20) rotate(150) scale(.8)" fill="url(#goldText)" stroke="{b.OUTLINE}" stroke-width="3.5"/>')
    gem = (f'<path d="M0 -22 L16 0 L0 22 L-16 0 Z" fill="{b.GOLD}" stroke="{b.OUTLINE}" stroke-width="5" stroke-linejoin="round"/>'
           f'<path d="M0 -22 L16 0 L0 0 Z" fill="{b.GOLD_B}"/><path d="M0 0 L-16 0 L0 22 Z" fill="{b.GOLD_D}"/>')
    return (f'<g transform="translate({fmt(cx)} {fmt(cy)}) scale({fmt(scale)})">'
            f'<g>{arm}</g><g transform="scale(-1 1)">{arm}</g>{gem}</g>')


def flourished_wordmark():
    """A — stacked DOFUS / FORGE with a scroll divider between, Ankama title style."""
    d1, w1 = b.wordmark("DOFUS", b.WM_FONT, 64, 0.16, x0=0, base=0)
    d2, w2 = b.wordmark("FORGE", b.WM_FONT, 128, 0.04, x0=0, base=0)
    W = 760
    return (f'<g transform="translate({fmt((W - w1) / 2)} 112)">{b.game_text(d1, stroke=9, shadow=5)}</g>'
            + flourish(W / 2, 168, 1.15)
            + f'<g transform="translate({fmt((W - w2) / 2)} 350)">{b.game_text(d2, stroke=12, shadow=7)}</g>'), W, 400


# ── B — retro wooden plaque (Dofus 2 nostalgia palette) ────────────────────
WOOD_D, WOOD, WOOD_L = "#4a2e17", "#6e4524", "#8f5d31"
PARCH, PARCH_D, INKBROWN = "#ead9ad", "#c9b17a", "#3a2412"


def plaque():
    W, H = 1000, 380
    grain = "".join(f'<path d="M30 {y} C300 {y - 10} 640 {y + 12} 970 {y - 4}" fill="none" stroke="{WOOD_D}" stroke-width="3" opacity=".45"/>'
                    for y in range(56, 340, 34))
    rivets = "".join(f'<circle cx="{x}" cy="{y}" r="10" fill="{b.GOLD}" stroke="{b.OUTLINE}" stroke-width="4"/>'
                     f'<circle cx="{x - 3}" cy="{y - 3}" r="3.5" fill="#fff3c4"/>'
                     for x, y in ((52, 52), (948, 52), (52, 328), (948, 328)))
    d, w = b.wordmark("DOFUS FORGE", b.WM_FONT, 50, 0.05, x0=0, base=0)
    sym = rb.nest(b.hero_symbol(halo=False, uid="r6p"), "0 60 480 452", 96, 92, 196)
    return (f'<rect x="10" y="14" width="980" height="356" rx="34" fill="{b.OUTLINE}"/>'
            f'<rect x="10" y="10" width="980" height="352" rx="34" fill="{WOOD}" stroke="{b.OUTLINE}" stroke-width="8"/>'
            f'<rect x="22" y="22" width="956" height="110" rx="26" fill="{WOOD_L}" opacity=".45"/>'
            + grain + rivets
            + f'<rect x="300" y="96" width="636" height="188" rx="20" fill="{PARCH}" stroke="{b.OUTLINE}" stroke-width="7"/>'
            f'<rect x="312" y="108" width="612" height="164" rx="14" fill="none" stroke="{PARCH_D}" stroke-width="3"/>'
            f'<circle cx="194" cy="190" r="118" fill="{WOOD_D}" stroke="{b.OUTLINE}" stroke-width="7"/>'
            f'<circle cx="194" cy="190" r="104" fill="url(#plaqueWell)"/>'
            + sym
            + f'<g transform="translate({fmt(618 - w / 2)} 215)"><path d="{d}" fill="{INKBROWN}"/></g>'), W, 380


# ── C — membership tier badges (MEMBERSHIP_DESIGN.md ladder) ──────────────
SHIELD = "M128 14 L226 42 L226 120 C226 182 184 224 128 246 C72 224 30 182 30 120 L30 42 Z"
SHIELD_IN = "M128 34 L208 57 L208 120 C208 172 174 207 128 226 C82 207 48 172 48 120 L48 57 Z"
SHIELD_LIT = "M128 34 L128 226 C82 207 48 172 48 120 L48 57 Z"
TIERS = [  # name, rim (dark, mid, light), field, ornaments
    ("Apprentice", ("#3c424d", "#7a828f", "#b7bec9"), "#20252f", 0),
    ("Artisan", ("#5a3216", "#b0703a", "#e3a56c"), "#2a1c14", 1),
    ("Forger", ("#4d5562", "#c3cad4", "#f2f5f8"), "#1c2130", 2),
    ("Master of the Forge", (b.GOLD_D, b.GOLD, b.GOLD_B), "#2a1a10", 3),
]


def tier_badge(i, uid):
    name, (rd, rm, rl), field, level = TIERS[i]
    g = [f'<path d="{SHIELD}" fill="{rm}" stroke="{b.OUTLINE}" stroke-width="9" stroke-linejoin="round"/>',
         f'<path d="M128 14 L128 246 C72 224 30 182 30 120 L30 42 Z" fill="{rl}" opacity=".55"/>',
         f'<path d="{SHIELD_IN}" fill="{field}" stroke="{rd}" stroke-width="5" stroke-linejoin="round"/>',
         f'<path d="{SHIELD_LIT}" fill="#fff" opacity=".04"/>']
    if level >= 3:  # laurel wings behind the shield top
        for sx in (1, -1):
            g.insert(0, f'<g transform="translate(128 0) scale({sx} 1)">'
                        + f'<path d="M96 52 C126 104 146 156 150 222" fill="none" stroke="{b.OUTLINE}" stroke-width="11" stroke-linecap="round"/>'
                        + f'<path d="M96 52 C126 104 146 156 150 222" fill="none" stroke="{b.GOLD_D}" stroke-width="5" stroke-linecap="round"/>'
                        + "".join(f'<path d="{LEAF}" transform="translate({100 + k * 10} {70 + k * 34}) rotate({-60 + k * 22}) scale(1.6)" '
                                  f'fill="{b.GOLD}" stroke="{b.OUTLINE}" stroke-width="3"/>' for k in range(5)) + "</g>")
    # anvil (all tiers), metal-tinted
    g.append(f'<g transform="translate(128 {150 if level >= 2 else 138}) scale(.3) translate(-239 -398)">'
             f'<path d="{b.ANVIL}" fill="{rl if level < 3 else "url(#goldText)"}" stroke="{b.OUTLINE}" stroke-width="22" stroke-linejoin="round"/></g>')
    if level >= 2:  # a Dofus on the anvil
        tones = b.EGG_TONES["ocre"] if level == 3 else ("#8f97a6", "#c3cad4", "#eef1f5", "#4d5562", "#3c424d", "#0b0e13")
        g.append(b.dofus(132, 70, 128, 22, tones, f"t{uid}", tilt=7, outline_w=4, bands=level == 3))
    if level >= 1:  # sparks
        for x, y, r in ((186, 86, 7), (70, 98, 5), (176, 128, 4))[:level + 1]:
            g.append(f'<path d="M{x} {y - r * 1.7} L{x + r} {y} L{x} {y + r * 1.7} L{x - r} {y} Z" fill="{b.GOLD_B}" stroke="{b.OUTLINE}" stroke-width="2"/>')
    if level >= 3:  # crown gem
        g.append(f'<path d="M128 -8 L146 18 L128 44 L110 18 Z" fill="{b.FIRE}" stroke="{b.OUTLINE}" stroke-width="5" stroke-linejoin="round"/>'
                 f'<path d="M128 -8 L146 18 L128 18 Z" fill="#f7a07a"/>')
    return "".join(g)


def supporter_badge():
    """One-off Supporter gift: a faceted ◆ gem on a round gold mount."""
    return (f'<circle cx="128" cy="128" r="100" fill="{b.GOLD}" stroke="{b.OUTLINE}" stroke-width="9"/>'
            f'<circle cx="128" cy="128" r="82" fill="#241631" stroke="{b.GOLD_D}" stroke-width="5"/>'
            f'<path d="M128 56 L176 128 L128 200 L80 128 Z" fill="#a06fd0" stroke="{b.OUTLINE}" stroke-width="7" stroke-linejoin="round"/>'
            f'<path d="M128 56 L176 128 L128 128 Z" fill="#d2b0f0"/><path d="M128 128 L80 128 L128 200 Z" fill="#6a3f94"/>'
            f'<circle cx="112" cy="104" r="7" fill="#fff"/>')


EXTRA_DEFS = f"""<defs>
  <radialGradient id="plaqueWell" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#3a2216"/><stop offset="1" stop-color="{b.VOID}"/></radialGradient>
</defs>"""
b.DEFS = b.DEFS + EXTRA_DEFS


def board():
    W, H = 1800, 1660
    t, _ = b.wordmark("ORNAMENT & TIERS", b.WM_FONT, 58, 0.04, x0=60, base=150)
    wm, ww, wh = flourished_wordmark()
    pl, pw, ph = plaque()
    master = tier_badge(3, "bm")
    p = [f'<rect width="{W}" height="{H}" fill="{b.VOID}"/>', f'<rect width="{W}" height="{H}" fill="url(#topGlow)"/>',
         rb.text(62, 64, "DOFUS FORGE · VISUAL IDENTITY · ROUND 6", 15, b.GOLD, 700, ls=3),
         b.game_text(t, stroke=8, shadow=4),
         rb.text(62, 200, "The Ankama title language — scrolls, leaves, inked gold — plus a retro mood and the membership ladder in forged metals.", 20, b.INK, op=.75)]
    blazon = b.blazon()
    p.append(rb.card(60, 260, "A", "Flourished Wordmark", "Wordmark · primary title",
                     ["Stacked DOFUS / FORGE with an Ankama", "scroll divider and a faceted ◆ heart.", "Hero title for home, OG and splash."],
                     wm, f"-20 {-(ww + 40 - wh) / 2} {ww + 40} {ww + 40}", blazon, "0 0 512 512", rec=True))
    p.append(rb.card(630, 260, "B", "The Retro Plaque", "Theme · Dofus 2 nostalgia",
                     ["Wooden plaque, brass rivets and a", "parchment inset in Dofus 2 tones.", "Alternate theme, events, throwbacks."],
                     pl, f"0 {-(pw - ph) / 2} {pw} {pw}", b.hero_symbol(halo=False, uid="r6s"), "0 60 480 452"))
    p.append(rb.card(1200, 260, "C", "Forge Tiers", "Badge system · membership",
                     ["Iron, bronze, silver and gold shields:", "each tier forges one step further,", "up to the glowing Master Dofus."],
                     master, "-60 -40 376 376", master, "-60 -40 376 376"))
    # tier strip
    y0 = 1200
    p.append(f'<rect x="60" y="{y0}" width="1680" height="400" rx="16" fill="{b.PANEL}" stroke="{b.EDGE}"/>')
    p.append(rb.text(96, y0 + 50, "MEMBERSHIP LADDER — docs/MEMBERSHIP_DESIGN.md", 14, b.GOLD, 700, ls=2.5))
    badges = [("Supporter", "one-off gift", supporter_badge(), "0 0 256 256")] + [
        (TIERS[i][0], ["US$3/mo", "US$6/mo", "US$10/mo", "US$18/mo"][i], tier_badge(i, f"s{i}"), "-60 -40 376 376") for i in range(4)]
    for k, (name, sub, art, vb) in enumerate(badges):
        cx = 228 + k * 336
        p.append(rb.nest(art, vb, cx - 110, y0 + 76, 220))
        p.append(rb.text(cx, y0 + 330, name.upper(), 15, b.GOLD_B, 700, "middle", ls=2))
        p.append(rb.text(cx, y0 + 356, sub, 13, b.INK, anchor="middle", op=.5))
    p.append(rb.text(62, H - 26, "Proposal: A becomes the hero title of the system; B is an optional seasonal theme; C ships with memberships.", 18, b.GOLD_B, 600))
    defs = f"""<defs>
  <radialGradient id="topGlow" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="{b.GOLD}" stop-opacity=".10"/><stop offset="1" stop-color="{b.GOLD}" stop-opacity="0"/></radialGradient>
  <radialGradient id="cardGlow" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#2a2018"/><stop offset="1" stop-color="{b.PANEL}"/></radialGradient>
  <linearGradient id="hdr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{b.STONE}"/><stop offset="1" stop-color="{b.VOID}"/></linearGradient>
</defs>"""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{b.DEFS}{defs}{"".join(p)}</svg>'


if __name__ == "__main__":
    wm, ww, wh = flourished_wordmark()
    b.write("a-flourished-wordmark.svg", b.svg(wm, ww, wh, "Dofus Forge — flourished wordmark", bg=b.VOID))
    pl, pw, ph = plaque()
    b.write("b-retro-plaque.svg", b.svg(pl, pw, ph, "Dofus Forge — retro plaque", bg=b.VOID))
    for i, (name, *_r) in enumerate(TIERS):
        b.write(f"c-tier-{name.lower().replace(' ', '-')}.svg", b.svg(tier_badge(i, f"f{i}"), 256, 256, f"Dofus Forge — {name}", vb="-60 -40 376 376"))
    b.write("c-tier-supporter.svg", b.svg(supporter_badge(), 256, 256, "Dofus Forge — Supporter"))
    b.write("board.svg", board())
    print("ok", OUT)
