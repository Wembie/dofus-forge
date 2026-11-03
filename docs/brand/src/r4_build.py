"""Round 4 — Dragon Lineage. In the lore the Dofus are dragon eggs: wings, hatching, scales.

usage: python r4_build.py <out-dir>
"""
import os, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "rounds", "r4-dragon-lineage")
import r2_build as b
import r2_board as rb
b.OUT = OUT
os.makedirs(OUT, exist_ok=True)
fmt = b.fmt

# crimson membrane, gold bone — dragon colours inside the Vault palette
WING = {"base": "#9c2c1a", "lit": "#c8452a", "shade": "#5e150b", "bone": b.GOLD_B, "bone_d": b.GOLD_D}


def mirror(d, axis):
    """Mirror an absolute M/L/C/Q/Z path horizontally around x = axis."""
    import re
    toks = re.findall(r"[MLCQZ]|-?\d+(?:\.\d+)?", d)
    out, i, cmd = [], 0, None
    for t in toks:
        if t in "MLCQZ":
            out.append(t); cmd = t; i = 0
        else:
            v = float(t)
            out.append(fmt(2 * axis - v) if i % 2 == 0 else fmt(v))
            i += 1
    return " ".join(out)


# Right wing on a 512 canvas: root behind the egg, wrist up-right, three finger tips, scalloped membrane.
WRIST = (418, 104)
TIPS = [(500, 40), (492, 150), (452, 236), (388, 292)]
LEAD = "M300 262 C310 200 350 150 410 110 C440 90 470 70 500 40"
WING_R = LEAD + " Q452 96 492 150 Q434 176 452 236 Q390 238 388 292 Q340 268 300 296 Z"
WING_LIT = LEAD + " Q456 92 462 140 Q404 150 392 200 Q342 210 316 262 Z"


def wing(d, lit, wrist, tips, side_uid, scale_w=1.0, lead_d=None):
    bones = "".join(f'<path d="M{fmt(wrist[0])} {fmt(wrist[1])} Q{fmt((wrist[0] + x) / 2 + 10)} {fmt((wrist[1] + y) / 2 - 6)} {fmt(x)} {fmt(y)}" />' for x, y in tips[1:])
    lead = lead_d if lead_d else LEAD
    return (f'<clipPath id="w{side_uid}"><path d="{d}"/></clipPath>'
            f'<path d="{d}" fill="{WING["shade"]}"/>'
            f'<g clip-path="url(#w{side_uid})"><path d="{d}" transform="translate(-10 -8)" fill="{WING["base"]}"/>'
            f'<path d="{lit}" fill="{WING["lit"]}" opacity=".85"/></g>'
            f'<g fill="none" stroke="{WING["bone_d"]}" stroke-width="{fmt(8 * scale_w)}" stroke-linecap="round">{bones}</g>'
            f'<g fill="none" stroke="{WING["bone"]}" stroke-width="{fmt(3.5 * scale_w)}" stroke-linecap="round">{bones}</g>'
            f'<path d="{d}" fill="none" stroke="{b.OUTLINE}" stroke-width="{fmt(8 * scale_w)}" stroke-linejoin="round"/>'
            f'<path d="{lead}" fill="none" stroke="{b.OUTLINE}" stroke-width="{fmt(16 * scale_w)}" stroke-linecap="round"/>'
            f'<path d="{lead}" fill="none" stroke="{WING["bone_d"]}" stroke-width="{fmt(10 * scale_w)}" stroke-linecap="round"/>'
            f'<path d="{lead}" fill="none" stroke="{WING["bone"]}" stroke-width="{fmt(4 * scale_w)}" stroke-linecap="round" transform="translate(-1 -2)"/>'
            # wrist claw
            f'<path d="M{fmt(wrist[0] - 4)} {fmt(wrist[1] + 2)} l-4 -26 l18 18 Z" fill="{b.GOLD_B}" stroke="{b.OUTLINE}" stroke-width="{fmt(4 * scale_w)}" stroke-linejoin="round"/>')


def wings_pair(axis=262, uid="a"):
    l = mirror(WING_R, axis)
    ll = mirror(WING_LIT, axis)
    lw = (2 * axis - WRIST[0], WRIST[1])
    lt = [(2 * axis - x, y) for x, y in TIPS]
    return wing(l, ll, lw, lt, uid + "l", lead_d=mirror(LEAD, axis)) + wing(WING_R, WING_LIT, WRIST, TIPS, uid + "r")


