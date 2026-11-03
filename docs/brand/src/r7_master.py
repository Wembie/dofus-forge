"""Round 7 — The Forge System: master logo that fuses every round, lockups, and the identity boards.

usage: python r7_master.py <out-dir>
"""
import os, sys, math
import r2_build as b
import r2_board as rb
import r3_build as r3   # before r4: both define #molten and the radial one is the one used here
import r4_build as r4
import r5_build as r5
import r6_build as r6
import r7_icons as ic

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(b.HERE, "..", "rounds", "r7-forge-system")
os.makedirs(OUT, exist_ok=True)
b.OUT = OUT
fmt, O = b.fmt, b.OUTLINE
text, nest = rb.text, rb.nest

CX, CY, R = 320, 352, 214  # master hex socket
CROWN_GLYPH = "M0 -36 L24 0 L0 36 L-24 0 Z M0 -14 L0 14"
ELEMENT_GEMS = [(300, "strength", b.EARTH), (60, "agility", b.AIR), (120, "chance", b.WATER), (240, "intelligence", b.FIRE)]


def hexagon(r, cx=CX, cy=CY):
    return ic.hexagon(r, cx, cy)


def vertex(a, r=R - 6):
    return CX + r * math.sin(math.radians(a)), CY - r * math.cos(math.radians(a))


def master(uid="m", halo=True, wings=True):
    """The Forge Crest: dragon wings rise behind a smithmagic hex socket that holds the Dofus on the anvil;
    the four elemental runes are set in its corners and the DF rune crowns it."""
    p = []
    if halo:
        p.append(f'<circle cx="{CX}" cy="{CY - 20}" r="300" fill="url(#masterHalo)"/>')
    if wings:
        p.append(f'<g transform="translate({CX} 326) scale(1.16) translate(-262 -262)">{r4.wings_pair(uid=uid + "w")}</g>')
    p.append(f'<path d="{hexagon(R + 8)}" fill="{O}"/>'
             f'<path d="{hexagon(R)}" fill="url(#ringGold)"/>'
             f'<path d="M{CX} {CY - R} L{fmt(CX + R * .866)} {CY - R / 2} L{CX} {CY} Z" fill="#fff6d8" opacity=".22"/>'
             f'<path d="{hexagon(R - 26)}" fill="{O}"/>'
             f'<path d="{hexagon(R - 32)}" fill="url(#masterWell)"/>'
             f'<path d="{hexagon(R - 32)}" fill="url(#scales)" opacity=".35"/>')
    # inner bevel line
    p.append(f'<path d="{hexagon(R - 14)}" fill="none" stroke="{b.GOLD_D}" stroke-width="3" opacity=".8"/>')
    p.append(f'<g transform="translate({CX} {CY + 12}) scale(.6) translate(-239 -290)">{b.hero_symbol(halo=False, uid=uid + "h")}</g>')
    for a, key, col in ELEMENT_GEMS:
        x, y = vertex(a)
        p.append(r3.rune_stone(x, y, 70, col, f"{uid}{key}", r3.GLYPHS[key], outline=6))
    x, y = vertex(180, R - 2)
    p.append(f'<path transform="translate({fmt(x)} {fmt(y)})" d="M0 -22 L15 0 L0 22 L-15 0 Z" fill="{b.GOLD}" stroke="{O}" stroke-width="5" stroke-linejoin="round"/>'
             f'<path transform="translate({fmt(x)} {fmt(y)})" d="M0 -22 L15 0 L0 0 Z" fill="{b.GOLD_B}"/>')
    x, y = vertex(0, R - 4)
    p.append(r3.rune_stone(x, y, 96, "#4a5a7c", uid + "df", CROWN_GLYPH, glow="molten", outline=7, glyph_scale=.7))
    return "".join(p)


