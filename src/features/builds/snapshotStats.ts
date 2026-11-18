import type { AppItem, AppSet } from '@/data/loaders.ts'
import { CHARACTERISTICS, type AllocatedCharacteristics, type DofusClass, type ScrolledCharacteristics, type StatBlock } from '@/engine/types.ts'
import { ALL_SLOTS, recompute, type BuildSnapshot, type RuneMap, type SlotId } from '@/store/buildStore.ts'

// One result per snapshot object and catalogue: a grid of cards renders often.
const cache = new WeakMap<BuildSnapshot, { equipment: AppItem[]; sets: AppSet[]; stats: StatBlock | null }>()

/** The gear stats of a saved build (no combat passives), as the workshop computes them. */
export function snapshotStats(snap: BuildSnapshot, equipment: AppItem[] | null, sets: AppSet[] | null): StatBlock | null {
  if (!equipment || !sets) return null
  const hit = cache.get(snap)
  if (hit && hit.equipment === equipment && hit.sets === sets) return hit.stats
  const allocated = Object.fromEntries(CHARACTERISTICS.map((c, i) => [c, snap.a[i] ?? 0])) as AllocatedCharacteristics
  const scrolled = Object.fromEntries(CHARACTERISTICS.map((c, i) => [c, Boolean(snap.s & (1 << i))])) as ScrolledCharacteristics
  const equipped = Object.fromEntries(
    ALL_SLOTS.map((slot, i) => [slot, snap.e[i] ?? undefined]).filter(([, v]) => v != null),
  ) as Partial<Record<SlotId, number>>
  const runes = (snap.r ?? {}) as Partial<Record<SlotId, RuneMap>>
  const stats = recompute(snap.c as DofusClass, snap.l, allocated, scrolled, equipped, equipment, sets, runes)
  cache.set(snap, { equipment, sets, stats })
  return stats
}