# ── A · Wings of the Forge ────────────────────────────────────────────────
def concept_a(uid="a", halo=True):
    p = []
    if halo:
        p.append('<circle cx="262" cy="230" r="250" fill="url(#halo)"/>')
    p.append(f'<g transform="translate(262 300) scale(.92) translate(-262 -294)">{wings_pair(uid=uid)}</g>')
    p.append(b.anvil_art())
    p.append(b.dofus(b.EGG_CX, b.EGG_TOP, b.EGG_BOT, b.EGG_RX, b.EGG_TONES["ocre"], uid + "egg", tilt=0))
    p.append(f'<g fill="{b.GOLD_B}" stroke="{b.FIRE}" stroke-width="1.5">' +
             "".join(b.ember(*e) for e in [(262, 70, 8, 0), (214, 96, 3, 0), (312, 92, 3, 0)]) + "</g>")
    return "".join(p)


# ── B · The Hatching ──────────────────────────────────────────────────────
CRACK_TOP = [(70, 262), (120, 236), (160, 268), (206, 226), (246, 262), (290, 214), (334, 254), (380, 222), (446, 250)]


def zig(pts):
    return " ".join(f"L{fmt(x)} {fmt(y)}" for x, y in pts)


def concept_b(uid="b"):
    cx, top, bot, rx = 256, 30, 492, 184
    shape = b.egg(cx, top, bot, rx)
    tones = b.EGG_TONES["ocre"]
    base, lit, hi, shade, mark, line = tones
    gap = [(x, y + 44 + (10 if 150 < x < 360 else 0)) for x, y in CRACK_TOP]
    upper = f"M0 0 L512 0 L512 {CRACK_TOP[-1][1]} " + zig(list(reversed(CRACK_TOP))) + f" L0 {CRACK_TOP[0][1]} Z"
    lower = f"M0 512 L512 512 L512 {gap[-1][1]} " + zig(list(reversed(gap))) + f" L0 {gap[0][1]} Z"
    opening = f"M{fmt(CRACK_TOP[0][0])} {fmt(CRACK_TOP[0][1])} " + zig(CRACK_TOP[1:]) + " " + zig(list(reversed(gap))) + " Z"
    scales = []
    for row in range(6):
        y = 40 + row * 34
        off = 0 if row % 2 == 0 else 22
        for i in range(-1, 13):
            x = i * 44 + off
            scales.append(f'<path d="M{fmt(x - 22)} {fmt(y)} Q{fmt(x - 22)} {fmt(y + 30)} {fmt(x)} {fmt(y + 34)} Q{fmt(x + 22)} {fmt(y + 30)} {fmt(x + 22)} {fmt(y)}"/>')
    p = [f'<clipPath id="{uid}egg"><path d="{shape}"/></clipPath>',
         f'<clipPath id="{uid}up"><path d="{upper}"/></clipPath>',
         f'<clipPath id="{uid}lo"><path d="{lower}"/></clipPath>',
         '<circle cx="256" cy="262" r="240" fill="url(#halo)"/>',
         # inner molten light visible through the opening
         f'<clipPath id="{uid}open"><path d="{opening}"/></clipPath>',
         f'<g clip-path="url(#{uid}egg)"><path d="{opening}" fill="url(#molten)"/></g>',
         # dragon eye peeking through the crack
         f'<g clip-path="url(#{uid}open)"><path d="M150 270 Q256 206 362 270 Q256 334 150 270 Z" fill="{b.GOLD_B}" stroke="{b.FIRE}" stroke-width="6"/>'
         f'<path d="M256 222 Q276 270 256 318 Q236 270 256 222 Z" fill="{b.OUTLINE}"/>'
         f'<circle cx="230" cy="252" r="8" fill="#fffdf4"/></g>']
    for clip, dy in ((f"{uid}up", -6), (f"{uid}lo", 6)):
        p.append(f'<g clip-path="url(#{clip})"><g transform="translate(0 {dy})" clip-path="url(#{uid}egg)">'
                 f'<path d="{shape}" fill="{shade}"/>'
                 f'<path d="{b.egg(cx - rx * .1, top - 10, bot - 28, rx * .9)}" fill="{base}"/>'
                 f'<path d="{b.egg(cx - rx * .2, top + 8, bot - 92, rx * .7)}" fill="{lit}"/>'
                 + (f'<g fill="none" stroke="{mark}" stroke-width="5" opacity=".55">{"".join(scales)}</g>' if dy < 0 else "")
                 + f'<path d="{b.egg(cx - rx * .34, top + 46, top + 230, rx * .3)}" fill="{hi}" opacity=".85"/>'
                 f'</g></g>')
    # crack rims + outline
    p.append(f'<path d="M{fmt(CRACK_TOP[0][0])} {fmt(CRACK_TOP[0][1] - 6)} ' + zig([(x, y - 6) for x, y in CRACK_TOP[1:]]) +
             f'" fill="none" stroke="{line}" stroke-width="9" stroke-linejoin="miter" clip-path="url(#{uid}egg)"/>')
    p.append(f'<path d="M{fmt(gap[0][0])} {fmt(gap[0][1] + 6)} ' + zig([(x, y + 6) for x, y in gap[1:]]) +
             f'" fill="none" stroke="{line}" stroke-width="9" stroke-linejoin="miter" clip-path="url(#{uid}egg)"/>')
    p.append(f'<g transform="translate(0 -6)" clip-path="url(#{uid}up)"><path d="{shape}" fill="none" stroke="{line}" stroke-width="12"/></g>')
    p.append(f'<g transform="translate(0 6)" clip-path="url(#{uid}lo)"><path d="{shape}" fill="none" stroke="{line}" stroke-width="12"/></g>')
    gx, gy = cx - rx * .46, top + 96
    p.append(f'<ellipse cx="{fmt(gx)}" cy="{fmt(gy)}" rx="22" ry="50" transform="rotate(20 {fmt(gx)} {fmt(gy)})" fill="#fffdf4"/>')
    p.append(f'<circle cx="{fmt(gx + 12)}" cy="{fmt(gy + 82)}" r="11" fill="#fffdf4"/>')
    p.append(f'<g fill="{b.GOLD_B}" stroke="{b.FIRE}" stroke-width="2">' +
             "".join(b.ember(*e) for e in [(470, 150, 12, 15), (44, 196, 9, -15), (480, 330, 4, 0), (36, 330, 4, 0)]) + "</g>")
    return "".join(p)


