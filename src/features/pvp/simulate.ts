// Pure damage-roll helpers for the PvP arena — reuse the same math as
// SpellCard/WeaponCard (spellCalc.ts, spellDamage.ts) but collapsed down
// to "one number for this hit against these resistances", since the arena
// fires a single spell/weapon at a punching dummy rather than rendering
// a full effect-by-effect breakdown.
import type { AppSpellLevel } from '@/data/spellLoaders.ts'
import type { AppItem } from '@/data/loaders.ts'
import type { StatBlock } from '@/engine/types.ts'
import { calcEffects } from '../spells/spellDamage.ts'
import { dedupEffects, rangePct } from '../spells/spellCalc.ts'
import { weaponAttackEffects, weaponDamageRows } from '../spells/weaponRows.ts'
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

  const rows = weaponDamageRows(weaponAttackEffects(weapon, weaponTransform), stats, critBon, weaponPct, weaponPct)
  let min = 0, max = 0, critMin = 0, critMax = 0
  for (const r of rows) {
    const elem = r.elem!
    min     += applyResist(r.low,      resist[elem])
    max     += applyResist(r.high,     resist[elem])
    critMin += applyResist(r.critLow,  resist[elem])
    critMax += applyResist(r.critHigh, resist[elem])
  }

  const hasCrit = (weapon.crit_chance ?? 0) > 0
  return { min, max, hasCrit, critMin: hasCrit ? critMin : min, critMax: hasCrit ? critMax : max }
}
