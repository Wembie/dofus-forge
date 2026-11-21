"""YouTube thumbnail v2 (Spanish): huge character, 12 PA / 6 PM hook, GRATIS seal.

python docs/brand/youtube-thumbnail/v2.py && node docs/brand/youtube-thumbnail/render.mjs v2
"""
import importlib.util
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('base', HERE / 'build.py')
# build.py writes the v1 SVGs when imported; that is harmless and keeps one copy of the helpers.
base = importlib.util.module_from_spec(spec); spec.loader.exec_module(base)
text, width, png, mark = base.text, base.width, base.png, base.mark
BG, INK, ACCENT, MUTED, LINE, HEAD = base.BG, base.INK, base.ACCENT, base.MUTED, base.LINE, base.HEAD
W, H = base.W, base.H
DARK = '#231d17'

ocra = Image.open(HERE / 'ocra.png'); ocra = ocra.crop(ocra.getbbox())
CS = 1.1
cw, ch = round(ocra.width * CS), round(ocra.height * CS)
ocra = ocra.resize((cw, ch), Image.LANCZOS)
CX, CY = W - cw - 8, H - ch + 64

forger = Image.open(HERE / 'workshop-es-ocra.png').convert('RGB').crop((1530, 178, 1788, 258))
FS = 0.78
fw, fh = round(forger.width * FS), round(forger.height * FS)
forger = forger.resize((fw, fh), Image.LANCZOS)

c = f'<rect width="{W}" height="{H}" fill="{BG}"/>'
c += f'<image href="{png(ocra)}" x="{CX}" y="{CY}" width="{cw}" height="{ch}"/>'
c += mark('translate(46 30) scale(.46)') + text('DOFUS FORGE', 32, 128, 72, ACCENT, HEAD, 1.5)

x = 52
c += text('TU BUILD', 124, x, 222, INK, HEAD, 2)
# The hook: the numbers every Dofus player reads first.
big, small = 222, 92
y = 432
for num, unit in (('12', 'PA'), ('6', 'PM')):
    c += text(num, big, x, y, ACCENT, HEAD, 2); x += width(num, big, HEAD, 2) + 10
    c += text(unit, small, x, y, INK, HEAD, 2); x += width(unit, small, HEAD, 2) + 36
c += text('EN SEGUNDOS', 124, 52, 566, INK, HEAD, 2)

c += f'<image href="{png(forger)}" x="56" y="604" width="{fw}" height="{fh}"/>'
c += text('dofusforge.com', 28, 56 + fw + 24, 604 + fh / 2 + 10, MUTED, 'IBMPlexMono-Medium.ttf')

seal = 'GRATIS'; ss = 58; sw = width(seal, ss, HEAD, 3)
bx, by, bw, bh = W - sw - 40 - 56, 48, sw + 40, 78
c += (f'<g transform="rotate(-6 {bx + bw / 2} {by + bh / 2})"><rect x="{bx}" y="{by}" width="{bw}" height="{bh}" fill="{ACCENT}"/>'
      + text(seal, ss, bx + 20, by + 60, DARK, HEAD, 3) + '</g>')

(HERE / 'thumbnail-es-v2.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{c}</svg>', encoding='utf8')
print('v2 ok')
