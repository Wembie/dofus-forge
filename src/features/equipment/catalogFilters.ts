// Pure filter/rule helpers for ItemCatalog and SetsCatalog.
import type { SlotId } from '@/store/buildStore.ts'
import type { AppEffect, AppItem } from '@/data/loaders.ts'
import { STAT_META } from './statDisplay.ts'
import { WEAPON_ATTACK_IDS } from '@/engine/statMap.ts'

/** Weapon attack lines share stat names with real bonuses (attack 'Neutral damage' vs +Neutral Damage). */
export function isAttackEffect(e: AppEffect): boolean {
  return e.effect_id != null && WEAPON_ATTACK_IDS.has(e.effect_id)
}

/** True when the item has a positive bonus for every selected stat (attack lines don't count). */
export function matchesStatFilter(item: AppItem, statFilter: string[]): boolean {
  return statFilter.every(s => {
    const sTKey = STAT_META[s]?.tKey ?? s
    return item.effects.some(e => {
      if (isAttackEffect(e)) return false
      if ((STAT_META[e.stat]?.tKey ?? e.stat) !== sTKey) return false
      // Only match a real bonus, not a malus (e.g. a hat with -1 Range
      // shouldn't show up when filtering by "Range") — same effective
      // value formula the stat engine uses (stats.ts applyEffect).
      const value = (e.max !== 0 && e.max > e.min) ? e.max : e.min
      return value > 0
    })
  })
}

/** Max-level select value meaning "no upper bound" (shown as "—"). */
export const NO_LEVEL_CAP = 0

export function levelCap(maxLevel: number): number {
  return maxLevel === NO_LEVEL_CAP ? Infinity : maxLevel
}

/** Applies a min/max select change, moving the other bound so min never exceeds max. */
export function changeLevelRange(
  range: { min: number; max: number },
  which: 'min' | 'max',
  value: number,
): { min: number; max: number } {
  if (which === 'min') return { min: value, max: value > levelCap(range.max) ? value : range.max }
  return { min: levelCap(value) < range.min ? value : range.min, max: value }
}

export type CatalogBlock =
  | { kind: 'dofus';  slot: SlotId }  // this exact Dofus is already in a Dofus slot
  | { kind: 'ring';   slot: SlotId }  // this set ring is already in the other ring slot
  | { kind: 'prysma'; slot: SlotId }  // another Prysmaradite is in a different Dofus slot

/** Why an item can't be picked for `slotId` given what's equipped, or null if it can. */
export function catalogBlock(
  item:     AppItem,
  slotId:   SlotId,
  equipped: Partial<Record<SlotId, number>>,
  byId:     Map<number, AppItem>,
): CatalogBlock | null {
  const entries = Object.entries(equipped) as [SlotId, number | undefined][]
  if (slotId.startsWith('dofus')) {
    const same = entries.find(([s, id]) => s.startsWith('dofus') && id === item.ankama_id)
    if (same) return { kind: 'dofus', slot: same[0] }
    if (item.type === 'Prysmaradite') {
      const other = entries.find(([s, id]) =>
        s.startsWith('dofus') && s !== slotId && id != null && byId.get(id)?.type === 'Prysmaradite')
      if (other) return { kind: 'prysma', slot: other[0] }
    }
    return null
  }
  if ((slotId === 'ring1' || slotId === 'ring2') && item.set_id != null) {
    const other: SlotId = slotId === 'ring1' ? 'ring2' : 'ring1'
    if (equipped[other] === item.ankama_id) return { kind: 'ring', slot: other }
  }
  return null
}
