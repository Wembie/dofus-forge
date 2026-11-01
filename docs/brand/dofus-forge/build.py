"""Dofus Forge — definitive identity (R8). Builds every concept with its full kit, the boards, and can apply
one concept to the live site.

    python docs/brand/dofus-forge/build.py              build all concepts into concepts/<id>/
    python docs/brand/dofus-forge/build.py --apply c    also copy concept c into public/ (favicons, PWA,
                                                        apple-touch, Discord, OG, header assets, 404 emblem)

Visual language comes from the site itself (docs/DESIGN.md + the live UI): flat faceted gold in three tones,
no outlines, on a void tile with a gold hairline border and a soft glow — the same treatment as the planner's
equipment and class slots. Wordmark: Cinzel small caps, like every title on the site.
"""
import base64, io, math, os, re, shutil, subprocess, sys, tempfile
import xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
FONT = os.path.join(HERE, "..", "src", "fonts", "Cinzel-700.ttf")
RENDER = os.path.expanduser("~/.claude/skills/logo-design/scripts/render_png.py")

# ── Tokens (docs/DESIGN.md §2) ─────────────────────────────────────────────
VOID, STONE, PANEL, PARCH, RAISED = "#0a0d13", "#11151e", "#171c28", "#1c2130", "#212636"
EDGE, EDGE_S = "#2b3446", "#3a465e"
GOLD_D, GOLD, GOLD_B = "#7f6428", "#c9a24b", "#eccb78"
INK, INK_M = "#e9e5da", "#9aa0b0"
EARTH, FIRE, WATER, AIR, NEUTRAL = "#c98a2b", "#e65f40", "#2f93d8", "#74b93f", "#b9b3a6"

DEFS = f"""<defs>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f8e3a3"/><stop offset=".32" stop-color="{GOLD_B}"/>
    <stop offset=".72" stop-color="{GOLD}"/><stop offset="1" stop-color="#9b7a33"/>
  </linearGradient>
  <linearGradient id="goldShade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#b8923f"/><stop offset="1" stop-color="#6b5220"/>
  </linearGradient>
  <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5d6c88"/><stop offset=".45" stop-color="{EDGE_S}"/><stop offset="1" stop-color="#1f2636"/>
  </linearGradient>
  <linearGradient id="steelShade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2f3a50"/><stop offset="1" stop-color="#151a26"/>
  </linearGradient>
  <radialGradient id="tile" cx="50%" cy="34%" r="80%">
    <stop offset="0" stop-color="#1d2334"/><stop offset=".6" stop-color="{STONE}"/><stop offset="1" stop-color="{VOID}"/>
  </radialGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="{GOLD}" stop-opacity=".34"/><stop offset=".55" stop-color="{GOLD}" stop-opacity=".08"/>
    <stop offset="1" stop-color="{GOLD}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ember" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="{FIRE}" stop-opacity=".30"/><stop offset="1" stop-color="{FIRE}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{GOLD_B}"/><stop offset=".5" stop-color="{GOLD}"/><stop offset="1" stop-color="{GOLD_D}"/>
  </linearGradient>
</defs>"""


def fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def egg(cx, top, bottom, rx, waist=0.58):
    k = 0.5523
    wy = top + (bottom - top) * waist
    rt, rb = wy - top, bottom - wy
    return (f"M{fmt(cx)} {fmt(top)} C{fmt(cx + k * rx)} {fmt(top)} {fmt(cx + rx)} {fmt(wy - k * rt)} {fmt(cx + rx)} {fmt(wy)} "
            f"C{fmt(cx + rx)} {fmt(wy + k * rb)} {fmt(cx + k * rx)} {fmt(bottom)} {fmt(cx)} {fmt(bottom)} "
            f"C{fmt(cx - k * rx)} {fmt(bottom)} {fmt(cx - rx)} {fmt(wy + k * rb)} {fmt(cx - rx)} {fmt(wy)} "
            f"C{fmt(cx - rx)} {fmt(wy - k * rt)} {fmt(cx - k * rx)} {fmt(top)} {fmt(cx)} {fmt(top)} Z")


def diamond(x, y, w, h):
    return f"M{fmt(x)} {fmt(y - h)} L{fmt(x + w)} {fmt(y)} L{fmt(x)} {fmt(y + h)} L{fmt(x - w)} {fmt(y)} Z"


def poly(pts):
    return "M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in pts) + " Z"


def faceted_egg(cx, top, bot, rx, uid, holes=""):
    """Gold Dofus with a shadow facet on the right and a thin rim light on the left — no outline."""
    h = bot - top
    shape = egg(cx, top, bot, rx) + (" " + holes if holes else "")
    shade = (f"M{fmt(cx + rx * .2)} {fmt(top - 2)} C{fmt(cx + rx * .8)} {fmt(top + h * .3)} {fmt(cx + rx * .7)} {fmt(top + h * .8)} "
             f"{fmt(cx + rx * .02)} {fmt(bot + 2)} L{fmt(cx + rx * 1.3)} {fmt(bot + 2)} L{fmt(cx + rx * 1.3)} {fmt(top - 2)} Z")
    rim = (f"M{fmt(cx - rx * .78)} {fmt(top + h * .5)} C{fmt(cx - rx * .8)} {fmt(top + h * .28)} "
           f"{fmt(cx - rx * .55)} {fmt(top + h * .1)} {fmt(cx - rx * .18)} {fmt(top + h * .05)}")
    return (f'<clipPath id="e{uid}"><path fill-rule="evenodd" d="{shape}"/></clipPath>'
            f'<path fill-rule="evenodd" d="{shape}" fill="url(#gold)"/>'
            f'<g clip-path="url(#e{uid})"><path d="{shade}" fill="url(#goldShade)" opacity=".92"/>'
            f'<path d="{rim}" fill="none" stroke="#fff6dc" stroke-width="{fmt(rx * .07)}" stroke-linecap="round" opacity=".75"/></g>')


