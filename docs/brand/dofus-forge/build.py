"""Dofus Forge — identity kit (R9). Builds every concept with its full kit, the boards, and can apply
one concept to the live site.

    python docs/brand/dofus-forge/build.py              build all concepts into concepts/<id>/
    python docs/brand/dofus-forge/build.py a            build one concept
    python docs/brand/dofus-forge/build.py --apply a    also copy concept a into public/ (favicons, PWA,
                                                        apple-touch, Discord, OG, header assets, 404 emblem)

The marks live in marks.py (flat, exact geometry). This file is the production side: wordmark from the
Cinzel outlines, lockups, colour variants, icon tiles, social cards, boards, and the copy into public/.
Requirements: Python 3, fontTools, Pillow, and the logo-design skill's render_png.py (headless Chrome).
"""
import base64, json, os, re, shutil, subprocess, sys, tempfile
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from marks import (CONCEPTS, GOLD, GOLD_B, GOLD_D, HOT, VOID, INK, LIGHT, egg_segments, path, fmt, svg as svg_doc)  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
FONT = os.path.join(HERE, "..", "src", "fonts", "Cinzel-700.ttf")
RENDER = os.path.expanduser("~/.claude/skills/logo-design/scripts/render_png.py")

# ── Tokens (docs/DESIGN.md §2) ─────────────────────────────────────────────
STONE, PANEL, PARCH, RAISED = "#11151e", "#171c28", "#1c2130", "#212636"
EDGE, EDGE_S = "#2b3446", "#3a465e"
INK_M = "#9aa0b0"
PAPER = "#f3efe4"      # light-theme page (src/index.css)
LANGS = ("en", "es", "fr", "pt")
DATA = os.path.join(ROOT, "public", "data")
MONO = "JetBrains Mono, Consolas, monospace"
SANS = "Inter, Segoe UI, sans-serif"


# ── Wordmark: Cinzel small caps, with the Dofus drawn into the O ────────────
_font = None


def font():
    global _font
    if _font is None:
        f = TTFont(FONT)
        gs, cmap = f.getGlyphSet(), f.getBestCmap()
        bp = BoundsPen(gs); gs[cmap[ord("H")]].draw(bp)
        _font = (f, gs, cmap, f["hmtx"], f["head"].unitsPerEm, bp.bounds[3])
    return _font


# Optical kerning on top of the advances, in em: Cinzel's F arm leaves the small-cap o floating.
KERN = {("F", "o"): -0.06, ("D", "o"): -0.015, ("r", "g"): -0.01}


def egg_o(x, small=True):
    """The small-cap o of Cinzel 700 redrawn as a Dofus: same height, same stroke contrast (153 sides /
    39 top-bottom in font units), 6 % narrower, widest below the middle. Returns path data in font units
    (y up) at pen position x, and the advance."""
    top, bot = (613, -13) if small else (714, -14)
    w = (708 if small else 787) * 0.94
    side, thin = (153, 39) if small else (164, 42)
    adv = (777 if small else 879) - (708 if small else 787) + w
    h = top - bot
    cx = x + (777 if small else 879) / 2 - 20
    # drawn y-down then flipped: a Dofus is pointed at the crown, round at the base
    outer = egg_segments(cx, 0, h, w / 2, waist=0.56)
    inner = egg_segments(cx, thin, h - thin, w / 2 - side, waist=0.56)
    flip = lambda p: (p[0], top - p[1])
    o = [(s[0], *[flip(p) for p in s[1:]]) for s in outer]
    i = [(s[0], *[flip(p) for p in s[1:]]) for s in inner][::-1]
    i = [(s[0], s[4], s[3], s[2], s[1]) for s in i]       # reverse winding so the counter is a hole
    return path(o) + " " + path(i), adv


def wordmark(text="Dofus Forge", cap=100, track=0.05, dofus_o=True):
    """Returns (path d, width, height). Cap height = `cap`; lowercase letters are Cinzel's small caps.
    With dofus_o, every small-cap o is redrawn as a Dofus (egg_o)."""
    f, gs, cmap, hmtx, upm, capH = font()
    s = cap / capH
    pen = SVGPathPen(gs, ntos=fmt)
    x, prev = 0.0, None
    for ch in text:
        g = cmap[ord(ch)]
        if prev and (prev, ch) in KERN:
            x += KERN[(prev, ch)] * upm * s
        if ch == "o" and dofus_o:
            x += egg_o(0)[1] * s + track * upm * s
        else:
            if ch != " ":
                gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, cap)))
            x += hmtx[g][0] * s + track * upm * s
        prev = ch
    w = x - track * upm * s
    d = pen.getCommands()
    if dofus_o and "o" in text:
        d = d + " " + " ".join(_scaled_eggs(text, cap, track, s, upm, capH, hmtx, cmap))
    return d, w, cap * 1.08


