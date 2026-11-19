// Pure damage-roll helpers for the PvP arena — reuse the same math as
// SpellCard/WeaponCard (spellCalc.ts, spellDamage.ts) but collapsed down
// to "one number for this hit against these resistances", since the arena
// fires a single spell/weapon at a punching dummy rather than rendering
// a full effect-by-effect breakdown.
import type { AppSpellEffect, AppSpellLevel } from '@/data/spellLoaders.ts'
import type { AppItem } from '@/data/loaders.ts'
import type { StatBlock } from '@/engine/types.ts'
import { calcEffects, type DamageMods } from '../spells/spellDamage.ts'
import { dedupEffects, weaponMods } from '../spells/spellCalc.ts'
import { weaponAttackEffects, weaponDamageRows } from '../spells/weaponRows.ts'
import type { PvpElement, PvpResist } from '@/store/pvpStore.ts'
import { applyResist } from './pvpMath.ts'

export type HitResult = { min: number; max: number; hasCrit: boolean; critMin: number; critMax: number }

// Poison (a per-turn DoT tick) is excluded: it never lands in the same instant as the rest
// of this hit, so it must not be folded into a single aggregate number (see spellCalc.ts's
// `inSigma`/SpellsPanel.tsx — the same bug, same fix, for the arena's one-number model).
const DMG_KINDS = new Set(['damage', 'steal'])

// Any conditioned effect (shield, a target-HP threshold, a named combat state) is a
// mutually-exclusive alternative to the base case, not a guaranteed extra hit — the arena's
// one-number estimate always uses the unconditioned (base) branch.
const isBaseEffect = (e: { condition?: unknown }) => e.condition === undefined

// The few spells that really hit every element they list in one cast. Any other spell
// listing several elements picks one per cast: a random element (Perfidious Boomerang,
// Trick), the target's elemental state (Elemental Drain), the caster's hand (Bluff).
const ALL_ELEMENTS_AT_ONCE = new Set([
  13403, // Apoyo (Masqueraider): fire, earth, water and air
  13300, // Tañido (Xelor): fire, water, air and earth
  14342, // Torrente Arcano (Huppermage): air, earth, fire and water
  13724, // Sobrecarga Rúnica (Huppermage): one hit per active rune
])

/**
 * What one cast at an enemy deals, per element.
 * - Steal beside damage: the cast at an enemy is the steal; the damage listed with it is
 *   the ally branch ("steals from enemies or heals allies") or lands later (a state, a
 *   delayed hit), and charge spells build with steal before a discharge pays out.
 * - Per element, the first real range: tiers are alternatives (charges, card values,
 *   more damage on summons), and a lone fixed "N-0" listed before a range (Feca's
 *   Stab: 100-0 then 29-33) is another branch, not the hit.
 */
function castEffects(all: AppSpellEffect[]): AppSpellEffect[] {
  let effects = dedupEffects(all).filter(e => DMG_KINDS.has(e.kind) && isBaseEffect(e))
  if (effects.some(e => e.kind === 'steal')) effects = effects.filter(e => e.kind === 'steal')
  const byElement = new Map<string, AppSpellEffect>()
  for (const e of effects) {
    const held = byElement.get(e.element)
    if (!held || (held.max === 0 && e.max > 0)) byElement.set(e.element, e)
  }
  return [...byElement.values()]
}

function hitOf(effects: AppSpellEffect[], stats: StatBlock, mods: DamageMods, resist: Record<PvpElement, PvpResist>, extra = 0) {
  let min = 0, max = 0
  for (const e of calcEffects(effects, stats, mods, extra)) {
    min += applyResist(e.calcMin, resist[e.element])
    max += applyResist(e.calcMax, resist[e.element])
  }
  return { min, max }
}

/** One cast of a spell; `element` is set when the spell picks one element per cast. */
export type SpellVariant = { element: string | null; hit: HitResult }

/**
 * The hit of one cast against the target, resisted per element. A spell that picks one
 * element per cast gives one variant per element instead of a sum that never happens.
 */
export function simulateSpellHits(
  spellId:  number,
  lvl:      AppSpellLevel,
  stats:    StatBlock,
  mods:     DamageMods,
  resist:   Record<PvpElement, PvpResist>,
): SpellVariant[] {
  const normal = castEffects(lvl.effects)
  const crit   = castEffects(lvl.critEffects ?? [])
  if (!normal.length) return []
  const hasCrit = crit.length > 0
  const hit = (n: AppSpellEffect[], c: AppSpellEffect[]): HitResult => {
    const base = hitOf(n, stats, mods, resist)
    const critical = hasCrit ? hitOf(c, stats, mods, resist, stats.critDamage) : base
    return { min: base.min, max: base.max, hasCrit, critMin: critical.min, critMax: critical.max }
  }
  if (normal.length === 1 || ALL_ELEMENTS_AT_ONCE.has(spellId)) return [{ element: null, hit: hit(normal, crit) }]
  return normal.map(e => ({ element: e.element, hit: hit([e], crit.filter(c => c.element === e.element)) }))
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
  const mods     = weaponMods(stats, minR, maxR)

  const rows = weaponDamageRows(weaponAttackEffects(weapon, weaponTransform), stats, critBon, mods, mods)
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
