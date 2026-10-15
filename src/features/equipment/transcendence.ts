import type { AppItem } from '@/data/loaders.ts'
import { STAT_MAP, WEAPON_ATTACK_IDS } from '@/engine/statMap.ts'

// Official transcendence runes: bonus per rank (0 = rank doesn't exist) and
// the forgemagie weight of one point of the stat. Same table La Forjadora uses.
export const TRANSCENDENCE: { stat: string; ranks: [number, number, number]; weight: number }[] = [
  { stat: 'Vitality',             ranks: [50, 75, 100],  weight: 0.2 },
  { stat: 'Strength',             ranks: [10, 15, 20],   weight: 1 },
  { stat: 'Intelligence',         ranks: [10, 15, 20],   weight: 1 },
  { stat: 'Chance',               ranks: [10, 15, 20],   weight: 1 },
  { stat: 'Agility',              ranks: [10, 15, 20],   weight: 1 },
  { stat: 'Power',                ranks: [6, 9, 12],     weight: 2 },
  { stat: '% Critical',           ranks: [1, 2, 0],      weight: 10 },
  { stat: 'Initiative',           ranks: [100, 150, 200], weight: 0.1 },
  { stat: 'Pod',                  ranks: [100, 200, 400], weight: 0.25 },
  { stat: 'Heal',                 ranks: [4, 7, 10],     weight: 10 },
  { stat: 'Earth Damage',         ranks: [2, 4, 6],      weight: 5 },
  { stat: 'Fire Damage',          ranks: [2, 4, 6],      weight: 5 },
  { stat: 'Water Damage',         ranks: [2, 4, 6],      weight: 5 },
  { stat: 'Air Damage',           ranks: [2, 4, 6],      weight: 5 },
  { stat: 'Neutral Damage',       ranks: [2, 4, 6],      weight: 5 },
  { stat: 'Critical Damage',      ranks: [6, 8, 0],      weight: 5 },
  { stat: 'Pushback Damage',      ranks: [6, 8, 0],      weight: 5 },
  { stat: '% Melee Damage',       ranks: [1, 0, 0],      weight: 15 },
  { stat: '% Ranged Damage',      ranks: [1, 0, 0],      weight: 15 },
  { stat: '% Spell Damage',       ranks: [1, 0, 0],      weight: 15 },
  { stat: '% Weapon Damage',      ranks: [1, 0, 0],      weight: 15 },
  { stat: '% Earth Resistance',   ranks: [2, 0, 0],      weight: 6 },
  { stat: '% Fire Resistance',    ranks: [2, 0, 0],      weight: 6 },
  { stat: '% Water Resistance',   ranks: [2, 0, 0],      weight: 6 },
  { stat: '% Air Resistance',     ranks: [2, 0, 0],      weight: 6 },
  { stat: '% Neutral Resistance', ranks: [2, 0, 0],      weight: 6 },
  { stat: '% Melee Resistance',   ranks: [1, 0, 0],      weight: 15 },
  { stat: '% Ranged Resistance',  ranks: [1, 0, 0],      weight: 15 },
  { stat: 'Critical Resistance',  ranks: [9, 12, 0],     weight: 2 },
  { stat: 'Pushback Resistance',  ranks: [9, 12, 0],     weight: 2 },
  { stat: 'Lock',                 ranks: [4, 6, 8],      weight: 4 },
  { stat: 'Dodge',                ranks: [4, 6, 8],      weight: 4 },
  { stat: 'AP Reduction',         ranks: [2, 3, 4],      weight: 7 },
  { stat: 'MP Reduction',         ranks: [2, 3, 4],      weight: 7 },
  { stat: 'AP Parry',             ranks: [2, 4, 6],      weight: 7 },
  { stat: 'MP Parry',             ranks: [2, 4, 6],      weight: 7 },
]

// A rank only takes on an item whose own line on that stat weighs at most this.
const RANK_WEIGHT_LIMIT = [60, 40, 20]

export const FORGEABLE_SLOTS = new Set(['hat', 'cape', 'amulet', 'ring1', 'ring2', 'belt', 'boots', 'weapon', 'shield'])

export type RankOption = { rank: 1 | 2 | 3; value: number; allowed: boolean; limit: number }

/** Weight of the item's own line on `stat` (weapon attack lines don't count). */
export function lineWeight(item: AppItem, stat: string): number {
  const row = TRANSCENDENCE.find(r => r.stat === stat)
  const key = STAT_MAP[stat]
  if (!row || !key) return 0
  const isWeapon = item.slot === 'weapon'
  let value = 0
  for (const e of item.effects) {
    if (STAT_MAP[e.stat] !== key) continue
    if (isWeapon && e.effect_id != null && WEAPON_ATTACK_IDS.has(e.effect_id)) continue
    value += e.max !== 0 && e.max > e.min ? e.max : e.min
  }
  return Math.round(value * row.weight * 10) / 10
}

export function rankOptions(item: AppItem, stat: string): RankOption[] {
  const row = TRANSCENDENCE.find(r => r.stat === stat)
  if (!row) return []
  const weight = lineWeight(item, stat)
  return row.ranks
    .map((value, i) => ({ rank: (i + 1) as 1 | 2 | 3, value, allowed: weight <= RANK_WEIGHT_LIMIT[i], limit: RANK_WEIGHT_LIMIT[i] }))
    .filter(o => o.value > 0)
}

/** Highest rank the item takes on `stat`, or null when none does. */
export function bestRank(item: AppItem, stat: string): RankOption | null {
  return rankOptions(item, stat).filter(o => o.allowed).pop() ?? null
}
