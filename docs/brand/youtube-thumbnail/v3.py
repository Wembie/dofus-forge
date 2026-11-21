"""YouTube thumbnail v3 (Spanish, aggressive): solid gold diagonal, FULL RESIS, real resistances.

python docs/brand/youtube-thumbnail/v3.py && node docs/brand/youtube-thumbnail/render.mjs v3
"""
import importlib.util
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('base', HERE / 'build.py')
base = importlib.util.module_from_spec(spec); spec.loader.exec_module(base)
text, width, png = base.text, base.width, base.png
BG, INK, ACCENT, HEAD, BODY, FLAME = base.BG, base.INK, base.ACCENT, base.HEAD, base.BODY, base.FLAME
W, H = base.W, base.H
STATS = base.ROOT / 'public' / 'data' / 'stats'
MONO = 'IBMPlexMono-Medium.ttf'

ocra = Image.open(HERE / 'ocra.png'); ocra = ocra.crop(ocra.getbbox())
CS = 1.22
cw, ch = round(ocra.width * CS), round(ocra.height * CS)
ocra = ocra.resize((cw, ch), Image.LANCZOS)
CX, CY = W - cw - 40, H - ch + 140

def icon(name, size):
    return png(Image.open(STATS / f'{name}.webp').convert('RGBA').resize((size, size), Image.LANCZOS))

c = f'<rect width="{W}" height="{H}" fill="{BG}"/>'
c += f'<path d="M0 0H740L610 {H}H0Z" fill="{ACCENT}"/>'
c += f'<image href="{png(ocra)}" x="{CX}" y="{CY}" width="{cw}" height="{ch}"/>'

c += f'<g transform="translate(44 28) scale(.42)" fill="{BG}" fill-rule="evenodd"><path d="{BODY}"/><path d="{FLAME}"/></g>'
c += text('DOFUS FORGE', 30, 120, 66, BG, HEAD, 1.5)
c += text('FULL', 214, 44, 276, BG, HEAD, 3)
c += text('RESIS', 236, 40, 478, BG, HEAD, 3)

# The build's real elemental resistances, as the workshop computes them.
RES = (('earth_resistance', '44'), ('fire_resistance', '34'), ('water_resistance', '44'), ('air_resistance', '41'))
c += f'<rect x="40" y="522" width="548" height="104" fill="{BG}"/>'
x = 60
for name, val in RES:
    c += f'<image href="{icon(name, 40)}" x="{x}" y="554" width="40" height="40"/>'
    c += text(val, 50, x + 46, 594, INK, HEAD, 1)
    vx = x + 46 + width(val, 50, HEAD, 1) + 2
    c += text('%', 28, vx, 594, ACCENT, HEAD)
    x += 132
c += text('dofusforge.com', 26, 44, 682, BG, MONO)

seal = 'GRATIS'; ss = 60; sw = width(seal, ss, HEAD, 3)
bx, by, bw, bh = W - sw - 40 - 48, 44, sw + 40, 80
c += (f'<g transform="rotate(5 {bx + bw / 2} {by + bh / 2})"><rect x="{bx}" y="{by}" width="{bw}" height="{bh}" fill="{BG}" stroke="{ACCENT}" stroke-width="3"/>'
      + text(seal, ss, bx + 20, by + 62, ACCENT, HEAD, 3) + '</g>')

(HERE / 'thumbnail-es-v3.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{c}</svg>', encoding='utf8')
print('v3 ok')