# Geometric anvil on a 512 box: flat face, tapered horn, faceted waist, stepped feet
ANVIL = [(48, 300), (420, 300), (420, 338), (380, 338), (346, 366), (346, 396), (392, 426), (392, 452),
         (120, 452), (120, 426), (166, 396), (166, 366), (132, 338), (104, 338)]
ANVIL_D = poly(ANVIL[:-1]) .replace(" Z", "") + " Q70 334 48 300 Z"


def anvil(dx=0, dy=0, s=1.0, uid="a"):
    t = f'transform="translate({fmt(dx)} {fmt(dy)}) scale({fmt(s)})"'
    shade = poly([(132, 338), (420, 338), (380, 338), (346, 366), (346, 396), (392, 426), (392, 452), (120, 452), (120, 426), (166, 396), (166, 366)])
    return (f'<g {t}><clipPath id="an{uid}"><path d="{ANVIL_D}"/></clipPath>'
            f'<path d="{ANVIL_D}" fill="url(#steel)"/>'
            f'<g clip-path="url(#an{uid})"><path d="{shade}" fill="url(#steelShade)" opacity=".55"/>'
            f'<rect x="0" y="300" width="512" height="7" fill="{GOLD_B}" opacity=".9"/>'
            f'<rect x="0" y="307" width="512" height="10" fill="#fff" opacity=".06"/></g></g>')


# ── The three marks (512 box, transparent) ─────────────────────────────────
def mark_slot(uid="s", dots=True, framed=True):
    """A — The Slot: the planner's class slot — gold-framed rounded square on an element ring, a Dofus inside."""
    p = []
    if dots:
        p.append(f'<circle cx="256" cy="256" r="214" fill="none" stroke="{GOLD_D}" stroke-width="5" opacity=".75"/>')
        for a, c in ((-135, FIRE), (-45, EARTH), (45, AIR), (135, WATER)):
            x, y = 256 + 214 * math.cos(math.radians(a)), 256 + 214 * math.sin(math.radians(a))
            p.append(f'<circle cx="{fmt(x)}" cy="{fmt(y)}" r="22" fill="{c}"/>'
                     f'<circle cx="{fmt(x - 6)}" cy="{fmt(y - 7)}" r="7" fill="#fff" opacity=".35"/>')
    if framed:
        p.append('<rect x="106" y="106" width="300" height="300" rx="56" fill="url(#tile)"/>'
             '<rect x="106" y="106" width="300" height="300" rx="56" fill="url(#glow)"/>'
                 f'<rect x="110" y="110" width="292" height="292" rx="52" fill="none" stroke="url(#hair)" stroke-width="8"/>')
        p.append(faceted_egg(256, 146, 372, 84, uid))
    else:
        p.append(faceted_egg(256, 112, 404, 110, uid))
    return "".join(p)


def mark_anvil(uid="v"):
    """B — Forged Dofus: a faceted gold Dofus resting on a steel anvil, a ◆ spark above."""
    return (f'<ellipse cx="256" cy="282" rx="150" ry="26" fill="url(#ember)"/>'
            + anvil(uid=uid)
            + faceted_egg(256, 64, 302, 92, uid)
            + f'<path d="{diamond(384, 96, 14, 24)}" fill="url(#gold)"/>'
            + f'<path d="{diamond(126, 150, 9, 15)}" fill="{GOLD}" opacity=".85"/>')


# anvil cut out of the egg (negative space), plus a ◆ spark hole
CUT_ANVIL = poly([(150, 318), (362, 318), (362, 344), (334, 344), (310, 364), (310, 382), (342, 404), (342, 420),
                  (170, 420), (170, 404), (202, 382), (202, 364), (178, 344), (168, 344)])[:-2] + " Q150 340 132 318 L150 318 Z"
CUT_SPARK = diamond(256, 236, 22, 38)


def mark_forge_egg(uid="f"):
    """C — The Forge Egg: one gold Dofus with the anvil and a ◆ spark cut out of it — the forge inside the egg."""
    return faceted_egg(256, 24, 488, 168, uid, holes=f"{CUT_ANVIL} {CUT_SPARK}")


