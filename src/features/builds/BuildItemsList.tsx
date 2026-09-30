import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ALL_SLOTS, type SlotId, type BuildSnapshot } from '@/store/buildStore.ts'
import { SLOT_CONFIGS, slotImageIcon } from '@/features/equipment/slotConfig.ts'
import { STAT_META, isIgnored, fmtValue, statIconUrl } from '@/features/equipment/statDisplay.ts'
import { ItemHoverTooltip } from '@/features/equipment/ItemHoverTooltip.tsx'
import type { AppItem } from '@/data/loaders.ts'

/** Read-only equipped-items list, styled like SetDetailModal's item rows
 * (image + name + level + stat chips) instead of a bare icon grid — used on
 * the build detail page. Hovering a row shows the same full ItemHoverTooltip
 * as the catalog/set views, including magesmithy runes from the snapshot. */
export function BuildItemsList({ snapshot, equipment }: {
  snapshot:  BuildSnapshot
  equipment: AppItem[] | null
}) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState<{ item: AppItem; slot: SlotId; rect: DOMRect } | null>(null)
  const map = new Map((equipment ?? []).map(it => [it.ankama_id, it]))

  const rows = ALL_SLOTS
    .map((slot, i) => {
      const id   = snapshot.e[i]
      const item = id != null ? map.get(id) : undefined
      return item ? { slot, item } : null
    })
    .filter((r): r is { slot: SlotId; item: AppItem } => r != null)

  if (rows.length === 0) {
    return <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{t('build_detail_no_items')}</p>
  }

  return (
    <>
      <div className="space-y-1.5">
        {rows.map(({ slot, item }) => {
          const slotCfg       = SLOT_CONFIGS.find(sc => sc.id === slot)
          const visibleStats  = item.effects.filter(e => !isIgnored(e.stat)).slice(0, 6)
          return (
            <div
              key={slot}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{
                background: 'color-mix(in srgb, var(--gold) 6%, var(--surface-panel))',
                border:     '1px solid color-mix(in srgb, var(--gold) 28%, transparent)',
                boxShadow:  '0 0 12px color-mix(in srgb, var(--gold) 10%, transparent)',
              }}
              onMouseEnter={e => setHovered({ item, slot, rect: e.currentTarget.getBoundingClientRect() })}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                style={{
                  width: 48, height: 48,
                  background: 'color-mix(in srgb, var(--gold) 8%, var(--surface-void))',
                  border:     '1px solid color-mix(in srgb, var(--gold) 36%, transparent)',
                }}
              >
                {item.image_url
                  ? <img src={item.image_url} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
                  : slotCfg && slotImageIcon(slotCfg.id)
                  ? <img src={slotImageIcon(slotCfg.id)!} alt="" className="w-full h-full object-contain p-1.5 opacity-60" />
                  : <span style={{ color: 'var(--ink-faint)', fontSize: 20 }}>{slotCfg?.icon ?? '?'}</span>
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: 'var(--gold)' }}>
                  {item.name}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                  {t('level_range')} {item.level}
                </p>
                {visibleStats.length > 0 && (
                  <div className="flex flex-wrap gap-x-2.5 gap-y-0 mt-1">
                    {visibleStats.map((e, i) => {
                      const meta = STAT_META[e.stat]
                      const clr  = meta?.color ?? 'var(--ink-faint)'
                      return (
                        <span key={i} className="flex items-center gap-0.5">
                          {meta?.icon && (
                            <img src={statIconUrl(meta.icon)} alt="" width={10} height={10} className="object-contain" />
                          )}
                          <span className="text-[10px] font-mono tabular-nums" style={{ color: clr }}>
                            {fmtValue(e.min, e.max, t('range_sep_neg'))}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

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
