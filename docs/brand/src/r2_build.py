"""Round 2 — Dofus × Forja. Builds hero + flat marks, wordmark studies and concept boards.

usage: python r2_build.py <out-dir>
"""
import os, sys, math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "rounds", "r2-dofus-forge")
os.makedirs(OUT, exist_ok=True)

# ── Palette (docs/DESIGN.md §2) ─────────────────────────────────────────────
VOID, STONE, PANEL = "#0a0d13", "#11151e", "#171c28"
EDGE, EDGE_S = "#2b3446", "#3a465e"
GOLD_D, GOLD, GOLD_B = "#7f6428", "#c9a24b", "#eccb78"
EARTH, FIRE, WATER, AIR = "#c98a2b", "#e65f40", "#2f93d8", "#74b93f"
INK = "#e9e5da"
OUTLINE = "#07090d"
# Ankama-style cel shading: base, lit, highlight, shadow, marking, outline
EGG_TONES = {
    "ocre":   ("#c9741f", "#e9a540", "#f8d778", "#8f3f14", "#7a3310", "#2a1004"),
    "earth":  ("#a8641c", "#c98a2b", "#ecc06a", "#6e3a0e", "#5a2c08", "#241003"),
    "fire":   ("#b43a22", "#e65f40", "#f7a07a", "#7a1d0e", "#62160a", "#2a0704"),
    "water":  ("#1f6fae", "#2f93d8", "#8fd0f5", "#143f6e", "#0f3159", "#04121f"),
    "air":    ("#4f8a26", "#74b93f", "#c2e98c", "#2f5a14", "#244810", "#0b1a04"),
}


def fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def egg(cx, top, bottom, rx, waist=0.58):
    """Egg from 4 cubics: the widest point sits `waist` of the way down."""
    k = 0.5523
    wy = top + (bottom - top) * waist
    rt, rb = wy - top, bottom - wy
    return (f"M{fmt(cx)} {fmt(top)} C{fmt(cx + k * rx)} {fmt(top)} {fmt(cx + rx)} {fmt(wy - k * rt)} {fmt(cx + rx)} {fmt(wy)} "
            f"C{fmt(cx + rx)} {fmt(wy + k * rb)} {fmt(cx + k * rx)} {fmt(bottom)} {fmt(cx)} {fmt(bottom)} "
            f"C{fmt(cx - k * rx)} {fmt(bottom)} {fmt(cx - rx)} {fmt(wy + k * rb)} {fmt(cx - rx)} {fmt(wy)} "
            f"C{fmt(cx - rx)} {fmt(wy - k * rt)} {fmt(cx - k * rx)} {fmt(top)} {fmt(cx)} {fmt(top)} Z")


# ── Anvil (512 canvas): horn lifting at the tip, stepped heel, concave waist, flared feet ──
ANVIL = ("M160 318 L436 318 Q458 318 458 340 L458 350 Q458 372 436 372 L398 372 "
         "C356 372 336 392 336 420 C336 440 352 452 396 458 Q420 462 420 480 L420 486 Q420 498 406 498 "
         "L106 498 Q92 498 92 486 L92 480 Q92 462 116 458 C160 452 176 440 176 420 "
         "C176 394 166 378 140 376 C92 372 50 346 20 298 C60 314 110 318 160 318 Z")
ANVIL_TOP = "M20 298 C60 314 110 318 160 318 L436 318 Q458 318 458 340"
ANVIL_PLANE = "M20 298 C60 314 110 318 160 318 L436 318 Q458 318 458 340 L458 342 L160 342 C104 342 56 328 20 298 Z"
ANVIL_SHADE = ("M300 372 L470 372 L470 510 L80 510 L80 470 C150 470 230 468 300 440 Z "
               "M20 330 C60 352 110 360 150 364 L150 380 L10 380 Z")

EGG_CX, EGG_TOP, EGG_BOT, EGG_RX = 262, 122, 318, 76
EGG_TILT = 7