def _scaled_eggs(text, cap, track, s, upm, capH, hmtx, cmap):
    out, x, prev = [], 0.0, None
    for ch in text:
        g = cmap[ord(ch)]
        if prev and (prev, ch) in KERN:
            x += KERN[(prev, ch)] * upm * s
        if ch == "o":
            top, bot = 613, -13
            w = 708 * 0.94
            side, thin = 153, 39
            adv = 777 - 708 + w
            h = top - bot
            cx = x / s + 777 / 2 - 20
            outer = egg_segments(cx, 0, h, w / 2, waist=0.56)
            inner = egg_segments(cx, thin, h - thin, w / 2 - side, waist=0.56)
            # font y-up → svg y-down with baseline at `cap`: Y = cap - y*s ; egg drawn y-down from top → y_font = top - y
            tf = lambda p: (p[0] * s, cap - (top - p[1]) * s)
            o = [(sg[0], *[tf(p) for p in sg[1:]]) for sg in outer]
            i = [(sg[0], *[tf(p) for p in sg[1:]]) for sg in inner][::-1]
            i = [(sg[0], sg[4], sg[3], sg[2], sg[1]) for sg in i]
            out.append(path(o) + " " + path(i))
            x += adv * s + track * upm * s
        else:
            x += hmtx[g][0] * s + track * upm * s
        prev = ch
    return out


def wordmark_svg(fill=GOLD, dofus_o=True):
    d, w, h = wordmark(dofus_o=dofus_o)
    return svg_doc(f'<path d="{d}" fill="{fill}"/>', int(w) + 2, int(h)), int(w) + 2, int(h)


# ── Containers (flat) ──────────────────────────────────────────────────────
def tile(mark_svg, scale=.68, radius=112, full=False, border=True, bg=STONE):
    """App-icon tile: the planner's slot, flat — stone square, gold hairline, the mark inside."""
    r = 0 if full else radius
    off = (512 - 512 * scale) / 2
    parts = [f'<rect width="512" height="512" rx="{r}" fill="{bg}"/>']
    if border:
        inset = 20 if full else 14
        parts.append(f'<rect x="{inset}" y="{inset}" width="{512 - 2 * inset}" height="{512 - 2 * inset}" '
                     f'rx="{max(r - inset, 92 if full else 0)}" fill="none" stroke="{GOLD}" stroke-width="5" opacity=".85"/>')
    parts.append(f'<g transform="translate({fmt(off)} {fmt(off)}) scale({fmt(scale)})">{mark_svg}</g>')
    return "".join(parts)


def bare(mark_svg, scale=1.0):
    return f'<g transform="translate(256 256) scale({fmt(scale)}) translate(-256 -256)">{mark_svg}</g>'


# ── Lockups ────────────────────────────────────────────────────────────────
def lockup_h(cid, tones=None, fill=GOLD, mono=None):
    """Horizontal: mark + wordmark on one line, cap height = 46 % of the mark."""
    c = CONCEPTS[cid]
    mark = c["mono"](mono) if mono else c["mark"](tones=tones) if tones else c["mark"]()
    d, w, h = wordmark(cap=118)
    W = int(256 + 44 + w + 8)
    body = (f'<g transform="scale(.5)">{mark}</g>'
            f'<path transform="translate(300 {fmt(128 - 118 / 2 - 4)})" d="{d}" fill="{fill}"/>')
    return svg_doc(body, W, 256), W, 256


def lockup_v(cid, tones=None, fill=GOLD, mono=None):
    """Stacked: mark above the wordmark, centred."""
    c = CONCEPTS[cid]
    mark = c["mono"](mono) if mono else c["mark"](tones=tones) if tones else c["mark"]()
    d, w, h = wordmark(cap=78)
    W = int(max(w, 420) + 80)
    H = 420 + 40 + 90
    body = (f'<g transform="translate({fmt(W / 2 - 210)} 0) scale({fmt(420 / 512)})">{mark}</g>'
            f'<path transform="translate({fmt(W / 2 - w / 2)} {fmt(420 + 46)})" d="{d}" fill="{fill}"/>')
    return svg_doc(body, W, H), W, H


# ── Board helpers ──────────────────────────────────────────────────────────
def text(x, y, s, size=20, fill=INK, weight=400, anchor="start", op=1, ls=0, family=SANS):
    return (f'<text x="{fmt(x)}" y="{fmt(y)}" font-family="{family}" font-size="{size}" font-weight="{weight}" fill="{fill}" '
            f'opacity="{op}" text-anchor="{anchor}" letter-spacing="{ls}">{s}</text>')


