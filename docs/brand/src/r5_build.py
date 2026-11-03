"""Round 5 — Guild & Kamas: Dofus heraldry and economy, forged.

A guild emblem shield, a forge kama coin and an alliance banner hung from a hammer, plus the
emblem as a per-element family. usage: python r5_build.py <out-dir>
"""
import os, sys, math

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "rounds", "r5-guild-kamas")
sys.argv = [sys.argv[0], OUT]
import r2_build as b
import r2_board as rb

b.OUT = OUT
os.makedirs(OUT, exist_ok=True)
fmt = b.fmt
LINE = b.OUTLINE

# field tones per guild colour: (lit, base, shade)
FIELDS = {
    "brand": ("#7a3a22", "#4a2016", "#24100b"),
    "crimson": ("#c4452a", "#9c3218", "#5a1c10"),
    "earth": ("#e0a64a", "#c98a2b", "#8a5a18"),
    "fire":  ("#f2805f", "#e65f40", "#9c3218"),
    "water": ("#5fb0ea", "#2f93d8", "#1a5a8e"),
    "air":   ("#98d064", "#74b93f", "#477a22"),
}

# symbol = A from round 2 (anvil + Dofus + sparks), centred on its own visual centre
SYM_CX, SYM_CY = 239, 318


def forged_symbol(uid, scale, cx, cy, sparks=True):
    body = b.hero_symbol(halo=False, uid=uid) if sparks else (b.anvil_art() + b.dofus(
        b.EGG_CX, b.EGG_TOP, b.EGG_BOT, b.EGG_RX, b.EGG_TONES["ocre"], uid, tilt=b.EGG_TILT))
    return (f'<g transform="translate({fmt(cx)} {fmt(cy)}) scale({fmt(scale)}) '
            f'translate({-SYM_CX} {-SYM_CY})">{body}</g>')


def diamond(x, y, r, fill, stroke=None, sw=0):
    s = f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"' if stroke else ""
    return f'<path d="M{fmt(x)} {fmt(y - r * 1.4)} L{fmt(x + r)} {fmt(y)} L{fmt(x)} {fmt(y + r * 1.4)} L{fmt(x - r)} {fmt(y)} Z" fill="{fill}"{s}/>'


# ── A · Guild Emblem ────────────────────────────────────────────────────────
# Crowned heater shield: three lobes on top like a Dofus guild-emblem backdrop.
SHIELD = ("M60 92 Q124 46 190 80 Q256 30 322 80 Q388 46 452 92 L452 252 "
          "C452 362 368 436 256 488 C144 436 60 362 60 252 Z")


def scaled(d, s, cx=256, cy=262):
    return f'<path transform="translate({cx} {cy}) scale({s}) translate({-cx} {-cy})" d="{d}"'


def shield(field="brand", uid="s", symbol=True):
    lit, base, shade = FIELDS[field]
    p = [f'<path d="{SHIELD}" fill="{LINE}" stroke="{LINE}" stroke-width="16" stroke-linejoin="round"/>',
         f'<path d="{SHIELD}" fill="url(#ringGold)"/>',
         # rim gloss on the upper-left lobe
         f'<path d="M78 112 Q124 72 182 96" fill="none" stroke="#fff6d8" stroke-width="6" stroke-linecap="round" opacity=".85"/>',
         f'<clipPath id="fld{uid}">{scaled(SHIELD, .84)}/></clipPath>',
         scaled(SHIELD, .865) + f' fill="{LINE}"/>',
         f'<g clip-path="url(#fld{uid})">',
         f'<rect x="0" y="0" width="512" height="512" fill="{shade}"/>',
         # party per pale: lit left half, base right half, hard edge (cel)
         f'<path d="M0 0 L256 0 L256 512 L0 512 Z" fill="{base}"/>',
         f'<path d="M0 0 L240 0 L240 512 L0 512 Z" fill="{lit}" opacity=".55"/>',
         f'<path d="M0 0 L512 0 L512 150 C380 120 160 170 0 140 Z" fill="#fff" opacity=".07"/>',
         '</g>']
    for x, y in ((124, 76), (256, 58), (388, 76)):
        p.append(diamond(x, y, 7, "#3b2a0c"))
    if symbol:
        p.append(scaled(SHIELD, .79) + f' fill="none" stroke="{b.GOLD_B}" stroke-width="3" opacity=".55"/>')
        p.append(forged_symbol(f"{uid}y", .54, 256, 290))
    return "".join(p)


