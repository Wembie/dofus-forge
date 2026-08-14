import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDataStore } from '@/store/dataStore.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import type { SlotId } from '@/store/buildStore.ts'
import { SLOT_CONFIGS, type SlotConfig } from './slotConfig.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import { itemMatchesElement, ELEM_FILTERS, type ElemFilter } from './itemElement.ts'
import { STAT_META, isIgnored, fmtValue, statIconUrl } from './statDisplay.ts'
import { useFavorites } from '@/store/useFavorites.ts'
import { Modal, Button, StatFilter } from '@/ui'

function matchesSlot(it: AppItem, slot: SlotConfig): boolean {
  const slots = Array.isArray(slot.apiSlot) ? slot.apiSlot : [slot.apiSlot]
  return slots.includes(it.slot) && (!slot.apiTypes || slot.apiTypes.includes(it.type))
}

function slotTKey(id: SlotId): string {
  if (id.startsWith('ring'))  return 'slot_ring'
  if (id.startsWith('dofus')) return 'slot_dofus'
  return `slot_${id}`
}

type SortKey = 'level-desc' | 'level-asc' | 'name-az'

type Props = {
  slot:    SlotConfig
  slotId:  SlotId
  onClose: () => void
}

const LEVELS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200]

function SetSearch({
  sets, selected, onSelect,
}: { sets: AppSet[]; selected: AppSet | null; onSelect: (s: AppSet | null) => void }) {
  const [q, setQ]       = useState('')
  const [open, setOpen] = useState(false)
  const inputRef        = useRef<HTMLInputElement>(null)

  const matches = useMemo(() => {
    if (!q) return sets.slice(0, 12)
    const lq = q.toLowerCase()
    return sets.filter(s => s.name.toLowerCase().includes(lq)).slice(0, 12)
  }, [sets, q])

  function pick(s: AppSet | null) {
    onSelect(s)
    setOpen(false)
    setQ('')
  }

  return (
    <div className="relative flex-1 min-w-0">
      {selected ? (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border font-medium cursor-pointer filter-btn-active"
          onClick={() => pick(null)}
        >
          <span className="truncate">{selected.name}</span>
          <span className="ml-auto flex-shrink-0 opacity-60 hover:opacity-100">✕</span>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={q}
            placeholder="Set…"
            onChange={e => { setQ(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="w-full rounded-md px-2.5 py-1 text-[11px] text-forge-text placeholder:text-ink-faint focus:outline-none"
            style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
          />
          {open && matches.length > 0 && (
            <ul
              className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-50 shadow-xl"
              style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)', maxHeight: 220, overflowY: 'auto' }}
            >
              {matches.map(s => (
                <li key={s.ankama_id}>
                  <button
                    className="w-full text-left px-3 py-1.5 text-[11px] text-forge-text hover:bg-white/5 transition-colors"
                    onMouseDown={() => pick(s)}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-1.5 text-ink-faint text-[10px]">{s.items.length}pc</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}


type SetModalProps = {
  set:         AppSet
  equipment:   AppItem[]
  equippedIds: Set<number>
  onEquip:     (item: AppItem) => void
  onUnequip:   (item: AppItem) => void
  onClose:     () => void
}

function SetDetailModal({ set, equipment, equippedIds, onEquip, onUnequip, onClose }: SetModalProps) {
  const { t } = useTranslation()

  const setItems = useMemo(() => {
    const ids = new Set(set.items)
    return equipment
      .filter(it => ids.has(it.ankama_id))
      .sort((a, b) => b.level - a.level)
  }, [set, equipment])

  const equippedCount = setItems.filter(it => equippedIds.has(it.ankama_id)).length
  const bonusCounts   = Object.keys(set.bonuses).map(Number).sort((a, b) => a - b)
  const activeTier    = [...bonusCounts].reverse().find(n => n <= equippedCount) ?? null

  return (
    <Modal open onClose={onClose} size="lg" title={set.name}>
      <div className="p-4 space-y-4">
        {setItems.length > 0 && (
          <div className="flex gap-1.5 items-center flex-wrap">
            {Array.from({ length: setItems.length }, (_, i) => (
              <div
                key={i}
                className="rounded-full flex-shrink-0 transition-all duration-150"
                style={{
                  width:      i < equippedCount ? 10 : 8,
                  height:     i < equippedCount ? 10 : 8,
                  background: i < equippedCount ? 'var(--gold)' : 'var(--surface-raised)',
                  border:     i < equippedCount
                    ? '1px solid color-mix(in srgb, var(--gold) 60%, transparent)'
                    : '1px solid var(--metal-edge)',
                }}
              />
            ))}
            <span className="text-[10px] ml-1" style={{ color: 'var(--ink-faint)' }}>
              {equippedCount} / {setItems.length}
            </span>
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--ink-faint)' }}>
            {t('set_items_title')}
          </p>
          <div className="space-y-1.5">
            {setItems.map(item => {
              const isEq = equippedIds.has(item.ankama_id)
              return (
                <div
                  key={item.ankama_id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors"
                  style={{
                    background: isEq
                      ? 'color-mix(in srgb, var(--gold) 7%, var(--surface-void))'
                      : 'var(--surface-stone)',
                    border:  isEq
                      ? '1px solid color-mix(in srgb, var(--gold) 28%, transparent)'
                      : '1px solid var(--metal-edge)',
                    cursor: !isEq ? 'pointer' : 'default',
                  }}
                  onClick={() => !isEq && onEquip(item)}
                  onMouseEnter={e => {
                    if (!isEq) (e.currentTarget as HTMLElement).style.background = 'var(--surface-panel)'
                  }}
                  onMouseLeave={e => {
                    if (!isEq) (e.currentTarget as HTMLElement).style.background = 'var(--surface-stone)'
                  }}
                >
                  <div
                    className="w-9 h-9 flex-shrink-0 rounded-md overflow-hidden flex items-center justify-center"
                    style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
                  >
                    {item.image_url
                      ? <img src={item.image_url} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
                      : <span style={{ fontSize: 14, color: 'var(--ink-faint)' }}>?</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate" style={{ color: isEq ? 'var(--gold)' : 'var(--ink)' }}>
                      {item.name}
                      {isEq && <span className="ml-1.5 text-[9px]" style={{ color: 'var(--gold)', opacity: 0.5 }}>✓</span>}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                      Lv {item.level} · {t(`item_type_${item.type}`, { defaultValue: item.type })}
                    </p>
                  </div>
                  {!isEq ? (
                    <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onEquip(item) }}>
                      {t('equip_item')}
                    </Button>
                  ) : (
                    <Button variant="danger" size="sm" onClick={e => { e.stopPropagation(); onUnequip(item) }}>
                      {t('unequip_btn')}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {bonusCounts.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--ink-faint)' }}>
              {t('set_bonuses_title')}
            </p>
            <div className="space-y-2">
              {bonusCounts.map(count => {
                const isActive  = count <= equippedCount
                const isCurrent = count === activeTier
                const effects   = set.bonuses[count] ?? []
                return (
                  <div
                    key={count}
                    className="rounded-lg p-3"
                    style={{
                      background: isActive
                        ? 'color-mix(in srgb, var(--gold) 7%, var(--surface-void))'
                        : 'var(--surface-stone)',
                      border: isCurrent
                        ? '1px solid color-mix(in srgb, var(--gold) 40%, transparent)'
                        : isActive
                        ? '1px solid color-mix(in srgb, var(--gold) 18%, transparent)'
                        : '1px solid var(--metal-edge)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold" style={{ color: isActive ? 'var(--gold)' : 'var(--ink-faint)' }}>
                        {t('set_bonus_count', { n: count })}
                      </span>
                      {isCurrent && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ background: 'color-mix(in srgb, var(--gold) 20%, transparent)', color: 'var(--gold)' }}
                        >
                          {t('set_bonus_active')}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {effects.map((e, i) => {
                        const meta  = STAT_META[e.stat]
                        const isNeg = e.min < 0
                        const clr   = isNeg ? 'var(--negative)' : (meta?.color ?? 'var(--ink-faint)')
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: isActive ? 1 : 0.3 }}>
                            {meta?.icon
                              ? <img src={statIconUrl(meta.icon)} alt="" width={11} height={11} style={{ objectFit: 'contain', flexShrink: 0 }} />
                              : <span style={{ width: 11, flexShrink: 0 }} />
                            }
                            <span style={{ color: clr, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', flexShrink: 0 }}>
                              {fmtValue(e.min, e.max, t('range_sep_neg'))}
                            </span>
                            <span style={{ color: meta?.color ?? 'var(--ink-faint)', fontSize: 10, opacity: 0.8 }}>
                              {meta ? t(meta.tKey) : e.stat}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export function ItemCatalog({ slot, slotId, onClose }: Props) {
  const { t }     = useTranslation()
  const equipment = useDataStore(s => s.equipment)
  const setsData  = useDataStore(s => s.sets)
  const equipItem   = useBuildStore(s => s.equipItem)
  const unequipItem = useBuildStore(s => s.unequipItem)
  const currentId   = useBuildStore(s => s.equipped[slotId])
  const equipped    = useBuildStore(s => s.equipped)

  const slotLabel = t(slotTKey(slotId))

  const { setMap, itemSetMap } = useMemo(() => {
    const setMap     = new Map<number, AppSet>()
    const itemSetMap = new Map<number, AppSet>()
    for (const s of setsData ?? []) {
      setMap.set(s.ankama_id, s)
      for (const id of s.items) itemSetMap.set(id, s)
    }
    return { setMap, itemSetMap }
  }, [setsData])

  const equippedIds = useMemo(
    () => new Set(Object.values(equipped).filter((v): v is number => v != null)),
    [equipped]
  )

  const slotSets = useMemo(() => {
    const ids = new Set<number>()
    const out: AppSet[] = []
    for (const it of equipment ?? []) {
      if (!matchesSlot(it, slot) || it.set_id == null) continue
      if (!ids.has(it.set_id)) {
        ids.add(it.set_id)
        const s = setMap.get(it.set_id)
        if (s) out.push(s)
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }, [equipment, slot, setMap])

  const slotStats = useMemo(() => {
    const seen = new Set<string>()
    for (const it of equipment ?? []) {
      for (const e of it.effects) {
        if (!isIgnored(e.stat)) seen.add(e.stat)
      }
    }
    return [...seen].sort((a, b) => {
      const la = STAT_META[a] ? t(STAT_META[a].tKey) : a
      const lb = STAT_META[b] ? t(STAT_META[b].tKey) : b
      return la.localeCompare(lb)
    })
  }, [equipment, t])

  const { isFav, toggle: toggleFav, favCount } = useFavorites()

  const [search,     setSearch]     = useState('')
  const [minLevel,   setMinLevel]   = useState(0)
  const [maxLevel,   setMaxLevel]   = useState(200)
  const [elem,       setElem]       = useState<ElemFilter>('all')
  const [sort,       setSort]       = useState<SortKey>('level-desc')
  const [setFilter,  setSetFilter]  = useState<AppSet | null>(null)
  const [statFilter, setStatFilter] = useState<string[]>([])
  const [favsOnly,   setFavsOnly]   = useState(false)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [setModal,   setSetModal]   = useState<AppSet | null>(null)

  const availableTypes = useMemo(() => {
    const seen = new Set<string>()
    for (const it of equipment ?? []) {
      if (matchesSlot(it, slot)) seen.add(it.type)
    }
    const types = [...seen]
    return types.length > 1 ? types.sort() : []
  }, [equipment, slot])

  const hasTypeFilter = availableTypes.length > 0

  const items = useMemo<AppItem[]>(() => {
    if (!equipment) return []
    const nameSearch = search.trim().toLowerCase()
    const filtered = equipment.filter(it =>
      matchesSlot(it, slot) &&
      it.level >= minLevel &&
      it.level <= maxLevel &&
      itemMatchesElement(it, elem) &&
      (setFilter  == null || it.set_id === setFilter.ankama_id) &&
      (statFilter.length === 0 || statFilter.every(s => it.effects.some(e => e.stat === s))) &&
      (!favsOnly  || isFav(it.ankama_id)) &&
      (nameSearch === '' || it.name.toLowerCase().includes(nameSearch)) &&
      (nameSearch !== '' || !hasTypeFilter || typeFilter == null || it.type === typeFilter)
    )
    if (sort === 'level-desc') return [...filtered].sort((a, b) => b.level - a.level)
    if (sort === 'level-asc')  return [...filtered].sort((a, b) => a.level - b.level)
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [equipment, slot, minLevel, maxLevel, search, elem, sort, setFilter, statFilter, favsOnly, isFav, typeFilter, hasTypeFilter])

  const handlePick = useCallback((item: AppItem) => {
    equipItem(slotId, item.ankama_id)
    onClose()
  }, [equipItem, slotId, onClose])

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [onClose])

  const SORT_LABELS: Record<SortKey, string> = { 'level-desc': 'Lv ↓', 'level-asc': 'Lv ↑', 'name-az': 'A–Z' }

  return (
    <>
    <div
      className="fixed inset-0 z-50"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal
      aria-label={slotLabel}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{ position: 'fixed', top: 32, left: 48, right: 48, bottom: 32, background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--metal-edge)' }}
        >
          <h3 className="font-display text-forge-gold font-bold text-base tracking-wide">
            {slotLabel}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-ink-faint font-mono">
              {items.length} {t('item_count', { count: items.length }).replace(/\d+\s*/, '')}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center transition-colors text-lg leading-none text-ink-muted hover:text-ink"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--metal-edge)' }}
              aria-label="Close"
            >×</button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 space-y-2.5" style={{ borderBottom: '1px solid var(--metal-edge)' }}>
          <input
            type="search"
            placeholder={t('search_items')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="w-full rounded-lg px-3 py-2 text-sm text-forge-text placeholder:text-ink-faint focus:outline-none transition-colors"
            style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
            onBlur={e =>  (e.currentTarget.style.borderColor = 'var(--metal-edge)')}
          />

          <div className="flex items-center gap-1 flex-wrap">
            {ELEM_FILTERS.map(({ filter, i18nKey, activeClass, label, iconName, color }) => {
              const isActive     = elem === filter
              const displayLabel = label ?? t(i18nKey)
              return (
                <button
                  key={filter}
                  onClick={() => setElem(filter)}
                  className={[
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] border transition-colors font-medium',
                    isActive
                      ? activeClass
                      : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-gold-deep',
                  ].join(' ')}
                >
                  {iconName && (
                    <img
                      src={statIconUrl(iconName)}
                      alt=""
                      width={14}
                      height={14}
                      className="object-contain flex-shrink-0"
                      style={isActive && color ? { filter: `drop-shadow(0 0 3px ${color}88)` } : undefined}
                    />
                  )}
                  <span style={isActive && color ? { color } : undefined}>{displayLabel}</span>
                </button>
              )
            })}

            {slotSets.length > 0 && (
              <SetSearch sets={slotSets} selected={setFilter} onSelect={setSetFilter} />
            )}

            <div className="ml-auto flex gap-1">
              <button
                onClick={() => setFavsOnly(v => !v)}
                className={[
                  'px-2.5 py-1 rounded-md text-[11px] border transition-colors font-medium flex items-center gap-1',
                  favsOnly
                    ? 'filter-btn-active'
                    : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-gold-deep',
                ].join(' ')}
              >
                ★{favCount > 0 && <span className="font-mono">{favCount}</span>}
              </button>
              {(Object.keys(SORT_LABELS) as SortKey[]).map(sk => (
                <button
                  key={sk}
                  onClick={() => setSort(sk)}
                  className={[
                    'px-2.5 py-1 rounded-md text-[11px] border transition-colors font-medium',
                    sort === sk
                      ? 'filter-btn-active'
                      : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-gold-deep',
                  ].join(' ')}
                >{SORT_LABELS[sk]}</button>
              ))}
            </div>
          </div>

          {hasTypeFilter && (
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setTypeFilter(null)}
                className={[
                  'px-2.5 py-1 rounded-md text-[11px] border transition-colors font-medium',
                  typeFilter === null
                    ? 'filter-btn-active'
                    : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-gold-deep',
                ].join(' ')}
              >
                {t('elem_all')}
              </button>
              {availableTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                  className={[
                    'px-2.5 py-1 rounded-md text-[11px] border transition-colors font-medium',
                    typeFilter === type
                      ? 'filter-btn-active'
                      : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-gold-deep',
                  ].join(' ')}
                >
                  {t(`item_type_${type}`, { defaultValue: type })}
                </button>
              ))}
              {search.trim() !== '' && typeFilter !== null && (
                <span className="text-[10px] text-ink-faint ml-1">· {t('elem_all')}</span>
              )}
            </div>
          )}

          <div className="flex gap-2 text-xs text-forge-muted items-center flex-wrap">
            {slotStats.length > 0 && (
              <StatFilter stats={slotStats} selected={statFilter} onSelect={setStatFilter} />
            )}
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
        </div>

        {/* Card grid */}
        <div className="overflow-y-auto flex-1 p-4">
          {items.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-forge-muted text-sm">{t('no_items')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(item => {
                const isEquipped = item.ankama_id === currentId
                const itemSet    = item.set_id != null ? itemSetMap.get(item.ankama_id) : undefined
                const effects    = item.effects.filter(e => !isIgnored(e.stat))

                return (
                  <button
                    key={item.ankama_id}
                    onClick={() => handlePick(item)}
                    className="text-left relative rounded-xl overflow-hidden w-full group"
                    style={{
                      background: isEquipped
                        ? 'linear-gradient(145deg, var(--surface-parchment), var(--surface-void))'
                        : 'var(--surface-void)',
                      border: isEquipped
                        ? '1px solid color-mix(in srgb, var(--gold) 45%, transparent)'
                        : '1px solid var(--metal-edge)',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      if (isEquipped) el.style.borderColor = 'color-mix(in srgb, var(--gold) 70%, transparent)'
                      else el.style.background = 'var(--surface-panel)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      if (isEquipped) el.style.borderColor = 'color-mix(in srgb, var(--gold) 45%, transparent)'
                      else el.style.background = 'var(--surface-void)'
                    }}
                  >
                    {/* Card header: image + name + level + fav */}
                    <div className="flex gap-3 p-4 pb-3">
                      <div
                        className="w-24 h-24 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                        style={{
                          background: 'linear-gradient(145deg, var(--surface-panel), var(--surface-stone))',
                          border: isEquipped
                            ? '1px solid color-mix(in srgb, var(--gold) 40%, transparent)'
                            : '1px solid var(--metal-edge)',
                          boxShadow: isEquipped
                            ? 'inset 0 0 12px color-mix(in srgb, var(--gold) 8%, transparent)'
                            : 'none',
                        }}
                      >
                        {item.image_url
                          ? <img src={item.image_url} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
                          : <span className="text-ink-faint text-xl">{slot.icon}</span>
                        }
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <p
                          className="font-semibold text-base leading-tight"
                          style={{
                            color: isEquipped ? 'var(--gold)' : 'var(--ink)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          } as React.CSSProperties}
                        >
                          {item.name}
                          {isEquipped && <span className="ml-1 text-[10px]" style={{ color: 'var(--gold)', opacity: 0.6 }}>✓</span>}
                        </p>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                          Lv {item.level}
                        </p>
                        {itemSet && (
                          <span
                            role="button"
                            tabIndex={-1}
                            className="text-[12px] font-medium truncate block cursor-pointer hover:underline"
                            style={{ color: 'var(--water)' }}
                            onClick={e => { e.stopPropagation(); setSetModal(itemSet) }}
                          >
                            {itemSet.name}
                          </span>
                        )}
                      </div>

                      {/* Fav star */}
                      <span
                        role="button"
                        tabIndex={-1}
                        className="text-[18px] leading-none flex-shrink-0 transition-colors select-none mt-0.5 cursor-pointer"
                        style={{ color: isFav(item.ankama_id) ? 'var(--gold)' : 'var(--metal-edge)' }}
                        onMouseEnter={e => {
                          if (!isFav(item.ankama_id))
                            (e.currentTarget as HTMLElement).style.color = 'var(--gold-deep)'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.color =
                            isFav(item.ankama_id) ? 'var(--gold)' : 'var(--metal-edge)'
                        }}
                        onClick={e => { e.stopPropagation(); toggleFav(item.ankama_id) }}
                      >★</span>
                    </div>

                    {/* Special passive ability */}
                    {item.ability && (
                      <div className="px-3 pb-2">
                        <div style={{
                          background:   'color-mix(in srgb, var(--gold) 10%, transparent)',
                          border:       '1px solid color-mix(in srgb, var(--gold) 35%, transparent)',
                          borderRadius: 6,
                          padding:      '6px 8px',
                        }}>
                          {item.ability.split('\n').filter(Boolean).map((line, i) => (
                            <p key={i} style={{ fontSize: 12, color: i === 0 ? 'var(--gold)' : 'var(--gold-deep)', lineHeight: 1.5, margin: i > 0 ? '2px 0 0' : 0 }}>
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    {effects.length > 0 && (
                      <div
                        className="px-3 pb-2"
                        style={{ borderTop: '1px solid var(--metal-edge)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}
                      >
                        {effects.map((e, i) => {
                          const meta  = STAT_META[e.stat]
                          const isNeg = e.min < 0
                          const clr   = isNeg ? 'var(--negative)' : (meta?.color ?? 'var(--ink-faint)')
                          const val   = fmtValue(e.min, e.max, t('range_sep_neg'))
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {meta?.icon
                                ? <img src={statIconUrl(meta.icon)} alt="" width={15} height={15} style={{ objectFit: 'contain', flexShrink: 0 }} />
                                : <span style={{ width: 15, flexShrink: 0 }} />
                              }
                              <span style={{ color: clr, fontSize: 13, fontWeight: 700, fontFamily: 'monospace', flexShrink: 0 }}>
                                {val}
                              </span>
                              <span style={{ color: isNeg ? 'var(--negative)' : (meta?.color ?? 'var(--ink-faint)'), fontSize: 13, lineHeight: 1.3, opacity: 0.7 }}>
                                {meta ? t(meta.tKey) : e.stat}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Lore description */}
                    {item.description && (
                      <div
                        className="px-3 pb-3"
                        style={{
                          borderTop:  (effects.length > 0 || item.ability) ? '1px solid var(--metal-edge)' : undefined,
                          paddingTop: (effects.length > 0 || item.ability) ? 7 : 4,
                        }}
                      >
                        <p style={{ fontSize: 12, color: 'var(--ink-muted)', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
                          {item.description}
                        </p>
                      </div>
                    )}
                  </button>
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
          <span>Esc · close</span>
          <span>{items.length} items</span>
        </div>
      </div>
    </div>
    {setModal && (
      <SetDetailModal
        set={setModal}
        equipment={equipment ?? []}
        equippedIds={equippedIds}
        onEquip={(item) => {
          const matching = SLOT_CONFIGS.filter(cfg => matchesSlot(item, cfg))
          if (matching.length === 0) return
          const empty  = matching.find(cfg => equipped[cfg.id] == null)
          const target = empty ?? matching[0]
          equipItem(target.id, item.ankama_id)
        }}
        onUnequip={(item) => {
          const sid = (Object.entries(equipped) as [SlotId, number | null][])
            .find(([, id]) => id === item.ankama_id)?.[0]
          if (sid) unequipItem(sid)
        }}
        onClose={() => setSetModal(null)}
      />
    )}
    </>
  )
}