def site_facts():
    load = lambda f: json.load(open(os.path.join(DATA, "en", f), encoding="utf-8"))
    items = load("equipment.json")
    known = {i["ankama_id"] for i in items}
    sets = sum(1 for s in load("sets.json") if any(i in known for i in s["items"]))
    classes = len([f for f in os.listdir(os.path.join(DATA, "classes")) if f.endswith(".png") and "-f." not in f])
    ver = json.load(open(os.path.join(DATA, "version.json"), encoding="utf-8"))["gameVersion"]
    return dict(items=len(items), sets=sets, classes=classes, version=".".join(ver.split(".")[:2]))


OG_COPY = {
    "en": dict(h1="Forge the perfect", h2="Dofus 3 build", sub=["Gear, characteristics, spells and runes —", "planned in seconds, right in your browser."],
               stats=["items", "sets", "classes", "languages"], updated="Updated for Dofus", free="Free · No account needed", sep=","),
    "es": dict(h1="Forja la build perfecta", h2="para Dofus 3", sub=["Equipo, características, hechizos y runas,", "planificados en segundos desde tu navegador."],
               stats=["ítems", "sets", "clases", "idiomas"], updated="Actualizado a Dofus", free="Gratis · Sin cuenta", sep="."),
    "fr": dict(h1="Forgez le build parfait", h2="pour Dofus 3", sub=["Équipement, caractéristiques, sorts et runes,", "planifiés en quelques secondes."],
               stats=["objets", "panoplies", "classes", "langues"], updated="À jour : Dofus", free="Gratuit · Sans compte", sep=" "),
    "pt": dict(h1="Forje a build perfeita", h2="para Dofus 3", sub=["Equipamento, características, feitiços e runas,", "planejados em segundos no seu navegador."],
               stats=["itens", "conjuntos", "classes", "idiomas"], updated="Atualizado: Dofus", free="Grátis · Sem conta", sep="."),
}


def num(n, sep):
    return f"{n:,}".replace(",", sep)


def og(cid, lang="en"):
    """1200×630 social card, flat: brand row, promise, real numbers; the mark on the right on its slot."""
    c, t, f = CONCEPTS[cid], OG_COPY[lang], site_facts()
    p = [f'<rect width="1200" height="630" fill="{VOID}"/>',
         f'<rect x="16" y="16" width="1168" height="598" rx="22" fill="none" stroke="{EDGE}"/>',
         f'<path d="M80 16.5 L1120 16.5" stroke="{GOLD}" stroke-opacity=".4"/>',
         # the slot: a faint stone disc behind the mark, gold hairline
         f'<circle cx="930" cy="318" r="226" fill="{STONE}"/>',
         f'<circle cx="930" cy="318" r="226" fill="none" stroke="{GOLD}" stroke-opacity=".3" stroke-width="2"/>',
         f'<g transform="translate(930 322) scale(.74) translate(-256 -256)">{c["mark"]()}</g>']
    wd, ww, _ = wordmark(cap=30, track=.06)
    p.append(f'<path transform="translate(64 62)" d="{wd}" fill="{GOLD}"/>')
    px = 64 + ww + 22
    lab = f'{t["updated"]} {f["version"]}'
    pw = 34 + len(lab) * 7.6
    p.append(f'<rect x="{fmt(px)}" y="60" width="{fmt(pw)}" height="32" rx="16" fill="#122016" stroke="#5fae54" stroke-opacity=".55"/>'
             f'<circle cx="{fmt(px + 17)}" cy="76" r="5" fill="#5fae54"/>' + text(px + 30, 81, lab, 14, "#a9d8a0", 600))
    _, w1, _ = wordmark(t["h1"], cap=100, track=.02, dofus_o=False)
    _, w2, _ = wordmark(t["h2"], cap=100, track=.02, dofus_o=False)
    cap = min(58, 100 * 600 / max(w1, w2))
    d1, _, _ = wordmark(t["h1"], cap=cap, track=.02, dofus_o=False)
    d2, _, _ = wordmark(t["h2"], cap=cap, track=.02, dofus_o=False)
    p.append(f'<path transform="translate(62 {fmt(232 - cap)})" d="{d1}" fill="{INK}"/>')
    p.append(f'<path transform="translate(62 {fmt(232 - cap + cap * 1.34)})" d="{d2}" fill="{GOLD}"/>')
    for k, ln in enumerate(t["sub"]):
        p.append(text(64, 360 + k * 32, ln, 23, INK_M))
    vals = [num(f["items"], t["sep"]), num(f["sets"], t["sep"]), str(f["classes"]), "4"]
    sx = 64
    for k, (v, lb) in enumerate(zip(vals, t["stats"])):
        p.append(f'<text x="{sx}" y="482" font-family="{MONO}" font-size="34" font-weight="700" fill="{GOLD_B}">{v}</text>')
        p.append(text(sx, 506, lb.upper(), 13, INK_M, 700, ls=2))
        sx += max(len(v) * 21, len(lb) * 10.6) + 46
        if k < 3:
            p.append(f'<path d="M{fmt(sx - 23)} 454 L{fmt(sx - 23)} 510" stroke="{EDGE_S}"/>')
    p.append(f'<path d="M64 548 L640 548" stroke="{EDGE}"/>')
    p.append(text(64, 586, "dofusforge.com", 21, GOLD, 700, ls=1) + text(244, 586, "·  " + t["free"], 17, INK_M))
    return svg_doc("".join(p), 1200, 630)


