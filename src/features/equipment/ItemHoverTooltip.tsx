import { createPortal } from 'react-dom'
import type { AppItem } from '@/data/loaders.ts'
import { ItemCard } from './ItemCard.tsx'

// Full item tooltip — portal, fixed position so it escapes any
// overflow-y:auto ancestor (modals, scrollable card grids, etc).
// Shared by SetDetailModal, SetsCatalog and BuildCharacterView (read-only
// build views) so they all show identical, complete item info (effects,
// weapon attack, magesmithy, conditions, lore) on hover. `runes`/
// `forjamagoName` are optional — omit them for a plain catalog item with no
// forgemagie.
export function ItemHoverTooltip({ item, anchor, runes, forjamagoName }: {
  item: AppItem
  anchor: DOMRect
  runes?: Record<string, number>
  forjamagoName?: string
}) {
  const TW     = 288
  const left   = window.innerWidth - anchor.right - 12 >= TW
    ? anchor.right + 8
    : anchor.left  - TW - 8
  const top    = Math.max(8, Math.min(anchor.top, window.innerHeight - 560))

  return createPortal(
    <div className="fixed z-[9999] pointer-events-none" style={{ left, top, width: TW }}>
      <ItemCard item={item} runes={runes} forjamagoName={forjamagoName} />
    </div>,
    document.body,
  )
}