def compact(uid="c"):
    """App icon / favicon: the hex socket and the Dofus on the anvil (no wings, no corner runes)."""
    return (f'<path d="{ic.hexagon(124)}" fill="{O}"/><path d="{ic.hexagon(118)}" fill="url(#ringGold)"/>'
            f'<path d="M128 10 L230 69 L128 128 Z" fill="#fff6d8" opacity=".22"/>'
            f'<path d="{ic.hexagon(98)}" fill="{O}"/><path d="{ic.hexagon(92)}" fill="url(#masterWell)"/>'
            f'<g transform="translate(128 134) scale(.36) translate(-239 -290)">{b.hero_symbol(halo=False, uid=uid)}</g>')


def favicon16():
    """16–32 px cut: fat gold hex, oversized Dofus, a single anvil bar."""
    return (f'<path d="{ic.hexagon(126)}" fill="{O}"/><path d="{ic.hexagon(114)}" fill="{b.GOLD}"/>'
            f'<path d="{ic.hexagon(84)}" fill="{O}"/><path d="{ic.hexagon(76)}" fill="#241a14"/>'
            f'<path d="M60 172 L196 172 L196 196 L60 196 Z" fill="{b.EDGE_S}" stroke="{O}" stroke-width="10" stroke-linejoin="round"/>'
            + b.dofus(128, 54, 176, 54, b.EGG_TONES["ocre"], "fav", outline_w=12, bands=False))


def hero_lockup(uid="hl"):
    """Master crest above the flourished stacked wordmark."""
    wm, ww, wh = r6.flourished_wordmark()
    return (f'<g transform="translate(70 0)">{master(uid)}</g>'
            f'<g transform="translate({fmt(390 - ww * .52)} 600) scale(1.04)">{wm}</g>'), 780, 1020


def horizontal_lockup(uid="hz", flat=False):
    d, w = b.wordmark("DOFUS FORGE", b.WM_FONT, 74, 0.05, x0=300, base=168)
    text_art = f'<path d="{d}" fill="{b.GOLD_B}"/>' if flat else b.game_text(d, stroke=10, shadow=5)
    return nest(compact(uid), "0 0 256 256", 10, 0, 256) + text_art, int(300 + w + 30), 256


def swatch(x, y, hexv, name, token, w=150, ink=b.INK):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="96" rx="12" fill="{hexv}" stroke="{b.EDGE}"/>'
            + text(x + 4, y + 122, name, 15, b.INK, 700)
            + text(x + 4, y + 142, f"{hexv}  {token}", 12, b.INK, op=.55))


def section(x, y, label):
    return text(x, y, label, 14, b.GOLD, 700, ls=2.6)