def dofus(cx, top, bot, rx, tones, uid, tilt=0.0, outline_w=8, bands=True):
    """Cel-shaded Dofus: shadow base, lit body, highlight, egg markings, gloss, thick outline."""
    base, lit, hi, shade, mark, line = tones
    shape = egg(cx, top, bot, rx)
    h = bot - top
    p = [f'<clipPath id="egg{uid}"><path d="{shape}"/></clipPath>',
         f'<g transform="rotate({fmt(tilt)} {fmt(cx)} {fmt(bot)})">',
         f'<path d="{shape}" fill="{shade}"/>',
         f'<g clip-path="url(#egg{uid})">',
         f'<path d="{egg(cx - rx * .1, top - h * .02, bot - h * .06, rx * .9)}" fill="{base}"/>',
         f'<path d="{egg(cx - rx * .2, top + h * .02, bot - h * .2, rx * .7)}" fill="{lit}"/>']
    if bands:
        y1, y2 = top + h * .6, top + h * .76
        for y, t in ((y1, h * .07), (y2, h * .035)):
            p.append(f'<path d="M{fmt(cx - rx * 1.2)} {fmt(y)} C{fmt(cx - rx * .4)} {fmt(y + h * .09)} {fmt(cx + rx * .4)} {fmt(y - h * .08)} '
                     f'{fmt(cx + rx * 1.2)} {fmt(y + h * .02)} L{fmt(cx + rx * 1.2)} {fmt(y + h * .02 + t)} '
                     f'C{fmt(cx + rx * .4)} {fmt(y - h * .08 + t)} {fmt(cx - rx * .4)} {fmt(y + h * .09 + t)} {fmt(cx - rx * 1.2)} {fmt(y + t)} Z" '
                     f'fill="{mark}" opacity=".8"/>')
    p.append(f'<path d="{egg(cx - rx * .34, top + h * .1, top + h * .5, rx * .3)}" fill="{hi}" opacity=".85"/>')
    p.append("</g>")
    # gloss: kidney highlight + spark dot
    gx, gy = cx - rx * .46, top + h * .25
    p.append(f'<ellipse cx="{fmt(gx)}" cy="{fmt(gy)}" rx="{fmt(rx * .13)}" ry="{fmt(h * .12)}" '
             f'transform="rotate(20 {fmt(gx)} {fmt(gy)})" fill="#fffdf4"/>')
    p.append(f'<circle cx="{fmt(gx + rx * .06)}" cy="{fmt(gy + h * .2)}" r="{fmt(rx * .065)}" fill="#fffdf4"/>')
    p.append(f'<path d="{shape}" fill="none" stroke="{line}" stroke-width="{outline_w}"/>')
    p.append("</g>")
    return "".join(p)


def ember(x, y, r, rot=0):
    """Forge spark: a tall diamond (echoes the header ◆) or, when r < 3.5, a round ember."""
    if r < 3.5:
        return f'<circle cx="{fmt(x)}" cy="{fmt(y)}" r="{fmt(r)}"/>'
    return (f'<path transform="translate({fmt(x)} {fmt(y)}) rotate({rot})" '
            f'd="M0 {fmt(-r * 1.7)} L{fmt(r)} 0 L0 {fmt(r * 1.7)} L{fmt(-r)} 0 Z"/>')


EMBERS = [(394, 150, 10, 12), (360, 92, 6, 8), (432, 224, 6, 18), (126, 176, 8, -12),
          (168, 108, 5, -6), (98, 246, 3, 0), (414, 290, 3, 0), (304, 66, 2.5, 0), (210, 84, 2.5, 0)]

DEFS = f"""<defs>
  <radialGradient id="halo" cx="262" cy="230" r="250" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="{FIRE}" stop-opacity=".42"/>
    <stop offset=".4" stop-color="{GOLD}" stop-opacity=".14"/>
    <stop offset="1" stop-color="{GOLD}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="hotspot" cx="262" cy="324" r="120" gradientTransform="translate(0 290) scale(1 .1)" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#ffd27a" stop-opacity=".95"/>
    <stop offset=".5" stop-color="{FIRE}" stop-opacity=".5"/>
    <stop offset="1" stop-color="{FIRE}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="goldText" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff1bd"/>
    <stop offset=".45" stop-color="{GOLD_B}"/>
    <stop offset=".55" stop-color="{GOLD}"/>
    <stop offset="1" stop-color="{GOLD_D}"/>
  </linearGradient>
  <clipPath id="anvilClip"><path d="{ANVIL}"/></clipPath>
</defs>"""