# ── C · Dragon Crest (wordmark framed by wings) ────────────────────────────
def concept_c(uid="c", flat_text=False):
    d, w = b.wordmark("DOFUS FORGE", b.WM_FONT, 74, 0.05, x0=0, base=0)
    W = 1400
    x0 = (W - w) / 2
    p = [f'<ellipse cx="{W / 2}" cy="210" rx="640" ry="180" fill="url(#crestGlow)"/>']
    # wings flanking: scale the right wing, mirror for left
    sc = .78
    p.append(f'<g transform="translate({fmt(x0 + w + 4 - 298 * sc)} {fmt(250 - 294 * sc)}) scale({sc})">'
             f'{wing(WING_R, WING_LIT, WRIST, TIPS, uid + "r", 1 / sc)}</g>')
    p.append(f'<g transform="translate({fmt(x0 - 4 + 298 * sc)} {fmt(250 - 294 * sc)}) scale(-{sc} {sc})">'
             f'{wing(WING_R, WING_LIT, WRIST, TIPS, uid + "l", 1 / sc)}</g>')
    # plate behind the wordmark
    p.append(f'<path d="M{fmt(x0 - 30)} 196 L{fmt(x0 + w + 30)} 196 L{fmt(x0 + w + 58)} 250 L{fmt(x0 + w + 30)} 304 '
             f'L{fmt(x0 - 30)} 304 L{fmt(x0 - 58)} 250 Z" fill="{b.PANEL}" stroke="{b.OUTLINE}" stroke-width="7" stroke-linejoin="round"/>')
    p.append(f'<path d="M{fmt(x0 - 22)} 204 L{fmt(x0 + w + 22)} 204" stroke="{b.GOLD}" stroke-width="3" opacity=".7"/>')
    p.append(f'<path d="M{fmt(x0 - 22)} 296 L{fmt(x0 + w + 22)} 296" stroke="{b.GOLD_D}" stroke-width="3"/>')
    p.append(f'<g transform="translate({fmt(x0)} 287)">' + (f'<path d="{d}" fill="{b.GOLD_B}"/>' if flat_text else b.game_text(d, stroke=9, shadow=5)) + "</g>")
    # Dofus crowning the crest
    p.append(b.dofus(W / 2, 34, 196, 62, b.EGG_TONES["ocre"], uid + "egg", outline_w=7))
    p.append(f'<g fill="{b.GOLD_B}" stroke="{b.FIRE}" stroke-width="1.5">' +
             "".join(b.ember(*e) for e in [(W / 2 - 96, 80, 7, -10), (W / 2 + 96, 72, 8, 10), (W / 2 + 130, 132, 3, 0), (W / 2 - 124, 140, 3, 0)]) + "</g>")
    return "".join(p), W


