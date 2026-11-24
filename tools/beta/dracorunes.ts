import type { AppEffect, AppItem } from '../../src/data/loaders.ts'
import { flattenRunes } from '../../src/engine/runes.ts'
import { WEAPON_ATTACK_IDS } from '../../src/engine/statMap.ts'

export const ELEMENTS = ['earth', 'fire', 'water', 'air'] as const
export type Element = typeof ELEMENTS[number]
export type ResistanceElement = Element | 'neutral'
export type Dracorune =
  | { kind: 'element'; from: Element; to: Element }
  | { kind: 'ivory'; from: ResistanceElement; to: ResistanceElement }
  | { kind: 'ebony' }
export type AppliedDracorune = { itemId: number; rune: Dracorune }
export type DracoruneMap = Record<string, AppliedDracorune>

const PREFIX = { earth: 'Earth', fire: 'Fire', water: 'Water', air: 'Air', neutral: 'Neutral' } as const
const CHARACTERISTIC = { earth: 'Strength', fire: 'Intelligence', water: 'Chance', air: 'Agility' } as const
export const DRACORUNE_IDS = { air: 31564, fire: 31565, water: 31566, earth: 31569, ivory: 31571, ebony: 31573 } as const

export function combinedEffects(item: AppItem, runes: Record<string, number> = {}): AppEffect[] {
  const effects = item.effects.map(e => ({ ...e }))
  for (const [stat, bonus] of Object.entries(flattenRunes(runes))) {
    const existing = effects.find(e => e.stat === stat && !(item.slot === 'weapon' && WEAPON_ATTACK_IDS.has(e.effect_id ?? -1)))
    if (existing) {
      existing.min += bonus
      existing.max = (existing.max === 0 ? existing.min - bonus : existing.max) + bonus
    } else effects.push({ stat, min: bonus, max: bonus })
  }
  return effects
}

const best = (e: AppEffect) => e.max !== 0 && e.max > e.min ? e.max : e.min
const attack = (item: AppItem, e: AppEffect) => item.slot === 'weapon' && WEAPON_ATTACK_IDS.has(e.effect_id ?? -1)

export function transformDracorune(item: AppItem, runes: Record<string, number>, rune: Dracorune): AppEffect[] | null {
  if (!['hat', 'cape', 'amulet', 'ring', 'belt', 'boots', 'weapon', 'shield'].includes(item.slot)) return null
  const effects = combinedEffects(item, runes)
  const passive = effects.filter(e => !attack(item, e))
  if (rune.kind === 'ebony') {
    const stats = passive.filter(e => ELEMENTS.some(el => CHARACTERISTIC[el] === e.stat) && best(e) > 0)
    const damage = passive.filter(e => ELEMENTS.some(el => `${PREFIX[el]} Damage` === e.stat) && best(e) > 0)
    if (!stats.length && !damage.length) return null
    const removed = new Set([...stats, ...damage])
    const next = effects.filter(e => !removed.has(e))
    for (const [stat, rows] of [['Power', stats], ['Damage', damage]] as const) {
      if (!rows.length) continue
      const value = Math.floor(Math.max(...rows.map(best)) * 0.7)
      const existing = next.find(e => e.stat === stat && !attack(item, e))
      if (existing) { existing.min += value; existing.max = (existing.max || existing.min - value) + value }
      else next.push({ stat, min: value, max: value })
    }
    return next
  }
  if (rune.from === rune.to) return null
  const names = (el: ResistanceElement) => rune.kind === 'ivory'
    ? [`${PREFIX[el]} Resistance`, `% ${PREFIX[el]} Resistance`]
    : [CHARACTERISTIC[el as Element], `${PREFIX[el]} Damage`]
  const source = names(rune.from), target = names(rune.to)
  if (!passive.some(e => source.includes(e.stat) && best(e) !== 0) || passive.some(e => target.includes(e.stat) && best(e) !== 0)) return null
  return effects.map(e => {
    const index = source.indexOf(e.stat)
    // IDs and formatted labels describe the old stat; retaining them would
    // make filters and icons identify a transformed line as its source.
    return index >= 0 && !attack(item, e) ? { stat: target[index], min: e.min, max: e.max } : e
  })
}

export function validDracorune(raw: unknown): raw is Dracorune {
  if (!raw || typeof raw !== 'object') return false
  const r = raw as Record<string, unknown>
  if (r.kind === 'ebony') return true
  const elements: readonly unknown[] = r.kind === 'element' ? ELEMENTS : r.kind === 'ivory' ? [...ELEMENTS, 'neutral'] : []
  return elements.includes(r.from) && elements.includes(r.to) && r.from !== r.to
}
