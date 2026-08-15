import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import type { SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { AppSet, AppEffect, AppItem } from '@/data/loaders.ts'
import { SLOT_CONFIGS } from './slotConfig.ts'
import { STAT_META, isIgnored, fmtValue, statIconUrl } from './statDisplay.ts'
import { Modal, Button } from '@/ui'

type Props = {
  set:     AppSet
  onClose: () => void
}

function TierEffectRow({ e, active }: { e: AppEffect; active: boolean }) {
  const { t }  = useTranslation()
  const meta   = STAT_META[e.stat]
  const isNeg  = e.min < 0
  const color  = active
    ? (isNeg ? 'var(--negative)' : (meta?.color ?? 'var(--ink-muted)'))
    : 'var(--ink-faint)'
  const val    = fmtValue(e.min, e.max, t('range_sep_neg'))
  return (
    <div className="flex items-center gap-1.5" style={{ opacity: active ? 1 : 0.4 }}>
      {meta?.icon
        ? <img src={statIconUrl(meta.icon)} alt="" width={13} height={13} style={{ objectFit: 'contain', flexShrink: 0 }} />
        : <span style={{ width: 13, flexShrink: 0 }} />
      }
      <span className="font-mono font-bold text-[12px] tabular-nums flex-shrink-0" style={{ color }}>{val}</span>
      <span className="text-[12px] leading-tight truncate" style={{ color }}>
        {meta ? t(meta.tKey) : e.stat}
      </span>
    </div>
  )
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

  const progress = equippedCount / setItems.length

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={set.name}
      className="max-h-[88vh]"
    >
      {/* Progress bar + equip-all */}
      <div
        className="flex items-center justify-between px-5 py-2.5 gap-4"
        style={{ borderBottom: '1px solid var(--metal-edge)', background: 'var(--surface-stone)' }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Piece count badge */}
          <span
            className="font-mono text-[11px] font-bold flex-shrink-0 px-2 py-0.5 rounded"
            style={{
              background: 'color-mix(in srgb, var(--gold) 12%, transparent)',
              color:      'var(--gold)',
              border:     '1px solid color-mix(in srgb, var(--gold) 22%, transparent)',
            }}
          >
            {equippedCount}/{setItems.length}
          </span>
          {/* Progress bar */}
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--metal-edge)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width:      `${progress * 100}%`,
                background: progress === 1
                  ? 'linear-gradient(90deg, var(--gold-deep), var(--gold))'
                  : 'linear-gradient(90deg, var(--gold-deep), var(--gold-bright))',
                boxShadow:  `0 0 6px color-mix(in srgb, var(--gold) 50%, transparent)`,
              }}
            />
          </div>
          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>
            {t('set_pieces_equipped', { n: equippedCount, total: setItems.length })}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleEquipAll}>{t('equip_all')}</Button>
      </div>

      <div className="p-4 space-y-5 overflow-y-auto">

        {/* ── Tier bonuses ── */}
        <section>
          <p className="text-[10px] uppercase tracking-[0.18em] font-medium mb-2.5" style={{ color: 'var(--ink-faint)' }}>
            {t('set_bonuses_title')}
          </p>
          <div className="space-y-2">
            {tiers.map(({ pieces, effects }) => {
              const active = pieces <= equippedCount
              const isNext = !active && pieces === tiers.find(tier => tier.pieces > equippedCount)?.pieces
              return (
                <div
                  key={pieces}
                  className="rounded-lg overflow-hidden"
                  style={{
                    border:     active
                      ? '1px solid color-mix(in srgb, var(--gold) 28%, transparent)'
                      : '1px solid var(--metal-edge)',
                    background: active
                      ? 'color-mix(in srgb, var(--gold) 5%, var(--surface-void))'
                      : 'var(--surface-void)',
                    opacity: !active && !isNext ? 0.45 : 1,
                  }}
                >
                  {/* Tier header */}
                  <div
                    className="flex items-center gap-2 px-3 py-1.5"
                    style={{
                      borderBottom: '1px solid color-mix(in srgb, var(--metal-edge) 60%, transparent)',
                      background:   active
                        ? 'color-mix(in srgb, var(--gold) 8%, var(--surface-stone))'
                        : 'var(--surface-stone)',
                    }}
                  >
                    <span
                      className="font-mono text-[11px] font-bold"
                      style={{ color: active ? 'var(--gold)' : isNext ? 'var(--ink-muted)' : 'var(--ink-faint)' }}
                    >
                      {t('set_tier', { n: pieces })}
                    </span>
                    {active && (
                      <span
                        className="text-[9px] uppercase tracking-widest px-1.5 py-px rounded font-medium"
                        style={{
                          background: 'color-mix(in srgb, var(--gold) 14%, transparent)',
                          color:      'var(--gold)',
                          border:     '1px solid color-mix(in srgb, var(--gold) 22%, transparent)',
                        }}
                      >
                        {t('set_bonus_active')}
                      </span>
                    )}
                    {isNext && (
                      <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>
                        {t('set_bonus_next')}
                      </span>
                    )}
                  </div>

                  {/* Effects grid */}
                  <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {effects.map((e: AppEffect, i: number) => (
                      <TierEffectRow key={i} e={e} active={active} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Items list ── */}
        <section>
          <p className="text-[10px] uppercase tracking-[0.18em] font-medium mb-2.5" style={{ color: 'var(--ink-faint)' }}>
            {t('set_items_title')}
          </p>
          <div className="space-y-3">
            {[
              { items: setItems.filter(it => equippedIds.has(it.ankama_id)),   label: t('set_items_have',    { n: setItems.filter(it => equippedIds.has(it.ankama_id)).length }),    color: 'var(--gold)' },
              { items: setItems.filter(it => !equippedIds.has(it.ankama_id)),  label: t('set_items_missing', { n: setItems.filter(it => !equippedIds.has(it.ankama_id)).length }),  color: 'var(--ink-faint)' },
            ].map(({ items: group, label, color }) => group.length === 0 ? null : (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-[0.15em] font-bold mb-1.5" style={{ color }}>{label}</p>
                <div className="space-y-1.5">
                {group.map(item => {
              const eq  = isEquipped(item)
              const slot = SLOT_CONFIGS.find(sc => {
                const slots = Array.isArray(sc.apiSlot) ? sc.apiSlot : [sc.apiSlot]
                if (!slots.includes(item.slot)) return false
                return !sc.apiTypes || sc.apiTypes.includes(item.type)
              })
              const visibleStats = item.effects.filter(e => !isIgnored(e.stat)).slice(0, 6)
              return (
                <div
                  key={item.ankama_id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
                  style={{
                    background: eq
                      ? 'color-mix(in srgb, var(--gold) 6%, var(--surface-panel))'
                      : 'var(--surface-stone)',
                    border: eq
                      ? '1px solid color-mix(in srgb, var(--gold) 28%, transparent)'
                      : '1px solid var(--metal-edge)',
                    boxShadow: eq
                      ? '0 0 12px color-mix(in srgb, var(--gold) 10%, transparent)'
                      : 'none',
                  }}
                >
                  {/* Item image */}
                  <div
                    className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                    style={{
                      width:      48, height: 48,
                      background: eq
                        ? 'color-mix(in srgb, var(--gold) 8%, var(--surface-void))'
                        : 'var(--surface-void)',
                      border: eq
                        ? '1px solid color-mix(in srgb, var(--gold) 36%, transparent)'
                        : '1px solid var(--metal-edge)',
                      boxShadow: eq ? `0 0 10px color-mix(in srgb, var(--gold) 20%, transparent)` : 'none',
                    }}
                  >
                    {item.image_url
                      ? <img src={item.image_url} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
                      : <span style={{ color: 'var(--ink-faint)', fontSize: 20 }}>{slot?.icon ?? '?'}</span>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p
                        className="text-[13px] font-semibold truncate leading-tight"
                        style={{ color: eq ? 'var(--gold)' : 'var(--ink)' }}
                      >
                        {item.name}
                      </p>
                      {eq ? (
                        <span
                          className="flex-shrink-0 text-[9px] uppercase tracking-widest px-1 py-px rounded font-bold"
                          style={{
                            background: 'color-mix(in srgb, var(--gold) 14%, transparent)',
                            color:      'var(--gold)',
                            border:     '1px solid color-mix(in srgb, var(--gold) 22%, transparent)',
                          }}
                        >
                          ✓
                        </span>
                      ) : slot && (
                        <span
                          className="flex-shrink-0 text-[9px] uppercase tracking-widest px-1.5 py-px rounded font-bold"
                          style={{
                            background: 'color-mix(in srgb, var(--ink-faint) 10%, transparent)',
                            color:      'var(--ink-muted)',
                            border:     '1px solid var(--metal-edge)',
                          }}
                        >
                          {slot.icon} {t(`slot_${slot.id}`)}
                        </span>
                      )}
                    </div>
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

                  {/* Equip button */}
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
            ))}
          </div>
        </section>
      </div>
    </Modal>
  )
}
