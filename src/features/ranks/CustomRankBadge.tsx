import type { CSSProperties } from 'react'
import { RANK_ICONS, type PublicCustomRank, type RankBadgeStyle } from './catalog.tsx'
import './rankBadge.css'

/**
 * A rank badge in the 0.4.0 language: a flat, squared chip with the icon in
 * its own tile and the name in condensed capitals. Each stored style keeps
 * its identity through a few restrained traits — fill, edge and, for the
 * metals, the metal's colour — instead of glows, neon and gradients.
 */
type Tone = 'tint' | 'solid' | 'outline' | 'inverse'
type Edge = 'single' | 'double' | 'dashed'

const SOLID = new Set<RankBadgeStyle>(['founder', 'royal', 'champion', 'gold_foil', 'royal_seal', 'champagne', 'platinum', 'solar_flare', 'prismatic', 'holographic', 'enamel', 'celestial'])
const OUTLINE = new Set<RankBadgeStyle>(['minimal', 'creator', 'glitch', 'matrix', 'silk', 'porcelain', 'marble', 'pearl'])
const INVERSE = new Set<RankBadgeStyle>(['obsidian', 'obsidian_gold', 'carbon', 'void', 'deep_space', 'black_tie', 'neon', 'nebula', 'cosmic', 'twilight', 'bloodmoon', 'steel_engraved', 'thunder', 'storm'])
const DOUBLE = new Set<RankBadgeStyle>(['royal', 'royal_seal', 'vintage', 'ancient', 'relic', 'steel_engraved', 'leatherbound', 'champion'])
const DASHED = new Set<RankBadgeStyle>(['creator', 'glitch', 'matrix'])

const GOLD = '#C9A24B'
const SILVER = '#A7AFBA'
const BRONZE = '#B07A45'
const METAL: Partial<Record<RankBadgeStyle, string>> = {
  founder: GOLD, gold_foil: GOLD, champagne: GOLD, royal_seal: GOLD, obsidian_gold: GOLD, solar_flare: GOLD,
  silver: SILVER, platinum: SILVER, blue_steel: SILVER, steel_engraved: SILVER, pearl: SILVER,
  bronze: BRONZE, copper: BRONZE, vintage: BRONZE, ancient: BRONZE, relic: BRONZE, leatherbound: BRONZE,
  rose_gold: '#C98F7E',
}

export function rankBadgeLook(style: RankBadgeStyle, color: string): { tone: Tone; edge: Edge; color: string } {
  return {
    tone: SOLID.has(style) ? 'solid' : OUTLINE.has(style) ? 'outline' : INVERSE.has(style) ? 'inverse' : 'tint',
    edge: DOUBLE.has(style) ? 'double' : DASHED.has(style) ? 'dashed' : 'single',
    color: METAL[style] ?? color,
  }
}

/** Dark or light ink, whichever reads better on a solid fill of `hex`. */
function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ?'#14161a' : '#ffffff'
}

export function CustomRankBadge({ rank }: { rank: PublicCustomRank }) {
  const Icon = RANK_ICONS[rank.icon]
  const look = rankBadgeLook(rank.badgeStyle, rank.color)
  const style = { '--rank': look.color, '--rank-ink': inkOn(look.color) } as CSSProperties
  return (
    <span className="rank-badge" data-tone={look.tone} data-edge={look.edge} style={style} title={rank.description || rank.name}>
      <span className="rank-badge-icon"><Icon size={12} strokeWidth={2.2} aria-hidden="true" /></span>
      <span className="rank-badge-name">{rank.name}</span>
    </span>
  )
}
