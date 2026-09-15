import type { StatBlock } from '@/engine/types.ts'
import type { AppSpellEffect } from '@/data/spellLoaders.ts'

type ElemKey = Exclude<AppSpellEffect['element'], never>

function mastery(elem: ElemKey, stats: StatBlock): number {
  switch (elem) {
    case 'earth':   return stats.strength
    case 'fire':    return stats.intelligence
    case 'water':   return stats.chance
    case 'air':     return stats.agility
    case 'neutral': return stats.strength
  }
}

function flatBonus(elem: ElemKey, stats: StatBlock): number {
  const base = stats.damage + stats.bestElemDamage
  switch (elem) {
    case 'earth':   return base + stats.earthDamage
    case 'fire':    return base + stats.fireDamage
    case 'water':   return base + stats.waterDamage
    case 'air':     return base + stats.airDamage
    case 'neutral': return base + stats.neutralDamage
  }
}

/**
 * Official Dofus damage formula:
 *   Floor(base × (1 + (mastery + power + pctBonus) / 100)) + flatBonus
 *
 * mastery  = relevant characteristic (strength for earth/neutral, etc.)
 * power    = Puissance stat — boosts all elements the same as a characteristic
 * pctBonus = context-specific % modifier:
 *              spellDamagePercent  for class spells
 *              weaponDamagePercent for weapon attacks
 *            % Melee / % Ranged would stack here too but require per-spell tagging
 * flatBonus = fixed elemental damage (outside the floor — applied after)
 */
export function calcDamage(base: number, elem: ElemKey, stats: StatBlock, pctBonus = 0): number {
  if (base <= 0) return 0
  const m = mastery(elem, stats)
  const f = flatBonus(elem, stats)
  return Math.floor(base * (1 + (m + stats.power + pctBonus) / 100)) + f
}

export type CalcedEffect = AppSpellEffect & { calcMin: number; calcMax: number }

export function calcEffects(effects: AppSpellEffect[], stats: StatBlock, pctBonus = 0, critFlatBonus = 0): CalcedEffect[] {
  return effects.map(e => {
    if (e.kind !== 'damage' && e.kind !== 'steal' && e.kind !== 'poison') return { ...e, calcMin: e.min, calcMax: e.max }
    // Fixed-value effects store max=0 (no range) — fall back to min, same
    // convention as WeaponCard's computeRow. Without this, a spell like
    // "Reprisal" (min=20, max=0) showed a calculated range of "104–0"
    // instead of a single "104".
    const effMax = e.max > 0 ? e.max : e.min
    return {
      ...e,
      calcMin: calcDamage(e.min,  e.element, stats, pctBonus) + critFlatBonus,
      calcMax: calcDamage(effMax, e.element, stats, pctBonus) + critFlatBonus,
    }
  })
}