# ── C2 — The Forge Egg, premium: polished metal, engraved anvil lit by the forge, a burning ◆ spark ──
EGG2 = (256, 22, 486, 164)
# refined anvil: sweeping horn, concave waist, flared feet (512 box, inside the egg)
ANVIL2 = ("M120 330 C150 326 178 325 200 325 L358 325 Q364 325 364 331 L364 344 Q364 350 358 350 L338 350 "
          "C320 352 308 362 306 378 L306 386 C308 397 320 403 338 405 Q344 406 344 412 L344 418 Q344 424 338 424 "
          "L174 424 Q168 424 168 418 L168 412 Q168 406 174 405 C192 403 204 397 206 386 L206 378 "
          "C204 363 194 353 176 351 L172 351 C150 351 132 344 120 330 Z")
SPARK2 = diamond(256, 226, 27, 52)
SPARK2_CORE = diamond(256, 228, 13, 28)
DEFS += f"""<defs>
  <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff4cf"/><stop offset=".16" stop-color="#f3d68c"/><stop offset=".42" stop-color="#d9b25c"/>
    <stop offset=".58" stop-color="#a77d32"/><stop offset=".7" stop-color="#c9a24b"/><stop offset=".84" stop-color="#e8c977"/>
    <stop offset="1" stop-color="#8d6a26"/>
  </linearGradient>
  <radialGradient id="metalSide" cx="34%" cy="30%" r="78%">
    <stop offset="0" stop-color="#3b2a0c" stop-opacity="0"/><stop offset=".62" stop-color="#3b2a0c" stop-opacity="0"/>
    <stop offset="1" stop-color="#2a1d07" stop-opacity=".62"/>
  </radialGradient>
  <linearGradient id="bevel" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff7da"/><stop offset=".45" stop-color="#f0d58e" stop-opacity=".4"/>
    <stop offset=".55" stop-color="#5a420f" stop-opacity=".4"/><stop offset="1" stop-color="#3d2c08"/>
  </linearGradient>
  <linearGradient id="recess" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0d0805"/><stop offset=".55" stop-color="#1f0e07"/><stop offset="1" stop-color="#4a170a"/>
  </linearGradient>
  <linearGradient id="molten" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fffbe8"/><stop offset=".4" stop-color="#ffd27a"/><stop offset="1" stop-color="#f08a3a"/>
  </linearGradient>
  <radialGradient id="spec" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="tile2" cx="50%" cy="30%" r="85%">
    <stop offset="0" stop-color="#222a3d"/><stop offset=".55" stop-color="#121722"/><stop offset="1" stop-color="#06080d"/>
  </radialGradient>
  <radialGradient id="floor" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="{FIRE}" stop-opacity=".38"/><stop offset=".5" stop-color="{GOLD}" stop-opacity=".12"/>
    <stop offset="1" stop-color="{GOLD}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="aura" cx="50%" cy="46%" r="50%">
    <stop offset="0" stop-color="{GOLD_B}" stop-opacity=".26"/><stop offset=".6" stop-color="{GOLD}" stop-opacity=".06"/>
    <stop offset="1" stop-color="{GOLD}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="frame" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fbe7ad"/><stop offset=".35" stop-color="{GOLD}"/><stop offset=".75" stop-color="{GOLD_D}"/>
    <stop offset="1" stop-color="#b8924a"/>
  </linearGradient>
</defs>"""


def forge_egg2(uid="p", glow=True):
    cx, top, bot, rx = EGG2
    shape = egg(cx, top, bot, rx)
    h = bot - top
    shade = (f"M{fmt(cx + rx * .28)} {fmt(top - 2)} C{fmt(cx + rx * .86)} {fmt(top + h * .3)} {fmt(cx + rx * .78)} {fmt(top + h * .8)} "
             f"{fmt(cx + rx * .14)} {fmt(bot + 2)} L{fmt(cx + rx * 1.3)} {fmt(bot + 2)} L{fmt(cx + rx * 1.3)} {fmt(top - 2)} Z")
    p = [f'<clipPath id="g{uid}"><path d="{shape}"/></clipPath>',
         f'<clipPath id="r{uid}"><path d="{ANVIL2}"/></clipPath>',
         f'<path d="{shape}" fill="url(#metal)"/>',
         f'<g clip-path="url(#g{uid})">',
         f'<path d="{shape}" fill="url(#metalSide)"/>',
         f'<path d="{shade}" fill="#5c4313" opacity=".28"/>',
         # specular: long soft streak + crisp glint
         f'<ellipse cx="{fmt(cx - rx * .44)}" cy="{fmt(top + h * .27)}" rx="{fmt(rx * .13)}" ry="{fmt(h * .17)}" transform="rotate(14 {fmt(cx - rx * .44)} {fmt(top + h * .27)})" fill="url(#spec)" opacity=".75"/>',
         f'<path d="M{fmt(cx - rx * .8)} {fmt(top + h * .52)} C{fmt(cx - rx * .82)} {fmt(top + h * .3)} {fmt(cx - rx * .6)} {fmt(top + h * .1)} {fmt(cx - rx * .24)} {fmt(top + h * .04)}" '
         f'fill="none" stroke="#fffbea" stroke-width="{fmt(rx * .045)}" stroke-linecap="round" opacity=".9"/>',
         # bevel: 14-wide stroke clipped to the egg = 7 px inner bevel, light top-left, dark bottom-right
         f'<path d="{shape}" fill="none" stroke="url(#bevel)" stroke-width="14" opacity=".85"/>',
         # engraved anvil: lip highlight below, recess, inner forge glow
         f'<path d="{ANVIL2}" transform="translate(0 3)" fill="#fff1c4" opacity=".75"/>',
         f'<path d="{ANVIL2}" fill="url(#recess)"/>',
         f'<g clip-path="url(#r{uid})">']
    if glow:
        for w, o in ((22, .14), (12, .28), (5, .7)):
            p.append(f'<path d="{ANVIL2}" fill="none" stroke="{FIRE}" stroke-width="{w}" opacity="{o}"/>')
        p.append(f'<path d="M100 325 L370 325 L370 333 L100 333 Z" fill="#ffcf73" opacity=".55"/>')
    p.append(f'<path d="{ANVIL2}" transform="translate(0 -4)" fill="none" stroke="#000" stroke-width="6" opacity=".45"/></g>')
    # spark: an engraved ◆ socket holding a molten core
    p.append(f'<path d="{SPARK2}" transform="translate(0 3)" fill="#fff1c4" opacity=".75"/>'
             f'<path d="{SPARK2}" fill="url(#recess)"/>')
    if glow:
        p.append(f'<path d="{SPARK2}" fill="none" stroke="{FIRE}" stroke-width="7" opacity=".45"/>'
                 f'<path d="{diamond(256, 228, 20, 40)}" fill="{FIRE}" opacity=".35"/>')
    p.append(f'<path d="{SPARK2_CORE}" fill="url(#molten)"/>'
             f'<path d="M256 200 L269 228 L256 228 Z" fill="#fff" opacity=".55"/>')
    p.append("</g>")
    return "".join(p)


