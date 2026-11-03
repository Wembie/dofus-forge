"""Build Dofus Forge concept SVGs: 3 symbols + Cinzel-outlined wordmark lockups."""
import os, sys, math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

W = sys.argv[1]
FONTS = sys.argv[2]
os.makedirs(W, exist_ok=True)

def fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s

def poly(pts):
    return "M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in pts) + " Z"

def inset(pts, d):
    """Inset a convex polygon by d (works for either winding)."""
    n = len(pts)
    area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
    sgn = 1 if area > 0 else -1
    lines = []
    for i in range(n):
        (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % n]
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        nx, ny = -dy / L * sgn, dx / L * sgn
        lines.append(((x1 + nx * d, y1 + ny * d), (dx, dy)))
    out = []
    for i in range(n):
        (p, r), (q, s) = lines[i - 1], lines[i]
        cross = r[0] * s[1] - r[1] * s[0]
        t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / cross
        out.append((p[0] + t * r[0], p[1] + t * r[1]))
    return out

def svg(paths, vb, title, fills=None):
    w, h = vb
    body = []
    for i, d in enumerate(paths):
        f = fills[i] if fills else "#000"
        body.append(f'  <path fill="{f}" d="{d}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
            f'role="img" aria-labelledby="title">\n  <title id="title">{title}</title>\n' + "\n".join(body) + "\n</svg>\n")

# ── A · Gema Dofus: faceted egg, 9 convex facets with real gaps ─────────────
GAP = float(os.environ.get("GAP", 7))
_k = math.tan(math.radians(60))
tt = (128, 87)
tr, tl = (164, 87 + 36 * _k), (92, 87 + 36 * _k)
tb = (128, 87 + 72 * _k)
_r1y = 87 - 50 * math.tan(math.radians(30))
T, R1, R2, R3, B = (128, 16), (178, _r1y), (214, tr[1]), (214 - 36 * _k * math.tan(math.radians(15)), tb[1]), (128, 240)
L1, L2, L3 = (78, _r1y), (42, tr[1]), (42 + 36 * _k * math.tan(math.radians(15)), tb[1])
FACETS = {
    "crown-r": [T, R1, tt],
    "crown-l": [T, tt, L1],
    "upper-r": [R1, R2, tr, tt],
    "upper-l": [L1, tt, tl, L2],
    "lower-r": [R2, R3, tb, tr],
    "lower-l": [L2, tl, tb, L3],
    "pavilion": [R3, B, L3],
    "table": [tt, tr, tb, tl],
}
# facet → tone (0 bright, 1 mid, 2 deep): light from upper-left, like the UI bevels
TONE = {"crown-l": 0, "upper-l": 0, "table": 0, "crown-r": 1, "lower-l": 1,
        "upper-r": 1, "lower-r": 2, "pavilion": 2}
a_paths = [poly(inset(p, GAP / 2)) for p in FACETS.values()]
a_tone = [TONE[k] for k in FACETS]

# ── B · F-martillo: F whose top arm is a hammer head ─────────────────────────
b_paths = [
    # head: wedge peen left, chamfered striking face right
    poly([(36, 56), (64, 28), (200, 28), (216, 44), (216, 76), (200, 92), (64, 92)]),
    # handle/stem, chamfered end
    poly([(100, 92), (144, 92), (144, 226), (130, 240), (100, 240)]),
    # middle arm, chamfered tip
    poly([(144, 140), (190, 140), (206, 156), (190, 172), (144, 172)]),
]

# ── C · Yunque ◆: anvil with the header diamond forged above it ─────────────
c_paths = [
    poly([(128, 20), (156, 62), (128, 104), (100, 62)]),
    ("M20 122 L226 122 L226 152 L190 152 C172 152 162 164 162 182 L194 214 L194 238 L62 238 L62 214 "
     "L94 182 C94 164 86 152 72 152 C48 152 30 142 20 122 Z"),
]

# ── Wordmark: Cinzel outlines, tracked ──────────────────────────────────────
def wordmark(text, font_file, cap_h, tracking_em, x0=0, y_base=0):
    f = TTFont(font_file)
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f["hmtx"]
    upm = f["head"].unitsPerEm
    bp = BoundsPen(gs); gs[cmap[ord("H")]].draw(bp)
    s = cap_h / bp.bounds[3]
    pen = SVGPathPen(gs, ntos=fmt)
    x = x0
    for ch in text:
        if ch == " ":
            x += hmtx[cmap[ord(" ")]][0] * s + tracking_em * upm * s
            continue
        g = cmap[ord(ch)]
        tp = TransformPen(pen, (s, 0, 0, -s, x, y_base))
        gs[g].draw(tp)
        x += hmtx[g][0] * s + tracking_em * upm * s
    return pen.getCommands(), x - tracking_em * upm * s - x0

def transform_path(d, sc, dx, dy):
    """Scale+translate a path made only of M/L/C/Z absolute commands."""
    out, nums, tok = [], [], ""
    import re
    parts = re.findall(r"[MLCZ]|-?\d+(?:\.\d+)?", d)
    res, buf, axis = [], [], 0
    for p in parts:
        if p in "MLCZ":
            res.append(p); axis = 0
        else:
            v = float(p)
            v = v * sc + (dx if axis == 0 else dy)
            axis ^= 1
            res.append(fmt(v))
    return " ".join(res)

FONT = os.path.join(FONTS, "Cinzel-700.ttf")
CAP = 78
TRACK = 0.16

def lockup(name, sym_paths, sym_fills=None, ink="#000"):
    wm, wm_w = wordmark("DOFUS FORGE", FONT, CAP, TRACK, x0=256 + 56, y_base=128 + CAP / 2)
    width = int(256 + 56 + wm_w + 8)
    paths = list(sym_paths) + [wm]
    fills = (sym_fills or ["#000"] * len(sym_paths)) + [ink]
    return svg(paths, (width, 256), f"Dofus Forge — {name}", fills)

GOLD = ["#eccb78", "#c9a24b", "#7f6428"]
concepts = {
    "a": ("Gema Dofus", a_paths, [GOLD[t] for t in a_tone]),
    "b": ("F-martillo", b_paths, None),
    "c": ("Yunque", c_paths, None),
}
for k, (name, paths, colour) in concepts.items():
    open(os.path.join(W, f"{k}-symbol.svg"), "w", encoding="utf-8").write(svg(paths, (256, 256), f"Dofus Forge — {name}"))
    open(os.path.join(W, f"{k}-lockup.svg"), "w", encoding="utf-8").write(lockup(name, paths))
    if colour:
        open(os.path.join(W, f"{k}-symbol-gold.svg"), "w", encoding="utf-8").write(svg(paths, (256, 256), f"Dofus Forge — {name}", colour))
print("ok")