# ── B · Forge Kama ──────────────────────────────────────────────────────────
def reeded(cx, cy, r_out, r_in, n):
    pts = []
    for i in range(n * 2):
        a = math.pi * i / n
        r = r_out if i % 2 == 0 else r_in
        pts.append(f"{fmt(cx + r * math.sin(a))} {fmt(cy - r * math.cos(a))}")
    return "M" + " L".join(pts) + " Z"


def top_arc_text(text, cap, track, cx, cy, R):
    gl = b.glyphs(text, b.WM_FONT, cap, track)
    total = sum(a for _, a in gl)
    ang = -total / 2 / R
    out = []
    for d, adv in gl:
        mid = ang + adv / 2 / R
        x, y = cx + R * math.sin(mid), cy - R * math.cos(mid)
        if d:
            out.append(f'<path d="{d}" transform="translate({fmt(x)} {fmt(y)}) rotate({fmt(math.degrees(mid))})"/>')
        ang += adv / R
    return "".join(out)


def coin(uid="k", text=True):
    cx, cy = 256, 246
    p = [  # coin thickness, then reeded rim, then face
        f'<circle cx="{cx}" cy="{cy + 16}" r="222" fill="#4a3412" stroke="{LINE}" stroke-width="10"/>',
        f'<circle cx="{cx}" cy="{cy}" r="224" fill="{LINE}"/>',
        f'<path d="{reeded(cx, cy, 219, 213, 96)}" fill="{b.GOLD_D}"/>',
        f'<circle cx="{cx}" cy="{cy}" r="211" fill="{b.GOLD}" stroke="{LINE}" stroke-width="4"/>',
        f'<clipPath id="face{uid}"><circle cx="{cx}" cy="{cy}" r="200"/></clipPath>',
        f'<circle cx="{cx}" cy="{cy}" r="200" fill="#a8822f"/>',
        f'<g clip-path="url(#face{uid})"><circle cx="{cx - 16}" cy="{cy - 18}" r="196" fill="{b.GOLD}"/>'
        f'<circle cx="{cx - 40}" cy="{cy - 46}" r="150" fill="#dcb766"/></g>',
        f'<circle cx="{cx}" cy="{cy}" r="200" fill="none" stroke="{LINE}" stroke-width="6"/>',
        # raised inner ring
        f'<circle cx="{cx}" cy="{cy}" r="160" fill="none" stroke="#5a4318" stroke-width="10"/>',
        f'<path d="M{cx - 160} {cy} A160 160 0 0 1 {cx} {cy - 160}" fill="none" stroke="#fff1bd" stroke-width="3"/>',
        f'<clipPath id="well{uid}"><circle cx="{cx}" cy="{cy}" r="155"/></clipPath>',
        f'<circle cx="{cx}" cy="{cy}" r="155" fill="#b38b3c"/>',
        f'<g clip-path="url(#well{uid})"><circle cx="{cx + 20}" cy="{cy + 22}" r="150" fill="#9a7630"/></g>',
    ]
    # relief: anvil + Dofus struck in the metal (shadow, face, bevel highlight)
    rel = (f'<path d="{b.ANVIL}"/>'
           f'<g transform="rotate({b.EGG_TILT} {b.EGG_CX} {b.EGG_BOT})"><path d="{b.egg(b.EGG_CX, b.EGG_TOP, b.EGG_BOT - 6, b.EGG_RX)}"/></g>')
    g = f'translate({cx} {cy + 6}) scale(.5) translate({-SYM_CX} {-SYM_CY})'
    p.append(f'<g transform="{g}" fill="#4a3412" stroke="#4a3412" stroke-width="14"><g transform="translate(8 10)">{rel}</g></g>')
    p.append(f'<g transform="{g}" fill="#e6c272" stroke="#5a4318" stroke-width="7" stroke-linejoin="round"><path d="{b.ANVIL}"/></g>')
    p.append(f'<g transform="{g}"><g transform="rotate({b.EGG_TILT} {b.EGG_CX} {b.EGG_BOT})"><path d="{b.egg(b.EGG_CX, b.EGG_TOP, b.EGG_BOT - 6, b.EGG_RX)}" fill="#e9a540" stroke="#5a2c08" stroke-width="8"/>'
             f'<path d="{b.egg(b.EGG_CX + 14, b.EGG_TOP + 20, b.EGG_BOT - 6, b.EGG_RX * .55)}" fill="#c9741f" opacity=".7"/></g></g>')
    p.append(f'<g transform="{g}"><g transform="rotate({b.EGG_TILT} {b.EGG_CX} {b.EGG_BOT})">'
             f'<ellipse cx="{b.EGG_CX - 34}" cy="{b.EGG_TOP + 50}" rx="11" ry="26" transform="rotate(20 {b.EGG_CX - 34} {b.EGG_TOP + 50})" fill="#fff8dc"/>'
             f'<path d="M{b.EGG_CX - 76} 236 C{b.EGG_CX - 30} 254 {b.EGG_CX + 30} 222 {b.EGG_CX + 76} 240" fill="none" stroke="#8f3f14" stroke-width="12"/></g>'
             f'<path d="M20 298 C60 314 110 318 160 318 L436 318" fill="none" stroke="#fff1bd" stroke-width="6"/></g>')
    if text:
        t = top_arc_text("DOFUS FORGE", 24, 0.12, cx, cy, 168)
        p.append(f'<g fill="#fff1bd" transform="translate(1.5 2)" opacity=".35">{t}</g>')
        p.append(f'<g fill="#4a3412">{t}</g>')
    for a, sz in ((-90, 6), (90, 6), (180, 8), (160, 5), (200, 5)):
        r = math.radians(a)
        p.append(diamond(cx + 180 * math.sin(r), cy - 180 * math.cos(r), sz, "#4a3412"))
    # face gloss
    p.append(f'<path d="M{cx - 176} {cy - 60} A190 190 0 0 1 {cx - 70} {cy - 178}" fill="none" stroke="#fffbe9" stroke-width="7" stroke-linecap="round" opacity=".8"/>')
    return "".join(p)


