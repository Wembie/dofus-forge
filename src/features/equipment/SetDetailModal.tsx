import type { AppSet } from '@/data/loaders.ts'
import { SetsCatalog } from './SetsCatalog.tsx'

/** A set's own window, wherever it is opened from (an item card, a slot, the
 * bonuses): its pieces with where each goes, equip or remove one by one or
 * all at once, the tiers and what the build gains. */
export function SetDetailModal({ set, onClose, onEquipAll }: { set: AppSet; onClose: () => void; onEquipAll?: () => void }) {
  return <SetsCatalog single open={set.ankama_id} onClose={onClose} onEquipped={onEquipAll ?? onClose} />
}
