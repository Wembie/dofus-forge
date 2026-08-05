import { useState, useMemo } from 'react'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { SLOT_CONFIGS, type SlotConfig } from './slotConfig.ts'
import { ItemCatalog } from './ItemCatalog.tsx'
import type { SlotId } from '@/store/buildStore.ts'

export function EquipmentGrid() {
  const equipped    = useBuildStore(s => s.equipped)
  const unequipItem = useBuildStore(s => s.unequipItem)
  const equipment   = useDataStore(s => s.equipment)
  const loading     = useDataStore(s => s.loading)

  const [openSlot, setOpenSlot] = useState<{ config: SlotConfig; id: SlotId } | null>(null)

  const equipMap = useMemo(
    () => new Map((equipment ?? []).map(it => [it.ankama_id, it])),
    [equipment],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-forge-muted text-sm">
        Loading item data…
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <h2 className="font-display text-forge-gold text-sm uppercase tracking-widest">Equipment</h2>
        <div className="grid grid-cols-4 gap-2">
          {SLOT_CONFIGS.map(cfg => {
            const id   = equipped[cfg.id]
            const item = id != null ? equipMap.get(id) : undefined

            return (
              <div key={cfg.id} className="relative group">
                <button
                  onClick={() => setOpenSlot({ config: cfg, id: cfg.id })}
                  className={[
                    'w-full aspect-square rounded-lg border transition-all duration-150 flex flex-col items-center justify-center gap-1 p-1',
                    item
                      ? 'border-forge-gold/30 bg-forge-card hover:border-forge-gold/70'
                      : 'border-forge-border border-dashed bg-forge-surface/50 hover:border-forge-gold/40 hover:bg-forge-surface',
                  ].join(' ')}
                  aria-label={`${cfg.label}${item ? `: ${item.name}` : ' (empty)'}`}
                >
                  {item ? (
                    item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-0.5" loading="lazy" />
                      : <span className="text-2xl">{cfg.icon}</span>
                  ) : (
                    <>
                      <span className="text-lg text-forge-muted/40">{cfg.icon}</span>
                      <span className="text-[9px] text-forge-muted/40 leading-tight text-center">{cfg.label}</span>
                    </>
                  )}
                </button>

                {item && (
                  <button
                    onClick={(e) => { e.stopPropagation(); unequipItem(cfg.id) }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-forge-bg border border-forge-border text-forge-muted hover:text-red-400 hover:border-red-400/50 text-[10px] leading-none items-center justify-center hidden group-hover:flex transition-colors"
                    aria-label={`Unequip ${item.name}`}
                  >×</button>
                )}

                {item && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-10 hidden group-hover:block pointer-events-none w-48">
                    <div className="bg-forge-card border border-forge-border rounded-lg p-2 shadow-xl text-xs">
                      <p className="font-medium text-forge-text mb-1">{item.name}</p>
                      <p className="text-forge-muted mb-1">Lv {item.level}</p>
                      {item.effects.slice(0, 5).map((e, i) => (
                        <p key={i} className="text-forge-muted/80">
                          {e.min !== e.max ? `${e.min}–${e.max}` : `+${e.min}`} {e.stat}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {openSlot && (
        <ItemCatalog
          slot={openSlot.config}
          slotId={openSlot.id}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </>
  )
}