def social(cid, out):
    """Profile and banner art for X and Discord, a Discord announcement frame and the docs banner."""
    c, t, f = CONCEPTS[cid], OG_COPY["en"], site_facts()
    so = os.path.join(out, "social")
    os.makedirs(so, exist_ok=True)

    def banner(W, H, mark_x, mark_scale, text_x, cap):
        wd, ww, _ = wordmark(cap=cap, track=.06)
        hd, hw, _ = wordmark(t["h1"] + " " + t["h2"], cap=cap * .42, track=.02, dofus_o=False)
        p = [f'<rect width="{W}" height="{H}" fill="{VOID}"/>',
             f'<circle cx="{mark_x}" cy="{H / 2}" r="{fmt(H * .44)}" fill="{STONE}"/>',
             f'<circle cx="{mark_x}" cy="{H / 2}" r="{fmt(H * .44)}" fill="none" stroke="{GOLD}" stroke-opacity=".3" stroke-width="2"/>',
             f'<g transform="translate({mark_x} {H / 2 + 4}) scale({mark_scale}) translate(-256 -256)">{c["mark"]()}</g>',
             f'<path transform="translate({text_x} {fmt(H / 2 - cap * .9)})" d="{wd}" fill="{GOLD}"/>',
             f'<path transform="translate({text_x + 2} {fmt(H / 2 + cap * .35)})" d="{hd}" fill="{INK}"/>',
             text(text_x + 2, H / 2 + cap * 1.25, f'{num(f["items"], ",")} items · {num(f["sets"], ",")} sets · The Forger optimizer · dofusforge.com', cap * .3, INK_M)]
        return svg_doc("".join(p), W, H)

    def announcement():
        """1200×675 frame for Discord/X posts: title area left blank on purpose (filled per post)."""
        wd, ww, _ = wordmark(cap=34, track=.06)
        p = [f'<rect width="1200" height="675" fill="{VOID}"/>',
             f'<rect x="16" y="16" width="1168" height="643" rx="22" fill="none" stroke="{EDGE}"/>',
             f'<path d="M80 16.5 L1120 16.5" stroke="{GOLD}" stroke-opacity=".4"/>',
             f'<path transform="translate(64 64)" d="{wd}" fill="{GOLD}"/>',
             text(64 + ww + 22, 92, "·  WHAT'S NEW", 15, INK_M, 700, ls=3),
             f'<g transform="translate(1010 338) scale(.56) translate(-256 -256)">{c["mark"]()}</g>',
             f'<rect x="64" y="180" width="700" height="46" rx="8" fill="{PANEL}"/>',
             f'<rect x="64" y="244" width="560" height="46" rx="8" fill="{PANEL}"/>',
             f'<rect x="64" y="330" width="640" height="18" rx="6" fill="{PANEL}" opacity=".8"/>',
             f'<rect x="64" y="362" width="600" height="18" rx="6" fill="{PANEL}" opacity=".8"/>',
             f'<rect x="64" y="394" width="420" height="18" rx="6" fill="{PANEL}" opacity=".8"/>',
             f'<path d="M64 596 L760 596" stroke="{EDGE}"/>',
             text(64, 632, "dofusforge.com", 21, GOLD, 700, ls=1), text(244, 632, f"·  v0.x · Dofus {f['version']}", 17, INK_M)]
        return svg_doc("".join(p), 1200, 675)

    def docs_banner():
        """1280×320 header for README / docs: stacked on the left, promise on the right."""
        wd, ww, _ = wordmark(cap=64, track=.06)
        p = [f'<rect width="1280" height="320" fill="{VOID}"/>',
             f'<rect x="12" y="12" width="1256" height="296" rx="18" fill="none" stroke="{EDGE}"/>',
             f'<g transform="translate(150 160) scale(.5) translate(-256 -256)">{c["mark"]()}</g>',
             f'<path transform="translate(300 {fmt(160 - 64 * .95)})" d="{wd}" fill="{GOLD}"/>',
             text(302, 160 + 48, "Build planner and optimizer for Dofus 3 — gear, characteristics, spells, sets and ranks.", 22, INK_M),
             text(302, 160 + 84, f'{num(f["items"], ",")} ITEMS  ·  {num(f["sets"], ",")} SETS  ·  {f["classes"]} CLASSES  ·  4 LANGUAGES', 13, GOLD_B, 700, ls=2)]
        return svg_doc("".join(p), 1280, 320)

    pieces = {
        "x-banner-1500x500": (banner(1500, 500, 1300, .66, 460, 66), 1500, 500),
        "discord-server-banner-960x540": (banner(960, 540, 790, .6, 56, 54), 960, 540),
        "x-avatar-400": (svg_doc(tile(c["mark"](), scale=.7, full=True, border=False)), 400, 400),
        "discord-server-icon-512": (svg_doc(tile(c["mark"](), scale=.7, full=True, border=False)), 512, 512),
        "announcement-1200x675": (announcement(), 1200, 675),
        "docs-banner-1280x320": (docs_banner(), 1280, 320),
    }
    for name, (s, w, h) in pieces.items():
        open(os.path.join(so, f"{name}.svg"), "w", encoding="utf-8").write(s)
        render(s, w, None if w == h else h).convert("RGB").save(os.path.join(so, f"{name}.png"))


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


