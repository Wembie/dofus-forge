"""Round 7 — Forge Sigils: one cel-shaded icon per site feature, set in a shared hex rune-socket.

usage: python r7_icons.py <out-dir>
"""
import os, sys, math
import r2_build as b
import r6_build as r6

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(b.HERE, "..", "rounds", "r7-forge-system")
os.makedirs(OUT, exist_ok=True)
b.OUT = OUT
fmt, O = b.fmt, b.OUTLINE
WOOD_D, WOOD, WOOD_L = r6.WOOD_D, r6.WOOD, r6.WOOD_L


def hexagon(r, cx=128, cy=128):
    return "M" + " L".join(f"{fmt(cx + r * math.sin(math.radians(a)))} {fmt(cy - r * math.cos(math.radians(a)))}"
                           for a in range(0, 360, 60)) + " Z"


def socket(well="#1c2130"):
    """Shared container: inked gold hex rim around a dark well (a smithmagic rune socket)."""
    return (f'<path d="{hexagon(122)}" fill="{O}"/>'
            f'<path d="{hexagon(116)}" fill="url(#ringGold)"/>'
            f'<path d="M128 12 L228.5 70 L128 128 Z" fill="#fff6d8" opacity=".25"/>'
            f'<path d="{hexagon(98)}" fill="{O}"/>'
            f'<path d="{hexagon(93)}" fill="{well}"/>'
            f'<path d="{hexagon(93)}" fill="url(#wellGlow)"/>')


def ink(d, fill, w=6, extra=""):
    return f'<path d="{d}" fill="{fill}" stroke="{O}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'


def spark(x, y, r):
    return ink(f"M{x} {y - r * 1.7} L{x + r} {y} L{x} {y + r * 1.7} L{x - r} {y} Z", b.GOLD_B, 2.5)


def i_builder():
    return f'<g transform="translate(128 140) scale(.36) translate(-239 -300)">{b.hero_symbol(halo=False, uid="ib")}</g>'


def i_forger():
    """The Forger: a hammer mid-strike with a spark burst."""
    g = ('<g transform="translate(128 138) scale(.84) rotate(-38) translate(-128 -138)">'
         + ink("M120 104 L136 104 L138 214 Q128 222 118 214 Z", WOOD)
         + '<path d="M128 104 L136 104 L138 214 Q133 218 128 218 Z" fill="#000" opacity=".25"/>'
         + ink("M70 66 Q70 58 78 58 L178 58 Q190 58 190 70 L190 100 Q190 112 178 112 L78 112 Q70 112 70 104 Z", b.EDGE_S)
         + '<path d="M78 62 L178 62 Q186 62 186 70 L186 76 L74 76 L74 68 Z" fill="#7b8db0"/>'
         + ink("M170 56 L194 56 L194 114 L170 114 Z", "#5f7194")
         + "</g>")
    return g + spark(190, 168, 9) + spark(214, 138, 5) + spark(170, 198, 5) + f'<circle cx="206" cy="186" r="3" fill="{b.GOLD_B}"/>'


def i_magesmithy():
    """Magesmithy: a smith rune stone with a glowing ◆ sigil."""
    stone = b.egg(128, 62, 202, 62, waist=.5)
    return (f'<clipPath id="runeC"><path d="{stone}"/></clipPath>'
            + f'<path d="{stone}" fill="#5a5f6b"/>'
            + f'<g clip-path="url(#runeC)"><path d="{b.egg(118, 56, 192, 58, waist=.5)}" fill="#8e94a2"/>'
            + f'<path d="{b.egg(108, 66, 140, 30, waist=.5)}" fill="#b9bec9" opacity=".8"/></g>'
            + f'<path d="{stone}" fill="none" stroke="{O}" stroke-width="7"/>'
            + '<circle cx="128" cy="134" r="40" fill="url(#runeGlow)"/>'
            + ink("M128 98 L150 134 L128 170 L106 134 Z", "none", 13)
            + '<path d="M128 98 L150 134 L128 170 L106 134 Z" fill="none" stroke="#ffd27a" stroke-width="7" stroke-linejoin="round"/>'
            + ink("M128 112 L128 156", "none", 11) + '<path d="M128 112 L128 156" stroke="#fff3c4" stroke-width="5" stroke-linecap="round"/>')


