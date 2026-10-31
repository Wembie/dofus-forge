"""Export the final Forge Crest kit into public/ — every format and size the site and socials need.

usage: python export_kit.py            (writes public/brand/* and the root favicons/PWA/OG files)

Swapping the logo later = re-run this script (or drop new files with the same names) — the site reads
every path from src/data/brand.ts.
"""
import os, shutil, subprocess, sys, tempfile
import xml.etree.ElementTree as ET
from PIL import Image
import r7_master as m

b, ic = m.b, m.ic
ROOT = os.path.abspath(os.path.join(b.HERE, "..", "..", ".."))
PUB = os.path.join(ROOT, "public")
BRAND = os.path.join(PUB, "brand")
RENDER = os.path.expanduser("~/.claude/skills/logo-design/scripts/render_png.py")
os.makedirs(BRAND, exist_ok=True)


def prune_defs(svg_text):
    """Drop shared <defs> entries this file never references (the build helpers ship every round's defs)."""
    ET.register_namespace("", "http://www.w3.org/2000/svg")
    root = ET.fromstring(svg_text)
    ns = "{http://www.w3.org/2000/svg}"
    for _ in range(3):  # gradients/patterns can reference each other
        body = ET.tostring(root, encoding="unicode")
        for defs in root.iter(f"{ns}defs"):
            for el in list(defs):
                i = el.get("id")
                if i and body.count(f"#{i})") + body.count(f'"#{i}"') == 0:
                    defs.remove(el)
    for defs in list(root.findall(f"{ns}defs")):
        if len(defs) == 0:
            root.remove(defs)
    return ET.tostring(root, encoding="unicode")


def save_svg(name, body, w, h, title, bg=None, vb=None):
    path = os.path.join(BRAND, name)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(prune_defs(b.svg(body, w, h, title, bg=bg, vb=vb)))
    return path


def png(svg_path, out, w, h=None, bg=None):
    """Render through the logo-design skill (headless Chrome), keeping alpha unless bg is set."""
    tmp = tempfile.mkdtemp()
    cmd = [sys.executable, RENDER, svg_path, "--out-dir", tmp]
    cmd += ["--size", str(w)] if h is None else ["--width", str(w), "--height", str(h)]
    if bg:
        cmd += ["--bg", bg]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)
    src = os.path.join(tmp, os.path.splitext(os.path.basename(svg_path))[0] + ".png")
    shutil.move(src, out)
    return out


def padded(body, pad, vb_size=256):
    """Wrap a 256-box symbol with a uniform margin (for maskable / store icons)."""
    s = (vb_size - 2 * pad) / vb_size
    return f'<g transform="translate({pad} {pad}) scale({s})">{body}</g>'


def flat_wordmark():
    d, w = b.wordmark("DOFUS FORGE", b.WM_FONT, 100, 0.06, x0=6, base=118)
    return f'<path d="{d}" fill="url(#goldText)"/>', int(w + 12), 140


if __name__ == "__main__":
    out = []
    # ── vector masters ──
    crest = save_svg("crest.svg", m.master("k", halo=False), 640, 640, "Dofus Forge — The Forge Crest")
    crest_glow = save_svg("crest-glow.svg", m.master("kg"), 640, 640, "Dofus Forge — The Forge Crest")
    hl, hw, hh = m.hero_lockup("kh")
    hero = save_svg("logo-hero.svg", hl, hw, hh, "Dofus Forge")
    hz, zw, zh = m.horizontal_lockup("kz")
    horiz = save_svg("logo-horizontal.svg", hz, zw, zh, "Dofus Forge")
    wm, ww, wh = flat_wordmark()
    save_svg("wordmark.svg", wm, ww, wh, "Dofus Forge")
    icon = save_svg("icon.svg", m.compact("ki"), 256, 256, "Dofus Forge")
    small = save_svg("icon-small.svg", m.favicon16(), 256, 256, "Dofus Forge")
    maskable = save_svg("icon-maskable.svg", padded(m.compact("km"), 40), 256, 256, "Dofus Forge", bg=b.VOID)
    og = save_svg("og-image.svg", m.og_card("ko"), 1200, 630, "Dofus Forge — Forge the perfect Dofus build")

    # ── raster sizes ──
    for s in (256, 512, 1024, 2048):
        png(crest, os.path.join(BRAND, f"crest-{s}.png"), s)
    png(hero, os.path.join(BRAND, "logo-hero-1024.png"), round(1024 * hw / hh), 1024)
    png(hero, os.path.join(BRAND, "logo-hero-2048.png"), round(2048 * hw / hh), 2048)
    for w in (600, 1200, 2400):
        png(horiz, os.path.join(BRAND, f"logo-horizontal-{w}.png"), w, round(w * zh / zw))
    for s in (16, 32):
        png(small, os.path.join(BRAND, f"icon-{s}.png"), s)
    for s in (48, 64, 96, 128, 180, 192, 256, 512, 1024):
        png(icon, os.path.join(BRAND, f"icon-{s}.png"), s)
    png(maskable, os.path.join(BRAND, "icon-maskable-512.png"), 512)
    png(og, os.path.join(BRAND, "og-image.png"), 1200, 630)
    Image.open(os.path.join(BRAND, "og-image.png")).convert("RGB").save(os.path.join(BRAND, "og-image.jpg"), quality=88, optimize=True)

    # ── root files the browser / platforms request by convention ──
    with open(small, encoding="utf-8") as fh:
        open(os.path.join(PUB, "favicon.svg"), "w", encoding="utf-8").write(fh.read())
    ico_imgs = [Image.open(os.path.join(BRAND, f"icon-{s}.png")).convert("RGBA") for s in (16, 32, 48)]
    ico_imgs[2].save(os.path.join(PUB, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico_imgs[:2])
    for s, name in ((48, "favicon-48.png"), (192, "favicon-192.png"), (512, "favicon-512.png")):
        Image.open(os.path.join(BRAND, f"icon-{s}.png")).save(os.path.join(PUB, name))
    # apple-touch and Discord want an opaque square
    png(icon, os.path.join(PUB, "apple-touch-icon.png"), 180, bg=b.VOID)
    png(icon, os.path.join(PUB, "discord-bot-icon.png"), 512, bg=b.VOID)
    Image.open(os.path.join(BRAND, "og-image.jpg")).save(os.path.join(PUB, "og-preview.jpg"), quality=88, optimize=True)
    print("kit ok:", len(os.listdir(BRAND)), "files in public/brand")