def crest_small(uid="cs"):
    """Small cut of C: Dofus between two wings, no wordmark."""
    return (f'<g transform="translate(0 30)">{wings_pair(axis=256, uid=uid)}</g>'
            + b.dofus(256, 150, 400, 96, b.EGG_TONES["ocre"], uid + "egg", outline_w=10))


# ── Motif: dragon-scale tile + wing divider ─────────────────────────────────
def scale_tile():
    """64×64 seamless tile of gold-deep scallop scales on void."""
    s = []
    for row in range(3):
        y = -16 + row * 32
        off = 0 if row % 2 == 0 else 32
        for i in range(-1, 3):
            x = i * 64 + off
            s.append(f'<path d="M{x} {y} Q{x} {y + 30} {x + 32} {y + 36} Q{x + 64} {y + 30} {x + 64} {y}"/>')
    return (f'<rect width="64" height="64" fill="{b.VOID}"/>'
            f'<g fill="none" stroke="{b.GOLD_D}" stroke-width="2.5" opacity=".7">{"".join(s)}</g>')


def divider(W=1400):
    c = W / 2
    return (f'<path d="M80 40 L{fmt(c - 70)} 40" stroke="{b.GOLD_D}" stroke-width="3"/>'
            f'<path d="M{fmt(c + 70)} 40 L{W - 80} 40" stroke="{b.GOLD_D}" stroke-width="3"/>'
            f'<path d="M{fmt(c - 70)} 40 Q{fmt(c - 40)} 10 {fmt(c - 16)} 26 Q{fmt(c - 40)} 34 {fmt(c - 70)} 40 Z" fill="{WING["base"]}" stroke="{b.OUTLINE}" stroke-width="3"/>'
            f'<path d="M{fmt(c + 70)} 40 Q{fmt(c + 40)} 10 {fmt(c + 16)} 26 Q{fmt(c + 40)} 34 {fmt(c + 70)} 40 Z" fill="{WING["base"]}" stroke="{b.OUTLINE}" stroke-width="3"/>'
            f'<path d="M{fmt(c)} 16 L{fmt(c + 14)} 40 L{fmt(c)} 64 L{fmt(c - 14)} 40 Z" fill="{b.GOLD}" stroke="{b.OUTLINE}" stroke-width="3"/>'
            f'<path d="M{fmt(c)} 16 L{fmt(c + 14)} 40 L{fmt(c)} 40 Z" fill="{b.GOLD_B}"/>')


R4_DEFS = f"""<defs>
  <linearGradient id="molten" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff6d8"/><stop offset=".5" stop-color="{b.GOLD_B}"/><stop offset="1" stop-color="{b.FIRE}"/>
  </linearGradient>
  <radialGradient id="crestGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="{b.FIRE}" stop-opacity=".22"/><stop offset="1" stop-color="{b.FIRE}" stop-opacity="0"/>
  </radialGradient>
  <pattern id="scales" width="64" height="64" patternUnits="userSpaceOnUse">{scale_tile()}</pattern>
  <radialGradient id="topGlow" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="{b.GOLD}" stop-opacity=".10"/><stop offset="1" stop-color="{b.GOLD}" stop-opacity="0"/></radialGradient>
  <radialGradient id="cardGlow" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#2a1a18"/><stop offset="1" stop-color="{b.PANEL}"/></radialGradient>
  <linearGradient id="hdr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{b.STONE}"/><stop offset="1" stop-color="{b.VOID}"/></linearGradient>
</defs>"""
b.DEFS = b.DEFS + R4_DEFS