def data_uri(p):
    return "data:image/png;base64," + base64.b64encode(open(p, "rb").read()).decode()


def build(cid):
    c = CONCEPTS[cid]
    out = os.path.join(HERE, "concepts", c["slug"])
    sv, pn = os.path.join(out, "svg"), os.path.join(out, "png")
    for d in (sv, pn):
        os.makedirs(d, exist_ok=True)
    W = lambda n, s: open(os.path.join(sv, n), "w", encoding="utf-8").write(s)
    D = lambda m: svg_doc(m)

    mark = D(c["mark"]())
    files = {
        "mark.svg": mark,
        "mark-light.svg": D(c["mark"](tones=LIGHT)),
        "mark-mono.svg": D(c["mono"](GOLD)),
        "mark-black.svg": D(c["mono"]("#111111")),
        "mark-white.svg": D(c["mono"]("#ffffff")),
        "favicon.svg": D(bare(c["small"](), 1.02)),
        "app-icon.svg": D(tile(c["mark"]())),
        "app-icon-square.svg": D(tile(c["mark"](), full=True)),
        "app-icon-maskable.svg": D(tile(c["mark"](), scale=.52, full=True, border=False, bg=VOID)),
    }
    lk, lw, lh = lockup_h(cid)
    files["lockup-horizontal.svg"] = lk
    files["lockup-horizontal-light.svg"] = lockup_h(cid, tones=LIGHT, fill=LIGHT["g"])[0]
    files["lockup-horizontal-mono.svg"] = lockup_h(cid, mono=GOLD)[0]
    files["lockup-horizontal-black.svg"] = lockup_h(cid, mono="#111111", fill="#111111")[0]
    files["lockup-horizontal-white.svg"] = lockup_h(cid, mono="#ffffff", fill="#ffffff")[0]
    st, sw, sh = lockup_v(cid)
    files["lockup-stacked.svg"] = st
    files["lockup-stacked-light.svg"] = lockup_v(cid, tones=LIGHT, fill=LIGHT["g"])[0]
    wm, ww, wh = wordmark_svg()
    files["wordmark.svg"] = wm
    files["wordmark-light.svg"] = wordmark_svg(fill=LIGHT["g"])[0]
    files["wordmark-white.svg"] = wordmark_svg(fill="#ffffff")[0]
    for lg in LANGS:
        files[f"og-preview-{lg}.svg"] = og(cid, lg)
    files["og-preview.svg"] = files["og-preview-en.svg"]
    files["404-emblem.svg"] = files["favicon.svg"]
    for n, s in files.items():
        W(n, s)

    big_mark = render(mark, 1024)
    big_small = render(files["favicon.svg"], 512)
    big_app = render(files["app-icon.svg"], 1024)
    big_square = render(files["app-icon-square.svg"], 1024, bg=STONE)
    for s in (256, 512, 1024):
        big_mark.resize((s, s), Image.LANCZOS).save(os.path.join(pn, f"mark-{s}.png"))
    render(files["mark-light.svg"], 512).save(os.path.join(pn, "mark-light-512.png"))
    render(files["mark-mono.svg"], 512).save(os.path.join(pn, "mark-mono-512.png"))
    render(files["mark-black.svg"], 512).save(os.path.join(pn, "mark-black-512.png"))
    render(files["mark-white.svg"], 512).save(os.path.join(pn, "mark-white-512.png"))
    for s in (16, 32, 48):
        big_small.resize((s, s), Image.LANCZOS).save(os.path.join(pn, f"favicon-{s}.png"))
    for s in (64, 96, 128, 192, 256, 512, 1024):
        big_mark.resize((s, s), Image.LANCZOS).save(os.path.join(pn, f"favicon-{s}.png"))
    big_app.resize((512, 512), Image.LANCZOS).save(os.path.join(pn, "app-icon-512.png"))
    big_square.convert("RGB").resize((180, 180), Image.LANCZOS).save(os.path.join(pn, "apple-touch-icon.png"))
    render(D(tile(c["mark"](), scale=.64, full=True, border=False)), 512, bg=STONE).convert("RGB").save(os.path.join(pn, "discord-bot-icon.png"))
    render(files["app-icon-maskable.svg"], 512, bg=VOID).convert("RGB").save(os.path.join(pn, "app-icon-maskable-512.png"))
    ico = [Image.open(os.path.join(pn, f"favicon-{s}.png")) for s in (16, 32, 48)]
    ico[2].save(os.path.join(out, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:2])
    for w in (600, 1200):
        render(lk, w, round(w * lh / lw)).save(os.path.join(pn, f"lockup-horizontal-{w}.png"))
    render(files["lockup-horizontal-light.svg"], 1200, round(1200 * lh / lw), bg=PAPER).convert("RGB").save(os.path.join(pn, "lockup-horizontal-light-1200.png"))
    render(st, 800, round(800 * sh / sw)).save(os.path.join(pn, "lockup-stacked-800.png"))
    render(wm, 1200, round(1200 * wh / ww)).save(os.path.join(pn, "wordmark-1200.png"))
    for lg in LANGS:
        ogi = render(files[f"og-preview-{lg}.svg"], 1200, 630)
        ogi.save(os.path.join(pn, f"og-preview-{lg}.png"))
        ogi.convert("RGB").save(os.path.join(pn, f"og-preview-{lg}.jpg"), quality=90, optimize=True)
    shutil.copyfile(os.path.join(pn, "og-preview-en.png"), os.path.join(pn, "og-preview.png"))
    shutil.copyfile(os.path.join(pn, "og-preview-en.jpg"), os.path.join(pn, "og-preview.jpg"))
    social(cid, out)
    board(cid, out, lw, lh, sw, sh)
    return out