def mark_forge_egg2(uid="p"):
    """C2 — The Forge Egg, premium."""
    return (f'<ellipse cx="256" cy="488" rx="150" ry="16" fill="#000" opacity=".45"/>'
            + forge_egg2(uid))


def forge_egg2_small():
    """16–48 px cut: bright two-tone gold, a fat engraved anvil and a solid spark — no glow, no glints."""
    cx, top, bot, rx = EGG2
    shape = egg(cx, top, bot, rx)
    return (f'<clipPath id="gs"><path d="{shape}"/></clipPath><path d="{shape}" fill="url(#metal)"/>'
            f'<g clip-path="url(#gs)"><path d="{shape}" fill="url(#metalSide)"/></g>'
            f'<path d="{ANVIL2}" transform="translate(256 374) scale(1.18) translate(-238 -369)" fill="#1a0c06"/>'
            f'<path d="{diamond(256, 222, 34, 62)}" fill="#1a0c06"/><path d="{diamond(256, 224, 17, 32)}" fill="#ffd27a"/>')


CONCEPTS = {
    "a": dict(slug="a-the-slot", name="The Slot", mark=mark_slot,
              idea="The planner's class slot becomes the logo: a gold-framed tile on the element ring, a Dofus inside.",
              small=lambda: mark_slot("ss", dots=False, framed=False), tile_mark=lambda u: mark_slot(u, framed=False)),
    "b": dict(slug="b-forged-dofus", name="Forged Dofus", mark=mark_anvil,
              idea="A faceted gold Dofus resting on a steel anvil — the build, forged. Gold and steel, straight from the UI.",
              small=lambda: mark_anvil("bs")),
    "c": dict(slug="c-forge-egg", name="The Forge Egg", mark=mark_forge_egg,
              idea="One gold Dofus with the anvil and a ◆ spark cut out of it: the forge lives inside the egg.",
              small=lambda: mark_forge_egg("cs")),
    "c2": dict(slug="c2-forge-egg-premium", name="The Forge Egg · Premium", mark=mark_forge_egg2, premium=True,
               idea="Polished gold Dofus with the anvil engraved into it, lit from inside by the forge, and a burning ◆ spark.",
               small=forge_egg2_small, small_tile={"scale": .94, "border": False}, tile_mark=lambda u: forge_egg2(u)),
}


# ── Containers ─────────────────────────────────────────────────────────────
def tile(mark_svg, scale=.66, radius=112, full=False, border=True):
    """App-icon tile: void gradient, gold glow, gold hairline — the site's slot treatment."""
    r = 0 if full else radius
    off = (512 - 512 * scale) / 2
    parts = [f'<rect width="512" height="512" rx="{r}" fill="url(#tile)"/>',
             f'<rect width="512" height="512" rx="{r}" fill="url(#glow)" opacity=".9"/>']
    if border:
        inset = 22 if full else 14
        parts.append(f'<rect x="{inset}" y="{inset}" width="{512 - 2 * inset}" height="{512 - 2 * inset}" rx="{max(r - inset, 96 if full else 0)}" '
                     f'fill="none" stroke="url(#hair)" stroke-width="6" opacity=".9"/>')
    parts.append(f'<g transform="translate({fmt(off)} {fmt(off)}) scale({fmt(scale)})">{mark_svg}</g>')
    return "".join(parts)


