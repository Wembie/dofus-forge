"""Dofus Forge identity (R9) — the marks as exact vector geometry.

Every shape is built from a handful of cubic Béziers and straight edges, clipped analytically
(the curves are split at the exact intersection, never sampled), so the SVG that ships is clean,
editable artwork: no clipPath, no mask, no gradient, no filter. Flat fills only.

Canvas: 512 × 512. The Dofus is a single egg curve; seams are negative space.
"""
import math

# ── Palette (docs/DESIGN.md §2 / src/index.css) ────────────────────────────
GOLD_B, GOLD, GOLD_D = "#eccb78", "#c9a24b", "#7f6428"
HOT = "#fff1c9"          # the molten core: the hottest gold on the site (gold-bright pushed to near white)
VOID = "#0a0d13"
INK = "#e9e5da"

# Light-theme golds (src/index.css [data-theme=light]): the mark on paper keeps the same facets, darker.
LIGHT = {"b": "#a87000", "g": "#7d5400", "d": "#5a3a00", "hot": "#c9a24b"}


def fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


# ── Segments: ('L', p0, p1) | ('C', p0, c1, c2, p1) ─────────────────────────
K = 0.5523


def egg_segments(cx, top, bottom, rx, waist=0.58):
    """A Dofus: four cubics, widest at `waist` of the height (pointed crown, round base)."""
    wy = top + (bottom - top) * waist
    rt, rb = wy - top, bottom - wy
    P = lambda x, y: (x, y)
    return [
        ("C", P(cx, top), P(cx + K * rx, top), P(cx + rx, wy - K * rt), P(cx + rx, wy)),
        ("C", P(cx + rx, wy), P(cx + rx, wy + K * rb), P(cx + K * rx, bottom), P(cx, bottom)),
        ("C", P(cx, bottom), P(cx - K * rx, bottom), P(cx - rx, wy + K * rb), P(cx - rx, wy)),
        ("C", P(cx - rx, wy), P(cx - rx, wy - K * rt), P(cx - K * rx, top), P(cx, top)),
    ]


def _bez(p0, c1, c2, p1, t):
    u = 1 - t
    return (u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
            u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1])


def _split(seg, t):
    _, p0, c1, c2, p1 = seg
    lerp = lambda a, b: (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    a, b, c = lerp(p0, c1), lerp(c1, c2), lerp(c2, p1)
    d, e = lerp(a, b), lerp(b, c)
    m = lerp(d, e)
    return ("C", p0, a, d, m), ("C", m, e, c, p1)


def _roots(seg, f, n=64):
    """Parameters where f(point) crosses zero along a cubic (sampled bracket + bisection)."""
    _, p0, c1, c2, p1 = seg
    g = lambda t: f(_bez(p0, c1, c2, p1, t))
    out, prev_t, prev_v = [], 0.0, g(0.0)
    for i in range(1, n + 1):
        t = i / n
        v = g(t)
        if prev_v == 0:
            out.append(prev_t)
        elif prev_v * v < 0:
            a, b, fa = prev_t, t, prev_v
            for _ in range(40):
                m = (a + b) / 2
                fm = g(m)
                if fa * fm <= 0:
                    b = m
                else:
                    a, fa = m, fm
            out.append((a + b) / 2)
        prev_t, prev_v = t, v
    return [r for r in out if 1e-6 < r < 1 - 1e-6]


def _mid(seg):
    if seg[0] == "L":
        return ((seg[1][0] + seg[2][0]) / 2, (seg[1][1] + seg[2][1]) / 2)
    return _bez(seg[1], seg[2], seg[3], seg[4], 0.5)


def _end(seg):
    return seg[-1]


def _start(seg):
    return seg[1]


def clip(segs, n, d):
    """Keep the part of a closed loop where n·p <= d (n is the outward normal of the cut)."""
    f = lambda p: n[0] * p[0] + n[1] * p[1] - d
    pieces = []
    for s in segs:
        if s[0] == "L":
            a, b = s[1], s[2]
            fa, fb = f(a), f(b)
            if fa * fb < 0:
                t = fa / (fa - fb)
                m = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                pieces += [("L", a, m), ("L", m, b)]
            else:
                pieces.append(s)
        else:
            cur, parts, t0 = s, [], 0.0
            for r in _roots(s, f):
                tt = (r - t0) / (1 - t0)
                left, cur = _split(cur, tt)
                parts.append(left)
                t0 = r
            parts.append(cur)
            pieces += parts
    kept = [p for p in pieces if f(_mid(p)) <= 0]
    if not kept:
        return []
    # re-join: a gap between consecutive kept pieces is a straight edge along the cut
    out = []
    for i, p in enumerate(kept):
        prev = kept[i - 1]
        if math.dist(_end(prev), _start(p)) > 1e-6:
            out.append(("L", _end(prev), _start(p)))
        out.append(p)
    return out


def _inside_poly(pt, poly):
    x, y, inside = pt[0], pt[1], False
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i - 1], poly[i]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def _flatten(segs, n=12):
    pts = []
    for s in segs:
        if s[0] == "L":
            pts.append(s[1])
        else:
            pts += [_bez(s[1], s[2], s[3], s[4], i / n) for i in range(n)]
    return pts


