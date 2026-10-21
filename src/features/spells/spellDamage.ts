import type { StatBlock } from '@/engine/types.ts'
import type { AppSpellEffect } from '@/data/spellLoaders.ts'

export type ElemKey = Exclude<AppSpellEffect['element'], never>

function mastery(elem: ElemKey, stats: StatBlock): number {
  switch (elem) {
    case 'earth':   return stats.strength
    case 'fire':    return stats.intelligence
    case 'water':   return stats.chance
    case 'air':     return stats.agility
    case 'neutral': return stats.strength
  }
}

// computeStats already folds the generic Damage stat into every elemental
// Damage total, so it must not be added again here (it was, doubling it).
function flatBonus(elem: ElemKey, stats: StatBlock): number {
  const base = stats.bestElemDamage
  switch (elem) {
    case 'earth':   return base + stats.earthDamage
    case 'fire':    return base + stats.fireDamage
    case 'water':   return base + stats.waterDamage
    case 'air':     return base + stats.airDamage
    case 'neutral': return base + stats.neutralDamage
  }
}

/**
 * Per-attack multipliers. `kindPct` = % Spell Damage (spells) or % Weapon
 * Damage (weapons); `rangePct` = % Ranged or % Melee Damage; `power` = extra
 * power that only this attack gets (Weapon Mastery).
 */
export type DamageMods = { kindPct: number; rangePct: number; power?: number; range?: 'melee' | 'ranged' }
export const NO_MODS: DamageMods = { kindPct: 0, rangePct: 0 }

/**
 * Dofus damage formula:
 *   (Floor(base × (100 + characteristic + power) / 100) + fixed damage)
 *     × (100 + % ranged or melee) / 100 × (100 + % spell or weapon) / 100
 *     × (100 + % final damage) / 100
 *
 * Fixed damage (Damage, elemental Damage, best-element Damage, plus Critical
 * Damage on a crit via `extraFlat`) is added before the % multipliers, so
 * those multiply it too. They used to be added to the characteristic, which
 * made +1% Spell Damage worth ~0.5 instead of ~1% of the hit.
 */
export function calcDamage(base: number, elem: ElemKey, stats: StatBlock, mods: DamageMods = NO_MODS, extraFlat = 0): number {
  return damageBreakdown(base, elem, stats, mods, extraFlat).total
}

/** Every step of calcDamage, for the hover breakdown (same numbers, by construction). */
export type DamageBreakdown = {
  roll:           number
  characteristic: number
  power:          number
  extraPower:     number
  scaled:         number
  fixed:          number
  critDamage:     number
  beforePct:      number
  afterRange:     number
  afterKind:      number
  finalPct:       number
  total:          number
}

export function damageBreakdown(base: number, elem: ElemKey, stats: StatBlock, mods: DamageMods = NO_MODS, extraFlat = 0): DamageBreakdown {
  const characteristic = mastery(elem, stats)
  const extraPower = mods.power ?? 0
  const fixed = flatBonus(elem, stats)
  const finalPct = stats.finalDamagePercent ?? 0
  if (base <= 0) {
    return { roll: base, characteristic, power: stats.power, extraPower, scaled: 0, fixed, critDamage: extraFlat, beforePct: 0, afterRange: 0, afterKind: 0, finalPct, total: 0 }
  }
  const scaled = Math.floor(base * (100 + characteristic + stats.power + extraPower) / 100)
  const beforePct = scaled + fixed + extraFlat
  const range = Math.max(0, 100 + mods.rangePct)
  const kind  = Math.max(0, 100 + mods.kindPct)
  const final = Math.max(0, 100 + finalPct)
  return {
    roll: base, characteristic, power: stats.power, extraPower, scaled, fixed, critDamage: extraFlat, beforePct,
    afterRange: Math.max(0, Math.floor(beforePct * range / 100)),
    afterKind:  Math.max(0, Math.floor(beforePct * range * kind / 10000)),
    finalPct,
    total:      Math.max(0, Math.floor(beforePct * range * kind * final / 1000000)),
  }
}

export type CalcedEffect = AppSpellEffect & { calcMin: number; calcMax: number }

export function calcEffects(effects: AppSpellEffect[], stats: StatBlock, mods: DamageMods = NO_MODS, critFlatBonus = 0): CalcedEffect[] {
  return effects.map(e => {
    if (e.kind !== 'damage' && e.kind !== 'steal' && e.kind !== 'poison') return { ...e, calcMin: e.min, calcMax: e.max }
    // Fixed-value effects store max=0 (no range) — fall back to min, same
    // convention as WeaponCard's computeRow. Without this, a spell like
    // "Reprisal" (min=20, max=0) showed a calculated range of "104–0"
    // instead of a single "104".
    const effMax = e.max > 0 ? e.max : e.min
    return {
      ...e,
      calcMin: calcDamage(e.min,  e.element, stats, mods, critFlatBonus),
      calcMax: calcDamage(effMax, e.element, stats, mods, critFlatBonus),
    }
  })
}