def board(cid, out, lw, lh, sw, sh):
    """Presentation board with the real rendered PNGs in context."""
    c, pn = CONCEPTS[cid], os.path.join(out, "png")
    img = lambda n, x, y, w, h=None, extra="", d="png": f'<image href="{data_uri(os.path.join(out, d, n))}" x="{fmt(x)}" y="{fmt(y)}" width="{fmt(w)}" height="{fmt(h or w)}" {extra}/>'
    d, w, h = wordmark(cap=40)
    hd, hw, hh = wordmark(cap=15, track=.06)
    p = [f'<rect width="1600" height="1320" fill="{VOID}"/>',
         text(64, 70, f"DOFUS FORGE · IDENTITY R9 · CONCEPT {cid.upper()}", 15, GOLD, 700, ls=3),
         f'<path transform="translate(64 96)" d="{d}" fill="{GOLD}"/>',
         text(64 + w + 24, 136, c["name"], 30, INK, 600),
         text(64, 186, c["idea"], 19, INK_M),
         img("mark-1024.png", 64, 220, 520),
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
    # header mock (52 px)
    p.append(f'<rect x="640" y="566" width="896" height="52" rx="10" fill="{STONE}" stroke="{EDGE}"/>'
             + img("favicon-64.png", 656, 575, 34)
             + f'<path transform="translate(700 584)" d="{hd}" fill="{GOLD}"/>')
    hx = 700 + hw + 30
    for lab in ("Explore", "My Builds", "Sets"):
        cw = 30 + len(lab) * 7
        p.append(f'<rect x="{fmt(hx)}" y="579" width="{fmt(cw)}" height="26" rx="13" fill="none" stroke="{EDGE_S}"/>'
                 + text(hx + cw / 2, 597, lab, 12, INK_M, 600, "middle"))
        hx += cw + 8
    # platform icons + on light
    p.append(text(640, 664, "DISCORD · iOS · ANDROID · ON LIGHT", 12, GOLD, 700, ls=2))
    p.append(f'<clipPath id="dc"><circle cx="720" cy="760" r="72"/></clipPath><g clip-path="url(#dc)">' + img("discord-bot-icon.png", 648, 688, 144) + "</g>")
    p.append(f'<clipPath id="ios"><rect x="830" y="688" width="144" height="144" rx="32"/></clipPath><g clip-path="url(#ios)">' + img("apple-touch-icon.png", 830, 688, 144) + "</g>")
    p.append(f'<clipPath id="and"><circle cx="1084" cy="760" r="72"/></clipPath><g clip-path="url(#and)">' + img("app-icon-maskable-512.png", 1012, 688, 144) + "</g>")
    p.append(f'<rect x="1196" y="688" width="340" height="144" rx="14" fill="{PAPER}"/>' + img("mark-light-512.png", 1212, 704, 112)
             + text(1340, 768, "light theme", 16, LIGHT["g"], 600))
    # variants row
    p.append(text(64, 800, "COLOUR · ONE GOLD · BLACK · WHITE", 12, GOLD, 700, ls=2))
    p.append(f'<rect x="64" y="818" width="130" height="130" rx="12" fill="{PANEL}"/>' + img("mark-512.png", 79, 833, 100))
    p.append(f'<rect x="204" y="818" width="130" height="130" rx="12" fill="{PANEL}"/>' + img("mark-mono-512.png", 219, 833, 100))
    p.append(f'<rect x="344" y="818" width="130" height="130" rx="12" fill="#ffffff"/>' + img("mark-black-512.png", 359, 833, 100))
    p.append(f'<rect x="484" y="818" width="130" height="130" rx="12" fill="#000000"/>' + img("mark-white-512.png", 499, 833, 100))
    # lockups
    p.append(text(64, 990, "LOCKUPS", 12, GOLD, 700, ls=2))
    p.append(img("lockup-horizontal-1200.png", 64, 1008, 540, 540 * lh / lw))
    p.append(f'<rect x="64" y="{fmt(1008 + 540 * lh / lw + 16)}" width="540" height="{fmt(540 * lh / lw)}" rx="12" fill="{PAPER}"/>'
             + img("lockup-horizontal-light-1200.png", 64, 1008 + 540 * lh / lw + 16, 540, 540 * lh / lw))
    p.append(img("lockup-stacked-800.png", 1380, 870, 150, 150 * sh / sw))
    # og + announcement
    p.append(text(640, 870, "OG / SOCIAL PREVIEW", 12, GOLD, 700, ls=2))
    p.append(img("og-preview.png", 640, 888, 520, 273))
    p.append(text(640, 1200, "ANNOUNCEMENT", 12, GOLD, 700, ls=2))
    p.append(img("announcement-1200x675.png", 640, 1216, 180, 101, d="social"))
    p.append(text(850, 1200, "X BANNER", 12, GOLD, 700, ls=2))
    p.append(img("x-banner-1500x500.png", 850, 1216, 285, 95, d="social"))
    p.append(text(1160, 1200, "DOCS", 12, GOLD, 700, ls=2))
    p.append(img("docs-banner-1280x320.png", 1160, 1216, 376, 94, d="social"))
    raw = f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1600 1320" width="1600" height="1320">{"".join(p)}</svg>'
    open(os.path.join(out, "board.svg"), "w", encoding="utf-8").write(raw)
    render(raw, 1600, 1320).convert("RGB").save(os.path.join(out, "board.png"), quality=92)


def overview(rec="a"):
    n = len(CONCEPTS)
    H = 260 + 640
    p = [f'<rect width="1800" height="{H}" fill="{VOID}"/>', text(64, 70, "DOFUS FORGE · IDENTITY R9", 15, GOLD, 700, ls=3)]
    d, w, h = wordmark(cap=44)
    p.append(f'<path transform="translate(64 96)" d="{d}" fill="{GOLD}"/>')
    p.append(text(64, 196, "Flat marks in the site's own gold, exact geometry, no gradients. Built to read at 16 px and in one colour.", 19, INK_M))
    for i, cid in enumerate(CONCEPTS):
        c = CONCEPTS[cid]
        x = 64 + i * 576
        pn = os.path.join(HERE, "concepts", c["slug"], "png")
        p.append(f'<rect x="{x}" y="240" width="544" height="600" rx="18" fill="{PANEL}" stroke="{GOLD if cid == rec else EDGE}" stroke-width="{2 if cid == rec else 1}"/>')
        p.append(f'<image href="{data_uri(os.path.join(pn, "mark-512.png"))}" x="{x + 122}" y="270" width="300" height="300"/>')
        for k, s in enumerate((64, 32, 16)):
            p.append(f'<image href="{data_uri(os.path.join(pn, f"favicon-{s}.png"))}" x="{x + 150 + k * 90}" y="{600 + (64 - s) / 2}" width="{s}" height="{s}"/>')
        p.append(f'<rect x="{x + 420}" y="600" width="64" height="64" rx="8" fill="#ffffff"/>'
                 f'<image href="{data_uri(os.path.join(pn, "mark-black-512.png"))}" x="{x + 426}" y="606" width="52" height="52"/>')
        p.append(text(x + 28, 730, f"{cid.upper()} · {c['name']}", 22, GOLD_B, 700, family="Cinzel, Georgia, serif"))
        words, line, lines = c["idea"].split(), "", []
        for wd in words:
            if len(line) + len(wd) > 56:
                lines.append(line); line = ""
            line += wd + " "
        lines.append(line)
        for k, ln in enumerate(lines[:4]):
            p.append(text(x + 28, 764 + k * 22, ln.strip(), 15, INK_M))
        if cid == rec:
            p.append(f'<rect x="{x + 390}" y="262" width="140" height="30" rx="15" fill="{GOLD_D}"/>' + text(x + 460, 282, "RECOMMENDED", 12, GOLD_B, 700, "middle", ls=1.5))
    raw = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 {H}" width="1800" height="{H}">{"".join(p)}</svg>'
    open(os.path.join(HERE, "overview.svg"), "w", encoding="utf-8").write(raw)
    render(raw, 1800, H).convert("RGB").save(os.path.join(HERE, "overview.png"), quality=92)


def apply(cid):
    """Copy one concept onto the live site. Paths match src/data/brand.ts and the conventional root files."""
    c = CONCEPTS[cid]
    src = os.path.join(HERE, "concepts", c["slug"])
    pub, brand = os.path.join(ROOT, "public"), os.path.join(ROOT, "public", "brand")
    os.makedirs(brand, exist_ok=True)
    for f in os.listdir(brand):  # files only: screenshots/ is captured from the live site
        if os.path.isfile(os.path.join(brand, f)):
            os.remove(os.path.join(brand, f))
    cp = lambda a, b: shutil.copyfile(os.path.join(src, a), b)
    cp("svg/favicon.svg", os.path.join(pub, "favicon.svg"))
    cp("favicon.ico", os.path.join(pub, "favicon.ico"))
    for s in (48, 192, 512):
        cp(f"png/favicon-{s}.png", os.path.join(pub, f"favicon-{s}.png"))
    cp("png/apple-touch-icon.png", os.path.join(pub, "apple-touch-icon.png"))
    cp("png/discord-bot-icon.png", os.path.join(pub, "discord-bot-icon.png"))
    cp("png/og-preview.jpg", os.path.join(pub, "og-preview.jpg"))
    for lg in LANGS:
        cp(f"png/og-preview-{lg}.jpg", os.path.join(brand, f"og-preview-{lg}.jpg"))
    # icon.svg is the header icon (34 px), so it takes the small cut; the full tile ships as app-icon.svg
    for a, b in (("svg/favicon.svg", "icon.svg"), ("svg/app-icon.svg", "app-icon.svg"), ("svg/mark.svg", "mark.svg"),
                 ("svg/mark-light.svg", "mark-light.svg"), ("svg/mark-mono.svg", "mark-mono.svg"),
                 ("svg/wordmark.svg", "wordmark.svg"), ("svg/lockup-horizontal.svg", "lockup-horizontal.svg"),
                 ("svg/lockup-stacked.svg", "lockup-stacked.svg"), ("png/og-preview.jpg", "og-preview.jpg"),
                 ("png/favicon-512.png", "icon-512.png"), ("png/app-icon-maskable-512.png", "icon-maskable-512.png"),
                 ("png/mark-1024.png", "mark-1024.png"), ("png/mark-256.png", "mark-256.png"),
                 ("png/favicon-96.png", "icon-96.png"), ("png/lockup-horizontal-1200.png", "lockup-horizontal-1200.png")):
        cp(a, os.path.join(brand, b))
    # 404.html: swap the inline emblem between its markers
    p404 = os.path.join(pub, "404.html")
    html = open(p404, encoding="utf-8").read()
    emb = open(os.path.join(src, "svg", "404-emblem.svg"), encoding="utf-8").read().replace('<svg ', '<svg class="emblem" ', 1)
    html = re.sub(r"<!-- brand:emblem -->.*?<!-- /brand:emblem -->", lambda m: f"<!-- brand:emblem -->{emb}<!-- /brand:emblem -->", html, flags=re.S)
    open(p404, "w", encoding="utf-8").write(html)
    # src/ui/brandMarkData.ts: the ≤48 px cut as path data, so the header can draw it inline in the theme's golds
    if c.get("parts"):
        parts = c["parts"](small=True)
        lines = [
            "// Generated by docs/brand/dofus-forge/build.py --apply; do not edit by hand.",
            "// The brand mark (small cut, 512 box) as path data. BrandMark.tsx fills it with the theme's golds,",
            "// so the header icon follows the light theme and paints without an image request.",
            "export const BRAND_MARK = {",
            f"  lit:   '{parts['lit']}',",
            f"  body:  '{parts['body']}',",
            f"  shade: '{parts['shade']}',",
            f"  hot:   '{parts['hot']}',",
            "} as const",
            "",
        ]
        open(os.path.join(ROOT, "src", "ui", "brandMarkData.ts"), "w", encoding="utf-8", newline="\n").write("\n".join(lines))
    print(f"applied {c['slug']}")


if __name__ == "__main__":
    only = [a for a in sys.argv[1:] if a in CONCEPTS]
    for cid in (only if only else list(CONCEPTS)):
        print("built", build(cid))
    overview()
    if "--apply" in sys.argv:
        apply(sys.argv[sys.argv.index("--apply") + 1])
