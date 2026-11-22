import type { AppItem } from '@/data/loaders.ts'
import { exoticOf, isExoticKey } from '@/engine/runes.ts'
import { WEAPON_ATTACK_STAT } from '@/features/spells/spellCalc.ts'
import { lineValue } from '@/features/equipment/transcendence.ts'

// Magesmithing rules shared by every presentation of the rune editor.

export type RuneSection = { labelKey: string; stats: string[] }

/** Runes the player can pick, grouped as in the game's magesmithing window. */
export const RUNE_SECTIONS: RuneSection[] = [
  {
    labelKey: 'rune_section_primary',
    stats: ['Vitality', 'Strength', 'Intelligence', 'Chance', 'Agility', 'Wisdom', 'Power', 'AP', 'MP', 'Range', 'Summons', '% Critical'],
  },
  {
    labelKey: 'rune_section_damage',
    stats: [
      'Damage', 'Earth Damage', 'Fire Damage', 'Water Damage', 'Air Damage', 'Neutral Damage',
      '% Spell Damage', '% Weapon Damage', '% Melee Damage', '% Ranged Damage',
      'Critical Damage', 'Pushback Damage', 'Trap Damage', 'Power (traps)',
    ],
  },
  {
    labelKey: 'rune_section_resistance',
    stats: [
      'Earth Resistance', 'Fire Resistance', 'Water Resistance', 'Air Resistance', 'Neutral Resistance',
      'Critical Resistance', 'Pushback Resistance',
    ],
  },
  {
    labelKey: 'rune_section_pct_resistance',
    stats: [
      '% Earth Resistance', '% Fire Resistance', '% Water Resistance', '% Air Resistance', '% Neutral Resistance',
      '% Melee Resistance', '% Ranged Resistance',
    ],
  },
  {
    labelKey: 'rune_section_secondary',
    stats: [
      'Initiative', 'Lock', 'Dodge', 'Heal', 'Prospecting', 'Pod',
      'AP Reduction', 'MP Reduction', 'AP Parry', 'MP Parry', 'reflected damage',
    ],
  },
]

export const ALL_RUNES = RUNE_SECTIONS.flatMap(s => s.stats)

const PCT_RUNES = new Set([
  '% Earth Resistance', '% Fire Resistance', '% Water Resistance', '% Air Resistance', '% Neutral Resistance',
  '% Spell Damage', '% Weapon Damage', '% Melee Damage', '% Ranged Damage',
  '% Melee Resistance', '% Ranged Resistance', '% Critical',
])
const UNIT_RUNES = new Set(['AP', 'MP', 'Range'])

/** Preset amounts offered for a rune: percentages and AP/MP/Range come in small steps. */
export function quickValuesFor(stat: string): number[] {
  if (PCT_RUNES.has(stat))  return [1, 2, 3, 4, 5]
  if (UNIT_RUNES.has(stat)) return [1]
  return [1, 5, 10, 25, 50, 100]
}

// Official forgemagie weight of one point, as the Forge uses it.
export const RUNE_WEIGHT: Record<string, number> = {
  'AP': 100, 'MP': 90, 'Range': 51, 'Summons': 30,
  'Vitality': 0.2, 'Wisdom': 3, 'Strength': 1, 'Intelligence': 1, 'Chance': 1, 'Agility': 1, 'Power': 2,
  'Damage': 20, 'Earth Damage': 5, 'Fire Damage': 5, 'Water Damage': 5, 'Air Damage': 5, 'Neutral Damage': 5,
  '% Spell Damage': 15, '% Weapon Damage': 15, '% Melee Damage': 15, '% Ranged Damage': 15,
  '% Critical': 10, 'Heal': 10, 'Critical Damage': 5, 'Pushback Damage': 5, 'Trap Damage': 5, 'Power (traps)': 2,
  'Earth Resistance': 2, 'Fire Resistance': 2, 'Water Resistance': 2, 'Air Resistance': 2, 'Neutral Resistance': 2,
  'Critical Resistance': 2, 'Pushback Resistance': 2,
  '% Earth Resistance': 6, '% Fire Resistance': 6, '% Water Resistance': 6, '% Air Resistance': 6, '% Neutral Resistance': 6,
  '% Melee Resistance': 15, '% Ranged Resistance': 15,
  'Initiative': 0.1, 'Lock': 4, 'Dodge': 4, 'Prospecting': 3, 'Pod': 0.25,
  'AP Reduction': 7, 'MP Reduction': 7, 'AP Parry': 7, 'MP Parry': 7, 'reflected damage': 10,
}

