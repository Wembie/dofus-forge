"""Round 3 — Smithmagic. Rune stones, a rune orbit around the Dofus, a hammer striking a rune,
the DF rune monogram and a stat-rune icon set.

usage: python r3_build.py <out-dir>
"""
import os, sys, math

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rounds", "r3-smithmagic")
import r2_build as b
import r2_board as bb

b.OUT = OUT
os.makedirs(OUT, exist_ok=True)
fmt = b.fmt


# ── Colour helpers ─────────────────────────────────────────────────────────
def _rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(h, other, t):
    a, c = _rgb(h), _rgb(other)
    return "#" + "".join(f"{round(x + (y - x) * t):02x}" for x, y in zip(a, c))


def stone_tones(base):
    """Facet tones for a cut rune: lightest upper-left → darkest lower-right."""
    return {
        "face": base,
        "ul": mix(base, "#ffffff", .42), "ur": mix(base, "#ffffff", .2), "l": mix(base, "#ffffff", .1),
        "r": mix(base, "#000000", .18), "ll": mix(base, "#000000", .3), "lr": mix(base, "#000000", .48),
        "line": mix(base, "#000000", .82),
    }


# ── Rune stone: pointy-top hexagon cut like a gem, rounded outer corners ─────
def hex_pts(cx, cy, w, h):
    return [(cx, cy - h / 2), (cx + w / 2, cy - h / 4), (cx + w / 2, cy + h / 4),
            (cx, cy + h / 2), (cx - w / 2, cy + h / 4), (cx - w / 2, cy - h / 4)]


def rpoly(pts, r):
    n, d = len(pts), []
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        l0 = math.dist(p0, p1); l2 = math.dist(p1, p2)
        a = (p1[0] + (p0[0] - p1[0]) * r / l0, p1[1] + (p0[1] - p1[1]) * r / l0)
        c = (p1[0] + (p2[0] - p1[0]) * r / l2, p1[1] + (p2[1] - p1[1]) * r / l2)
        d.append(f"{'M' if i == 0 else 'L'}{fmt(a[0])} {fmt(a[1])} Q{fmt(p1[0])} {fmt(p1[1])} {fmt(c[0])} {fmt(c[1])}")
    return " ".join(d) + " Z"


def poly(pts):
    return "M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in pts) + " Z"


# edge i joins vertex i → i+1: 0 top→upper-right, 1 right, 2 lower-right, 3 lower-left, 4 left, 5 upper-left
EDGE_TONE = ["ur", "r", "lr", "ll", "l", "ul"]