def tile_premium(mark_svg, scale=.66, radius=112, full=False, border=True):
    """Jewel tile: vignetted void, gold aura, forge floor glow, double gold filet and a ◆ on the top edge."""
    r = 0 if full else radius
    off = (512 - 512 * scale) / 2
    parts = [f'<rect width="512" height="512" rx="{r}" fill="url(#tile2)"/>',
             f'<rect width="512" height="512" rx="{r}" fill="url(#aura)"/>',
             f'<ellipse cx="256" cy="{fmt(off + 512 * scale * .93)}" rx="{fmt(190 * scale / .66)}" ry="{fmt(60 * scale / .66)}" fill="url(#floor)"/>']
    if border:
        i1 = 22 if full else 12
        r1 = 96 if full else r - i1
        parts += [f'<rect x="{i1}" y="{i1}" width="{512 - 2 * i1}" height="{512 - 2 * i1}" rx="{r1}" fill="none" stroke="url(#frame)" stroke-width="6"/>',
                  f'<rect x="{i1 + 13}" y="{i1 + 13}" width="{512 - 2 * i1 - 26}" height="{512 - 2 * i1 - 26}" rx="{r1 - 13}" fill="none" stroke="{GOLD}" stroke-width="1.6" opacity=".35"/>',
                  f'<path d="M{i1 + r1} {i1 + 4} L{512 - i1 - r1} {i1 + 4}" stroke="#fff" stroke-width="2" opacity=".18"/>',
                  f'<path d="{diamond(256, i1, 18, 15)}" fill="#0b0e15"/>',
                  f'<path d="{diamond(256, i1, 12, 10)}" fill="url(#frame)"/>']
    parts.append(f'<g transform="translate({fmt(off)} {fmt(off)}) scale({fmt(scale)})">{mark_svg}</g>')
    return "".join(parts)


def tile_for(cid):
    return tile_premium if CONCEPTS[cid].get("premium") else tile


def svg_doc(body, w, h, title, vb=None, bg=None):
    vb = vb or f"0 0 {w} {h}"
    bgr = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    raw = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}" role="img" aria-labelledby="t">'
           f'<title id="t">{title}</title>{DEFS}{bgr}{body}</svg>')
    return prune(raw)


def prune(svg_text):
    ET.register_namespace("", "http://www.w3.org/2000/svg")
    root = ET.fromstring(svg_text)
    ns = "{http://www.w3.org/2000/svg}"
    for _ in range(3):
        body = ET.tostring(root, encoding="unicode")
        for defs in root.iter(f"{ns}defs"):
            for el in list(defs):
                i = el.get("id")
                if i and f"#{i})" not in body:
                    defs.remove(el)
    return ET.tostring(root, encoding="unicode")


# ── Wordmark: Cinzel small caps, exactly like the site's titles ─────────────
def wordmark(text="Dofus Forge", cap=100, track=0.05):
    f = TTFont(FONT)
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f["hmtx"]
    upm = f["head"].unitsPerEm
    bp = BoundsPen(gs); gs[cmap[ord("H")]].draw(bp)
    s = cap / bp.bounds[3]
    pen = SVGPathPen(gs, ntos=fmt)
    x = 0.0
    for ch in text:
        g = cmap[ord(ch)]
        if ch != " ":
            gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, cap)))
        x += hmtx[g][0] * s + track * upm * s
    w = x - track * upm * s
    return pen.getCommands(), w, cap * 1.08


def lockup(cid):
    """Horizontal lockup: app tile + gold wordmark."""
    d, w, h = wordmark(cap=120)
    W = int(300 + w + 20)
    body = (f'<g transform="scale(.5)">{tile_for(cid)(CONCEPTS[cid].get("tile_mark", CONCEPTS[cid]["mark"])(cid + "L"))}</g>'
            f'<path transform="translate(296 66)" d="{d}" fill="url(#gold)"/>')
    return svg_doc(body, W, 256, "Dofus Forge"), W, 256


def text(x, y, s, size=20, fill=INK, weight=400, anchor="start", op=1, ls=0, family="Segoe UI, Inter, sans-serif"):
    return (f'<text x="{x}" y="{y}" font-family="{family}" font-size="{size}" font-weight="{weight}" fill="{fill}" '
            f'opacity="{op}" text-anchor="{anchor}" letter-spacing="{ls}">{s}</text>')


def chip(x, y, label, active=False):
    w = 18 + len(label) * 8.6
    fill = "#2a2316" if active else "none"
    return (f'<rect x="{fmt(x)}" y="{y}" width="{fmt(w)}" height="34" rx="17" fill="{fill}" stroke="{GOLD}" stroke-opacity="{.9 if active else .55}"/>'
            + text(x + w / 2, y + 23, label, 15, GOLD_B, 600, "middle")), w


