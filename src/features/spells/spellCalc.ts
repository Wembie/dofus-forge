// Pure spell/weapon damage helpers shared between SpellsPanel.tsx (the
// normal spell/weapon cards) and the PvP arena (pvp/PvpArena.tsx). Kept
// dependency-free (no React) so both can import it without a cycle.
import type { AppSpellElement, AppSpellEffect, AppSpellEffectKind, AppSpellCondition } from '@/data/spellLoaders.ts'
import type { StatBlock } from '@/engine/types.ts'
import type { DamageMods } from './spellDamage.ts'

export function spellGrade(level: number): number {
  if (level >= 200) return 6
  if (level >= 150) return 5
  if (level >= 125) return 4
  if (level >= 100) return 3
  if (level >= 50)  return 2
  return 1
}

export const ELEM_COLOR: Record<AppSpellElement, string> = {
  earth:   'var(--earth)',
  fire:    'var(--fire)',
  water:   'var(--water)',
  air:     'var(--air)',
  neutral: 'var(--neutral)',
  mixed:   'var(--gold)',
}

export const WEAPON_ATTACK_STAT: Record<string, Exclude<AppSpellElement, 'mixed'>> = {
  'Neutral damage': 'neutral',
  'Earth damage':   'earth',
  'Fire damage':    'fire',
  'Water damage':   'water',
  'Air damage':     'air',
  'Earth steal':    'earth',
  'Fire steal':     'fire',
  'Water steal':    'water',
  'Air steal':      'air',
  'Neutral steal':  'neutral',
}
export const IS_STEAL = (stat: string) => stat.includes('steal') || stat.includes('Steal')

export function fmtRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`
}

/** Which of % Melee / % Ranged Damage applies; null for a self-cast (range 0). */
export function rangeKind(minRange: number, maxRange: number): 'melee' | 'ranged' | null {
  if (maxRange === 0) return null
  if (maxRange <= 1)  return 'melee'  // range 0-1 or 1-1 = melee weapon
  return minRange === 0 ? 'melee' : 'ranged'
}

export function rangePct(minRange: number, maxRange: number, stats: StatBlock): number {
  const kind = rangeKind(minRange, maxRange)
  return kind === 'melee' ? stats.meleeDamagePercent : kind === 'ranged' ? stats.rangedDamagePercent : 0
}

/** Stable string key for an effect's condition — `undefined` groups separately from any
 * condition, and each condition kind is distinguished by its own parameter (a `low_target_hp`
 * at 50% is a different branch from one at 30%; a `state` is distinguished by its id, not its
 * display label, which can repeat across languages/states). */
export function conditionKey(c: AppSpellCondition | undefined): string {
  if (!c) return ''
  if (c.kind === 'shield') return 'shield'
  if (c.kind === 'low_target_hp') return `low_target_hp:${c.threshold}`
  return `state:${c.id}`
}

export const sameCondition = (a: AppSpellCondition | undefined, b: AppSpellCondition | undefined): boolean =>
  conditionKey(a) === conditionKey(b)

// Keep first occurrence of each (condition+element+kind+min+max) group.
// Removes duplicates that arise from multi-hit AoE (same value applied to N cells)
// and from charge mechanics where the same hit repeats (e.g. Tyrannical Arrow).
export function dedupEffects(effects: AppSpellEffect[]): AppSpellEffect[] {
  const seen = new Set<string>()
  return effects.filter(e => {
    if (e.kind === 'spell_buff') return true
    const key = `${conditionKey(e.condition)}|${e.element}|${e.kind}|${e.min}|${e.max}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * A charge/discharge spell (e.g. Devouring Arrow): a "charge" (steal) phase builds up,
 * then a later "discharge" (damage) phase pays it out. Requires more than one tier in at
 * least one of the two kinds — a dual steal+damage spell with exactly one tier each (e.g.
 * Crobak Call: "steals HP from enemies or heals allies", same value on both) is not a charge
 * mechanic, just two simultaneous effects, and must not be excluded from the Σ total or
 * labeled "Spell Discharge".
 */
export function hasDescargaPattern(effects: { kind: AppSpellEffectKind }[]): boolean {
  const stealCount  = effects.filter(e => e.kind === 'steal').length
  const damageCount = effects.filter(e => e.kind === 'damage').length
  if (stealCount < 1 || damageCount < 1 || (stealCount <= 1 && damageCount <= 1)) return false
  return effects.findIndex(e => e.kind === 'damage') > effects.findIndex(e => e.kind === 'steal')
}

/**
 * Two effects of the same kind with different (min, max) are mutually-exclusive outcomes —
 * a charge-tier payout (Devouring Arrow's 3 discharge tiers) or a random draw (Ecaflip's
 * Topkaj: one of 7/10/13 Fire damage per cast, never all three) — never simultaneous hits.
 * Scanned across all 19 classes: no spell legitimately sums distinct same-kind values, so
 * their Σ must be suppressed rather than added together.
 */
export function hasTieredOutcomes(effects: { kind: AppSpellEffectKind; min: number; max: number }[]): boolean {
  const seen = new Map<AppSpellEffectKind, Set<string>>()
  for (const e of effects) {
    const set = seen.get(e.kind) ?? new Set<string>()
    set.add(`${e.min}-${e.max}`)
    seen.set(e.kind, set)
  }
  return [...seen.values()].some(set => set.size >= 2)
}

/**
 * Keeps only the first (lowest, as the data lists tiers ascending) effect of each
 * (kind, element) pair — used where a single deterministic number is needed (the PvP arena's
 * one-hit estimate) instead of a per-tier breakdown. Must run after `dedupEffects`: anything
 * still duplicated on (kind, element) at that point is, by elimination, a distinct tier
 * (see `hasTieredOutcomes`), never an exact duplicate. This picks the base/uncharged tier —
 * it does not attempt to model which charge level a charge/discharge spell (e.g. Devouring
 * Arrow) would actually be at, which the dedicated "Descarga" breakdown in SpellsPanel exists
 * to show instead of collapsing to one number.
 */
export function collapseTieredOutcomes<T extends { kind: AppSpellEffectKind; element: string }>(effects: T[]): T[] {
  const seen = new Set<string>()
  return effects.filter(e => {
    const key = `${e.kind}|${e.element}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** % Spell Damage plus % Ranged / % Melee for a spell cast at this range. */
export function spellMods(stats: StatBlock, minRange: number, maxRange: number): DamageMods {
  return { kindPct: stats.spellDamagePercent, rangePct: rangePct(minRange, maxRange, stats), range: rangeKind(minRange, maxRange) ?? undefined }
}

/** % Weapon Damage plus % Ranged / % Melee for a weapon with this range. */
export function weaponMods(stats: StatBlock, minRange: number, maxRange: number): DamageMods {
  return { kindPct: stats.weaponDamagePercent, rangePct: rangePct(minRange, maxRange, stats), range: rangeKind(minRange, maxRange) ?? undefined }
}
