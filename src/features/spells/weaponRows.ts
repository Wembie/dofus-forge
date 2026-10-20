// Weapon attack-line selection and damage rows, shared by WeaponCard
// (SpellsPanel.tsx) and the PvP arena (pvp/simulate.ts).
import type { AppEffect, AppItem } from '@/data/loaders.ts'
import type { StatBlock } from '@/engine/types.ts'
import { WEAPON_ATTACK_IDS } from '@/engine/statMap.ts'
import { calcDamage } from './spellDamage.ts'
import { WEAPON_ATTACK_STAT, IS_STEAL } from './spellCalc.ts'

export type WeaponElem = (typeof WEAPON_ATTACK_STAT)[string]

const BEST_ELEMENT_STATS = new Set(['best-element damage', 'best-element steal'])

export type WeaponRow = {
  elem:  WeaponElem | null  // null = best-element line without stats to resolve it
  best:  boolean
  steal: boolean
  low: number; high: number; critLow: number; critHigh: number
}

/** Element with the highest characteristic; ties keep earth → fire → water → air order. */
export function bestElement(stats: StatBlock): WeaponElem {
  const candidates: [WeaponElem, number][] = [
    ['earth', stats.strength], ['fire', stats.intelligence], ['water', stats.chance], ['air', stats.agility],
  ]
  return candidates.reduce((best, c) => (c[1] > best[1] ? c : best))[0]
}

/** Attack lines of a weapon (push excluded), with an optional Neutral → element transform applied. */
export function weaponAttackEffects(
  weapon:    AppItem,
  transform: { element: string; ratio: number } | null,
): AppEffect[] {
  // Use effect_id when available (same as tooltip) to exclude passive +AirDmg bonuses
  // that share the same stat name as weapon attack effects (e.g. id=47 passive vs id=189 attack).
  const base = weapon.effects.filter(e =>
    e.effect_id != null
      ? WEAPON_ATTACK_IDS.has(e.effect_id) && e.effect_id !== 225
      : Object.prototype.hasOwnProperty.call(WEAPON_ATTACK_STAT, e.stat),
  )
  if (!transform || !weapon.effects.some(e => e.stat === 'Neutral damage')) return base
  const elemStat = `${transform.element.charAt(0).toUpperCase()}${transform.element.slice(1)} damage`
  const r = transform.ratio / 100
  return base.map(e => {
    if (e.stat !== 'Neutral damage') return e
    // Dofus rounds transformed weapon damage DOWN, not up (see EquipmentGrid.tsx).
    const newMin = Math.floor(e.min * r)
    const newMax = e.max > 0 ? Math.floor(e.max * r) : newMin
    return { ...e, stat: elemStat, min: newMin, max: newMax }
  })
}

/** True for attack lines that deal elemental damage (AP cost, MP removal, heals, etc. are not). */
export function isDamageLine(e: AppEffect): boolean {
  return Object.prototype.hasOwnProperty.call(WEAPON_ATTACK_STAT, e.stat) || BEST_ELEMENT_STATS.has(e.stat)
}

export function weaponDamageRows(
  effects:  AppEffect[],
  stats:    StatBlock | null,
  critBon:  number,
  normalPct: number,
  critPct:  number,
): WeaponRow[] {
  return effects.filter(isDamageLine).map(e => {
    const best = BEST_ELEMENT_STATS.has(e.stat)
    const elem = best ? (stats ? bestElement(stats) : null) : WEAPON_ATTACK_STAT[e.stat]!
    const baseMax = e.max > 0 ? e.max : e.min
    if (!stats || !elem) {
      return { elem, best, steal: IS_STEAL(e.stat), low: e.min, high: baseMax, critLow: e.min, critHigh: baseMax }
    }
    return {
      elem, best, steal: IS_STEAL(e.stat),
      low:  calcDamage(e.min,   elem, stats, normalPct),
      high: calcDamage(baseMax, elem, stats, normalPct),
      // crit_bonus is an additional base damage amplified by the mastery formula (not flat)
      critLow:  calcDamage(e.min   + critBon, elem, stats, critPct) + stats.critDamage,
      critHigh: calcDamage(baseMax + critBon, elem, stats, critPct) + stats.critDamage,
    }
  })
}
