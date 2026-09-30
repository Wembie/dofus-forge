import { ALL_SLOTS } from '@/store/buildStore.ts'
import { SLOT_CONFIGS } from '@/features/equipment/slotConfig.ts'
import type { AppItem } from '@/data/loaders.ts'
import type { BuildSnapshot } from '@/store/buildStore.ts'

/** Read-only equipment grid — same slot set/order as the real EquipmentGrid,
 * no click/drag handlers, used to preview someone else's build (or your own,
 * on the Explore card / build detail page / My Builds card). */
export function BuildEquipmentPreview({ snapshot, equipment, size = 40, hideEmpty = false }: {
  snapshot:  BuildSnapshot
  equipment: AppItem[] | null
  size?:     number
  /** Compact mode for small cards (Explore/My Builds) — skip empty slots
   * entirely instead of showing a dashed placeholder for all 17. */
  hideEmpty?: boolean
}) {
  const map = new Map((equipment ?? []).map(it => [it.ankama_id, it]))

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_SLOTS.map((slot, i) => {
        const id   = snapshot.e[i]
        const item = id != null ? map.get(id) : undefined
        if (!item && hideEmpty) return null
        const cfg  = SLOT_CONFIGS[i]
        return (
          <div
            key={slot}
            title={item?.name}
            className="rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{
              width:  size,
              height: size,
              background: item ? 'linear-gradient(145deg, var(--surface-parchment), var(--surface-void))' : 'var(--surface-void)',
              border: item ? '1px solid color-mix(in srgb, var(--gold) 40%, transparent)' : '1px dashed var(--metal-edge)',
            }}
          >
            {item?.image_url
              ? <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-1" loading="lazy" />
              : <span className="opacity-25 text-xs" style={{ color: 'var(--ink-muted)' }}>{cfg.icon}</span>
            }
          </div>
        )
      })}
    </div>
  )
}
