// Pure damage-roll helpers for the PvP arena — reuse the same math as
// SpellCard/WeaponCard (spellCalc.ts, spellDamage.ts) but collapsed down
// to "one number for this hit against these resistances", since the arena
// fires a single spell/weapon at a punching dummy rather than rendering
// a full effect-by-effect breakdown.
import type { AppSpellLevel } from '@/data/spellLoaders.ts'
import type { AppItem } from '@/data/loaders.ts'
import type { StatBlock } from '@/engine/types.ts'
import { calcEffects, calcDamage } from '../spells/spellDamage.ts'
import { dedupEffects, rangePct, WEAPON_ATTACK_STAT } from '../spells/spellCalc.ts'
import { WEAPON_ATTACK_IDS } from '@/engine/statMap.ts'
import type { PvpElement, PvpResist } from '@/store/pvpStore.ts'
import { applyResist } from './pvpMath.ts'

export type HitResult = { min: number; max: number; hasCrit: boolean; critMin: number; critMax: number }

const DMG_KINDS = new Set(['damage', 'steal', 'poison'])

/** Sum of every non-shield damage/steal/poison effect, resisted per its own element. */
export function simulateSpellHit(
  lvl:      AppSpellLevel,
  stats:    StatBlock,
  spellPct: number,
  resist:   Record<PvpElement, PvpResist>,
): HitResult {
  const effects = dedupEffects(lvl.effects).filter(e => DMG_KINDS.has(e.kind) && e.condition !== 'shield')
  const calced  = calcEffects(effects, stats, spellPct)
  let min = 0, max = 0
  for (const e of calced) {
    min += applyResist(e.calcMin, resist[e.element])
    max += applyResist(e.calcMax, resist[e.element])
  }

  const critEffects = (lvl.critEffects ?? []).filter(e => DMG_KINDS.has(e.kind) && e.condition !== 'shield')
  const hasCrit      = critEffects.length > 0
  let critMin = min, critMax = max
  if (hasCrit) {
    const calcedCrit = calcEffects(dedupEffects(critEffects), stats, spellPct, stats.critDamage)
    critMin = 0; critMax = 0
    for (const e of calcedCrit) {
      critMin += applyResist(e.calcMin, resist[e.element])
      critMax += applyResist(e.calcMax, resist[e.element])
    }
  }

  return { min, max, hasCrit, critMin, critMax }
}

/**
 * Same attack-effect selection as WeaponCard's attackEffects/computeRow,
 * minus the manual "Dominio del arma" scratch input (UI-only, not build data).
 */
export function simulateWeaponHit(
  weapon:         AppItem,
  stats:          StatBlock,
  resist:         Record<PvpElement, PvpResist>,
  weaponTransform: { element: string; ratio: number } | null,
): HitResult {
  const minR     = weapon.min_range ?? 0
  const maxR     = weapon.max_range ?? 0
  const critBon  = weapon.crit_bonus ?? 0
  const weaponPct = stats.weaponDamagePercent + rangePct(minR, maxR, stats)

  const hasNeutralDamage = weapon.effects.some(e => e.stat === 'Neutral damage')
  const base = weapon.effects.filter(e =>
    e.effect_id != null
      ? WEAPON_ATTACK_IDS.has(e.effect_id) && e.effect_id !== 225
      : Object.prototype.hasOwnProperty.call(WEAPON_ATTACK_STAT, e.stat),
  )
  const rows = weaponTransform && hasNeutralDamage
    ? base.map(e => {
        if (e.stat !== 'Neutral damage') return e
        const elemStat = `${weaponTransform.element.charAt(0).toUpperCase()}${weaponTransform.element.slice(1)} damage`
        const r = weaponTransform.ratio / 100
        // Dofus rounds transformed weapon damage DOWN, not up (see EquipmentGrid.tsx).
        const newMin = Math.floor(e.min * r)
        const newMax = e.max > 0 ? Math.floor(e.max * r) : newMin
        return { ...e, stat: elemStat, min: newMin, max: newMax }
      })
    : base

  let min = 0, max = 0, critMin = 0, critMax = 0
  for (const e of rows) {
    const elem = WEAPON_ATTACK_STAT[e.stat]
    if (!elem) continue // e.g. effect_id 238 "MP removed on hit" — not elemental damage
    const baseMax = e.max > 0 ? e.max : e.min
    const low   = calcDamage(e.min, elem, stats, weaponPct)
    const high  = calcDamage(baseMax, elem, stats, weaponPct)
    const cLow  = calcDamage(e.min + critBon, elem, stats, weaponPct) + stats.critDamage
    const cHigh = calcDamage(baseMax + critBon, elem, stats, weaponPct) + stats.critDamage
    min     += applyResist(low,  resist[elem])
    max     += applyResist(high, resist[elem])
    critMin += applyResist(cLow,  resist[elem])
    critMax += applyResist(cHigh, resist[elem])
  }

  const hasCrit = (weapon.crit_chance ?? 0) > 0
  return { min, max, hasCrit, critMin: hasCrit ? critMin : min, critMax: hasCrit ? critMax : max }
}