def rune_stone(cx, cy, w, base, uid, glyph=None, glow=None, outline=None, inner=.68, glyph_scale=None):
    """Cel-shaded rune stone with bevel facets and an optional engraved glyph (molten if `glow`)."""
    t = stone_tones(base)
    h = w * 1.12
    O = hex_pts(cx, cy, w, h)
    I = [(cx + (x - cx) * inner, cy + (y - cy) * inner) for x, y in O]
    sw = outline or max(3, w * .055)
    outer = rpoly(O, w * .09)
    p = [f'<clipPath id="st{uid}"><path d="{outer}"/></clipPath>',
         f'<path d="{outer}" fill="{t["lr"]}"/>',
         f'<g clip-path="url(#st{uid})">']
    for i in range(6):
        p.append(f'<path d="{poly([O[i], O[(i + 1) % 6], I[(i + 1) % 6], I[i]])}" fill="{t[EDGE_TONE[i]]}"/>')
    p.append(f'<path d="{poly(I)}" fill="{t["face"]}"/>')
    # soft cel highlight on the face (upper-left) + gloss chip
    fx, fy = cx - w * .12, cy - h * .14
    p.append(f'<path d="{poly([I[5], I[0], (cx + w * .05, cy - h * .05), (cx - w * .22, cy + h * .02)])}" fill="#ffffff" opacity=".12"/>')
    p.append("</g>")
    p.append(f'<path d="{poly(I)}" fill="none" stroke="{t["line"]}" stroke-width="{fmt(sw * .4)}" opacity=".55" stroke-linejoin="round"/>')
    if glyph:
        gs = glyph_scale or w * inner * .0108
        tr = f'translate({fmt(cx)} {fmt(cy + h * .01)}) scale({fmt(gs)})'
        if glow:
            p.append(f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(w * .34)}" fill="url(#{glow})"/>')
            p.append(f'<path d="{glyph}" transform="{tr}" fill="none" stroke="{t["line"]}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>')
            p.append(f'<path d="{glyph}" transform="{tr}" fill="none" stroke="#ffd77a" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>')
            p.append(f'<path d="{glyph}" transform="{tr}" fill="none" stroke="#fff6d8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>')
        else:
            p.append(f'<path d="{glyph}" transform="{tr} translate(0 2.4)" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>')
            p.append(f'<path d="{glyph}" transform="{tr}" fill="none" stroke="{t["line"]}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>')
    p.append(f'<path d="{outer}" fill="none" stroke="{b.OUTLINE}" stroke-width="{fmt(sw)}" stroke-linejoin="round"/>')
    gx, gy = O[5][0] + w * .1, O[5][1] + h * .02
    p.append(f'<path d="M{fmt(O[0][0] - w * .02)} {fmt(O[0][1] + h * .07)} L{fmt(gx)} {fmt(gy)}" stroke="#fffdf4" stroke-width="{fmt(max(1.5, w * .035))}" stroke-linecap="round" opacity=".85"/>')
    return "".join(p)


# ── Glyphs on a 100-unit grid centred at 0,0 ────────────────────────────────
def star(n=5, ro=34, ri=15):
    pts = []
    for i in range(n * 2):
        r = ro if i % 2 == 0 else ri
        a = math.pi * i / n - math.pi / 2
        pts.append((r * math.cos(a), r * math.sin(a) + 3))
    return poly(pts)


GLYPHS = {
    # brand: DF rune — shared stem, angular D bowl, F arms rising like the Fehu rune
    "df": "M-4 -38 L-4 38 M-4 -38 L28 -18 L28 18 L-4 38 M-4 -8 L-26 -30 M-4 14 L-26 -8",
    "vitality": "M0 28 C-36 6 -36 -28 -15 -28 C-6 -28 0 -21 0 -13 C0 -21 6 -28 15 -28 C36 -28 36 6 0 28 Z",
    "strength": "M-34 26 L-10 -22 L3 2 L13 -12 L34 26 Z",
    "intelligence": "M0 -34 C12 -16 26 -2 20 16 C15 30 -15 30 -20 16 C-25 2 -13 -6 -6 -18 C-4 -6 2 -2 6 -6 C8 -16 4 -26 0 -34 Z",
    "chance": "M0 -34 C14 -14 24 -2 24 10 A24 24 0 0 1 -24 10 C-24 -2 -14 -14 0 -34 Z",
    "agility": "M-32 -10 L12 -10 A12 12 0 1 0 0 -22 M-32 8 L20 8 A12 12 0 1 1 8 20",
    "wisdom": "M-34 0 C-18 -22 18 -22 34 0 C18 22 -18 22 -34 0 Z M0 -9 A9 9 0 1 1 0 9 A9 9 0 1 1 0 -9 Z",
    "ap": star(),
    "mp": "M-24 -24 L2 0 L-24 24 M2 -24 L28 0 L2 24",
}

STATS = [("vitality", "VITALITY", "#db5a74"), ("strength", "STRENGTH", b.EARTH), ("intelligence", "INTELLIGENCE", b.FIRE),
         ("chance", "CHANCE", b.WATER), ("agility", "AGILITY", b.AIR), ("wisdom", "WISDOM", "#a06fd0"),
         ("ap", "AP", "#38a7cf"), ("mp", "MP", "#4fae5a")]

R3_DEFS = f"""<defs>
  <radialGradient id="molten" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#ffe39a" stop-opacity=".75"/><stop offset=".5" stop-color="{b.GOLD}" stop-opacity=".3"/>
    <stop offset="1" stop-color="{b.FIRE}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="runeHalo" cx="256" cy="250" r="250" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="{b.GOLD}" stop-opacity=".3"/><stop offset=".5" stop-color="{b.FIRE}" stop-opacity=".1"/>
    <stop offset="1" stop-color="{b.FIRE}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="wood" x1="0" y1="-14" x2="0" y2="14" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#b9783f"/><stop offset=".5" stop-color="#8a5228"/><stop offset=".51" stop-color="#6b3c1c"/><stop offset="1" stop-color="#55301a"/>
  </linearGradient>
  <linearGradient id="steelHead" x1="-40" y1="0" x2="40" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#7d8fb2"/><stop offset=".5" stop-color="#7d8fb2"/><stop offset=".51" stop-color="{b.EDGE_S}"/><stop offset="1" stop-color="#262f42"/>
  </linearGradient>
</defs>"""
b.DEFS = b.DEFS + R3_DEFS


def ring_pts(cx, cy, rx, ry, rot, t0, t1, n=48):
    ph = math.radians(rot)
    out = []
    for i in range(n + 1):
        t = t0 + (t1 - t0) * i / n
        x = cx + rx * math.cos(t) * math.cos(ph) - ry * math.sin(t) * math.sin(ph)
        y = cy + rx * math.cos(t) * math.sin(ph) + ry * math.sin(t) * math.cos(ph)
        out.append((x, y))
    return out


def ring_arc(cx, cy, rx, ry, rot, t0, t1):
    pts = ring_pts(cx, cy, rx, ry, rot, t0, t1)
    return "M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in pts)


# ── A — The Rune Orbit: four elemental runes orbit the Dofus on the anvil ───
ORB = (262, 222, 200, 54, -10)
ORBIT_RUNES = [  # (t, width, element colour, glyph) — Ba/Pa/Ra tiers by size
    (0.30 * math.pi, 62, b.FIRE, "intelligence"),
    (0.78 * math.pi, 50, b.AIR, "agility"),
    (1.28 * math.pi, 34, b.WATER, "chance"),
    (1.78 * math.pi, 42, b.EARTH, "strength"),
]


def rune_orbit(uid="a", halo=True):
    cx, cy, rx, ry, rot = ORB
    p = []
    if halo:
        p.append('<circle cx="262" cy="230" r="250" fill="url(#halo)"/>')
    p.append(b.anvil_art())
    back = ring_arc(cx, cy, rx, ry, rot, math.pi, 2 * math.pi)
    front = ring_arc(cx, cy, rx, ry, rot, 0, math.pi)

    def band(d, back=False):
        g, hi = (b.GOLD_D, b.GOLD) if back else (b.GOLD, b.GOLD_B)
        return (f'<path d="{d}" fill="none" stroke="{b.OUTLINE}" stroke-width="13" stroke-linecap="round"/>'
                f'<path d="{d}" fill="none" stroke="{g}" stroke-width="6" stroke-linecap="round"/>'
                f'<path d="{d}" fill="none" stroke="{hi}" stroke-width="2" stroke-linecap="round" transform="translate(0 -1.5)"/>')

    def place(t, w, col, g, k, back=False):
        x, y = ring_pts(cx, cy, rx, ry, rot, t, t, 1)[0]
        return rune_stone(x, y, w, mix(col, "#000000", .28) if back else col, f"{uid}{k}", GLYPHS[g])

    p.append(band(back, True))
    for k, (t, w, col, g) in enumerate(ORBIT_RUNES):
        if t > math.pi:
            p.append(place(t, w, col, g, k, True))
    p.append(b.dofus(b.EGG_CX, b.EGG_TOP, b.EGG_BOT, b.EGG_RX, b.EGG_TONES["ocre"], uid, tilt=b.EGG_TILT))
    p.append(band(front))
    for k, (t, w, col, g) in enumerate(ORBIT_RUNES):
        if t < math.pi:
            p.append(place(t, w, col, g, k))
    p.append(f'<g fill="{b.GOLD_B}" stroke="{b.FIRE}" stroke-width="1.5">' + "".join(b.ember(*e) for e in [(388, 96, 7, 10), (150, 88, 5, -8), (330, 60, 3, 0), (196, 66, 2.5, 0)]) + "</g>")
    return "".join(p)


# ── B — The Ra Rune: the DF rune monogram, molten, in a gold-rimmed stone ───
def ra_rune(uid="b", halo=True):
    p = []
    if halo:
        p.append('<circle cx="256" cy="256" r="250" fill="url(#runeHalo)"/>')
    p.append(rune_stone(256, 262, 380, "#4a5a7c", uid, GLYPHS["df"], glow="molten", outline=12, glyph_scale=2.55))
    # gold rim inlays at the six corners: the ◆ rivets of the forge
    for x, y in hex_pts(256, 262, 380, 380 * 1.12):
        ix, iy = 256 + (x - 256) * .84, 262 + (y - 262) * .84
        p.append(f'<path transform="translate({fmt(ix)} {fmt(iy)})" d="M0 -13 L9 0 L0 13 L-9 0 Z" fill="{b.GOLD}" stroke="{b.OUTLINE}" stroke-width="3"/>')
        p.append(f'<path transform="translate({fmt(ix)} {fmt(iy)})" d="M0 -13 L9 0 L0 0 Z" fill="{b.GOLD_B}"/>')
    return "".join(p)


def ra_rune_small(uid="bs"):
    """16–32 px cut: no rivets, fatter glyph, thicker outline."""
    return rune_stone(256, 262, 420, "#4a5a7c", uid, GLYPHS["df"], glow="molten", outline=22, glyph_scale=3.0)


# ── C — The Strike: a hammer lands on a glowing rune on the anvil ───────────
def hammer(x, y, rot, uid):
    head = poly([(-34, -76), (34, -76), (42, -64), (42, 64), (34, 76), (-34, 76), (-42, 64), (-42, -64)])
    return "".join([
        f'<g transform="translate({fmt(x)} {fmt(y)}) rotate({fmt(rot)})">',
        # handle
        f'<path d="M40 -13 L216 -11 Q230 -11 230 0 Q230 11 216 11 L40 13 Z" fill="url(#wood)" stroke="{b.OUTLINE}" stroke-width="8" stroke-linejoin="round"/>',
        f'<path d="M166 -12 L190 -12 L190 12 L166 12 Z" fill="{b.GOLD}" stroke="{b.OUTLINE}" stroke-width="4"/>',
        f'<path d="M196 -12 L207 -12 L207 12 L196 12 Z" fill="{b.GOLD}" stroke="{b.OUTLINE}" stroke-width="4"/>',
        # head
        f'<path d="{head}" fill="url(#steelHead)" stroke="{b.OUTLINE}" stroke-width="9" stroke-linejoin="round"/>',
        f'<path d="M-42 -42 L42 -42 L42 -28 L-42 -28 Z" fill="{b.GOLD}" stroke="{b.OUTLINE}" stroke-width="4"/>',
        f'<path d="M-42 28 L42 28 L42 42 L-42 42 Z" fill="{b.GOLD}" stroke="{b.OUTLINE}" stroke-width="4"/>',
        f'<path d="M-26 -62 L-26 -50" stroke="#fffdf4" stroke-width="6" stroke-linecap="round" opacity=".8"/>',
        "</g>",
    ])


def strike(uid="c", halo=True, sparks=True):
    p = []
    if halo:
        p.append('<circle cx="256" cy="250" r="250" fill="url(#halo)"/>')
    p.append(b.anvil_art())
    p.append(rune_stone(250, 258, 112, b.GOLD_D, uid, GLYPHS["df"], glow="molten", outline=8))
    if sparks:
        # impact burst of ◆ sparks radiating from the strike point
        ix, iy = 252, 196
        for ang, dist, r in ((-160, 100, 9), (-132, 116, 6), (-104, 120, 7), (-196, 96, 5), (-20, 112, 7), (-2, 98, 4), (-178, 132, 3), (8, 128, 3)):
            a = math.radians(ang)
            sx, sy = ix + dist * math.cos(a), iy + dist * math.sin(a)
            p.append(f'<g fill="{b.GOLD_B}" stroke="{b.FIRE}" stroke-width="1.5">{b.ember(sx, sy, r, ang + 90)}</g>')
        for ang in (-150, -118, -190, -12):
            a = math.radians(ang)
            p.append(f'<path d="M{fmt(ix + 40 * math.cos(a))} {fmt(iy + 40 * math.sin(a))} L{fmt(ix + 70 * math.cos(a))} {fmt(iy + 70 * math.sin(a))}" '
                     f'stroke="{b.GOLD_B}" stroke-width="5" stroke-linecap="round" opacity=".8"/>')
    p.append(hammer(226, 124, -22, uid))
    return "".join(p)


def strike_small(uid="cs"):
    return strike(uid, halo=False, sparks=False)


# ── Stat rune set ──────────────────────────────────────────────────────────
def stat_rune(key, col, uid, w=100, cx=60, cy=62):
    return rune_stone(cx, cy, w, col, uid, GLYPHS[key], outline=6)


def write_svg(name, body, w=512, h=512, title="", bg=b.VOID, vb=None):
    b.write(name, b.svg(body, w, h, title, bg=bg, vb=vb))


def board():
    W, H = 1800, 1720
    t, _ = b.wordmark("SMITHMAGIC", b.WM_FONT, 58, 0.04, x0=60, base=150)
    p = [f'<rect width="{W}" height="{H}" fill="{b.VOID}"/>', f'<rect width="{W}" height="{H}" fill="url(#topGlow)"/>',
         bb.text(62, 64, "DOFUS FORGE · VISUAL IDENTITY · ROUND 3", 15, b.GOLD, 700, ls=3),
         b.game_text(t, stroke=8, shadow=4),
         bb.text(62, 200, "Smithmagic is the forge inside Dofus. Rune stones cut like gems, molten glyphs, Ba / Pa / Ra tiers — our forge signature in the game's own craft.", 20, b.INK, op=.75)]
    p.append(bb.card(60, 260, "A", "The Rune Orbit", "Combination · hero / landing",
                     ["Four elemental runes (Ba, Pa, Ra sizes)", "orbit the Dofus on the anvil: the", "whole build-crafting loop in one mark."],
                     rune_orbit("ba"), "0 20 512 512", b.hero_symbol(halo=False, uid="bas"), "0 60 480 452"))
    p.append(bb.card(630, 260, "B", "The Ra Rune", "Emblem · icon and monogram",
                     ["The DF rune — shared stem, angular D,", "Fehu-like F arms — glows molten inside", "a cut rune stone with ◆ rivets."],
                     ra_rune("bb"), "0 0 512 512", ra_rune_small("bbs"), "0 20 512 512", rec=True))
    p.append(bb.card(1200, 260, "C", "The Strike", "Pictorial · action / loader",
                     ["A gold-banded hammer lands on a", "molten rune: the moment of smithmagic.", "Born to animate (loader, success)."],
                     strike("bc"), "0 20 512 512", strike_small("bcs"), "0 40 512 452"))
    # stat rune strip
    y0 = 1210
    p.append(f'<rect x="60" y="{y0}" width="1680" height="300" rx="16" fill="{b.PANEL}" stroke="{b.EDGE}"/>')
    p.append(bb.text(96, y0 + 46, "SYSTEM · STAT RUNES", 15, b.GOLD, 700, ls=3))
    p.append(bb.text(96, y0 + 74, "One cut, one glyph per characteristic, coloured by DESIGN.md stat/element tokens — for stat rows, filters, smithmagic UI.", 17, b.INK, op=.7))
    for i, (k, name, col) in enumerate(STATS):
        x = 96 + i * 205
        p.append(f'<svg x="{x}" y="{y0 + 96}" width="130" height="134" viewBox="0 0 120 124">{stat_rune(k, col, f"s{i}")}</svg>')
        p.append(bb.text(x + 65, y0 + 262, name, 13, col, 700, "middle", ls=2))
    # tiers
    y1 = 1540
    p.append(f'<rect x="60" y="{y1}" width="1680" height="150" rx="16" fill="{b.PANEL}" stroke="{b.EDGE}"/>')
    p.append(bb.text(96, y1 + 46, "SYSTEM · RUNE TIERS", 15, b.GOLD, 700, ls=3))
    p.append(bb.text(96, y1 + 76, "Ba · Pa · Ra = small · medium · large. Use as rarity / membership ladder", 17, b.INK, op=.7))
    p.append(bb.text(96, y1 + 102, "or optimizer-quality badges.", 17, b.INK, op=.7))
    for i, (w, lab) in enumerate(((54, "BA"), (78, "PA"), (106, "RA"))):
        x = 1020 + i * 220
        p.append(f'<svg x="{x}" y="{y1 + 75 - w * .62}" width="{w}" height="{w * 1.24}" viewBox="0 0 120 124">{rune_stone(60, 62, 100, b.GOLD_D, f"t{i}", GLYPHS["df"], glow="molten", outline=6)}</svg>')
        p.append(bb.text(x + w + 18, y1 + 84, lab, 18, b.GOLD_B, 700, ls=3))
    defs = f"""<defs>
  <radialGradient id="topGlow" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="{b.GOLD}" stop-opacity=".10"/><stop offset="1" stop-color="{b.GOLD}" stop-opacity="0"/></radialGradient>
  <radialGradient id="cardGlow" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#2a2018"/><stop offset="1" stop-color="{b.PANEL}"/></radialGradient>
  <linearGradient id="hdr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{b.STONE}"/><stop offset="1" stop-color="{b.VOID}"/></linearGradient>
</defs>"""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{b.DEFS}{defs}{"".join(p)}</svg>'


def stat_sheet():
    p = [f'<rect width="1400" height="260" fill="{b.VOID}"/>']
    for i, (k, name, col) in enumerate(STATS):
        x = 40 + i * 170
        p.append(f'<svg x="{x}" y="30" width="130" height="134" viewBox="0 0 120 124">{stat_rune(k, col, f"x{i}")}</svg>')
        p.append(f'<text x="{x + 65}" y="210" text-anchor="middle" font-family="{bb.FONT_UI}" font-size="15" font-weight="700" letter-spacing="2" fill="{col}">{name}</text>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 260" width="1400" height="260">{b.DEFS}{"".join(p)}</svg>'


if __name__ == "__main__":
    write_svg("a-rune-orbit.svg", rune_orbit(), title="Dofus Forge — The Rune Orbit", vb="0 20 512 512")
    write_svg("b-ra-rune.svg", ra_rune(), title="Dofus Forge — The Ra Rune")
    write_svg("b-ra-rune-small.svg", ra_rune_small(), title="Dofus Forge — Ra Rune small-size cut", bg=None, vb="0 20 512 512")
    write_svg("c-strike.svg", strike(), title="Dofus Forge — The Strike", vb="0 20 512 512")
    b.write("b-lockup-h.svg", b.lockup_h(ra_rune_small("bl"), (0, 20, 512, 512), "Dofus Forge — Ra Rune horizontal lockup"))
    b.write("stat-runes.svg", stat_sheet())
    b.write("board.svg", board())
    print("ok", OUT)