# ── Board 1: the master logo ───────────────────────────────────────────────
def board_master():
    W, H = 1800, 1500
    t, _ = b.wordmark("THE FORGE CREST", b.WM_FONT, 58, 0.04, x0=60, base=150)
    hl, hw, hh = hero_lockup("b1")
    hz, zw, zh = horizontal_lockup("b1z")
    p = [f'<rect width="{W}" height="{H}" fill="{b.VOID}"/>', f'<rect width="{W}" height="{H}" fill="url(#topGlow)"/>',
         text(62, 64, "DOFUS FORGE · VISUAL IDENTITY · ROUND 7 · MASTER LOGO", 15, b.GOLD, 700, ls=3),
         b.game_text(t, stroke=8, shadow=4),
         text(62, 200, "One crest that carries the whole site: every part of it is a feature you use.", 20, b.INK, op=.75),
         f'<rect x="60" y="240" width="860" height="1200" rx="18" fill="{b.PANEL}" stroke="{b.GOLD}" stroke-width="2"/>',
         f'<rect x="61" y="241" width="858" height="1198" rx="17" fill="url(#cardGlow)"/>',
         nest(hl, f"0 0 {hw} {hh}", 100, 270, 780, 1020 * 780 / 780)]
    parts = [  # anatomy callouts
        ("RUNE CROWN", "Magesmithy — a molten ◆ rune, the header diamond (R3)"),
        ("DRAGON WINGS", "Dofus lore — every Dofus is a dragon egg (R4)"),
        ("HEX RUNE SOCKET", "The shared container of every icon and stat rune (R3·R7)"),
        ("THE DOFUS ON THE ANVIL", "Builder — your build is forged here (R2)"),
        ("FOUR ELEMENT RUNES", "Strength · Agility · Chance · Intelligence (DESIGN §2.4)"),
        ("◆ SPARKS + SCALES", "The header diamond and the dragon-scale motif (R2·R4)"),
        ("FLOURISHED WORDMARK", "Ankama title language, Cinzel Decorative Black (R6)"),
    ]
    x0, y0 = 980, 250
    p.append(section(x0, y0, "ANATOMY"))
    for i, (k, v) in enumerate(parts):
        yy = y0 + 40 + i * 66
        p.append(f'<path transform="translate({x0 + 10} {yy + 10})" d="M0 -10 L7 0 L0 10 L-7 0 Z" fill="{b.GOLD}"/>')
        p.append(text(x0 + 32, yy + 6, k, 16, b.GOLD_B, 700, ls=1.5))
        p.append(text(x0 + 32, yy + 32, v, 16, b.INK, op=.75))
    y1 = 760
    p.append(section(x0, y1, "HORIZONTAL LOCKUP"))
    p.append(f'<rect x="{x0}" y="{y1 + 20}" width="760" height="200" rx="14" fill="{b.STONE}" stroke="{b.EDGE}"/>')
    p.append(nest(hz, f"0 0 {zw} {zh}", x0 + 30, y1 + 52, 700, 700 * zh / zw))
    y2 = 1010
    p.append(section(x0, y2, "COMPACT ICON · 16 PX CUT"))
    p.append(f'<rect x="{x0}" y="{y2 + 20}" width="760" height="190" rx="14" fill="{b.STONE}" stroke="{b.EDGE}"/>')
    for sz, xx in ((128, 30), (64, 190), (32, 290)):
        p.append(nest(compact(f"cl{sz}"), "0 0 256 256", x0 + xx, y2 + 50 + (128 - sz) / 2, sz))
        p.append(text(x0 + xx + sz / 2, y2 + 198, f"{sz}px", 11, b.INK, anchor="middle", op=.45))
    for sz, xx in ((32, 400), (16, 470)):
        p.append(nest(favicon16(), "0 0 256 256", x0 + xx, y2 + 98, sz))
        p.append(text(x0 + xx + sz / 2, y2 + 198, f"{sz}px cut", 11, b.INK, anchor="middle", op=.45))
    p.append(f'<rect x="{x0 + 540}" y="{y2 + 62}" width="190" height="80" rx="18" fill="{b.INK}"/>')
    p.append(nest(compact("clw"), "0 0 256 256", x0 + 552, y2 + 70, 64))
    p.append(text(x0 + 626, y2 + 108, "on light", 14, b.VOID, 600))
    p.append(text(x0, H - 48, "Crest: hero, OG, splash · horizontal: headers · compact: favicon, PWA, Discord.", 17, b.GOLD_B, 600))
    return p, W, H


# ── Board 2: the system ────────────────────────────────────────────────────
PALETTE = [
    ("Void", b.VOID, "--surface-void"), ("Stone", b.STONE, "--surface-stone"), ("Panel", b.PANEL, "--surface-panel"),
    ("Metal", b.EDGE_S, "--metal-edge-strong"), ("Gold deep", b.GOLD_D, "--gold-deep"), ("Gold", b.GOLD, "--gold"),
    ("Gold bright", b.GOLD_B, "--gold-bright"), ("Ink", b.INK, "--ink"),
]
ACCENTS = [("Dofus ochre", "#e9a540", "brand egg"), ("Ember", b.FIRE, "--fire / molten"), ("Earth", b.EARTH, "--earth"),
           ("Water", b.WATER, "--water"), ("Air", b.AIR, "--air"), ("Crimson wing", "#9c2c1a", "dragon wing")]


