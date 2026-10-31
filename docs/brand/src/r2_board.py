"""Round 2 concept board on the site's dark palette: hero, sizes 64/32/16, 52px header mock.

usage: python r2_board.py <out-dir>
"""
import os, sys
import r2_build as b

OUT = sys.argv[1] if len(sys.argv) > 1 else b.OUT
b.OUT = OUT
FONT_UI = "Segoe UI, Inter, system-ui, sans-serif"


def nest(body, vb, x, y, w, h=None):
    return f'<svg x="{x}" y="{y}" width="{w}" height="{h or w}" viewBox="{vb}">{body}</svg>'


def text(x, y, s, size=20, fill=b.INK, weight=400, anchor="start", op=1, ls=0):
    return (f'<text x="{x}" y="{y}" font-family="{FONT_UI}" font-size="{size}" font-weight="{weight}" fill="{fill}" '
            f'opacity="{op}" text-anchor="{anchor}" letter-spacing="{ls}">{s}</text>')


def header_mock(x, y, w, sym, vb):
    d, _ = b.wordmark("DOFUS FORGE", b.WM_FONT, 14, 0.14, x0=x + 60, base=y + 33)
    return (f'<rect x="{x}" y="{y}" width="{w}" height="52" rx="8" fill="url(#hdr)" stroke="{b.EDGE}"/>'
            + nest(sym, vb, x + 14, y + 8, 36)
            + f'<path d="{d}" fill="{b.GOLD_B}"/>'
            + f'<rect x="{x + w - 132}" y="{y + 14}" width="54" height="24" rx="5" fill="{b.PANEL}" stroke="{b.EDGE}"/>'
            + text(x + w - 105, y + 31, "Lv 200", 11, b.GOLD_B, 700, "middle")
            + f'<rect x="{x + w - 68}" y="{y + 14}" width="54" height="24" rx="5" fill="{b.GOLD_D}" opacity=".5"/>'
            + text(x + w - 41, y + 31, "Builds", 11, b.INK, 600, "middle"))


def card(x, y, letter, name, kind, lines, sym, vb, small, small_vb, rec=False):
    W, H = 540, 900
    p = [f'<rect x="{x}" y="{y}" width="{W}" height="{H}" rx="16" fill="{b.PANEL}" stroke="{b.GOLD if rec else b.EDGE}" stroke-width="{2 if rec else 1}"/>',
         f'<rect x="{x + 1}" y="{y + 1}" width="{W - 2}" height="440" rx="15" fill="url(#cardGlow)"/>',
         nest(sym, vb, x + 70, y + 30, 400)]
    if rec:
        p.append(f'<rect x="{x + 20}" y="{y + 20}" width="150" height="30" rx="15" fill="{b.GOLD_D}"/>'
                 + text(x + 95, y + 40, "RECOMMENDED", 12, b.GOLD_B, 700, "middle", ls=1.5))
    nd, _ = b.wordmark(f"{letter} · {name}", "Cinzel-700.ttf", 23, 0.03, x0=x + 36, base=y + 484)
    p.append(f'<path d="{nd}" fill="{b.GOLD_B}"/>')
    p.append(text(x + 36, y + 514, kind.upper(), 13, b.GOLD, 700, ls=2))
    for i, ln in enumerate(lines):
        p.append(text(x + 36, y + 552 + i * 28, ln, 18, b.INK, op=.85))
    # size ladder
    yy = y + 664
    p.append(f'<rect x="{x + 36}" y="{yy}" width="{W - 72}" height="96" rx="10" fill="{b.VOID}" stroke="{b.EDGE}"/>')
    for sz, xx in ((64, 60), (32, 150), (16, 206)):
        p.append(nest(small, small_vb, x + xx, yy + 48 - sz / 2, sz))
        p.append(text(x + xx + sz / 2, yy + 90, f"{sz}px", 11, b.INK, anchor="middle", op=.45))
    p.append(f'<rect x="{x + 262}" y="{yy + 16}" width="64" height="64" rx="14" fill="{b.STONE}" stroke="{b.EDGE}"/>')
    p.append(nest(small, small_vb, x + 268, yy + 22, 52))
    p.append(f'<rect x="{x + 346}" y="{yy + 28}" width="120" height="40" rx="8" fill="#e9e5da"/>')
    p.append(nest(small, small_vb, x + 352, yy + 32, 32))
    p.append(text(x + 392, yy + 54, "light", 12, b.VOID, 600))
    p.append(header_mock(x + 36, y + 790, W - 72, small, small_vb))
    return "".join(p)


def board():
    W, H = 1800, 1240
    t, tw = b.wordmark("DOFUS × FORGE", b.WM_FONT, 58, 0.04, x0=60, base=150)
    p = [f'<rect width="{W}" height="{H}" fill="{b.VOID}"/>',
         f'<rect width="{W}" height="{H}" fill="url(#topGlow)"/>',
         text(62, 64, "DOFUS FORGE · VISUAL IDENTITY · ROUND 2", 15, b.GOLD, 700, ls=3),
         b.game_text(t, stroke=8, shadow=4),
         text(62, 200, "The Dofus is born in the forge: your build is forged like a legendary egg. Ankama-style cel shading on The Vault palette.", 20, b.INK, op=.75)]
    A = b.hero_symbol(uid="ba")
    A_small = b.hero_symbol(halo=False, uid="bas")
    B = b.seal()
    C = b.blazon()
    p.append(card(60, 260, "A", "The Dofus on the Anvil", "Combination · primary symbol",
                  ["An ochre Dofus, glowing hot, freshly", "forged on the anvil; ◆ sparks echo", "the header diamond."],
                  A, "0 20 512 512", A_small, "0 60 480 452", rec=True))
    p.append(card(630, 260, "B", "The Forge Seal", "Emblem · premium badge",
                  ["Gold medallion with 12 ◆ rivets and a", "red ribbon: the seal for OG, Discord,", "achievements and What's New."],
                  B, "0 0 512 512", B, "0 0 512 512"))
    p.append(card(1200, 260, "C", "The Blazoned Dofus", "Pictorial · compact icon",
                  ["The Dofus itself is the shield: a gold", "anvil forged into its band. Best", "legibility at 16 px (favicon, app)."],
                  C, "0 0 512 512", C, "0 0 512 512"))
    p.append(text(62, 1210, "Recommendation: A as primary symbol + C as icon/favicon + B as seal — one system, three scales.", 18, b.GOLD_B, 600))
    defs = f"""<defs>
  <radialGradient id="topGlow" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="{b.GOLD}" stop-opacity=".10"/><stop offset="1" stop-color="{b.GOLD}" stop-opacity="0"/></radialGradient>
  <radialGradient id="cardGlow" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#2a2018"/><stop offset="1" stop-color="{b.PANEL}"/></radialGradient>
  <linearGradient id="hdr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{b.STONE}"/><stop offset="1" stop-color="{b.VOID}"/></linearGradient>
</defs>"""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f'{b.DEFS}{defs}{"".join(p)}</svg>')


if __name__ == "__main__":
    b.write("board.svg", board())
    print("ok")