def anvil_art():
    return "".join([
        f'<path d="{ANVIL}" fill="#1b2232"/>',
        '<g clip-path="url(#anvilClip)">',
        f'<path d="{ANVIL}" transform="translate(-12 -12)" fill="{EDGE_S}"/>',
        f'<path d="{ANVIL_PLANE}" fill="#5f7194"/>',
        '<rect x="120" y="300" width="290" height="60" fill="url(#hotspot)"/>',
        '</g>',
        f'<path d="{ANVIL_TOP}" fill="none" stroke="{GOLD_B}" stroke-width="3" opacity=".9"/>',
        f'<path d="M398 372 C356 372 336 392 336 420" fill="none" stroke="{GOLD}" stroke-width="3" opacity=".5"/>',
        f'<path d="M256 388 L272 412 L256 436 L240 412 Z" fill="{GOLD}" stroke="{OUTLINE}" stroke-width="3"/>',
        f'<path d="M256 388 L272 412 L256 412 Z" fill="{GOLD_B}"/>',
        f'<path d="{ANVIL}" fill="none" stroke="{OUTLINE}" stroke-width="9" stroke-linejoin="round"/>',
    ])


def hero_symbol(tones=EGG_TONES["ocre"], halo=True, uid="a"):
    p = []
    if halo:
        p.append('<circle cx="262" cy="230" r="250" fill="url(#halo)"/>')
    p.append(anvil_art())
    p.append(dofus(EGG_CX, EGG_TOP, EGG_BOT, EGG_RX, tones, uid, tilt=EGG_TILT))
    p.append(f'<g fill="{GOLD_B}" stroke="{FIRE}" stroke-width="1.5">' + "".join(ember(*e) for e in EMBERS) + "</g>")
    return "".join(p)


def flat_symbol(fill="#000"):
    """One-colour cut: anvil + egg separated by a gap, gloss as a hole (no masks: evenodd + separate paths)."""
    from math import radians, sin, cos
    return (f'<path d="{ANVIL}" fill="{fill}"/>'
            f'<g transform="rotate({EGG_TILT} {EGG_CX} {EGG_BOT})">'
            f'<path d="{egg(EGG_CX, EGG_TOP - 12, EGG_BOT + 6, EGG_RX + 12)}" fill="#fff"/>'
            f'<path fill-rule="evenodd" fill="{fill}" d="{egg(EGG_CX, EGG_TOP, EGG_BOT - 4, EGG_RX)} '
            f'{egg(EGG_CX - EGG_RX * .46, EGG_TOP + 32, EGG_TOP + 104, EGG_RX * .15)}"/></g>'
            f'<g fill="{fill}">' + "".join(ember(*e) for e in EMBERS[:4]) + "</g>")


def svg(body, w, h, title, bg=None, vb=None):
    r = f'<rect x="-2000" y="-2000" width="5000" height="5000" fill="{bg}"/>' if bg else ""
    vb = vb or f"0 0 {w} {h}"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}" role="img" '
            f'aria-labelledby="t"><title id="t">{title}</title>\n{DEFS}\n{r}\n{body}\n</svg>\n')


# ── Wordmark from real font outlines ───────────────────────────────────────
def wordmark(text, font, cap_h, track_em, x0=0.0, base=0.0):
    f = TTFont(os.path.join(FONTS, font))
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f["hmtx"]
    upm = f["head"].unitsPerEm
    bp = BoundsPen(gs); gs[cmap[ord("H")]].draw(bp)
    s = cap_h / bp.bounds[3]
    pen = SVGPathPen(gs, ntos=fmt)
    x = x0
    for ch in text:
        g = cmap[ord(ch)]
        if ch != " ":
            gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, base)))
        x += hmtx[g][0] * s + track_em * upm * s
    return pen.getCommands(), x - track_em * upm * s - x0


def game_text(d, stroke=10, shadow=6):
    """Dofus-style title treatment: drop shadow, dark outline, gold bevel fill."""
    return (f'<path d="{d}" transform="translate(0 {shadow})" fill="{OUTLINE}" stroke="{OUTLINE}" stroke-width="{stroke}" stroke-linejoin="round" opacity=".7"/>'
            f'<path d="{d}" fill="{OUTLINE}" stroke="{OUTLINE}" stroke-width="{stroke}" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="url(#goldText)" stroke="#3b2a0c" stroke-width="1.5"/>')


WM_FONT = "CinzelDecorative-Black.ttf"


def write(name, content):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
        fh.write(content)


