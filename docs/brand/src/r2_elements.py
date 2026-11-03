"""Round 2 — system teaser: the brand Dofus plus the four elemental Dofus (DESIGN.md §2.4 colours)."""
import sys
import r2_build as b

b.OUT = sys.argv[1] if len(sys.argv) > 1 else b.OUT
labels = [("ocre", "BRAND"), ("earth", "EARTH"), ("fire", "FIRE"), ("water", "WATER"), ("air", "AIR")]
p = [f'<rect width="1400" height="420" fill="{b.VOID}"/>']
for i, (k, name) in enumerate(labels):
    cx = 140 + i * 280
    p.append(f'<ellipse cx="{cx}" cy="330" rx="80" ry="12" fill="#000" opacity=".5"/>')
    p.append(b.dofus(cx, 70, 326, 100, b.EGG_TONES[k], f"e{i}", tilt=0, outline_w=9))
    p.append(f'<text x="{cx}" y="384" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="18" '
             f'font-weight="700" letter-spacing="3" fill="{b.EGG_TONES[k][1]}">{name}</text>')
b.write("elements.svg", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 420" width="1400" height="420">{b.DEFS}{"".join(p)}</svg>')
print("ok")
