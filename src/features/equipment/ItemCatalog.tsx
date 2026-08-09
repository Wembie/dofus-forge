import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDataStore } from '@/store/dataStore.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import type { SlotId } from '@/store/buildStore.ts'
import type { SlotConfig } from './slotConfig.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import { itemMatchesElement, ELEM_FILTERS, type ElemFilter } from './itemElement.ts'
import { STAT_META, isIgnored, fmtValue, statIconUrl } from './statDisplay.ts'
import { useFavorites } from '@/store/useFavorites.ts'

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
  const { t }           = useTranslation()
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
        <span className="truncate">{meta ? t(meta.tKey) : selected}</span>
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
                  <span style={{ color: clr }}>{meta ? t(meta.tKey) : stat}</span>
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
  const currentId = useBuildStore(s => s.equipped[slotId])

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
      if (!matchesSlot(it, slot)) continue
      for (const e of it.effects) {
        if (!isIgnored(e.stat) && STAT_META[e.stat]) seen.add(e.stat)
      }
    }
    return [...seen].sort((a, b) => {
      const la = STAT_META[a] ? t(STAT_META[a].tKey) : a
      const lb = STAT_META[b] ? t(STAT_META[b].tKey) : b
      return la.localeCompare(lb)
    })
  }, [equipment, slot, t])

  const { isFav, toggle: toggleFav, favCount } = useFavorites()

  const [search,     setSearch]     = useState('')
  const [minLevel,   setMinLevel]   = useState(0)
  const [maxLevel,   setMaxLevel]   = useState(200)
  const [elem,       setElem]       = useState<ElemFilter>('all')
  const [sort,       setSort]       = useState<SortKey>('level-desc')
  const [setFilter,  setSetFilter]  = useState<AppSet | null>(null)
  const [statFilter, setStatFilter] = useState<string | null>(null)
  const [favsOnly,   setFavsOnly]   = useState(false)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  // Auto-detect all distinct types present in this slot's data
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
      (statFilter == null || it.effects.some(e => e.stat === statFilter)) &&
      (!favsOnly  || isFav(it.ankama_id)) &&
      // name search is global across all types; type filter only applies when no name search
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
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [onClose])

  const SORT_LABELS: Record<SortKey, string> = { 'level-desc': 'Lv ↓', 'level-asc': 'Lv ↑', 'name-az': 'A–Z' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal
      aria-label={slotLabel}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-4xl flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: '#0f1320',
          border:     '1px solid #2a3347',
          maxHeight:  '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{
            background:   'linear-gradient(180deg, #1a2035 0%, #141929 100%)',
            borderBottom: '1px solid #2a3347',
          }}
        >
          <h3 className="font-display text-forge-gold font-bold text-base tracking-wide">
            {slotLabel}
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
          <input
            type="search"
            placeholder={t('search_items')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="w-full rounded-lg px-3 py-2 text-sm text-forge-text placeholder:text-forge-muted/40 focus:outline-none transition-colors"
            style={{ background: '#161b26', border: '1px solid #2a3347' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#c9a84c66')}
            onBlur={e =>  (e.currentTarget.style.borderColor = '#2a3347')}
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

          {/* Type filter tabs — auto-shown for any slot with >1 distinct item types */}
          {hasTypeFilter && (
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setTypeFilter(null)}
                className={[
                  'px-2.5 py-1 rounded-md text-[11px] border transition-colors font-medium',
                  typeFilter === null
                    ? 'border-forge-gold bg-forge-gold/10 text-forge-gold'
                    : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-forge-gold/40',
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
                      ? 'border-forge-gold bg-forge-gold/10 text-forge-gold'
                      : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-forge-gold/40',
                  ].join(' ')}
                >
                  {t(`item_type_${type}`, { defaultValue: type })}
                </button>
              ))}
              {search.trim() !== '' && typeFilter !== null && (
                <span className="text-[10px] text-forge-muted/50 ml-1">· {t('elem_all')}</span>
              )}
            </div>
          )}

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
                      background:  isEquipped
                        ? 'linear-gradient(145deg, #1c1530, #0d0b1e)'
                        : '#0d1120',
                      border:      isEquipped
                        ? '1px solid rgba(201,168,76,0.45)'
                        : '1px solid #1c2333',
                      transition:  'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = isEquipped ? 'rgba(201,168,76,0.7)' : '#2a3347'
                      if (!isEquipped) el.style.background = '#101525'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = isEquipped ? 'rgba(201,168,76,0.45)' : '#1c2333'
                      if (!isEquipped) el.style.background = '#0d1120'
                    }}
                  >
                    {/* Card header: image + name + level + fav */}
                    <div className="flex gap-2.5 p-3 pb-2">
                      <div
                        className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                        style={{
                          background: 'linear-gradient(145deg, #1a1f30, #0f1220)',
                          border:     isEquipped ? '1px solid #c9a84c55' : '1px solid #1c2333',
                        }}
                      >
                        {item.image_url
                          ? <img src={item.image_url} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
                          : <span className="text-forge-muted/40 text-xl">{slot.icon}</span>
                        }
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <p
                          className="font-semibold text-[12px] leading-tight"
                          style={{
                            color: isEquipped ? '#c9a84c' : '#e8eaf0',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          } as React.CSSProperties}
                        >
                          {item.name}
                          {isEquipped && <span className="ml-1 text-[10px]" style={{ color: '#c9a84c99' }}>✓</span>}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#4a5268' }}>
                          Lv {item.level}
                        </p>
                        {itemSet && (
                          <p className="text-[10px] font-medium truncate" style={{ color: '#4a8fcc' }}>
                            {itemSet.name}
                          </p>
                        )}
                      </div>

                      {/* Fav star */}
                      <span
                        role="button"
                        tabIndex={-1}
                        className="text-[14px] leading-none flex-shrink-0 transition-colors select-none mt-0.5"
                        style={{ color: isFav(item.ankama_id) ? '#c9a84c' : '#2a3347' }}
                        onMouseEnter={e => {
                          if (!isFav(item.ankama_id))
                            (e.currentTarget as HTMLElement).style.color = '#5a4a20'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.color =
                            isFav(item.ankama_id) ? '#c9a84c' : '#2a3347'
                        }}
                        onClick={e => { e.stopPropagation(); toggleFav(item.ankama_id) }}
                      >★</span>
                    </div>

                    {/* Stats — all of them */}
                    {effects.length > 0 && (
                      <div
                        className="px-3 pb-3"
                        style={{
                          borderTop:  '1px solid #131a28',
                          paddingTop: 8,
                          display:    'flex',
                          flexDirection: 'column',
                          gap: 3,
                        }}
                      >
                        {effects.map((e, i) => {
                          const meta  = STAT_META[e.stat]
                          const isNeg = e.min < 0
                          const clr   = isNeg ? '#f87171' : (meta?.color ?? '#4a5268')
                          const val   = fmtValue(e.min, e.max)
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {meta?.icon
                                ? <img
                                    src={statIconUrl(meta.icon)}
                                    alt=""
                                    width={11}
                                    height={11}
                                    style={{ objectFit: 'contain', flexShrink: 0, filter: `drop-shadow(0 0 2px ${clr}44)` }}
                                  />
                                : <span style={{ width: 11, flexShrink: 0 }} />
                              }
                              <span style={{ color: clr, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', flexShrink: 0, tabularNums: true } as React.CSSProperties}>
                                {val}
                              </span>
                              <span style={{ color: isNeg ? '#f87171cc' : meta?.color ? `${meta.color}bb` : '#4a5268', fontSize: 10, lineHeight: 1.3 }}>
                                {meta ? t(meta.tKey) : e.stat}
                              </span>
                            </div>
                          )
                        })}
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
          style={{ borderTop: '1px solid #1a1f2e', color: '#3a4268' }}
        >
          <span>Esc · close</span>
          <span>{items.length} items</span>
        </div>
      </div>
    </div>
  )
}
