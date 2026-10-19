import {
  Anvil, Award, Axe, BadgeCheck, BadgePlus, Bird, BookOpen, Bug, Castle, Cat,
  CircleStar, Clover, Code2, Compass, Crown, Dna, Feather, Flame, FlameKindling,
  Flower2, Gamepad2, Gem, Globe2, Hammer, Handshake, Headphones, Heart,
  HeartHandshake, HeartPulse, Landmark, Leaf, Medal, Moon, Mountain, Music,
  Orbit, Palette, PiggyBank, Rabbit, Rocket, ScrollText, Shield, ShieldCheck,
  Sparkles, Star, Sun, Sword, Swords, Target, Trophy, Users, WandSparkles, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react'

export const RANK_ICONS = {
  anvil: Anvil,
  award: Award,
  axe: Axe,
  badge_check: BadgeCheck,
  badge_plus: BadgePlus,
  bird: Bird,
  book_open: BookOpen,
  bug: Bug,
  castle: Castle,
  cat: Cat,
  circle_star: CircleStar,
  clover: Clover,
  code: Code2,
  compass: Compass,
  crown: Crown,
  dna: Dna,
  feather: Feather,
  flame: Flame,
  flame_kindling: FlameKindling,
  flower: Flower2,
  gamepad: Gamepad2,
  gem: Gem,
  globe: Globe2,
  hammer: Hammer,
  handshake: Handshake,
  headphones: Headphones,
  heart: Heart,
  heart_handshake: HeartHandshake,
  heart_pulse: HeartPulse,
  landmark: Landmark,
  leaf: Leaf,
  medal: Medal,
  moon: Moon,
  mountain: Mountain,
  music: Music,
  orbit: Orbit,
  palette: Palette,
  piggy_bank: PiggyBank,
  rabbit: Rabbit,
  rocket: Rocket,
  scroll: ScrollText,
  shield: Shield,
  shield_check: ShieldCheck,
  sparkles: Sparkles,
  star: Star,
  sun: Sun,
  sword: Sword,
  swords: Swords,
  target: Target,
  trophy: Trophy,
  users: Users,
  wand: WandSparkles,
  wrench: Wrench,
  zap: Zap,
} satisfies Record<string, LucideIcon>

export type CustomRankIcon = keyof typeof RANK_ICONS
export const RANK_BADGE_STYLES = [
  'standard', 'founder', 'creator', 'royal', 'neon', 'crystal',
  'holographic', 'obsidian', 'minimal', 'arcane', 'vintage', 'champion',
  'celestial', 'infernal', 'emerald', 'sapphire', 'ruby', 'bronze',
  'silver', 'platinum', 'carbon', 'aurora', 'cosmic', 'toxic',
] as const
export type RankBadgeStyle = typeof RANK_BADGE_STYLES[number]

export const RANK_COLORS = [
  '#C9A24B', '#F2C14E', '#D98A4A', '#F78C6B', '#FF6B35', '#E56B6F', '#EF476F', '#C56C72',
  '#D86AA0', '#F1C0E8', '#B47AEA', '#8B7BB8', '#7209B7', '#CDB4DB', '#6F83D6', '#3A86FF',
  '#4E90D8', '#77A9C9', '#A0C4FF', '#00B4D8', '#4FACC9', '#54B8A7', '#06D6A0', '#6FAF85',
  '#52B788', '#2D6A4F', '#8FBF4A', '#FDFFB6', '#C0A84A', '#B98B62', '#A6A6A6', '#778DA9',
  '#6C757D', '#E6E8EF', '#FFC6FF', '#9B5DE5', '#00F5D4', '#F15BB5',
] as const

export type CustomRankColor = string

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
  return /^#[0-9a-f]{6}$/i.test(value)
}

export function isRankBadgeStyle(value: string): value is RankBadgeStyle {
  return (RANK_BADGE_STYLES as readonly string[]).includes(value)
}