def i_sets():
    """Sets: three linked rings, each a set piece, around a ◆ bonus gem."""
    rings = [(100, 112), (156, 112), (128, 160)]
    g = "".join(f'<circle cx="{x}" cy="{y}" r="32" fill="none" stroke="{O}" stroke-width="22"/>' for x, y in rings)
    g += "".join(f'<circle cx="{x}" cy="{y}" r="32" fill="none" stroke="url(#ringGold)" stroke-width="11"/>'
                 f'<path d="M{x - 26} {y - 14} A30 30 0 0 1 {x + 6} {y - 31}" fill="none" stroke="#fff6d8" stroke-width="3" stroke-linecap="round"/>'
                 for x, y in rings)
    return g + ink("M128 112 L142 130 L128 148 L114 130 Z", b.FIRE, 5) + '<path d="M128 112 L142 130 L128 130 Z" fill="#f7a07a"/>'


def i_spells():
    """Spells: a swirling arcane orb on a gold stand."""
    return (ink("M92 196 Q128 176 164 196 L170 210 L86 210 Z", "url(#goldText)")
            + ink("M128 64 A52 52 0 1 1 127.9 64 Z", "url(#orbG)", 7)
            + '<path d="M96 130 C100 96 150 88 160 116 C166 136 140 150 124 138 C114 130 122 116 134 120" fill="none" stroke="#e8f6ff" stroke-width="7" stroke-linecap="round" opacity=".9"/>'
            + '<ellipse cx="108" cy="94" rx="10" ry="16" transform="rotate(30 108 94)" fill="#fff" opacity=".85"/>'
            + spark(176, 76, 6) + spark(80, 84, 4))


def i_ranks():
    """Ranks / PvP: the Master tier crest."""
    return f'<g transform="translate(128 134) scale(.5) translate(-128 -128)">{r6.tier_badge(3, "ir")}</g>'


def i_compare():
    """Compare: forge scales weighing two builds."""
    pan = lambda x: (f'<path d="M{x} 92 L{x - 26} 150 M{x} 92 L{x + 26} 150" stroke="{O}" stroke-width="7" stroke-linecap="round"/>'
                     f'<path d="M{x} 92 L{x - 26} 150 M{x} 92 L{x + 26} 150" stroke="{b.GOLD_D}" stroke-width="3" stroke-linecap="round"/>'
                     + ink(f"M{x - 34} 148 Q{x} 178 {x + 34} 148 Z", "url(#goldText)"))
    return (ink("M122 84 L134 84 L136 196 L120 196 Z", b.EDGE_S)
            + ink("M92 202 Q128 186 164 202 L164 212 L92 212 Z", "url(#goldText)")
            + ink("M64 84 L192 84 L192 96 L64 96 Z", "url(#goldText)")
            + pan(70) + pan(186)
            + ink("M128 52 L144 74 L128 96 L112 74 Z", b.GOLD) + '<path d="M128 52 L144 74 L128 74 Z" fill="#fff1bd"/>')


def i_explore():
    """Explore: a stone portal arch with a swirling gateway."""
    arch = "M70 206 L70 120 A58 58 0 0 1 186 120 L186 206 L160 206 L160 122 A32 32 0 0 0 96 122 L96 206 Z"
    inner = "M96 206 L96 122 A32 32 0 0 1 160 122 L160 206 Z"
    stones = "".join(f'<path d="M{fmt(128 + 45 * math.cos(math.radians(a)))} {fmt(120 - 45 * math.sin(math.radians(a)))} '
                     f'L{fmt(128 + 58 * math.cos(math.radians(a)))} {fmt(120 - 58 * math.sin(math.radians(a)))}" stroke="{O}" stroke-width="4"/>'
                     for a in (30, 70, 110, 150))
    return (ink(inner, "url(#portalG)", 5)
            + '<path d="M128 190 C100 186 102 140 128 138 C150 136 152 166 134 168 C122 170 120 156 130 154" fill="none" stroke="#e8f6ff" stroke-width="6" stroke-linecap="round" opacity=".85"/>'
            + ink(arch, "#7a808d") + '<path d="M70 120 A58 58 0 0 1 128 62 L128 74 A46 46 0 0 0 82 120 L82 206 L70 206 Z" fill="#a5abb8"/>'
            + stones + ink(arch, "none", 7) + ink("M120 56 L136 56 L140 72 L116 72 Z", b.GOLD))