/** The game's cap on a line's weight, and on the exo + over weight of one item. */
export const EXOTIC_LIMIT = 101

export type RuneBlock = 'transcendence' | 'line' | 'item' | null
export type RuneRoom = {
  /** Most that can still be added on this stat (0: the rune is impossible). */
  room:       number
  block:      RuneBlock
  /** Weight the stat's line would reach with one more point. */
  lineWeight: number
  /** Exo + over weight the item's normal runes already add. */
  itemWeight: number
}

const weightOf = (stat: string) => RUNE_WEIGHT[stat] ?? 1
const round1 = (v: number) => Math.round(v * 10) / 10

/** Exo + over weight of a slot's normal runes: every one sits past the item's best roll. */
export function runesWeight(runes: Record<string, number>): number {
  return round1(Object.entries(runes).reduce((sum, [k, v]) => (v > 0 && !isExoticKey(k) ? sum + v * weightOf(k) : sum), 0))
}

/**
 * How much more of `stat` a normal rune can still add to the item. A line
 * never weighs more than 101 (unless the item's own roll already does, and
 * then it cannot grow), the item carries at most 101 of exo + over weight,
 * and an item with a transcendence rune takes no other forgemagie.
 */
export function runeRoom(item: AppItem, runes: Record<string, number>, stat: string): RuneRoom {
  const w = weightOf(stat)
  const native = lineValue(item, stat)
  const carried = runes[stat] ?? 0
  const itemWeight = runesWeight(runes)
  const lineWeight = round1((native + carried + 1) * w)
  if (exoticOf(runes)) return { room: 0, block: 'transcendence', lineWeight, itemWeight }
  const lineLimit = Math.max(EXOTIC_LIMIT, native * w)
  const lineRoom = Math.max(0, Math.floor(lineLimit / w + 1e-9) - native - carried)
  const itemRoom = Math.max(0, Math.floor((EXOTIC_LIMIT - itemWeight) / w + 1e-9))
  const room = Math.min(lineRoom, itemRoom)
  return { room, block: room > 0 ? null : lineRoom <= itemRoom ? 'line' : 'item', lineWeight, itemWeight }
}

/** Whether what the slot already carries could be forged in the game. */
export function runeImpossible(item: AppItem, runes: Record<string, number>, stat: string): RuneBlock {
  const value = runes[stat] ?? 0
  if (value <= 0) return null
  if (exoticOf(runes)) return 'transcendence'
  const w = weightOf(stat)
  const native = lineValue(item, stat)
  if ((native + value) * w > Math.max(EXOTIC_LIMIT, native * w) + 1e-9) return 'line'
  if (runesWeight(runes) > EXOTIC_LIMIT + 1e-9) return 'item'
  return null
}

/** Sort order for a slot's rune list: the exotic (transcendence) line first. */
export const exoticFirst = ([a]: [string, number], [b]: [string, number]) => Number(isExoticKey(b)) - Number(isExoticKey(a))

export type TransformElement = 'fire' | 'earth' | 'water' | 'air'
export const TRANSFORM_ELEMENTS: TransformElement[] = ['fire', 'earth', 'water', 'air']
export const TRANSFORM_RATIOS: (85 | 68 | 50)[] = [85, 68, 50]
/** Ratio a transform starts at when no ratio was chosen yet. */
export const DEFAULT_TRANSFORM_RATIO = 85

/**
 * A weapon can only be transformed when it has a neutral attack line, which
 * can be a plain damage line or a steal line (e.g. Pandamonium Wand only has
 * "Neutral steal"; checking just 'Neutral damage' missed every steal-only weapon).
 */
export function canTransformWeapon(item: AppItem): boolean {
  return item.effects.some(e => WEAPON_ATTACK_STAT[e.stat] === 'neutral')
}