def board_system():
    W, H = 1800, 2520
    t, _ = b.wordmark("THE FORGE SYSTEM", b.WM_FONT, 58, 0.04, x0=60, base=150)
    p = [f'<rect width="{W}" height="{H}" fill="{b.VOID}"/>', f'<rect width="{W}" height="{H}" fill="url(#topGlow)"/>',
         text(62, 64, "DOFUS FORGE · VISUAL IDENTITY · ROUND 7 · SYSTEM", 15, b.GOLD, 700, ls=3),
         b.game_text(t, stroke=8, shadow=4),
         text(62, 200, "Look like Dofus, own the forge. Palette, type, sigils, runes, crests, tiers and motifs — one language.", 20, b.INK, op=.75)]
    # palette
    p.append(section(62, 270, "PALETTE · THE VAULT (DESIGN.md §2)"))
    for i, (n, h, tok) in enumerate(PALETTE):
        p.append(swatch(62 + i * 210, 290, h, n, tok, 190))
    p.append(section(62, 500, "ACCENTS · ONLY WITH MEANING"))
    for i, (n, h, tok) in enumerate(ACCENTS):
        p.append(swatch(62 + i * 280, 520, h, n, tok, 260))
    # type
    y = 730
    p.append(section(62, y, "TYPOGRAPHY"))
    rows = [(b.WM_FONT, "Dofus Forge", 64, "Cinzel Decorative Black — logo and hero titles only"),
            ("Cinzel-700.ttf", "Characteristics · Set Bonus", 40, "Cinzel 700 — section headers, max 3–4 words"),
            (None, "Equip your first item to start forging.", 28, "Inter — UI text, labels, descriptions"),
            ("mono", "4,945   12 AP   6 MP   +450", 30, "JetBrains Mono — every number, tabular")]
    for i, (font, sample, cap, note) in enumerate(rows):
        yy = y + 40 + i * 110
        p.append(f'<rect x="62" y="{yy}" width="1676" height="96" rx="12" fill="{b.PANEL}" stroke="{b.EDGE}"/>')
        if font == "mono":
            p.append(f'<text x="92" y="{yy + 60}" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="{cap}" fill="{b.GOLD_B}">{sample}</text>')
        elif font:
            d, _ = b.wordmark(sample.upper() if font != b.WM_FONT else sample.upper(), font, cap * .72, 0.03, x0=92, base=yy + 48 + cap * .36)
            p.append(f'<path d="{d}" fill="{b.GOLD_B}"/>')
        else:
            p.append(text(92, yy + 58, sample, cap, b.INK))
        p.append(text(1700, yy + 56, note, 15, b.INK, anchor="end", op=.55))
    # sigils
    y = 1220
    p.append(section(62, y, "FEATURE SIGILS · ONE PER SITE FEATURE"))
    for i, (key, label, _a, _w) in enumerate(ic.ICONS):
        x = 62 + (i % 10) * 168
        p.append(nest(ic.icon(i), "0 0 256 256", x, y + 24, 150))
        p.append(text(x + 75, y + 196, label.upper().replace("&AMP;", "&amp;"), 12, b.GOLD_B, 700, "middle", ls=1.2))
    # stat runes
    y = 1460
    p.append(section(62, y, "STAT RUNES (R3)"))
    for i, (key, label, col) in enumerate(r3.STATS):
        x = 62 + i * 210
        p.append(nest(r3.rune_stone(60, 62, 100, col, f"sr{key}", r3.GLYPHS[key]), "0 0 120 124", x + 30, y + 24, 130, 134))
        p.append(text(x + 95, y + 184, label, 12, col, 700, "middle", ls=1.5))
    # crests + tiers
    y = 1690
    p.append(section(62, y, "ELEMENT CRESTS (R5)"))
    for i, f in enumerate(("brand", "earth", "fire", "water", "air")):
        p.append(nest(r5.shield(f, f"cr{f}"), "30 20 452 480", 62 + i * 170, y + 24, 150, 160))
    p.append(section(930, y, "MEMBERSHIP TIERS (R6)"))
    tiers = [r6.supporter_badge()] + [r6.tier_badge(i, f"tt{i}") for i in range(4)]
    for i, art in enumerate(tiers):
        vb = "0 0 256 256" if i == 0 else "-60 -40 376 376"
        p.append(nest(art, vb, 930 + i * 162, y + 24, 150, 160))
    # motifs
    y = 1930
    p.append(section(62, y, "MOTIFS · DRAGON SCALES + WING DIVIDER (R4) · SCROLL (R6)"))
    p.append(f'<rect x="62" y="{y + 24}" width="560" height="260" rx="14" fill="url(#scales)" stroke="{b.EDGE}"/>')
    p.append(f'<rect x="652" y="{y + 24}" width="1086" height="120" rx="14" fill="{b.PANEL}" stroke="{b.EDGE}"/>')
    p.append(f'<g transform="translate(652 {y + 44}) scale(.7757)">{r4.divider(1400)}</g>')
    p.append(f'<rect x="652" y="{y + 164}" width="1086" height="120" rx="14" fill="{b.PANEL}" stroke="{b.EDGE}"/>')
    p.append(r6.flourish(1195, y + 224, .9))
    p.append(text(62, H - 48, "Rule: every surface carries one forge signature — molten gold, the anvil, ◆ sparks or the void + gold palette.", 17, b.GOLD_B, 600))
    return p, W, H


