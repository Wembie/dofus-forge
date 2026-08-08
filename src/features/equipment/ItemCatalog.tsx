import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDataStore } from '@/store/dataStore.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import type { SlotId } from '@/store/buildStore.ts'
import type { SlotConfig } from './slotConfig.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import { itemMatchesElement, ELEM_FILTERS, type ElemFilter } from './itemElement.ts'
import { useVirtualList } from '@/ui/useVirtualList.ts'
import { STAT_META, isIgnored, fmtValue, statIconUrl } from './statDisplay.ts'
import { useFavorites } from '@/store/useFavorites.ts'

const ROW_HEIGHT = 72

type SortKey = 'level-desc' | 'level-asc' | 'name-az'

type Props = {
  slot:    SlotConfig
  slotId:  SlotId
  onClose: () => void
}

const LEVELS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200]

function statDelta(candidate: AppItem, current: AppItem) {
  const sum = (item: AppItem) => {
    const m = new Map<string, number>()
    for (const e of item.effects) {
      if (!isIgnored(e.stat)) m.set(e.stat, (m.get(e.stat) ?? 0) + e.min)
    }
    return m
  }
  const cMap = sum(candidate)
  const eMap = sum(current)
  const all  = new Set([...cMap.keys(), ...eMap.keys()])
  const out: Array<{ stat: string; delta: number; hasMeta: boolean }> = []
  for (const stat of all) {
    const d = (cMap.get(stat) ?? 0) - (eMap.get(stat) ?? 0)
    if (d !== 0) out.push({ stat, delta: d, hasMeta: Boolean(STAT_META[stat]) })
  }
  // Sort: known stats with biggest abs delta first, then unknowns
  return out
    .sort((a, b) => {
      if (a.hasMeta !== b.hasMeta) return a.hasMeta ? -1 : 1
      return Math.abs(b.delta) - Math.abs(a.delta)
    })
    .slice(0, 6)
}

