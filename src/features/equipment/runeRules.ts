import type { AppItem } from '@/data/loaders.ts'
import { isExoticKey } from '@/engine/runes.ts'
import { WEAPON_ATTACK_STAT } from '@/features/spells/spellCalc.ts'

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
