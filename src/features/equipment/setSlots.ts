import type { SlotId } from '@/store/buildStore.ts'
import type { AppItem } from '@/data/loaders.ts'
import { SLOT_CONFIGS } from './slotConfig.ts'

const SLOTS_BY_API_SLOT = new Map<string, SlotId[]>()
for (const sc of SLOT_CONFIGS) {
  for (const s of Array.isArray(sc.apiSlot) ? sc.apiSlot : [sc.apiSlot]) {
    if (!SLOTS_BY_API_SLOT.has(s)) SLOTS_BY_API_SLOT.set(s, [])
    SLOTS_BY_API_SLOT.get(s)!.push(sc.id)
  }
}

/**
 * Target slot for every not-yet-equipped item of a set ("Equip All"). Prefers
 * empty slots, then replaces occupied ones, but never gives two items of the
 * batch the same slot (both rings of a set land in ring1 + ring2).
 */
export function assignSetSlots(
  items:    AppItem[],
  equipped: Partial<Record<SlotId, number>>,
): { slot: SlotId; item: AppItem }[] {
  const equippedIds = new Set(Object.values(equipped))
  const taken = new Set<SlotId>()
  const out: { slot: SlotId; item: AppItem }[] = []
  for (const item of items) {
    if (equippedIds.has(item.ankama_id)) continue
    const slots = (SLOTS_BY_API_SLOT.get(item.slot) ?? []).filter(sid => !taken.has(sid))
    const target = slots.find(sid => equipped[sid] == null) ?? slots[0]
    if (!target) continue
    taken.add(target)
    out.push({ slot: target, item })
  }
  return out
}