def og(cid):
    """1200×630 social card, built from the site's own components: slot tile, Cinzel title, gold chips."""
    _, w100, _ = wordmark(cap=100)
    cap = min(66, 100 * 580 / w100)
    d, w, h = wordmark(cap=cap)
    p = [f'<rect width="1200" height="630" fill="{VOID}"/>',
         f'<circle cx="300" cy="315" r="360" fill="url(#glow)"/>',
         f'<rect x="0.5" y="0.5" width="1199" height="629" fill="none" stroke="{EDGE}"/>',
         f'<g transform="translate(110 125) scale(.74)">{tile_for(cid)(CONCEPTS[cid].get("tile_mark", CONCEPTS[cid]["mark"])(cid + "O"))}</g>',
         f'<path transform="translate(560 {fmt(262 - cap)})" d="{d}" fill="url(#gold)"/>',
         text(562, 330, "Build planner &amp; optimizer for Dofus 3", 30, INK, 500),
         text(562, 372, "Every item, set and rune — and The Forger finds your best gear.", 21, INK_M)]
    x = 562
    for lab in ("Builder", "The Forger", "Sets", "Magesmithy"):
        c, cw = chip(x, 420, lab, active=lab == "The Forger")
        p.append(c)
        x += cw + 12
    p.append(text(562, 540, "dofusforge.com", 22, GOLD, 700, ls=1.5))
    return svg_doc("".join(p), 1200, 630, "Dofus Forge — Build planner for Dofus 3")


def emblem_404(cid):
    """Inline SVG for public/404.html (no external refs, small)."""
    return svg_doc(tile_for(cid)(CONCEPTS[cid]["small"](), **CONCEPTS[cid].get("small_tile", {})), 512, 512, "Dofus Forge")


# ── Rendering ──────────────────────────────────────────────────────────────
def render(svg_text, w, h=None, bg=None):
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "x.svg")
    open(src, "w", encoding="utf-8").write(svg_text)
    cmd = [sys.executable, RENDER, src, "--out-dir", tmp] + (["--size", str(w)] if h is None else ["--width", str(w), "--height", str(h)])
    if bg:
        cmd += ["--bg", bg]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)
    im = Image.open(os.path.join(tmp, "x.png")).convert("RGBA")
    shutil.rmtree(tmp, ignore_errors=True)
    return im


def build(cid):
    c = CONCEPTS[cid]
    out = os.path.join(HERE, "concepts", c["slug"])
    sv, pn = os.path.join(out, "svg"), os.path.join(out, "png")
    for d in (sv, pn):
        os.makedirs(d, exist_ok=True)
    W = lambda n, s: open(os.path.join(sv, n), "w", encoding="utf-8").write(s)

    mark = svg_doc(c["mark"](cid + "m"), 512, 512, "Dofus Forge")
    tm = c.get("tile_mark", c["mark"])
    T = tile_for(cid)
    app = svg_doc(T(tm(cid + "t")), 512, 512, "Dofus Forge")
    small = svg_doc(T(c["small"](), **c.get("small_tile", {"scale": .74})), 512, 512, "Dofus Forge")
    square = svg_doc(T(tm(cid + "q"), full=True), 512, 512, "Dofus Forge")
    disc = svg_doc(T(tm(cid + "d"), scale=.62, full=True, border=False), 512, 512, "Dofus Forge")
    mask = svg_doc(T(tm(cid + "k"), scale=.5, full=True, border=False), 512, 512, "Dofus Forge")
    lk, lw, lh = lockup(cid)
    wd, ww, wh = wordmark()
    wm = svg_doc(f'<path d="{wd}" fill="url(#gold)"/>', int(ww) + 2, int(wh), "Dofus Forge")
    ogs = og(cid)
    for n, s in (("mark.svg", mark), ("app-icon.svg", app), ("favicon.svg", small), ("app-icon-square.svg", square),
                 ("app-icon-maskable.svg", mask), ("lockup-horizontal.svg", lk), ("wordmark.svg", wm), ("og-preview.svg", ogs)):
        W(n, s)

    big_mark = render(mark, 1024)
    big_app = render(app, 1024)
    big_small = render(small, 512)
    big_square = render(square, 1024, bg=VOID)
    for s in (256, 512, 1024):
        big_mark.resize((s, s), Image.LANCZOS).save(os.path.join(pn, f"mark-{s}.png"))
    for s in (16, 32, 48):
        big_small.resize((s, s), Image.LANCZOS).save(os.path.join(pn, f"favicon-{s}.png"))
    for s in (64, 96, 128, 192, 256, 512, 1024):
        big_app.resize((s, s), Image.LANCZOS).save(os.path.join(pn, f"favicon-{s}.png"))
    big_square.convert("RGB").resize((180, 180), Image.LANCZOS).save(os.path.join(pn, "apple-touch-icon.png"))
    render(disc, 512, bg=VOID).convert("RGB").save(os.path.join(pn, "discord-bot-icon.png"))
    render(mask, 512, bg=VOID).convert("RGB").save(os.path.join(pn, "app-icon-maskable-512.png"))
    ico = [Image.open(os.path.join(pn, f"favicon-{s}.png")) for s in (16, 32, 48)]
    ico[2].save(os.path.join(out, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:2])
    for w in (600, 1200):
        render(lk, w, round(w * lh / lw)).save(os.path.join(pn, f"lockup-horizontal-{w}.png"))
    ogi = render(ogs, 1200, 630)
    ogi.save(os.path.join(pn, "og-preview.png"))
    ogi.convert("RGB").save(os.path.join(pn, "og-preview.jpg"), quality=90, optimize=True)
    open(os.path.join(sv, "404-emblem.svg"), "w", encoding="utf-8").write(emblem_404(cid))
    board(cid, out, lk, lw, lh)
    return out


def data_uri(path):
    return "data:image/png;base64," + base64.b64encode(open(path, "rb").read()).decode()