def i_guides():
    """Build guides by element: the four elemental Dofus."""
    out = []
    for (x, y), k in zip(((100, 74), (156, 74), (100, 140), (156, 140)), ("earth", "fire", "water", "air")):
        out.append(b.dofus(x, y, y + 62, 24, b.EGG_TONES[k], f"ig{k}", outline_w=5, bands=False))
    return "".join(out)


def i_collections():
    """Collections: a banded treasure chest with a ◆ lock."""
    return (ink("M66 124 L190 124 L190 202 Q190 210 182 210 L74 210 Q66 210 66 202 Z", WOOD)
            + '<path d="M70 128 L186 128 L186 146 L70 146 Z" fill="#000" opacity=".2"/>'
            + ink("M66 124 L66 104 Q66 66 128 66 Q190 66 190 104 L190 124 Z", WOOD_L)
            + '<path d="M74 104 Q76 76 128 74 L128 90 Q86 92 84 110 Z" fill="#fff" opacity=".15"/>'
            + "".join(ink(f"M{x} 70 L{x + 16} 68 L{x + 16} 210 L{x} 210 Z", "url(#goldText)", 4) for x in (84, 156))
            + ink("M66 120 L190 120 L190 132 L66 132 Z", "url(#goldText)", 4)
            + ink("M128 116 L144 140 L128 164 L112 140 Z", b.FIRE, 5) + '<path d="M128 116 L144 140 L128 140 Z" fill="#f7a07a"/>')


ICONS = [  # key, label, art, well tint
    ("builder", "Builder", i_builder, "#241a14"),
    ("forger", "The Forger", i_forger, "#2a1a12"),
    ("magesmithy", "Magesmithy", i_magesmithy, "#1d1a2a"),
    ("sets", "Sets", i_sets, "#241a14"),
    ("spells", "Spells", i_spells, "#161f30"),
    ("ranks", "Ranks &amp; PvP", i_ranks, "#2a1414"),
    ("compare", "Compare", i_compare, "#1c2130"),
    ("explore", "Explore", i_explore, "#14222a"),
    ("guides", "Element guides", i_guides, "#1c2130"),
    ("collections", "Collections", i_collections, "#241a14"),
]

b.DEFS = b.DEFS + f"""<defs>
  <radialGradient id="wellGlow" cx="50%" cy="38%" r="62%"><stop offset="0" stop-color="{b.GOLD}" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient>
  <radialGradient id="runeGlow"><stop offset="0" stop-color="{b.FIRE}" stop-opacity=".7"/><stop offset="1" stop-color="{b.FIRE}" stop-opacity="0"/></radialGradient>
  <radialGradient id="orbG" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#c9a6ff"/><stop offset=".5" stop-color="#a06fd0"/><stop offset="1" stop-color="#3f2a8a"/></radialGradient>
  <radialGradient id="portalG" cx="50%" cy="60%" r="70%"><stop offset="0" stop-color="#bff3ff"/><stop offset=".45" stop-color="{b.WATER}"/><stop offset="1" stop-color="#134a7a"/></radialGradient>
</defs>"""


def icon(i):
    key, label, art, well = ICONS[i]
    return socket(well) + f'<g transform="translate(128 132) scale(.8) translate(-128 -132)">{art()}</g>'


if __name__ == "__main__":
    for i, (key, label, _a, _w) in enumerate(ICONS):
        b.write(f"icon-{key}.svg", b.svg(icon(i), 256, 256, f"Dofus Forge — {label}"))
    print("ok", OUT)
