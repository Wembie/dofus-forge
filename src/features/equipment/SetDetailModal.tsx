import { lazy, Suspense } from 'react'
import type { AppSet } from '@/data/loaders.ts'

const SetsCatalog = lazy(() => import('./SetsCatalog.tsx').then(m => ({ default: m.SetsCatalog })))

/** A set's own window, wherever it is opened from (an item card, a slot, the
 * bonuses): its pieces with where each goes, equip or remove one by one or
 * all at once, the tiers and what the build gains. */
export function SetDetailModal({ set, onClose, onEquipAll }: { set: AppSet; onClose: () => void; onEquipAll?: () => void }) {
  return <Suspense fallback={null}><SetsCatalog single open={set.ankama_id} onClose={onClose} onEquipped={onEquipAll ?? onClose} /></Suspense>
}