def board():
    W, H = 1800, 2180
    t, _ = b.wordmark("DRAGON LINEAGE", b.WM_FONT, 58, 0.04, x0=60, base=150)
    p = [f'<rect width="{W}" height="{H}" fill="{b.VOID}"/>', f'<rect width="{W}" height="{H}" fill="url(#topGlow)"/>',
         rb.text(62, 64, "DOFUS FORGE · VISUAL IDENTITY · ROUND 4", 15, b.GOLD, 700, ls=3),
         b.game_text(t, stroke=8, shadow=4),
         rb.text(62, 200, "Every Dofus is a dragon egg. In our forge the build hatches: crimson wings, molten gold, ◆ sparks.", 20, b.INK, op=.75)]
    C, CW = concept_c("bc")
    p.append(rb.card(60, 260, "A", "Wings of the Forge", "Combination · hero / splash",
                     ["Original crimson dragon wings rise", "behind the Dofus on the anvil — the", "egg's lineage, guarded by the forge."],
                     concept_a("ba"), "0 20 512 512", concept_a("bas", halo=False), "0 40 512 472", rec=True))
    p.append(rb.card(630, 260, "B", "The Hatching", "Pictorial · icon / loader",
                     ["A scaled Dofus cracks open; molten", "gold and a dragon eye glow inside.", "The build is hatching."],
                     concept_b("bb"), "0 0 512 512", concept_b("bbs"), "0 0 512 512"))
    p.append(rb.card(1200, 260, "C", "Dragon Crest", "Emblem lockup · header / OG",
                     ["Wings frame the wordmark plate,", "crowned by the Dofus. A wide crest", "for headers, banners and OG cards."],
                     crest_small("bch"), "0 10 512 512", crest_small("bcs"), "0 60 512 400"))
    # full crest showcase
    y = 1210
    p.append(rb.text(62, y, "C · DRAGON CREST — FULL LOCKUP", 15, b.GOLD, 700, ls=3))
    p.append(f'<rect x="60" y="{y + 24}" width="1680" height="480" rx="16" fill="{b.PANEL}" stroke="{b.EDGE}"/>')
    p.append(rb.nest(C, f"0 0 {CW} 400", 130, y + 44, 1540, 440))
    # motif strip
    y = 1760
    p.append(rb.text(62, y, "SYSTEM MOTIF · DRAGON SCALES + WING DIVIDER", 15, b.GOLD, 700, ls=3))
    p.append(f'<rect x="60" y="{y + 24}" width="820" height="300" rx="14" fill="url(#scales)" stroke="{b.EDGE}"/>')
    p.append(f'<rect x="60" y="{y + 24}" width="820" height="300" rx="14" fill="url(#cardGlow)" opacity=".55"/>')
    p.append(rb.text(90, y + 300, "64 px seamless tile — panel backgrounds, empty states, hero sections", 15, b.INK, op=.7))
    p.append(f'<rect x="920" y="{y + 24}" width="820" height="300" rx="14" fill="{b.PANEL}" stroke="{b.EDGE}"/>')
    p.append(f'<g transform="translate(930 {y + 60}) scale(.571)">{divider()}</g>')
    p.append(rb.text(1330, y + 150, "CHARACTERISTICS", 22, b.GOLD, 700, "middle", ls=4))
    p.append(f'<g transform="translate(930 {y + 190}) scale(.571)">{divider()}</g>')
    p.append(rb.text(950, y + 300, "Wing divider — section headers, modal titles, changelog", 15, b.INK, op=.7))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{b.DEFS}{"".join(p)}</svg>'


if __name__ == "__main__":
    b.write("a-wings-of-the-forge.svg", b.svg(concept_a(), 512, 512, "Dofus Forge — Wings of the Forge", bg=b.VOID, vb="0 20 512 512"))
    b.write("b-the-hatching.svg", b.svg(concept_b(), 512, 512, "Dofus Forge — The Hatching", bg=b.VOID))
    c, cw = concept_c()
    b.write("c-dragon-crest.svg", b.svg(c, cw, 400, "Dofus Forge — Dragon Crest", bg=b.VOID))
    b.write("c-dragon-crest-small.svg", b.svg(crest_small(), 512, 400, "Dofus Forge — Dragon Crest small", bg=b.VOID, vb="0 60 512 400"))
    b.write("motif-scale-tile.svg", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">{scale_tile()}</svg>')
    b.write("motif-wing-divider.svg", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 80" width="1400" height="80">{divider()}</svg>')
    b.write("board.svg", board())
    print("ok", OUT)