# ── Board 3: applications ──────────────────────────────────────────────────
def og_card(uid="og"):
    """1200×630 social card."""
    wm, ww, wh = r6.flourished_wordmark()
    return (f'<rect width="1200" height="630" fill="{b.VOID}"/><rect width="1200" height="630" fill="url(#scales)" opacity=".5"/>'
            f'<rect width="1200" height="630" fill="url(#ogGlow)"/>'
            f'<g transform="translate(40 -10) scale(.98)">{master(uid)}</g>'
            f'<g transform="translate(640 120) scale(.72)">{wm}</g>'
            + text(914, 450, "Forge the perfect Dofus build.", 30, b.INK, 600, "middle")
            + text(914, 494, "Builder · The Forger · Magesmithy · Sets", 20, b.GOLD, 600, "middle", ls=1.5)
            + f'<rect x="784" y="530" width="260" height="46" rx="23" fill="{b.GOLD_D}" stroke="{b.GOLD}"/>'
            + text(914, 560, "dofusforge.com", 20, b.GOLD_B, 700, "middle"))


def board_apps():
    W, H = 1800, 1900
    t, _ = b.wordmark("IN THE WILD", b.WM_FONT, 58, 0.04, x0=60, base=150)
    p = [f'<rect width="{W}" height="{H}" fill="{b.VOID}"/>', f'<rect width="{W}" height="{H}" fill="url(#topGlow)"/>',
         text(62, 64, "DOFUS FORGE · VISUAL IDENTITY · ROUND 7 · APPLICATIONS", 15, b.GOLD, 700, ls=3),
         b.game_text(t, stroke=8, shadow=4),
         text(62, 200, "Where the crest lives: social card, header, browser tab, Discord, app icon, loader and empty states.", 20, b.INK, op=.75)]
    p.append(section(62, 270, "OG / SOCIAL CARD · 1200×630"))
    p.append(f'<rect x="60" y="288" width="1104" height="584" rx="16" fill="{O}" stroke="{b.EDGE}"/>')
    p.append(nest(og_card(), "0 0 1200 630", 62, 290, 1100, 577.5))
    # browser tab + header
    x = 1210
    p.append(section(x, 270, "BROWSER TAB"))
    p.append(f'<rect x="{x}" y="290" width="530" height="110" rx="14" fill="#202430"/>'
             f'<path d="M{x + 20} 400 L{x + 20} 330 Q{x + 20} 318 {x + 32} 318 L{x + 300} 318 Q{x + 312} 318 {x + 312} 330 L{x + 312} 400 Z" fill="{b.PANEL}"/>'
             + nest(favicon16(), "0 0 256 256", x + 36, 336, 24)
             + text(x + 70, 355, "Dofus Forge — Build planner", 15, b.INK)
             + f'<rect x="{x + 20}" y="400" width="490" height="0" fill="none"/>')
    p.append(section(x, 450, "DISCORD · APP ICON"))
    p.append(f'<circle cx="{x + 90}" cy="560" r="80" fill="{b.STONE}" stroke="{b.EDGE}"/>')
    p.append(f'<clipPath id="discord"><circle cx="{x + 90}" cy="560" r="80"/></clipPath>')
    p.append(f'<g clip-path="url(#discord)"><rect x="{x + 10}" y="480" width="160" height="160" fill="url(#masterWell)"/>'
             + nest(compact("dc"), "0 0 256 256", x + 22, 492, 136) + "</g>")
    p.append(f'<rect x="{x + 210}" y="480" width="160" height="160" rx="36" fill="url(#appBg)" stroke="{b.EDGE}"/>'
             + nest(compact("ap"), "0 0 256 256", x + 222, 492, 136))
    p.append(f'<rect x="{x + 400}" y="508" width="104" height="104" rx="24" fill="{b.INK}"/>'
             + nest(compact("apl"), "0 0 256 256", x + 410, 518, 84))
    p.append(section(x, 690, "LOADER · THE STRIKE (R3)"))
    p.append(f'<rect x="{x}" y="710" width="530" height="162" rx="14" fill="{b.PANEL}" stroke="{b.EDGE}"/>')
    for k, rot in enumerate((-30, -12, 6)):
        p.append(nest(r3.strike(uid=f"ld{k}", halo=k == 2, sparks=k == 2), "0 0 512 512", x + 20 + k * 170, 716, 150))
    # header
    y = 930
    p.append(section(62, y, "HEADER · 52 PX"))
    p.append(f'<rect x="60" y="{y + 20}" width="1680" height="60" rx="10" fill="url(#hdr)" stroke="{b.EDGE}"/>')
    hz, zw, zh = horizontal_lockup("hdr", flat=True)
    p.append(nest(hz, f"0 0 {zw} {zh}", 76, y + 30, 40 * zw / zh, 40))
    for k, lab in enumerate(("Builder", "The Forger", "Sets", "Explore", "Ranks")):
        p.append(text(560 + k * 130, y + 57, lab, 15, b.GOLD_B if k == 0 else b.INK, 600, op=1 if k == 0 else .7))
    p.append(f'<rect x="1500" y="{y + 34}" width="90" height="32" rx="7" fill="{b.PANEL}" stroke="{b.EDGE}"/>'
             + text(1545, y + 56, "Lv 200", 13, b.GOLD_B, 700, "middle")
             + f'<rect x="1606" y="{y + 34}" width="118" height="32" rx="7" fill="{b.GOLD_D}"/>'
             + text(1665, y + 56, "My builds", 13, b.INK, 600, "middle"))
    # feature tabs + empty state + whats new
    y = 1060
    p.append(section(62, y, "FEATURE NAVIGATION · SIGILS IN USE"))
    for i, (key, label, _a, _w) in enumerate(ic.ICONS[:6]):
        xx = 62 + i * 282
        active = i == 1
        p.append(f'<rect x="{xx}" y="{y + 20}" width="262" height="74" rx="12" fill="{b.PANEL if not active else "#2a2018"}" stroke="{b.GOLD if active else b.EDGE}"/>'
                 + nest(ic.icon(i), "0 0 256 256", xx + 10, y + 27, 60)
                 + text(xx + 84, y + 64, label, 17, b.GOLD_B if active else b.INK, 600))
    y = 1210
    p.append(section(62, y, "EMPTY STATE"))
    p.append(f'<rect x="60" y="{y + 20}" width="820" height="440" rx="16" fill="{b.PANEL}" stroke="{b.EDGE}"/>'
             f'<rect x="61" y="{y + 21}" width="818" height="438" rx="15" fill="url(#scales)" opacity=".35"/>'
             + nest(ic.icon(0), "0 0 256 256", 370, y + 60, 200)
             + text(470, y + 310, "Your anvil is cold.", 30, b.GOLD_B, 700, "middle")
             + text(470, y + 348, "Equip your first item to start forging.", 19, b.INK, anchor="middle", op=.7)
             + f'<rect x="380" y="{y + 380}" width="180" height="46" rx="10" fill="{b.GOLD}"/>'
             + text(470, y + 410, "Open catalog", 17, b.VOID, 700, "middle"))
    p.append(section(920, y, "WHAT'S NEW MODAL"))
    p.append(f'<rect x="920" y="{y + 20}" width="820" height="440" rx="16" fill="{b.STONE}" stroke="{b.GOLD_D}" stroke-width="2"/>'
             + nest(r5.coin("wn"), "0 0 512 512", 950, y + 50, 120)
             + f'<g transform="translate(1090 {y + 84})">' + b.game_text(b.wordmark("WHAT'S NEW", b.WM_FONT, 40, 0.04)[0], stroke=7, shadow=4) + "</g>"
             + text(1092, y + 128, "Version 0.3.140", 18, b.GOLD, 600)
             + f'<g transform="translate(940 {y + 170}) scale(.557)">{r4.divider(1400)}</g>')
    for k, line in enumerate(("New Forge Crest identity across the site", "Stat runes in characteristics and filters",
                              "Element crests on build guides", "Membership tiers forged in metal")):
        yy = y + 260 + k * 46
        p.append(f'<path transform="translate(970 {yy - 6})" d="M0 -9 L6 0 L0 9 L-6 0 Z" fill="{b.GOLD}"/>' + text(992, yy, line, 18, b.INK, op=.85))
    p.append(text(62, H - 48, "Next: favicon + PWA set, header lockup and OG card ship to the site; stat runes replace text labels.", 17, b.GOLD_B, 600))
    return p, W, H


