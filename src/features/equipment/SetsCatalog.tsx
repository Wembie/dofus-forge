import { useState, useMemo, useEffect, Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import { useDataStore } from '@/store/dataStore.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import type { SlotId } from '@/store/buildStore.ts'
import type { AppSet, AppItem, AppEffect } from '@/data/loaders.ts'
import { SLOT_CONFIGS } from './slotConfig.ts'
import { STAT_META, isIgnored, statIconUrl } from './statDisplay.ts'
import { ItemHoverTooltip } from './ItemHoverTooltip.tsx'
import { useToastStore } from '@/store/toastStore.ts'

const SetDetailModal = lazy(() => import('./SetDetailModal.tsx').then(m => ({ default: m.SetDetailModal })))

type Props = { onClose: () => void }

type SortKey = 'level-desc' | 'level-asc' | 'name-az' | 'pieces-desc'

const LEVELS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200]

type EnrichedSet = {
  set:        AppSet
  items:      AppItem[]
  minLevel:   number
  maxLevel:   number
  topBonus:   AppEffect[]
}

function SetCard({
  entry, equippedCount, onEquipAll, onViewDetail,
}: { entry: EnrichedSet; equippedCount: number; onEquipAll: () => void; onViewDetail: () => void }) {
  const { t } = useTranslation()
  const { set, items, minLevel, maxLevel, topBonus } = entry
  const total = items.length
  const complete = equippedCount === total && total > 0
  const [hovered, setHovered] = useState<{ item: AppItem; rect: DOMRect } | null>(null)

  return (
    <div
      className="text-left relative rounded-xl overflow-hidden w-full group flex flex-col cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={onEquipAll}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEquipAll() } }}
      style={{
        background: complete
          ? 'linear-gradient(145deg, var(--surface-parchment), var(--surface-void))'
          : 'var(--surface-void)',
        border: complete
          ? '1px solid color-mix(in srgb, var(--gold) 45%, transparent)'
          : '1px solid var(--metal-edge)',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        if (complete) el.style.borderColor = 'color-mix(in srgb, var(--gold) 70%, transparent)'
        else el.style.background = 'var(--surface-panel)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        if (complete) el.style.borderColor = 'color-mix(in srgb, var(--gold) 45%, transparent)'
        else el.style.background = 'var(--surface-void)'
      }}
    >
      {/* Header: name + level + piece badge + view-detail */}
      <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2">
        <div className="min-w-0">
          <p
            className="font-semibold text-[15px] leading-tight truncate"
            style={{ color: complete ? 'var(--gold)' : 'var(--ink)' }}
          >
            {set.name}
            {complete && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--gold)', opacity: 0.7 }}>✓</span>}
          </p>
          <p className="text-[11px] mt-0.5 font-mono" style={{ color: 'var(--ink-faint)' }}>
            Lv {minLevel === maxLevel ? minLevel : `${minLevel}–${maxLevel}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className="font-mono text-[11px] font-bold px-2 py-0.5 rounded"
            style={{
              background: 'color-mix(in srgb, var(--gold) 12%, transparent)',
              color:      'var(--gold)',
              border:     '1px solid color-mix(in srgb, var(--gold) 22%, transparent)',
            }}
          >
            {equippedCount}/{total}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onViewDetail() }}
            title={t('view_set')}
            aria-label={t('view_set')}
            className="w-6 h-6 rounded flex items-center justify-center transition-colors text-ink-faint hover:text-gold"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--metal-edge)' }}
          >
            <Eye size={12} />
          </button>
        </div>
      </div>

      {/* Item thumbnail strip — hover shows full item tooltip */}
      <div className="flex gap-1.5 px-4 pb-3 flex-wrap">
        {items.slice(0, 6).map(it => (
          <div
            key={it.ankama_id}
            className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{ background: 'linear-gradient(145deg, var(--surface-panel), var(--surface-stone))', border: '1px solid var(--metal-edge)' }}
            onMouseEnter={e => { e.stopPropagation(); setHovered({ item: it, rect: e.currentTarget.getBoundingClientRect() }) }}
            onMouseLeave={e => { e.stopPropagation(); setHovered(null) }}
          >
            {it.image_url
              ? <img src={it.image_url} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
              : <span className="text-ink-faint text-[11px]">?</span>}
          </div>
        ))}
        {items.length > 6 && (
          <div
            className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-mono"
            style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink-faint)' }}
          >
            +{items.length - 6}
          </div>
        )}
      </div>

      {/* Top-tier bonus preview */}
      {topBonus.length > 0 && (
        <div
          className="flex items-center gap-2.5 px-4 py-2 flex-wrap mt-auto"
          style={{ borderTop: '1px solid var(--metal-edge)', background: 'color-mix(in srgb, var(--surface-panel) 60%, transparent)' }}
        >
          <span className="text-[9px] uppercase tracking-wider font-semibold flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>
            {t('set_tier', { n: total })}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {topBonus.slice(0, 5).map((e, i) => {
              const meta = STAT_META[e.stat]
              if (!meta?.icon) return null
              return (
                <img
                  key={i}
                  src={statIconUrl(meta.icon)}
                  alt={t(meta.tKey)}
                  title={t(meta.tKey)}
                  width={14} height={14}
                  className="object-contain opacity-80"
                />
              )
            })}
            {topBonus.length > 5 && (
              <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>+{topBonus.length - 5}</span>
            )}
          </div>
        </div>
      )}

      {hovered && <ItemHoverTooltip item={hovered.item} anchor={hovered.rect} />}
    </div>
  )
}

export function SetsCatalog({ onClose }: Props) {
  const { t }         = useTranslation()
  const equipment     = useDataStore(s => s.equipment)
  const sets          = useDataStore(s => s.sets)
  const equipped      = useBuildStore(s => s.equipped)
  const equipMultiple = useBuildStore(s => s.equipMultiple)
  const addToast      = useToastStore(s => s.addToast)

  const [search, setSearch]       = useState('')
  const [minLevel, setMinLevel]   = useState(0)
  const [maxLevel, setMaxLevel]   = useState(200)
  const [pieces, setPieces]       = useState<number | null>(null)
  const [sort, setSort]           = useState<SortKey>('level-desc')
  const [openSet, setOpenSet]     = useState<AppSet | null>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Escape' && !openSet) onClose() }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [onClose, openSet])

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

  const equippedIds = useMemo(
    () => new Set(Object.values(equipped).filter((v): v is number => v != null)),
    [equipped],
  )

  const enriched = useMemo<EnrichedSet[]>(() => {
    if (!equipment || !sets) return []
    return sets
      .filter(s => s.items.length > 1)  // hide single-item "sets" (API quirk)
      .map(set => {
        const items = set.items
          .map(id => equipment.find(it => it.ankama_id === id))
          .filter((it): it is AppItem => it != null)
        if (items.length === 0) return null
        const levels   = items.map(it => it.level)
        const topTier  = Math.max(...Object.keys(set.bonuses).map(Number))
        const topBonus = (set.bonuses[topTier] ?? []).filter(e => !isIgnored(e.stat))
        return {
          set, items,
          minLevel: Math.min(...levels),
          maxLevel: Math.max(...levels),
          topBonus,
        } satisfies EnrichedSet
      })
      .filter((e): e is EnrichedSet => e !== null)
  }, [equipment, sets])

  const pieceOptions = useMemo(
    () => [...new Set(enriched.map(e => e.items.length))].sort((a, b) => a - b),
    [enriched],
  )

  const filtered = useMemo(() => {
    let list = enriched
    if (search.trim()) {
      const lq = search.toLowerCase()
      list = list.filter(e => e.set.name.toLowerCase().includes(lq))
    }
    list = list.filter(e => e.maxLevel >= minLevel && e.minLevel <= maxLevel)
    if (pieces != null) list = list.filter(e => e.items.length === pieces)

    const sorted = [...list]
    if (sort === 'level-desc')  sorted.sort((a, b) => b.maxLevel - a.maxLevel)
    else if (sort === 'level-asc') sorted.sort((a, b) => a.minLevel - b.minLevel)
    else if (sort === 'pieces-desc') sorted.sort((a, b) => b.items.length - a.items.length)
    else sorted.sort((a, b) => a.set.name.localeCompare(b.set.name))
    return sorted
  }, [enriched, search, minLevel, maxLevel, pieces, sort])

  const SORT_LABELS: Record<SortKey, string> = {
    'level-desc':  t('sort_level_desc'),
    'level-asc':   t('sort_level_asc'),
    'name-az':     t('sort_name_az'),
    'pieces-desc': t('sets_sort_pieces'),
  }

  // Equip every not-yet-equipped item of a set in one atomic update — same
  // logic as SetDetailModal's handleEquipAll, kept in sync with it.
  function handleEquipAll(entry: EnrichedSet) {
    const localEquipped = { ...equipped }
    const toEquip: { slot: SlotId; ankama_id: number }[] = []
    const equippedItems: { slot: SlotId; item: AppItem }[] = []

    for (const item of entry.items) {
      if (equippedIds.has(item.ankama_id)) continue
      const slots  = slotByApiSlot.get(item.slot) ?? []
      const target = slots.find(sid => localEquipped[sid] == null) ?? slots[0]
      if (!target) continue
      localEquipped[target] = item.ankama_id
      toEquip.push({ slot: target, ankama_id: item.ankama_id })
      equippedItems.push({ slot: target, item })
    }

    if (toEquip.length === 0) return
    equipMultiple(toEquip)
    for (const { slot, item } of equippedItems) {
      const slotCfg = SLOT_CONFIGS.find(s => s.id === slot)
      addToast(t('toast_equipped', { slot: t(`slot_${slot}`), item: item.name }), slotCfg?.icon ?? '✓')
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
        role="dialog"
        aria-modal
        aria-label={t('sets_catalog_title')}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="catalog-panel flex flex-col rounded-xl shadow-2xl overflow-hidden"
          style={{ position: 'fixed', top: 32, left: 48, right: 48, bottom: 32, background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--metal-edge)' }}
          >
            <h3 className="font-display text-forge-gold font-bold text-base tracking-wide">
              {t('sets_catalog_title')}
            </h3>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center transition-colors text-lg leading-none text-ink-muted hover:text-ink"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--metal-edge)' }}
              aria-label={t('modal_close')}
            >×</button>
          </div>

          {/* Filters */}
          <div className="px-4 py-3 space-y-2.5" style={{ borderBottom: '1px solid var(--metal-edge)' }}>
            <input
              type="search"
              placeholder={t('sets_catalog_search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="w-full rounded-lg px-3 py-2 text-sm text-forge-text placeholder:text-ink-faint focus:outline-none transition-colors"
              style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
              onBlur={e =>  (e.currentTarget.style.borderColor = 'var(--metal-edge)')}
            />

            <div className="flex items-center gap-1 flex-wrap">
              {pieceOptions.length > 0 && (
                <>
                  <button
                    onClick={() => setPieces(null)}
                    className={[
                      'px-2.5 py-1 rounded-md text-[11px] border transition-colors font-medium',
                      pieces === null ? 'filter-btn-active' : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-gold-deep',
                    ].join(' ')}
                  >{t('elem_all')}</button>
                  {pieceOptions.map(n => (
                    <button
                      key={n}
                      onClick={() => setPieces(pieces === n ? null : n)}
                      className={[
                        'px-2.5 py-1 rounded-md text-[11px] border transition-colors font-medium',
                        pieces === n ? 'filter-btn-active' : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-gold-deep',
                      ].join(' ')}
                    >{t('sets_catalog_pieces', { count: n })}</button>
                  ))}
                </>
              )}

              <div className="ml-auto flex gap-1">
                {(Object.keys(SORT_LABELS) as SortKey[]).map(sk => (
                  <button
                    key={sk}
                    onClick={() => setSort(sk)}
                    className={[
                      'px-2.5 py-1 rounded-md text-[11px] border transition-colors font-medium',
                      sort === sk ? 'filter-btn-active' : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-gold-deep',
                    ].join(' ')}
                  >{SORT_LABELS[sk]}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 text-xs text-forge-muted items-center flex-wrap">
              <span className="text-ink-faint flex-shrink-0">{t('level_range')}</span>
              <select
                value={minLevel}
                onChange={e => setMinLevel(Number(e.target.value))}
                className="rounded px-2 py-1 text-forge-text text-xs focus:outline-none"
                style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
              >
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <span className="text-ink-faint">–</span>
              <select
                value={maxLevel}
                onChange={e => setMaxLevel(Number(e.target.value))}
                className="rounded px-2 py-1 text-forge-text text-xs focus:outline-none"
                style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
              >
                {LEVELS.map(l => <option key={l} value={l}>{l === 0 ? '—' : l}</option>)}
              </select>
            </div>

            <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('sets_catalog_hint')}</p>
          </div>

          {/* Card grid */}
          <div className="overflow-y-auto flex-1 p-4">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-forge-muted text-sm">{t('no_sets')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(entry => {
                  const equippedCount = entry.items.filter(it => equippedIds.has(it.ankama_id)).length
                  return (
                    <SetCard
                      key={entry.set.ankama_id}
                      entry={entry}
                      equippedCount={equippedCount}
                      onEquipAll={() => handleEquipAll(entry)}
                      onViewDetail={() => setOpenSet(entry.set)}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-4 py-2 text-[10px]"
            style={{ borderTop: '1px solid var(--metal-edge)', color: 'var(--ink-faint)' }}
          >
            <span>{t('catalog_esc_hint')}</span>
            <span>{t('set_count', { count: filtered.length })}</span>
          </div>
        </div>
      </div>

      {openSet && (
        <Suspense fallback={null}>
          <SetDetailModal set={openSet} onClose={() => setOpenSet(null)} />
        </Suspense>
      )}
    </>
  )
}