# ── C · Alliance Banner ─────────────────────────────────────────────────────
BANNER = "M148 100 L364 100 L364 448 L256 392 L148 448 Z"


def banner(field="crimson", uid="n"):
    lit, base, shade = FIELDS[field]
    p = [f'<path d="{BANNER}" fill="{LINE}" stroke="{LINE}" stroke-width="16" stroke-linejoin="round"/>',
         f'<clipPath id="bn{uid}"><path d="{BANNER}"/></clipPath>',
         f'<g clip-path="url(#bn{uid})"><rect width="512" height="512" fill="{base}"/>'
         f'<path d="M148 100 L232 100 L232 512 L148 512 Z" fill="{lit}" opacity=".6"/>'
         f'<path d="M318 100 L364 100 L364 512 L318 512 Z" fill="{shade}"/></g>',
         f'<path d="M166 118 L346 118 L346 418 L256 372 L166 418 Z" fill="none" stroke="{b.GOLD_B}" stroke-width="5" stroke-linejoin="round"/>',
         f'<path d="{BANNER}" fill="none" stroke="{LINE}" stroke-width="7" stroke-linejoin="round"/>',
         # hammer as the banner pole: wooden handle, steel head, gold finial
         f'<rect x="78" y="74" width="390" height="26" rx="12" fill="#6e4322" stroke="{LINE}" stroke-width="7"/>',
         '<rect x="84" y="78" width="378" height="8" rx="4" fill="#a8693a"/>']
    for x in (164, 241, 318):
        p.append(f'<rect x="{x}" y="66" width="30" height="48" rx="6" fill="{shade}" stroke="{LINE}" stroke-width="6"/>'
                 f'<rect x="{x + 4}" y="70" width="9" height="40" rx="3" fill="{lit}" opacity=".6"/>')
    p.append(f'<path d="M20 52 L36 36 L112 36 L112 140 L36 140 L20 124 Z" fill="{b.EDGE_S}" stroke="{LINE}" stroke-width="8" stroke-linejoin="round"/>'
             '<path d="M30 54 L42 44 L104 44 L104 64 L30 64 Z" fill="#5f7194"/>'
             '<path d="M84 44 L104 44 L104 132 L84 132 Z" fill="#1b2232"/>'
             f'<rect x="108" y="60" width="16" height="56" rx="4" fill="{b.GOLD}" stroke="{LINE}" stroke-width="5"/>')
    p.append(diamond(482, 87, 13, b.GOLD_B, LINE, 6))
    p.append(forged_symbol(f"{uid}y", .44, 256, 254))
    return "".join(p)


# ── Lockups, family, board ─────────────────────────────────────────────────
DEFS5 = f"""<defs>
  <radialGradient id="r5glow" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#3a2216"/><stop offset="1" stop-color="{b.PANEL}"/></radialGradient>
</defs>"""
b.DEFS = b.DEFS + DEFS5