def board(cid, out, lk, lw, lh):
    """Presentation board with the real rendered PNGs in context."""
    c, pn = CONCEPTS[cid], os.path.join(out, "png")
    img = lambda n, x, y, w, h=None, extra="": f'<image href="{data_uri(os.path.join(pn, n))}" x="{x}" y="{y}" width="{w}" height="{h or w}" {extra}/>'
    d, w, h = wordmark(cap=40)
    hd, hw, hh = wordmark(cap=15, track=.06)
    p = [f'<rect width="1600" height="1180" fill="{VOID}"/>', f'<circle cx="330" cy="430" r="380" fill="url(#glow)" opacity=".6"/>',
         text(64, 70, f"DOFUS FORGE · DEFINITIVE IDENTITY · CONCEPT {cid.upper()}", 15, GOLD, 700, ls=3),
         f'<path transform="translate(64 96)" d="{d}" fill="url(#gold)"/>',
         text(64 + w + 24, 136, c["name"], 30, INK, 600),
         text(64, 186, c["idea"], 19, INK_M),
         img("favicon-512.png", 64, 230, 520),
         # size ladder at true pixels
         f'<rect x="640" y="230" width="896" height="180" rx="14" fill="{PANEL}" stroke="{EDGE}"/>',
         text(664, 262, "TRUE SIZE", 12, GOLD, 700, ls=2)]
    x = 670
    for s in (128, 64, 48, 32, 16):
        p.append(img(f"favicon-{s}.png", x, 290 + (128 - s) / 2 - 10, s))
        p.append(text(x + s / 2, 400, f"{s}", 12, INK_M, anchor="middle"))
        x += s + 48
    p.append(img("favicon-16.png", x + 10, 284, 96, extra='style="image-rendering:pixelated"'))
    p.append(text(x + 58, 400, "16 ×6", 12, INK_M, anchor="middle"))
    # browser tab
    p.append(f'<rect x="640" y="440" width="896" height="96" rx="14" fill="#202430"/>'
             f'<path d="M664 536 L664 476 Q664 464 676 464 L960 464 Q972 464 972 476 L972 536 Z" fill="{PANEL}"/>'
             + img("favicon-32.png", 682, 484, 16) + text(708, 498, "Dofus Forge — Build planner for Dofus 3", 14, INK))
    # header mock (52px, the real site header)
    p.append(f'<rect x="640" y="566" width="896" height="52" rx="10" fill="{STONE}" stroke="{EDGE}"/>'
             + img("favicon-64.png", 656, 575, 34)
             + f'<path transform="translate(700 584)" d="{hd}" fill="url(#gold)"/>')
    hx = 700 + hw + 30
    for lab in ("Explore", "My Builds", "Sets"):
        cw = 30 + len(lab) * 7
        p.append(f'<rect x="{fmt(hx)}" y="579" width="{fmt(cw)}" height="26" rx="13" fill="none" stroke="{EDGE_S}"/>'
                 + text(hx + cw / 2, 597, lab, 12, INK_M, 600, "middle"))
        hx += cw + 8
    # discord + iOS + android maskable
    p.append(text(640, 664, "DISCORD · iOS · ANDROID", 12, GOLD, 700, ls=2))
    p.append(f'<clipPath id="dc"><circle cx="720" cy="760" r="72"/></clipPath><g clip-path="url(#dc)">'
             + img("discord-bot-icon.png", 648, 688, 144) + "</g>")
    p.append(f'<clipPath id="ios"><rect x="830" y="688" width="144" height="144" rx="32"/></clipPath><g clip-path="url(#ios)">'
             + img("apple-touch-icon.png", 830, 688, 144) + "</g>")
    p.append(f'<clipPath id="and"><circle cx="1084" cy="760" r="72"/></clipPath><g clip-path="url(#and)">'
             + img("app-icon-maskable-512.png", 1012, 688, 144) + "</g>")
    p.append(f'<rect x="1196" y="688" width="340" height="144" rx="14" fill="{INK}"/>' + img("favicon-128.png", 1212, 704, 112)
             + text(1340, 768, "on light", 16, VOID, 600))
    # lockup + og
    p.append(text(64, 800, "LOCKUP", 12, GOLD, 700, ls=2))
    p.append(img("lockup-horizontal-1200.png", 64, 818, 540, 540 * lh / lw))
    p.append(text(640, 870, "OG / SOCIAL PREVIEW", 12, GOLD, 700, ls=2))
    p.append(img("og-preview.png", 640, 888, 520, 273))
    p.append(f'<rect x="1196" y="888" width="340" height="273" rx="14" fill="{PANEL}" stroke="{EDGE}"/>'
             + img("mark-256.png", 1281, 913, 170)
             + text(1366, 1130, "mark · transparent", 13, INK_M, anchor="middle"))
    raw = f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1600 1180" width="1600" height="1180">{DEFS}{"".join(p)}</svg>'
    open(os.path.join(out, "board.svg"), "w", encoding="utf-8").write(raw)
    render(raw, 1600, 1180).convert("RGB").save(os.path.join(out, "board.png"), quality=92)