b.DEFS = b.DEFS + f"""<defs>
  <radialGradient id="masterHalo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="{b.FIRE}" stop-opacity=".34"/><stop offset=".5" stop-color="{b.GOLD}" stop-opacity=".1"/><stop offset="1" stop-color="{b.GOLD}" stop-opacity="0"/></radialGradient>
  <radialGradient id="masterWell" cx="50%" cy="40%" r="62%"><stop offset="0" stop-color="#3a2216"/><stop offset=".6" stop-color="{b.PANEL}"/><stop offset="1" stop-color="{b.VOID}"/></radialGradient>
  <radialGradient id="ogGlow" cx="25%" cy="55%" r="60%"><stop offset="0" stop-color="{b.FIRE}" stop-opacity=".22"/><stop offset="1" stop-color="{b.FIRE}" stop-opacity="0"/></radialGradient>
  <linearGradient id="appBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a12"/><stop offset="1" stop-color="{b.VOID}"/></linearGradient>
</defs>"""


def page(parts, W, H):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{b.DEFS}{"".join(parts)}</svg>'


if __name__ == "__main__":
    b.write("master-crest.svg", b.svg(master(), 640, 640, "Dofus Forge — The Forge Crest", bg=b.VOID))
    b.write("master-crest-transparent.svg", b.svg(master("mt", halo=False), 640, 640, "Dofus Forge — The Forge Crest"))
    hl, hw, hh = hero_lockup()
    b.write("lockup-hero.svg", b.svg(hl, hw, hh, "Dofus Forge — hero lockup", bg=b.VOID))
    hz, zw, zh = horizontal_lockup()
    b.write("lockup-horizontal.svg", b.svg(hz, zw, zh, "Dofus Forge — horizontal lockup"))
    hz, zw, zh = horizontal_lockup("hzf", flat=True)
    b.write("lockup-header.svg", b.svg(hz, zw, zh, "Dofus Forge — header lockup"))
    b.write("icon-compact.svg", b.svg(compact(), 256, 256, "Dofus Forge — app icon"))
    b.write("icon-favicon-16.svg", b.svg(favicon16(), 256, 256, "Dofus Forge — favicon"))
    b.write("og-card.svg", b.svg(og_card(), 1200, 630, "Dofus Forge — social card"))
    for name, fn in (("board-1-master", board_master), ("board-2-system", board_system), ("board-3-applications", board_apps)):
        p, W, H = fn()
        b.write(f"{name}.svg", page(p, W, H))
    print("ok", OUT)
