"""YouTube thumbnail (1280x720) from the real workshop screenshot.

python docs/brand/youtube-thumbnail/build.py && node docs/brand/youtube-thumbnail/render.mjs
"""
from pathlib import Path
import base64
import io
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
FONTS = ROOT / 'src' / 'worker' / 'fonts'
BRAND = ROOT / 'public' / 'brand'
BODY = 'M18 60H52C52 77 62 90 79 90C96 90 106 77 106 60H142V79H112V91H129V104H107L102 117L124 129V136H37V129L57 116V98L36 86L18 68V60ZM91 96V119L98 113V96H91Z'
FLAME = 'M79 25C86 30 98 48 98 62C98 74 91 82 79 82C67 82 60 74 60 62C60 48 72 30 79 25ZM66 51L80 43L83 48L69 56L66 51ZM77 65L91 57L94 62L80 70L77 65Z'
BG, INK, ACCENT, MUTED, LINE = '#111615', '#e9e8df', '#e4b28b', '#a1aaa0', '#343c35'
W, H = 1280, 720
HEAD = 'BarlowCondensed-SemiBold.ttf'

_faces = {}
def face(font):
    if font not in _faces: _faces[font] = TTFont(FONTS / font)
    return _faces[font]

def width(value, size, font, spacing=0):
    f = face(font); cmap = f.getBestCmap(); scale = size / f['head'].unitsPerEm
    return sum(f['hmtx'][cmap.get(ord(c), '.notdef')][0] * scale + spacing for c in value) - spacing

def text(value, size, x, y, color=INK, font='SourceSans3-Regular.ttf', spacing=0):
    f = face(font); glyphs = f.getGlyphSet(); cmap = f.getBestCmap(); scale = size / f['head'].unitsPerEm; out = []
    for c in value:
        name = cmap.get(ord(c), '.notdef'); pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, y)))
        out.append(pen.getCommands()); x += f['hmtx'][name][0] * scale + spacing
    return f'<path fill="{color}" d="{" ".join(out)}"/>'

def fit(value, font, max_w, start, spacing=0):
    size = start
    while width(value, size, font, spacing) > max_w: size -= 1
    return size

def png(img):
    buf = io.BytesIO(); img.save(buf, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

def mark(transform):
    return f'<g transform="{transform}" fill="{ACCENT}" fill-rule="evenodd"><path d="{BODY}"/><path d="{FLAME}"/></g>'

# Real workshop captured at 2x (shot.mjs): equipment panel and the stats strip.
SCALE = 0.66
def crop(lang, box):
    img = Image.open(HERE / f'workshop-{lang}.png').convert('RGB').crop(box)
    return img.resize((round(img.width * SCALE), round(img.height * SCALE)), Image.LANCZOS)

# The Spanish capture's build name wraps to two lines, pushing the panels down.
DY = {'es': 70}

COPY = {
    'es': ('ARMA TU', 'BUILD', 'PERFECTA', 'Gratis · Equipo, stats y Forjadora'),
    'en': ('BUILD YOUR', 'PERFECT', 'GEAR', 'Free · Equipment, stats and the Forger'),
}

for lang, (l1, l2, l3, sub) in COPY.items():
    dy = DY.get(lang, 0)
    panel = crop(lang, (40, 470 + dy, 1202, 1279 + dy))
    stats = crop(lang, (1262, 866 + dy, 1900, 1010 + dy))
    pw, ph = panel.size; sw, sh = stats.size
    PX, PY = W - pw + 24, 64
    SX, SY = W - sw - 48, H - sh - 30
    col = PX - 56 - 36
    s1 = fit(l1, HEAD, col, 150, 2)
    s2 = fit(l2, HEAD, col, 230, 2)
    s3 = fit(l3, HEAD, col, 150, 2)
    s1 = s3 = min(s1, s3)
    y1 = 250; y2 = y1 + s2 * 0.86; y3 = y2 + s3 * 0.92
    c = f'<rect width="{W}" height="{H}" fill="{BG}"/>'
    c += f'<image href="{png(panel)}" x="{PX}" y="{PY}" width="{pw}" height="{ph}"/>'
    c += f'<rect x="{SX - 16}" y="{SY - 12}" width="{sw + 32}" height="{sh + 24}" fill="#191e1c" stroke="{LINE}"/>'
    c += f'<image href="{png(stats)}" x="{SX}" y="{SY}" width="{sw}" height="{sh}"/>'
    c += mark('translate(44 34) scale(.52)') + text('DOFUS FORGE', 36, 136, 82, ACCENT, HEAD, 1.5)
    c += text(l1, s1, 56, y1, INK, HEAD, 2)
    c += text(l2, s2, 52, y2, ACCENT, HEAD, 2)
    c += text(l3, s3, 56, y3, INK, HEAD, 2)
    c += text(sub, 30, 58, y3 + 66, MUTED)
    c += text('dofusforge.com', 26, 58, H - 44, INK, 'IBMPlexMono-Medium.ttf')
    (HERE / f'thumbnail-{lang}.svg').write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{c}</svg>', encoding='utf8')
print('svg ok')
