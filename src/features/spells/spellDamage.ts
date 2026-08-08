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
  const base = stats.damage
  switch (elem) {
    case 'earth':   return base + stats.earthDamage
    case 'fire':    return base + stats.fireDamage
    case 'water':   return base + stats.waterDamage
    case 'air':     return base + stats.airDamage
    case 'neutral': return base + stats.neutralDamage
  }
}

/** Dofus formula: (base + mastery) + flat. Power is already baked into mastery stats. */
export function calcDamage(base: number, elem: ElemKey, stats: StatBlock): number {
  if (base <= 0) return 0
  const m = mastery(elem, stats)
  const f = flatBonus(elem, stats)
  return Math.floor(base + m + f)
}

export type CalcedEffect = AppSpellEffect & { calcMin: number; calcMax: number }

export function calcEffects(effects: AppSpellEffect[], stats: StatBlock): CalcedEffect[] {
  return effects.map(e => ({
    ...e,
    calcMin: calcDamage(e.min, e.element, stats),
    calcMax: calcDamage(e.max, e.element, stats),
  }))
}