def glyphs(text, font, cap_h, track_em):
    """Per-glyph outlines centred on their own advance, for setting type on a curve."""
    f = TTFont(os.path.join(FONTS, font))
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f["hmtx"]
    upm = f["head"].unitsPerEm
    bp = BoundsPen(gs); gs[cmap[ord("H")]].draw(bp)
    s = cap_h / bp.bounds[3]
    out = []
    for ch in text:
        g = cmap[ord(ch)]
        adv = hmtx[g][0] * s
        d = ""
        if ch != " ":
            pen = SVGPathPen(gs, ntos=fmt)
            gs[g].draw(TransformPen(pen, (s, 0, 0, -s, -adv / 2, 0)))
            d = pen.getCommands()
        out.append((d, adv + track_em * upm * s))
    return out


def arc_text(text, font, cap_h, track_em, cx, cy, R):
    """Text on the bottom of a circle (smile): baseline radius R around (cx, cy), reading left to right."""
    gl = glyphs(text, font, cap_h, track_em)
    total = sum(a for _, a in gl)
    ang = total / 2 / R
    out = []
    for d, adv in gl:
        mid = ang - adv / 2 / R
        x, y = cx - R * math.sin(mid), cy + R * math.cos(mid)
        if d:
            out.append(f'<path d="{d}" transform="translate({fmt(x)} {fmt(y)}) rotate({fmt(math.degrees(mid))})"/>')
        ang -= adv / R
    return "".join(out)


# ribbon following the arc of the text (smile), folded tails behind
RIBBON_FACE = "M70 352 Q256 448 442 352 L452 412 Q256 512 60 412 Z"
RIBBON_TAILS = "M64 372 L8 364 L36 404 L16 442 L72 438 Z M448 372 L504 364 L476 404 L496 442 L440 438 Z"
RIBBON_EDGE = "M76 362 Q256 456 436 362"


def seal():
    """B — Sello de la Forja: beveled gold medallion, studs, A inside, ribbon with arched wordmark."""
    p = ['<circle cx="256" cy="256" r="244" fill="#07090d"/>',
         '<circle cx="256" cy="256" r="236" fill="url(#ringGold)"/>',
         '<circle cx="256" cy="256" r="206" fill="#07090d"/>',
         '<circle cx="256" cy="256" r="200" fill="url(#sealBg)"/>']
    for i in range(12):
        a = math.radians(i * 30)
        x, y = 256 + 221 * math.sin(a), 256 - 221 * math.cos(a)
        p.append(f'<path transform="translate({fmt(x)} {fmt(y)}) rotate({i * 30})" d="M0 -8 L6 0 L0 8 L-6 0 Z" fill="#3b2a0c"/>')
    p.append(f'<g transform="translate(256 236) scale(.64) translate(-239 -300)">{hero_symbol(halo=False, uid="b")}</g>')
    p.append(f'<path d="{RIBBON_TAILS}" fill="#6e1f10" stroke="#07090d" stroke-width="7" stroke-linejoin="round"/>')
    p.append(f'<path d="{RIBBON_FACE}" fill="url(#ribbon)" stroke="#07090d" stroke-width="7" stroke-linejoin="round"/>')
    p.append(f'<path d="{RIBBON_EDGE}" fill="none" stroke="{GOLD_B}" stroke-width="2.5" opacity=".8"/>')
    t = arc_text("DOFUS FORGE", WM_FONT, 30, 0.08, 256, 34, 412)
    p.append(f'<g fill="#07090d" stroke="#07090d" stroke-width="6" stroke-linejoin="round" transform="translate(0 2)">{t}</g>')
    p.append(f'<g fill="url(#goldText)">{t}</g>')
    return "".join(p)


def blazon():
    """C — Dofus Blasonado: the Dofus is the shield; a gold anvil is forged into its band."""
    shape = egg(256, 28, 492, 186)
    p = [dofus(256, 28, 492, 186, EGG_TONES["ocre"], "c", bands=False, outline_w=12),
         f'<clipPath id="eggC2"><path d="{shape}"/></clipPath>',
         f'<g clip-path="url(#eggC2)"><path d="M40 296 C150 332 362 266 472 296 L472 396 C362 366 150 432 40 396 Z" fill="#5a2c08"/>'
         f'<path d="M40 296 C150 332 362 266 472 296" fill="none" stroke="{GOLD_B}" stroke-width="5"/>'
         f'<path d="M40 396 C150 432 362 366 472 396" fill="none" stroke="{GOLD_B}" stroke-width="5"/></g>',
         f'<g transform="translate(256 346) scale(.4) translate(-239 -398)">'
         f'<path d="{ANVIL}" fill="url(#goldText)" stroke="#07090d" stroke-width="16" stroke-linejoin="round"/></g>',
         f'<path d="{shape}" fill="none" stroke="#2a1004" stroke-width="12"/>']
    return "".join(p)