def family_strip(x0, y0, w):
    p = [f'<rect x="{x0}" y="{y0}" width="{w}" height="420" rx="16" fill="{b.PANEL}" stroke="{b.EDGE}"/>']
    nd, _ = b.wordmark("Guild family · one emblem, five colours", "Cinzel-700.ttf", 22, 0.03, x0=x0 + 36, base=y0 + 52)
    p.append(f'<path d="{nd}" fill="{b.GOLD_B}"/>')
    p.append(rb.text(x0 + 36, y0 + 82, "Same shield + forged Dofus; the field takes the element colour (DESIGN.md §2.4) — sub-identities for build guides, class pages and set pages by element.", 16, b.INK, op=.75))
    names = [("brand", "BRAND"), ("earth", "EARTH · STRENGTH"), ("fire", "FIRE · INTELLIGENCE"), ("water", "WATER · CHANCE"), ("air", "AIR · AGILITY")]
    step = (w - 72) / 5
    for i, (k, name) in enumerate(names):
        cx = x0 + 36 + step * i + step / 2
        p.append(rb.nest(shield(k, uid=f"f{i}"), "0 0 512 512", cx - 120, y0 + 104, 240))
        p.append(rb.text(cx, y0 + 380, name, 14, b.GOLD_B if k == "brand" else FIELDS[k][0], 700, "middle", ls=2))
    return "".join(p)


def board():
    W, H = 1800, 1720
    t, _ = b.wordmark("GUILD & KAMAS", b.WM_FONT, 58, 0.04, x0=60, base=150)
    p = [f'<rect width="{W}" height="{H}" fill="{b.VOID}"/>',
         f'<rect width="{W}" height="{H}" fill="url(#topGlow)"/>',
         rb.text(62, 64, "DOFUS FORGE · VISUAL IDENTITY · ROUND 5", 15, b.GOLD, 700, ls=3),
         b.game_text(t, stroke=8, shadow=4),
         rb.text(62, 200, "Dofus heraldry and economy, forged: a guild emblem, a kama struck at the forge and an alliance banner hung from a hammer.", 20, b.INK, op=.75)]
    A, B_, C = shield(uid="ba"), coin(uid="bb"), banner(uid="bc")
    p.append(rb.card(60, 260, "A", "The Forge Guild", "Emblem · guild crest",
                     ["A guild-emblem shield in forge ember:", "the Dofus on the anvil is our symbol.", "Field colour changes per element."],
                     A, "0 0 512 512", A, "40 20 432 480", rec=True))
    p.append(rb.card(630, 260, "B", "The Forge Kama", "Emblem · coin",
                     ["A gold coin struck at the forge, reeded", "rim, anvil + Dofus in relief: the", "currency of good builds."],
                     B_, "0 0 512 512", coin(uid="bbs", text=False), "26 16 460 476"))
    p.append(rb.card(1200, 260, "C", "The Alliance Banner", "Pictorial · banner",
                     ["Our banner hangs from a smith's", "hammer: rally point for guilds and", "alliances (Discord, events)."],
                     C, "0 0 512 512", C, "0 20 512 452"))
    p.append(family_strip(60, 1200, 1680))
    p.append(rb.text(62, 1690, "Recommendation: A as the community crest with the element family; B for rewards, premium and memberships; C for Discord / events.", 18, b.GOLD_B, 600))
    defs = f"""<defs>
  <radialGradient id="topGlow" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="{b.GOLD}" stop-opacity=".10"/><stop offset="1" stop-color="{b.GOLD}" stop-opacity="0"/></radialGradient>
  <radialGradient id="cardGlow" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#2a2018"/><stop offset="1" stop-color="{b.PANEL}"/></radialGradient>
  <linearGradient id="hdr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{b.STONE}"/><stop offset="1" stop-color="{b.VOID}"/></linearGradient>
</defs>"""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f'{b.DEFS}{defs}{"".join(p)}</svg>')


if __name__ == "__main__":
    b.write("a-guild-emblem.svg", b.svg(shield(), 512, 512, "Dofus Forge — Forge Guild emblem", bg=b.VOID))
    b.write("b-forge-kama.svg", b.svg(coin(), 512, 512, "Dofus Forge — Forge Kama", bg=b.VOID))
    b.write("c-alliance-banner.svg", b.svg(banner(), 512, 512, "Dofus Forge — Alliance Banner", bg=b.VOID))
    for k in ("brand", "earth", "fire", "water", "air"):
        b.write(f"a-guild-emblem-{k}.svg", b.svg(shield(k, uid=k), 512, 512, f"Dofus Forge — Guild emblem ({k})"))
    b.write("a-lockup-h.svg", b.lockup_h(shield(uid="lh"), (40, 20, 432, 480), "Dofus Forge — Guild horizontal lockup"))
    b.write("b-lockup-h.svg", b.lockup_h(coin(uid="kh", text=False), (26, 16, 460, 476), "Dofus Forge — Kama horizontal lockup"))
    b.write("board.svg", board())
    print("ok", OUT)