function SetSearch({
  sets, selected, onSelect,
}: { sets: AppSet[]; selected: AppSet | null; onSelect: (s: AppSet | null) => void }) {
  const [q, setQ]           = useState('')
  const [open, setOpen]     = useState(false)
  const inputRef            = useRef<HTMLInputElement>(null)

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
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border border-forge-gold/50 bg-forge-gold/10 text-forge-gold font-medium cursor-pointer"
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
            className="w-full rounded-md px-2.5 py-1 text-[11px] text-forge-text placeholder:text-forge-muted/40 focus:outline-none"
            style={{ background: '#161b26', border: '1px solid #2a3347' }}
          />
          {open && matches.length > 0 && (
            <ul
              className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-50 shadow-xl"
              style={{ background: '#131824', border: '1px solid #2a3347', maxHeight: 220, overflowY: 'auto' }}
            >
              {matches.map(s => (
                <li key={s.ankama_id}>
                  <button
                    className="w-full text-left px-3 py-1.5 text-[11px] text-forge-text hover:bg-white/5 transition-colors"
                    onMouseDown={() => pick(s)}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-1.5 text-forge-muted/50 text-[10px]">{s.items.length}pc</span>
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

function StatFilter({
  stats, selected, onSelect,
}: { stats: string[]; selected: string | null; onSelect: (s: string | null) => void }) {
  const [q, setQ]       = useState('')
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    if (!q) return stats.slice(0, 14)
    const lq = q.toLowerCase()
    return stats.filter(s => s.toLowerCase().includes(lq)).slice(0, 14)
  }, [stats, q])

  function pick(s: string | null) {
    onSelect(s)
    setOpen(false)
    setQ('')
  }

  if (selected) {
    const meta = STAT_META[selected]
    const clr  = meta?.color ?? '#7a8499'
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border font-medium cursor-pointer"
        style={{ borderColor: `${clr}50`, background: `${clr}15`, color: clr }}
        onClick={() => pick(null)}
      >
        {meta?.icon && (
          <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain" />
        )}
        <span className="truncate">{meta?.label ?? selected}</span>
        <span className="ml-auto flex-shrink-0 opacity-60">✕</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={q}
        placeholder="Stat…"
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-md px-2.5 py-1 text-[11px] text-forge-text placeholder:text-forge-muted/40 focus:outline-none"
        style={{ background: '#161b26', border: '1px solid #2a3347', minWidth: 70 }}
      />
      {open && matches.length > 0 && (
        <ul
          className="absolute left-0 top-full mt-1 rounded-lg overflow-hidden z-50 shadow-xl"
          style={{ background: '#131824', border: '1px solid #2a3347', maxHeight: 220, overflowY: 'auto', minWidth: 160 }}
        >
          {matches.map(stat => {
            const meta = STAT_META[stat]
            const clr  = meta?.color ?? '#7a8499'
            return (
              <li key={stat}>
                <button
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/5 transition-colors flex items-center gap-2"
                  onMouseDown={() => pick(stat)}
                >
                  {meta?.icon && (
                    <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain flex-shrink-0" />
                  )}
                  <span style={{ color: clr }}>{meta?.label ?? stat}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function ItemCatalog({ slot, slotId, onClose }: Props) {
  const { t }     = useTranslation()
  const equipment = useDataStore(s => s.equipment)
  const setsData  = useDataStore(s => s.sets)
  const equipItem = useBuildStore(s => s.equipItem)

  const currentId   = useBuildStore(s => s.equipped[slotId])
  const currentItem = useMemo(
    () => currentId != null ? (equipment ?? []).find(it => it.ankama_id === currentId) : undefined,
    [currentId, equipment],
  )

  // Build set lookup maps
  const { setMap, itemSetMap } = useMemo(() => {
    const setMap     = new Map<number, AppSet>()
    const itemSetMap = new Map<number, AppSet>()
    for (const s of setsData ?? []) {
      setMap.set(s.ankama_id, s)
      for (const id of s.items) itemSetMap.set(id, s)
    }
    return { setMap, itemSetMap }
  }, [setsData])

  // Sets that have at least one item for this slot
  const slotSets = useMemo(() => {
    const ids = new Set<number>()
    const out: AppSet[] = []
    for (const it of equipment ?? []) {
      if (it.slot !== slot.apiSlot || it.set_id == null) continue
      if (!ids.has(it.set_id)) {
        ids.add(it.set_id)
        const s = setMap.get(it.set_id)
        if (s) out.push(s)
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }, [equipment, slot.apiSlot, setMap])

  // Unique stats available in this slot (non-ignored, sorted by STAT_META label then raw)
  const slotStats = useMemo(() => {
    const seen = new Set<string>()
    for (const it of equipment ?? []) {
      if (it.slot !== slot.apiSlot) continue
      for (const e of it.effects) {
        if (!isIgnored(e.stat) && STAT_META[e.stat]) seen.add(e.stat)
      }
    }
    return [...seen].sort((a, b) => {
      const la = STAT_META[a]?.label ?? a
      const lb = STAT_META[b]?.label ?? b
      return la.localeCompare(lb)
    })
  }, [equipment, slot.apiSlot])

  const { isFav, toggle: toggleFav, favCount } = useFavorites()

  const [search,     setSearch]     = useState('')
  const [minLevel,   setMinLevel]   = useState(0)
  const [maxLevel,   setMaxLevel]   = useState(200)
  const [elem,       setElem]       = useState<ElemFilter>('all')
  const [sort,       setSort]       = useState<SortKey>('level-desc')
  const [setFilter,  setSetFilter]  = useState<AppSet | null>(null)
  const [statFilter, setStatFilter] = useState<string | null>(null)
  const [favsOnly,   setFavsOnly]   = useState(false)
  const [activeIdx,  setActiveIdx]  = useState(-1)
  const activeIdxRef                = useRef(-1)

  useEffect(() => { activeIdxRef.current = activeIdx }, [activeIdx])

  const items = useMemo<AppItem[]>(() => {
    if (!equipment) return []
    const filtered = equipment.filter(it =>
      it.slot === slot.apiSlot &&
      it.level >= minLevel &&
      it.level <= maxLevel &&
      itemMatchesElement(it, elem) &&
      (setFilter  == null || it.set_id === setFilter.ankama_id) &&
      (statFilter == null || it.effects.some(e => e.stat === statFilter)) &&
      (!favsOnly || isFav(it.ankama_id)) &&
      (search === '' || it.name.toLowerCase().includes(search.toLowerCase()))
    )
    if (sort === 'level-desc') return [...filtered].sort((a, b) => b.level - a.level)
    if (sort === 'level-asc')  return [...filtered].sort((a, b) => a.level - b.level)
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [equipment, slot.apiSlot, minLevel, maxLevel, search, elem, sort, setFilter, statFilter, favsOnly, isFav])

  useEffect(() => { setActiveIdx(-1) }, [items])

  const { containerRef, onScroll, visibleItems, paddingTop, paddingBottom, startIdx } =
    useVirtualList(items, ROW_HEIGHT)

  useEffect(() => {
    const el = containerRef.current
    if (!el || activeIdx < 0) return
    const top = activeIdx * ROW_HEIGHT
    const bot = top + ROW_HEIGHT
    if (top < el.scrollTop) el.scrollTop = top
    else if (bot > el.scrollTop + el.clientHeight) el.scrollTop = bot - el.clientHeight
  }, [activeIdx, containerRef])

  const handlePick = useCallback((item: AppItem) => {
    equipItem(slotId, item.ankama_id)
    onClose()
  }, [equipItem, slotId, onClose])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape')    { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(items.length - 1, i + 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)) }
      if (e.key === 'Enter') {
        const item = items[activeIdxRef.current]
        if (item) handlePick(item)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [items, handlePick, onClose])

  const SORT_LABELS: Record<SortKey, string> = { 'level-desc': 'Lv ↓', 'level-asc': 'Lv ↑', 'name-az': 'A–Z' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal
      aria-label={`Select ${slot.label}`}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: '#0f1320',
          border:     '1px solid #2a3347',
          maxHeight:  '88vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{
            background:  'linear-gradient(180deg, #1a2035 0%, #141929 100%)',
            borderBottom: '1px solid #2a3347',
          }}
        >
          <h3 className="font-display text-forge-gold font-bold text-base tracking-wide">
            {slot.label}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-forge-muted/60 font-mono">
              {items.length} {t('item_count', { count: items.length }).replace(/\d+\s*/, '')}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center transition-colors text-lg leading-none"
              style={{ background: '#1c2333', border: '1px solid #2a3347', color: '#7a8499' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e8eaf0' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#7a8499' }}
              aria-label="Close"
            >×</button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 space-y-2.5" style={{ borderBottom: '1px solid #1c2333' }}>
          {/* Search */}
          <input
            type="search"
            placeholder={t('search_items')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="w-full rounded-lg px-3 py-2 text-sm text-forge-text placeholder:text-forge-muted/40 focus:outline-none transition-colors"
            style={{
              background:   '#161b26',
              border:       '1px solid #2a3347',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#c9a84c66')}
            onBlur={e =>  (e.currentTarget.style.borderColor = '#2a3347')}
          />

          {/* Element + sort + set */}
          <div className="flex items-center gap-1 flex-wrap">
            {ELEM_FILTERS.map(({ filter, i18nKey, activeClass, label, iconName, color }) => {
              const isActive = elem === filter
              const displayLabel = label ?? t(i18nKey)
              return (
                <button
                  key={filter}
                  onClick={() => setElem(filter)}
                  className={[
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] border transition-colors font-medium',
                    isActive
                      ? activeClass
                      : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-forge-gold/40',
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
                    ? 'border-forge-gold bg-forge-gold/10 text-forge-gold'
                    : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-forge-gold/40',
                ].join(' ')}
                title="Show favorites only"
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
                      ? 'border-forge-gold bg-forge-gold/10 text-forge-gold'
                      : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-forge-gold/40',
                  ].join(' ')}
                >{SORT_LABELS[sk]}</button>
              ))}
            </div>
          </div>

          {/* Stat + level range */}
          <div className="flex gap-2 text-xs text-forge-muted items-center flex-wrap">
            {slotStats.length > 0 && (
              <StatFilter stats={slotStats} selected={statFilter} onSelect={setStatFilter} />
            )}
            <span className="text-forge-muted/60 flex-shrink-0">{t('level_range')}</span>
            <select
              value={minLevel}
              onChange={e => setMinLevel(Number(e.target.value))}
              className="rounded px-2 py-1 text-forge-text text-xs focus:outline-none"
              style={{ background: '#161b26', border: '1px solid #2a3347' }}
            >
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <span className="text-forge-muted/40">–</span>
            <select
              value={maxLevel}
              onChange={e => setMaxLevel(Number(e.target.value))}
              className="rounded px-2 py-1 text-forge-text text-xs focus:outline-none"
              style={{ background: '#161b26', border: '1px solid #2a3347' }}
            >
              {LEVELS.map(l => <option key={l} value={l}>{l === 0 ? '—' : l}</option>)}
            </select>
          </div>
        </div>

        {/* Item list */}
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <p className="text-forge-muted text-sm">{t('no_items')}</p>
          </div>
        ) : (
          <ul
            ref={containerRef}
            onScroll={onScroll}
            className="overflow-y-auto flex-1"
            role="listbox"
            aria-label={slot.label}
          >
            <li aria-hidden style={{ height: paddingTop }} />
            {visibleItems.map((item, i) => {
              const absoluteIdx   = startIdx + i
              const isHighlighted = absoluteIdx === activeIdx
              const isEquipped    = item.ankama_id === currentId
              const delta         = currentItem && !isEquipped ? statDelta(item, currentItem) : []

              return (
                <li
                  key={item.ankama_id}
                  role="option"
                  aria-selected={isEquipped}
                  style={{ borderBottom: '1px solid #1a1f2e' }}
                >
                  <button
                    className="w-full flex items-center gap-3 px-4 transition-colors text-left relative"
                    style={{
                      height:     ROW_HEIGHT,
                      background: isHighlighted || isEquipped
                        ? 'linear-gradient(90deg, #1c2333 0%, #161b2680 100%)'
                        : 'transparent',
                    }}
                    onClick={() => handlePick(item)}
                    onMouseEnter={() => setActiveIdx(absoluteIdx)}
                  >
                    {/* Fav star */}
                    <span
                      role="button"
                      tabIndex={-1}
                      title={isFav(item.ankama_id) ? 'Remove from favorites' : 'Add to favorites'}
                      className="absolute top-1 right-1 z-10 text-[13px] leading-none transition-colors select-none"
                      style={{ color: isFav(item.ankama_id) ? '#c9a84c' : '#2a3347' }}
                      onMouseEnter={e => {
                        if (!isFav(item.ankama_id)) (e.currentTarget as HTMLElement).style.color = '#5a4a20'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLElement).style.color = isFav(item.ankama_id) ? '#c9a84c' : '#2a3347'
                      }}
                      onClick={e => { e.stopPropagation(); toggleFav(item.ankama_id) }}
                    >★</span>
                    {/* Item image */}
                    <div
                      className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                      style={{
                        width:   52,
                        height:  52,
                        background: 'linear-gradient(145deg, #1a1f30, #0f1220)',
                        border:  isEquipped ? '1px solid #c9a84c55' : '1px solid #1c2333',
                      }}
                    >
                      {item.image_url
                        ? <img src={item.image_url} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
                        : <span className="text-forge-muted/40 text-xl">{slot.icon}</span>
                      }
                    </div>

                    {/* Name + level + set */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate leading-tight ${isEquipped ? 'text-forge-gold' : 'text-forge-text'}`}>
                        {item.name}
                        {isEquipped && <span className="ml-1.5 text-[10px] text-forge-gold/70">✓ equipped</span>}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px]" style={{ color: '#4a5268' }}>Lv {item.level}</span>
                        {item.set_id != null && itemSetMap.get(item.ankama_id) && (
                          <span
                            className="text-[10px] truncate font-medium"
                            style={{ color: '#7a6030' }}
                            title={itemSetMap.get(item.ankama_id)!.name}
                          >
                            · {itemSetMap.get(item.ankama_id)!.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats / delta */}
                    <div className="text-right space-y-0.5 flex-shrink-0 max-w-[150px]">
                      {delta.length > 0
                        ? delta.map((d, di) => {
                            const meta  = STAT_META[d.stat]
                            const isPos = d.delta > 0
                            const clr   = isPos ? '#4ade80' : '#f87171'
                            return (
                              <div key={di} className="flex items-center justify-end gap-1">
                                {meta?.icon && (
                                  <img src={statIconUrl(meta.icon)} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
                                )}
                                <span className="font-mono font-bold tabular-nums" style={{ color: clr, fontSize: 11 }}>
                                  {isPos ? '+' : ''}{d.delta}
                                </span>
                                <span className="text-[10px] truncate" style={{ color: meta?.color ? `${meta.color}80` : '#3a4268' }}>
                                  {meta?.label ?? d.stat}
                                </span>
                              </div>
                            )
                          })
                        : (() => {
                            const visible = item.effects.filter(e => !isIgnored(e.stat))
                            const top4    = visible.slice(0, 4)
                            const rest    = visible.length - 4
                            return (
                              <>
                                {top4.map((e, ei) => {
                                  const meta = STAT_META[e.stat]
                                  const val  = fmtValue(e.min, e.max)
                                  const clr  = meta?.color ?? '#4a5268'
                                  return (
                                    <div key={ei} className="flex items-center justify-end gap-1">
                                      {meta?.icon && (
                                        <img src={statIconUrl(meta.icon)} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
                                      )}
                                      <span className="font-mono font-semibold truncate tabular-nums" style={{ color: clr, fontSize: 11 }}>
                                        {val}
                                      </span>
                                    </div>
                                  )
                                })}
                                {rest > 0 && (
                                  <p style={{ color: '#333a50', fontSize: 10 }}>+{rest} more</p>
                                )}
                              </>
                            )
                          })()
                      }
                    </div>
                  </button>
                </li>
              )
            })}
            <li aria-hidden style={{ height: paddingBottom }} />
          </ul>
        )}

        {/* Footer hint */}
        <div
          className="flex items-center justify-between px-4 py-2 text-[10px]"
          style={{ borderTop: '1px solid #1a1f2e', color: '#3a4268' }}
        >
          <span>↑↓ navigate · Enter select · Esc close</span>
          <span>{items.length} items</span>
        </div>
      </div>
    </div>
  )
}
