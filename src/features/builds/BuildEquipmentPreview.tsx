import { ALL_SLOTS } from '@/store/buildStore.ts'
import { SLOT_CONFIGS } from '@/features/equipment/slotConfig.ts'
import type { AppItem } from '@/data/loaders.ts'
import type { BuildSnapshot } from '@/store/buildStore.ts'

/** Read-only equipment grid — same slot set/order and visual treatment as
 * the real EquipmentGrid slot buttons (gradient, gold glow, inset shadow),
 * just without the click/drag handlers. Used to preview a build on the
 * Explore card / build detail page / My Builds card. */
export function BuildEquipmentPreview({ snapshot, equipment, size = 44, hideEmpty = false }: {
  snapshot:  BuildSnapshot
  equipment: AppItem[] | null
  size?:     number
  /** Compact mode for small cards (Explore/My Builds) — skip empty slots
   * entirely instead of showing a dashed placeholder for all 17. */
  hideEmpty?: boolean
}) {
  const map = new Map((equipment ?? []).map(it => [it.ankama_id, it]))

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_SLOTS.map((slot, i) => {
        const id   = snapshot.e[i]
        const item = id != null ? map.get(id) : undefined
        if (!item && hideEmpty) return null
        const cfg  = SLOT_CONFIGS[i]
        return (
          <div
            key={slot}
            title={item?.name}
            className="relative rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{
              width:  size,
              height: size,
              background: item
                ? 'linear-gradient(145deg, var(--surface-parchment), var(--surface-void))'
                : 'var(--surface-void)',
              border: item
                ? '1.5px solid color-mix(in srgb, var(--gold) 48%, transparent)'
                : '1px dashed rgba(60,80,130,0.55)',
              boxShadow: item
                ? 'inset 0 0 18px color-mix(in srgb, var(--gold) 10%, transparent), 0 2px 8px rgba(0,0,0,0.5)'
                : 'var(--well-inset)',
            }}
          >
            {item?.image_url
              ? <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-1.5" loading="lazy" />
              : <span className="opacity-20 scale-110" style={{ color: 'var(--ink-muted)' }}>{cfg.icon}</span>
            }
            {item && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--gold) 7%, transparent) 0%, transparent 55%)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