def lockup_h(sym, sym_vb, title, flat=False):
    """Horizontal lockup: symbol at 256 tall + wordmark."""
    d, w = wordmark("DOFUS FORGE", WM_FONT, 70, 0.05, x0=300, base=164)
    sx, sy, sw, sh = sym_vb
    sc = 256 / sh
    body = f'<g transform="scale({fmt(sc)}) translate({fmt(-sx)} {fmt(-sy)})">{sym}</g>' + (
        f'<path d="{d}" fill="{GOLD_B}"/>' if flat else game_text(d, stroke=9, shadow=5))
    return svg(body, int(300 + w + 24), 256, title)


def lockup_v(sym, sym_vb, title):
    d, w = wordmark("DOFUS FORGE", WM_FONT, 64, 0.05, x0=0, base=0)
    W = int(w + 80)
    sx, sy, sw, sh = sym_vb
    sc = 300 / sh
    body = (f'<g transform="translate({fmt((W - sw * sc) / 2)} 10) scale({fmt(sc)}) translate({fmt(-sx)} {fmt(-sy)})">{sym}</g>'
            f'<g transform="translate(40 392)">{game_text(d, stroke=9, shadow=5)}</g>')
    return svg(body, W, 430, title)


DEFS = DEFS + f"""<defs>
  <linearGradient id="ringGold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff1bd"/><stop offset=".35" stop-color="{GOLD_B}"/>
    <stop offset=".6" stop-color="{GOLD}"/><stop offset="1" stop-color="{GOLD_D}"/>
  </linearGradient>
  <radialGradient id="sealBg" cx="50%" cy="42%" r="60%">
    <stop offset="0" stop-color="#3a2216"/><stop offset=".55" stop-color="{PANEL}"/><stop offset="1" stop-color="{VOID}"/>
  </radialGradient>
  <linearGradient id="ribbon" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#b43a22"/><stop offset="1" stop-color="#6e1f10"/>
  </linearGradient>
</defs>"""


if __name__ == "__main__":
    A_VB = (0, 20, 512, 512)
    write("a-hero-symbol.svg", svg(hero_symbol(), 512, 512, "Dofus Forge — Forged Dofus", bg=VOID, vb="0 20 512 512"))
    write("a-flat-symbol.svg", svg(flat_symbol(), 512, 512, "Dofus Forge — one-colour symbol", vb="0 20 512 512"))
    write("b-seal.svg", svg(seal(), 512, 512, "Dofus Forge — Forge Seal", bg=VOID))
    write("c-blazon.svg", svg(blazon(), 512, 512, "Dofus Forge — Blazoned Dofus", bg=VOID))
    write("a-lockup-h.svg", lockup_h(hero_symbol(halo=False, uid="ah"), (0, 60, 480, 452), "Dofus Forge — horizontal"))
    write("a-lockup-v.svg", lockup_v(hero_symbol(uid="av"), A_VB, "Dofus Forge — stacked"))
    write("b-lockup-h.svg", lockup_h(seal(), (0, 0, 512, 512), "Dofus Forge — B horizontal"))
    write("c-lockup-h.svg", lockup_h(blazon(), (0, 0, 512, 512), "Dofus Forge — C horizontal"))

    rows, y = [], 150
    for font in ("Cinzel-900.ttf", "CinzelDecorative-Bold.ttf", "CinzelDecorative-Black.ttf"):
        d, w = wordmark("DOFUS FORGE", font, 96, 0.06, x0=80, base=y)
        rows.append(game_text(d))
        rows.append(f'<text x="80" y="{y + 40}" fill="{INK}" opacity=".5" font-family="Inter,sans-serif" font-size="20">{font}</text>')
        y += 190
    write("wordmark-study.svg", svg("".join(rows), 1400, y - 40, "Wordmark study", bg=VOID))
    print("ok", OUT)
