import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SlotId, BuildSnapshot } from '@/store/buildStore.ts'
import { ALL_SLOTS } from '@/store/buildStore.ts'
import { LEFT_SLOTS, RIGHT_SLOTS, EXTRAS_SLOTS, DOFUS_SLOTS } from '@/features/equipment/EquipmentGrid.tsx'
import { SLOT_CONFIGS, slotImageIcon } from '@/features/equipment/slotConfig.ts'
import { ItemHoverTooltip } from '@/features/equipment/ItemHoverTooltip.tsx'
import type { AppItem } from '@/data/loaders.ts'

type Hovered = { item: AppItem; slot: SlotId; rect: DOMRect }

function SlotCell({ slot, item, size, onHover, onLeave }: {
  slot:    SlotId
  item:    AppItem | undefined
  size:    number
  onHover: (e: React.MouseEvent<HTMLDivElement>) => void
  onLeave: () => void
}) {
  const { t } = useTranslation()
  const cfg   = SLOT_CONFIGS.find(sc => sc.id === slot)

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        className="relative rounded-lg flex items-center justify-center overflow-hidden"
        style={{
          width: size, height: size,
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
          : item && slotImageIcon(slot)
          ? <img src={slotImageIcon(slot)!} alt="" className="w-full h-full object-contain p-2 opacity-60" />
          : <span className="opacity-20 scale-110" style={{ color: 'var(--ink-muted)' }}>{cfg?.icon}</span>
        }
        {item && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--gold) 7%, transparent) 0%, transparent 55%)' }}
          />
        )}
      </div>
      <span className="text-[8px] font-medium tracking-wide uppercase select-none" style={{ color: 'var(--ink-faint)' }}>
        {t(`slot_${slot}`)}
      </span>
    </div>
  )
}

/** Read-only equipment view mirroring the live EquipmentGrid's
 * character-centered layout (portrait in the middle, gear arranged around
 * it, dofus row below) instead of a generic list — used on the build
 * detail page so a viewed build looks like "the real thing", not an
 * approximation. Hovering a slot shows the same ItemHoverTooltip used
 * everywhere else, including magesmithy runes from the snapshot. */
export function BuildCharacterView({ snapshot, equipment, portrait, classLabel, level }: {
  snapshot:   BuildSnapshot
  equipment:  AppItem[] | null
  portrait?:  string
  classLabel: string
  level:      number
}) {
  const [hovered, setHovered] = useState<Hovered | null>(null)
  const map = new Map((equipment ?? []).map(it => [it.ankama_id, it]))

  function itemFor(slot: SlotId): AppItem | undefined {
    const i  = ALL_SLOTS.indexOf(slot)
    const id = snapshot.e[i]
    return id != null ? map.get(id) : undefined
  }

  function cell(slot: SlotId, size = 56) {
    const item = itemFor(slot)
    return (
      <SlotCell
        key={slot}
        slot={slot}
        item={item}
        size={size}
        onHover={e => item && setHovered({ item, slot, rect: e.currentTarget.getBoundingClientRect() })}
        onLeave={() => setHovered(null)}
      />
    )
  }

  return (
    <>
      <div className="flex items-start justify-center gap-3 flex-wrap">
        <div className="flex flex-col gap-2.5">{LEFT_SLOTS.map(id => cell(id))}</div>

        <div className="flex flex-col items-center flex-shrink-0" style={{ width: 140 }}>
          <div
            className="rounded-xl overflow-hidden flex-shrink-0"
            style={{
              width: 120, height: 120,
              border:     '2px solid color-mix(in srgb, var(--gold) 45%, transparent)',
              boxShadow:  '0 0 30px color-mix(in srgb, var(--gold) 25%, transparent)',
              background: 'var(--surface-void)',
            }}
          >
            {portrait
              ? <img src={portrait} alt={classLabel} className="w-full h-full object-contain" draggable={false} />
              : <div className="w-full h-full" />
            }
          </div>
          <p className="mt-2 font-display text-xs uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--gold)' }}>
            {classLabel}
          </p>
          <p className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>Nv.{level}</p>
        </div>

        <div className="flex flex-col gap-2.5">{RIGHT_SLOTS.map(id => cell(id))}</div>
      </div>

      {EXTRAS_SLOTS.length > 0 && (
        <div className="flex justify-center gap-3 mt-3">{EXTRAS_SLOTS.map(id => cell(id, 48))}</div>
      )}

      <div className="flex justify-center gap-2 mt-3">{DOFUS_SLOTS.map(id => cell(id, 44))}</div>

      {hovered && (
        <ItemHoverTooltip
          item={hovered.item}
          anchor={hovered.rect}
          runes={snapshot.r?.[hovered.slot]}
          forjamagoName={snapshot.fn?.[hovered.slot]}
        />
      )}
    </>
  )
}
