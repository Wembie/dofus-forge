import { useMemo } from 'react'
import { useBuildStore, type SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { AppSet, AppEffect, AppItem } from '@/data/loaders.ts'
import { SLOT_CONFIGS } from './slotConfig.ts'
import { STAT_META, isIgnored, fmtValue, statIconUrl } from './statDisplay.ts'

function effectLabel(e: AppEffect): string {
  const sign = e.min >= 0 ? '+' : ''
  const val  = e.min !== e.max ? `${e.min}–${e.max}` : `${sign}${e.min}`
  return `${val} ${e.stat}`
}

type Props = {
  set:     AppSet
  onClose: () => void
}

export function SetDetailModal({ set, onClose }: Props) {
  const equipment = useDataStore(s => s.equipment)
  const equipped  = useBuildStore(s => s.equipped)
  const equipItem = useBuildStore(s => s.equipItem)

  // Build apiSlot→slotId map for equipping (handles string | string[] apiSlot)
  const slotByApiSlot = useMemo(() => {
    const map = new Map<string, SlotId[]>()
    for (const sc of SLOT_CONFIGS) {
      const apiSlots = Array.isArray(sc.apiSlot) ? sc.apiSlot : [sc.apiSlot]
      for (const s of apiSlots) {
        if (!map.has(s)) map.set(s, [])
        map.get(s)!.push(sc.id)
      }
    }
    return map
  }, [])

  // Items in this set that exist in loaded equipment
  const setItems = useMemo<AppItem[]>(() => {
    if (!equipment) return []
    return set.items
      .map(id => equipment.find(it => it.ankama_id === id))
      .filter((it): it is AppItem => it != null)
      .sort((a, b) => b.level - a.level)
  }, [set, equipment])

  // Which set item ids are currently equipped
  const equippedIds = useMemo(
    () => new Set(Object.values(equipped).filter((v): v is number => v != null)),
    [equipped],
  )

  const equippedCount = useMemo(
    () => setItems.filter(it => equippedIds.has(it.ankama_id)).length,
    [setItems, equippedIds],
  )

  const tiers = useMemo(
    () => Object.entries(set.bonuses)
      .map(([k, v]) => ({ pieces: Number(k), effects: v }))
      .sort((a, b) => a.pieces - b.pieces),
    [set],
  )

  function handleEquip(item: AppItem) {
    const slots = slotByApiSlot.get(item.slot) ?? []
    // prefer first unoccupied slot, else use first slot
    const target = slots.find(sid => equipped[sid] == null) ?? slots[0]
    if (target) equipItem(target, item.ankama_id)
  }

  const isEquipped = (item: AppItem) => equippedIds.has(item.ankama_id)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-xl flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#0f1320', border: '1px solid #2a3347', maxHeight: '88vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{
            background:   'linear-gradient(180deg, #1a2035 0%, #141929 100%)',
            borderBottom: '1px solid #2a3347',
          }}
        >
          <div>
            <h3 className="font-display text-forge-gold font-bold text-base tracking-wide">{set.name}</h3>
            <p className="text-[11px] text-forge-muted/60 mt-0.5">
              {equippedCount}/{setItems.length} equipped
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors text-lg leading-none"
            style={{ background: '#1c2333', border: '1px solid #2a3347', color: '#7a8499' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e8eaf0' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#7a8499' }}
            aria-label="Close"
          >×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Set bonuses */}
          <div className="rounded-lg p-3 space-y-2" style={{ background: '#080c14', border: '1px solid #1c2333' }}>
            <p className="text-[10px] uppercase tracking-widest text-forge-muted/50 font-medium mb-2">Set Bonuses</p>
            {tiers.map(({ pieces, effects }) => {
              const active = pieces <= equippedCount
              return (
                <div
                  key={pieces}
                  className={`pl-2.5 border-l-2 transition-colors ${active ? 'border-forge-gold' : 'border-forge-border'}`}
                >
                  <span className={`text-[10px] font-mono font-bold mr-1.5 ${active ? 'text-forge-gold' : 'text-forge-muted/30'}`}>
                    {pieces}pc
                  </span>
                  <span className={`text-[10px] ${active ? 'text-forge-text' : 'text-forge-muted/25'}`}>
                    {effects.map((e: AppEffect, i: number) => (
                      <span key={i}>
                        {i > 0 && <span className="mx-1 text-forge-border">·</span>}
                        {effectLabel(e)}
                      </span>
                    ))}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Items list */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-forge-muted/50 font-medium mb-2">Items</p>
            {setItems.map(item => {
              const eq = isEquipped(item)
              const slot = SLOT_CONFIGS.find(sc => sc.apiSlot === item.slot)
              const visibleStats = item.effects.filter(e => !isIgnored(e.stat)).slice(0, 5)
              return (
                <div
                  key={item.ankama_id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors"
                  style={{
                    background: eq ? '#1a1f30' : '#111520',
                    border:     eq ? '1px solid #c9a84c44' : '1px solid #1c2333',
                  }}
                >
                  {/* Image */}
                  <div
                    className="flex-shrink-0 rounded overflow-hidden flex items-center justify-center"
                    style={{
                      width:  44, height: 44,
                      background: 'linear-gradient(145deg, #1a1f30, #0f1220)',
                      border: eq ? '1px solid #c9a84c55' : '1px solid #1c2333',
                    }}
                  >
                    {item.image_url
                      ? <img src={item.image_url} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
                      : <span className="text-forge-muted/40 text-lg">{slot?.icon ?? '?'}</span>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate leading-tight ${eq ? 'text-forge-gold' : 'text-forge-text'}`}>
                      {item.name}
                      {eq && <span className="ml-1.5 text-[10px] text-forge-gold/60">✓</span>}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#4a5268' }}>
                      Lv {item.level} · {slot?.label ?? item.slot}
                    </p>
                    <div className="flex flex-wrap gap-x-2 mt-0.5">
                      {visibleStats.map((e, i) => {
                        const meta = STAT_META[e.stat]
                        const clr  = meta?.color ?? '#4a5268'
                        return (
                          <span key={i} className="flex items-center gap-0.5">
                            {meta?.icon && (
                              <img src={statIconUrl(meta.icon)} alt="" width={10} height={10} className="object-contain" />
                            )}
                            <span className="text-[10px] font-mono tabular-nums" style={{ color: clr }}>
                              {fmtValue(e.min, e.max)}
                            </span>
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Equip button */}
                  {!eq && (
                    <button
                      onClick={() => handleEquip(item)}
                      className="flex-shrink-0 px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                      style={{ background: '#1c2740', border: '1px solid #2a3f60', color: '#7a9ab8' }}
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = '#22304e'
                        ;(e.currentTarget as HTMLButtonElement).style.color = '#a8c4e0'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = '#1c2740'
                        ;(e.currentTarget as HTMLButtonElement).style.color = '#7a9ab8'
                      }}
                    >
                      Equip
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
