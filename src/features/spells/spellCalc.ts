// Pure spell/weapon damage helpers shared between SpellsPanel.tsx (the
// normal spell/weapon cards) and the PvP arena (pvp/PvpArena.tsx). Kept
// dependency-free (no React) so both can import it without a cycle.
import type { AppSpellElement, AppSpellEffect } from '@/data/spellLoaders.ts'
import type { StatBlock } from '@/engine/types.ts'

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

export function rangePct(minRange: number, maxRange: number, stats: StatBlock): number {
  if (maxRange === 0) return 0
  if (maxRange <= 1)  return stats.meleeDamagePercent  // range 0-1 or 1-1 = melee weapon
  return minRange === 0 ? stats.meleeDamagePercent : stats.rangedDamagePercent
}

// Keep first occurrence of each (element+kind+min+max) group.
// Removes duplicates that arise from multi-hit AoE (same value applied to N cells)
// and from charge mechanics where the same hit repeats (e.g. Tyrannical Arrow).
export function dedupEffects(effects: AppSpellEffect[]): AppSpellEffect[] {
  const seen = new Set<string>()
  return effects.filter(e => {
    if (e.kind === 'spell_buff') return true
    const key = `${e.condition ?? ''}|${e.element}|${e.kind}|${e.min}|${e.max}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