def overview():
    p = [f'<rect width="1800" height="900" fill="{VOID}"/>',
         text(64, 70, "DOFUS FORGE · DEFINITIVE IDENTITY · R8", 15, GOLD, 700, ls=3)]
    d, w, h = wordmark(cap=44)
    p.append(f'<path transform="translate(64 96)" d="{d}" fill="url(#gold)"/>')
    p.append(text(64, 196, "Marks in the site's own language: gold on a void tile with a gold filet, Cinzel small caps. C2 refines C into polished, engraved metal.", 19, INK_M))
    REC = "c2"
    for i, cid in enumerate(CONCEPTS):
        c = CONCEPTS[cid]
        x = 64 + i * 426
        pn = os.path.join(HERE, "concepts", c["slug"], "png")
        p.append(f'<rect x="{x}" y="240" width="402" height="600" rx="18" fill="{PANEL}" stroke="{GOLD if cid == REC else EDGE}" stroke-width="{2 if cid == REC else 1}"/>')
        p.append(f'<image href="{data_uri(os.path.join(pn, "favicon-512.png"))}" x="{x + 61}" y="280" width="280" height="280"/>')
        for k, s in enumerate((64, 32, 16)):
            p.append(f'<image href="{data_uri(os.path.join(pn, f"favicon-{s}.png"))}" x="{x + 100 + k * 90}" y="{600 + (64 - s) / 2}" width="{s}" height="{s}"/>')
        p.append(text(x + 28, 730, f"{cid.upper()} · {c['name']}", 22, GOLD_B, 700, family="Cinzel, Georgia, serif"))
        words, line, lines = c["idea"].split(), "", []
        for wd in words:
            if len(line) + len(wd) > 40:
                lines.append(line); line = ""
            line += wd + " "
        lines.append(line)
        for k, ln in enumerate(lines[:4]):
            p.append(text(x + 28, 764 + k * 22, ln.strip(), 15, INK_M))
        if cid == REC:
            p.append(f'<rect x="{x + 248}" y="262" width="140" height="30" rx="15" fill="{GOLD_D}"/>' + text(x + 318, 282, "RECOMMENDED", 12, GOLD_B, 700, "middle", ls=1.5))
    raw = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 900" width="1800" height="900">{DEFS}{"".join(p)}</svg>'
    open(os.path.join(HERE, "overview.svg"), "w", encoding="utf-8").write(raw)
    render(raw, 1800, 900).convert("RGB").save(os.path.join(HERE, "overview.png"), quality=92)


def apply(cid):
    """Copy one concept onto the live site. Paths match src/data/brand.ts and the conventional root files."""
    c = CONCEPTS[cid]
    src = os.path.join(HERE, "concepts", c["slug"])
    pub, brand = os.path.join(ROOT, "public"), os.path.join(ROOT, "public", "brand")
    os.makedirs(brand, exist_ok=True)
    for f in os.listdir(brand):
        os.remove(os.path.join(brand, f))
    cp = lambda a, b: shutil.copyfile(os.path.join(src, a), b)
    cp("svg/favicon.svg", os.path.join(pub, "favicon.svg"))
    cp("favicon.ico", os.path.join(pub, "favicon.ico"))
    for s in (48, 192, 512):
        cp(f"png/favicon-{s}.png", os.path.join(pub, f"favicon-{s}.png"))
    cp("png/apple-touch-icon.png", os.path.join(pub, "apple-touch-icon.png"))
    cp("png/discord-bot-icon.png", os.path.join(pub, "discord-bot-icon.png"))
    cp("png/og-preview.jpg", os.path.join(pub, "og-preview.jpg"))
    for a, b in (("svg/app-icon.svg", "icon.svg"), ("svg/mark.svg", "mark.svg"), ("svg/wordmark.svg", "wordmark.svg"),
                 ("svg/lockup-horizontal.svg", "lockup-horizontal.svg"), ("png/og-preview.jpg", "og-preview.jpg"),
                 ("png/favicon-512.png", "icon-512.png"), ("png/app-icon-maskable-512.png", "icon-maskable-512.png"),
                 ("png/mark-1024.png", "mark-1024.png"), ("png/lockup-horizontal-1200.png", "lockup-horizontal-1200.png")):
        cp(a, os.path.join(brand, b))
    # 404.html: swap the inline emblem between its markers
    p404 = os.path.join(pub, "404.html")
    html = open(p404, encoding="utf-8").read()
    emb = open(os.path.join(src, "svg", "404-emblem.svg"), encoding="utf-8").read()
    emb = emb.replace('<svg ', '<svg class="emblem" ', 1)
    html = re.sub(r"<!-- brand:emblem -->.*?<!-- /brand:emblem -->", lambda m: f"<!-- brand:emblem -->{emb}<!-- /brand:emblem -->", html, flags=re.S)
    open(p404, "w", encoding="utf-8").write(html)
    _, ww, wh = wordmark()
    print(f"applied {c['slug']} · wordmark aspect {int(ww) + 2}/{int(wh)}")


if __name__ == "__main__":
    only = [a for a in sys.argv[1:] if a in CONCEPTS]
    for cid in (only if only and "--apply" not in sys.argv else list(CONCEPTS)):
        print("built", build(cid))
    overview()
    if "--apply" in sys.argv:
        apply(sys.argv[sys.argv.index("--apply") + 1])
