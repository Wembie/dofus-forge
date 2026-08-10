import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import type { SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { AppSet, AppEffect, AppItem } from '@/data/loaders.ts'
import { SLOT_CONFIGS } from './slotConfig.ts'
import { STAT_META, isIgnored, fmtValue, statIconUrl } from './statDisplay.ts'
import { Modal, Button } from '@/ui'

function effectLabel(e: AppEffect, negSep: string): string {
  const sign = e.min >= 0 ? '+' : ''
  if (e.min === e.max) return `${sign}${e.min} ${e.stat}`
  if (e.max < 0)       return `${e.max} ${negSep} ${e.min} ${e.stat}`
  return `${sign}${e.min}–${e.max} ${e.stat}`
}

type Props = {
  set:     AppSet
  onClose: () => void
}

export function SetDetailModal({ set, onClose }: Props) {
  const { t }     = useTranslation()
  const equipment   = useDataStore(s => s.equipment)
  const equipped    = useBuildStore(s => s.equipped)
  const equipItem   = useBuildStore(s => s.equipItem)
  const unequipItem = useBuildStore(s => s.unequipItem)

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

  const setItems = useMemo<AppItem[]>(() => {
    if (!equipment) return []
    return set.items
      .map(id => equipment.find(it => it.ankama_id === id))
      .filter((it): it is AppItem => it != null)
      .sort((a, b) => b.level - a.level)
  }, [set, equipment])

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

  function handleEquipAll() {
    for (const item of setItems) {
      if (!isEquipped(item)) handleEquip(item)
    }
  }

  function handleEquip(item: AppItem) {
    const slots  = slotByApiSlot.get(item.slot) ?? []
    const target = slots.find(sid => equipped[sid] == null) ?? slots[0]
    if (target) equipItem(target, item.ankama_id)
  }

  function handleUnequip(item: AppItem) {
    const slotId = (Object.entries(equipped) as [SlotId, number | null][])
      .find(([, id]) => id === item.ankama_id)?.[0]
    if (slotId) unequipItem(slotId)
  }

  const isEquipped = (item: AppItem) => equippedIds.has(item.ankama_id)

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={set.name}
      className="max-h-[88vh]"
    >
      {/* Subtitle + equip-all — sticky above scroll */}
      <div className="flex items-center justify-between px-5 py-2" style={{ borderBottom: '1px solid var(--metal-edge)' }}>
        <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
          {t('set_pieces_equipped', { n: equippedCount, total: setItems.length })}
        </p>
        <Button variant="ghost" size="sm" onClick={handleEquipAll}>{t('equip_all')}</Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Set bonuses */}
        <div className="rounded-frame p-3 space-y-2" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
          <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--ink-faint)' }}>{t('set_bonuses_title')}</p>
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
                      {effectLabel(e, t('range_sep_neg'))}
                    </span>
                  ))}
                </span>
              </div>
            )
          })}
        </div>

        {/* Items list */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--ink-faint)' }}>{t('set_items_title')}</p>
          {setItems.map(item => {
            const eq = isEquipped(item)
            const slot = SLOT_CONFIGS.find(sc => sc.apiSlot === item.slot)
            const visibleStats = item.effects.filter(e => !isIgnored(e.stat)).slice(0, 5)
            return (
              <div
                key={item.ankama_id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors"
                style={{
                  background: eq ? 'var(--surface-parchment)' : 'var(--surface-stone)',
                  border:     eq ? '1px solid color-mix(in srgb, var(--gold) 27%, transparent)' : '1px solid var(--metal-edge)',
                }}
              >
                <div
                  className="flex-shrink-0 rounded overflow-hidden flex items-center justify-center"
                  style={{
                    width:  44, height: 44,
                    background: 'var(--surface-void)',
                    border: eq ? '1px solid color-mix(in srgb, var(--gold) 33%, transparent)' : '1px solid var(--metal-edge)',
                  }}
                >
                  {item.image_url
                    ? <img src={item.image_url} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
                    : <span className="text-forge-muted/40 text-lg">{slot?.icon ?? '?'}</span>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate leading-tight ${eq ? 'text-forge-gold' : 'text-forge-text'}`}>
                    {item.name}
                    {eq && <span className="ml-1.5 text-[10px] text-forge-gold/60">✓</span>}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                    Lv {item.level} · {slot?.label ?? item.slot}
                  </p>
                  <div className="flex flex-wrap gap-x-2 mt-0.5">
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
                </div>

                {!eq ? (
                  <Button variant="ghost" size="sm" onClick={() => handleEquip(item)}>
                    {t('equip_item')}
                  </Button>
                ) : (
                  <Button variant="danger" size="sm" onClick={() => handleUnequip(item)}>
                    {t('unequip_btn')}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
