import type { AppSet } from '@/data/loaders.ts'
import { SetsCatalog } from './SetsCatalog.tsx'

/** A set's detail, wherever it is opened from (an item card, a slot, the
 * bonuses): the sets catalogue starting on that set, so its pieces, tiers
 * and the change in the build read the same everywhere. */
export function SetDetailModal({ set, onClose, onEquipAll }: { set: AppSet; onClose: () => void; onEquipAll?: () => void }) {
  return <SetsCatalog open={set.ankama_id} onClose={onClose} onEquipped={onEquipAll ?? onClose} />
}
