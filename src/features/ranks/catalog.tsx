import {
  Crown, Flame, Gem, Handshake, Heart, Medal, Palette, Shield, Sparkles, Star,
  type LucideIcon,
} from 'lucide-react'

export const RANK_ICONS = {
  crown: Crown,
  sparkles: Sparkles,
  palette: Palette,
  shield: Shield,
  heart: Heart,
  star: Star,
  gem: Gem,
  handshake: Handshake,
  flame: Flame,
  medal: Medal,
} satisfies Record<string, LucideIcon>

export type CustomRankIcon = keyof typeof RANK_ICONS
export type RankBadgeStyle = 'standard' | 'founder' | 'creator'

export const RANK_COLORS = [
  '#C9A24B', '#D98A4A', '#8B7BB8', '#6FAF85',
  '#77A9C9', '#C56C72', '#B98B62', '#A6A6A6',
] as const

export type CustomRankColor = typeof RANK_COLORS[number]

export type PublicCustomRank = {
  name: string
  description: string
  icon: CustomRankIcon
  color: CustomRankColor
  badgeStyle: RankBadgeStyle
}

export function isRankIcon(value: string): value is CustomRankIcon {
  return Object.prototype.hasOwnProperty.call(RANK_ICONS, value)
}

export function isRankColor(value: string): value is CustomRankColor {
  return (RANK_COLORS as readonly string[]).includes(value)
}

export function isRankBadgeStyle(value: string): value is RankBadgeStyle {
  return value === 'standard' || value === 'founder' || value === 'creator'
}