def _seg_x_line(a, b, c, d):
    """Intersection of segments a-b and c-d, or None."""
    r = (b[0] - a[0], b[1] - a[1])
    s = (d[0] - c[0], d[1] - c[1])
    den = r[0] * s[1] - r[1] * s[0]
    if abs(den) < 1e-9:
        return None
    qp = (c[0] - a[0], c[1] - a[1])
    t = (qp[0] * s[1] - qp[1] * s[0]) / den
    u = (qp[0] * r[1] - qp[1] * r[0]) / den
    if -1e-9 <= t <= 1 + 1e-9 and -1e-9 <= u <= 1 + 1e-9:
        return (a[0] + r[0] * t, a[1] + r[1] * t), t
    return None


def cut_polygon(segs, poly):
    """Subtract a convex polygon that overlaps the loop only across straight edges (the plates' tips)."""
    hits = []
    for i, s in enumerate(segs):
        if s[0] != "L":
            continue
        for j in range(len(poly)):
            h = _seg_x_line(s[1], s[2], poly[j - 1], poly[j])
            if h:
                hits.append((i, h[1], h[0], j))
    if len(hits) != 2:
        raise ValueError(f"expected 2 crossings, got {len(hits)}")
    hits.sort()
    (i1, t1, A, j1), (i2, t2, B, j2) = hits
    outline = _flatten(segs)
    # which way round the polygon from A to B stays inside the old shape
    def arc(j_from, j_to, start, end):
        pts, j = [start], j_from
        while j != j_to:
            pts.append(poly[j])
            j = (j + 1) % len(poly)
        pts.append(end)
        return pts
    # polygon edge j runs poly[j-1] -> poly[j]; walking forward from A (on edge j1) reaches poly[j1] first
    fwd = arc(j1, j2, A, B)
    bwd = list(reversed(arc(j2, j1, B, A)))
    pick = fwd if _inside_poly(_mid(("L", fwd[len(fwd) // 2 - 1], fwd[len(fwd) // 2])), outline) else bwd
    # does the loop between i1 and i2 (forward) lie inside the polygon? then that's the tip to drop
    probe = _mid(segs[(i1 + 1) % len(segs)]) if i2 > i1 + 1 else ((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)
    tip_is_forward = _inside_poly(probe, poly) if i2 > i1 + 1 else _inside_poly(_mid(("L", segs[i1][2], segs[i1][2])), poly)
    out = []
    if tip_is_forward:
        out.append(("L", segs[i1][1], A))
        for k in range(len(pick) - 1):
            out.append(("L", pick[k], pick[k + 1]))
        out.append(("L", B, segs[i2][2]))
        out += segs[i2 + 1:] + segs[:i1]
    else:
        out.append(("L", segs[i2][1], B))
        rp = list(reversed(pick))
        for k in range(len(rp) - 1):
            out.append(("L", rp[k], rp[k + 1]))
        out.append(("L", A, segs[i1][2]))
        out += segs[i1 + 1:i2]
    return out


def path(segs, extra=""):
    d = [f"M{fmt(segs[0][1][0])} {fmt(segs[0][1][1])}"]
    for s in segs:
        if s[0] == "L":
            d.append(f"L{fmt(s[2][0])} {fmt(s[2][1])}")
        else:
            d.append(f"C{fmt(s[2][0])} {fmt(s[2][1])} {fmt(s[3][0])} {fmt(s[3][1])} {fmt(s[4][0])} {fmt(s[4][1])}")
    return " ".join(d) + " Z" + extra


def diamond(cx, cy, hw, hh):
    return [(cx, cy - hh), (cx + hw, cy), (cx, cy + hh), (cx - hw, cy)]


def dpath(cx, cy, hw, hh):
    return "M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in diamond(cx, cy, hw, hh)) + " Z"


def transform(segs, fn):
    return [(s[0], *[fn(p) for p in s[1:]]) for s in segs]


def rot(theta, cx=256, cy=256):
    c, s = math.cos(theta), math.sin(theta)
    return lambda p: (cx + (p[0] - cx) * c - (p[1] - cy) * s, cy + (p[0] - cx) * s + (p[1] - cy) * c)


def shift(dx, dy):
    return lambda p: (p[0] + dx, p[1] + dy)


SQ2 = math.sqrt(2) / 2


# ══════════════════════════════════════════════════════════════════════════
# Concept A — The Core
# A Dofus split into three forged plates by seams that meet at a molten ◆ core;
# the crown seam lets one ◆ spark out. Three flat golds (lit / body / shade), one hot.
# ══════════════════════════════════════════════════════════════════════════
def core(seam=26, socket=(30, 40), gem=(15, 20), spark=True, tones=None, small=False):
    t = tones or {"b": GOLD_B, "g": GOLD, "d": GOLD_D, "hot": HOT}
    cx, top, bot, rx = 256, 56, 456, 162
    J = (256, 262)
    egg = egg_segments(cx, top, bot, rx)
    hw = seam / 2
    nl, nr = (SQ2, SQ2), (-SQ2, SQ2)                       # normals of the two lower seams
    dl, dr = nl[0] * J[0] + nl[1] * J[1], nr[0] * J[0] + nr[1] * J[1]
    left = clip(clip(egg, (1, 0), cx - hw), nl, dl - hw)
    right = clip(clip(egg, (-1, 0), -(cx + hw)), nr, dr - hw)
    bottom = clip(clip(egg, (-nl[0], -nl[1]), -(dl + hw)), (-nr[0], -nr[1]), -(dr + hw))
    sock = diamond(J[0], J[1], *socket)
    left, right, bottom = (cut_polygon(p, sock) for p in (left, right, bottom))
    parts = [f'<path d="{path(left)}" fill="{t["b"]}"/>',
             f'<path d="{path(right)}" fill="{t["g"]}"/>',
             f'<path d="{path(bottom)}" fill="{t["d"]}"/>',
             f'<path d="{dpath(J[0], J[1], *gem)}" fill="{t["hot"]}"/>']
    if spark:
        # the crown tips sit at y≈top+3 either side of the seam; the spark floats one seam-width above
        parts.append(f'<path d="{dpath(256, top - 14 - (8 if small else 0), 11 + (3 if small else 0), 15 + (4 if small else 0))}" fill="{t["hot"]}"/>')
    return "".join(parts)


def core_parts(small=False):
    """The Core as raw path data per tone (for the inline header component)."""
    import re as _re
    body = core_small() if small else core()
    ds = _re.findall(r'd="([^"]+)"', body)
    return {"lit": ds[0], "body": ds[1], "shade": ds[2], "hot": ds[3] + " " + ds[4]}


def core_small():
    """≤ 48 px: wider seams, bigger socket and gem, bolder spark."""
    return core(seam=40, socket=(42, 56), gem=(21, 28), small=True)


def core_mono(color):
    return core(tones={"b": color, "g": color, "d": color, "hot": color})


# ══════════════════════════════════════════════════════════════════════════
# Concept B — Circle of Six
# Six Dofus around one ◆: the complete build. Every player knows the count.
# ══════════════════════════════════════════════════════════════════════════
def six(tones=None, small=False):
    t = tones or {"b": GOLD_B, "g": GOLD, "d": GOLD_D, "hot": HOT}
    r_tip, r_base, rx = (236, 92, 50) if not small else (240, 104, 54)
    h = r_tip - r_base
    one = egg_segments(256, 256 - r_tip, 256 - r_base, rx)     # pointing up
    parts = []
    for i in range(6):
        e = transform(one, rot(math.radians(60 * i)))
        parts.append(f'<path d="{path(e)}" fill="{[t["b"], t["g"], t["d"]][i % 3] if not small else t["g"]}"/>')
    parts.append(f'<path d="{dpath(256, 256, 26 if not small else 34, 34 if not small else 44)}" fill="{t["hot"]}"/>')
    return "".join(parts)


def six_mono(color):
    return six(tones={"b": color, "g": color, "d": color, "hot": color})


# ══════════════════════════════════════════════════════════════════════════
# Concept C — The Hatch
# The Dofus opens: its cap lifts on a slanted seam and the light inside is a ◆.
# ══════════════════════════════════════════════════════════════════════════
def hatch(tones=None, small=False):
    t = tones or {"b": GOLD_B, "g": GOLD, "d": GOLD_D, "hot": HOT}
    cx, top, bot, rx = 256, 62, 462, 162
    egg = egg_segments(cx, top, bot, rx)
    a = math.radians(15)
    n = (-math.sin(a), math.cos(a))
    P = (256, 186)
    d0 = n[0] * P[0] + n[1] * P[1]
    g = 16 if not small else 24
    cap = clip(egg, n, d0 - g / 2)
    body = clip(egg, (-n[0], -n[1]), -(d0 + g / 2))
    lift = (10, -22) if not small else (12, -28)
    cap = transform(cap, shift(*lift))
    hole = (24, 32) if not small else (30, 40)
    parts = [f'<path d="{path(cap)}" fill="{t["b"]}"/>',
             f'<path fill-rule="evenodd" d="{path(body)} {dpath(256, 300, *hole)}" fill="{t["g"]}"/>',
             f'<path d="{dpath(256, 300, hole[0] * .5, hole[1] * .5)}" fill="{t["hot"]}"/>']
    return "".join(parts)


def hatch_mono(color):
    return hatch(tones={"b": color, "g": color, "d": color, "hot": color})


CONCEPTS = {
    "a": dict(slug="a-the-core", name="The Core", mark=core, small=core_small, mono=core_mono, parts=core_parts,
              idea="A Dofus split into three forged plates by seams that meet at a molten ◆ core; the crown seam lets one spark out."),
    "b": dict(slug="b-circle-of-six", name="Circle of Six", mark=six, small=lambda: six(small=True), mono=six_mono,
              idea="Six Dofus around one ◆ — the complete build. Every player knows the count."),
    "c": dict(slug="c-the-hatch", name="The Hatch", mark=hatch, small=lambda: hatch(small=True), mono=hatch_mono,
              idea="The Dofus opens: its cap lifts on a slanted seam and the light inside is a ◆."),
}


def svg(body, w=512, h=512, title="Dofus Forge", bg=None, vb=None):
    vb = vb or f"0 0 {w} {h}"
    bgr = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}" role="img" aria-labelledby="t">'
            f'<title id="t">{title}</title>{bgr}{body}</svg>')


if __name__ == "__main__":
    import os, sys
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    for cid, c in CONCEPTS.items():
        open(os.path.join(out, f"{cid}-black.svg"), "w", encoding="utf-8").write(svg(c["mono"]("#111")))
        open(os.path.join(out, f"{cid}-color.svg"), "w", encoding="utf-8").write(svg(c["mark"]()))
        open(os.path.join(out, f"{cid}-small.svg"), "w", encoding="utf-8").write(svg(c["small"]()))
    print("ok")
