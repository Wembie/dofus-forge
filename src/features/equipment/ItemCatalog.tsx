import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDataStore } from '@/store/dataStore.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import type { SlotId } from '@/store/buildStore.ts'
import type { SlotConfig } from './slotConfig.ts'
import type { AppItem } from '@/data/loaders.ts'
import { itemMatchesElement, ELEM_FILTERS, type ElemFilter } from './itemElement.ts'
import { useVirtualList } from '@/ui/useVirtualList.ts'

const ROW_HEIGHT = 72

type SortKey = 'level-desc' | 'level-asc' | 'name-az'

type Props = {
  slot:    SlotConfig
  slotId:  SlotId
  onClose: () => void
}

const LEVELS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200]

function statDelta(candidate: AppItem, current: AppItem | undefined) {
  if (!current) return []
  const sum = (item: AppItem) => {
    const m = new Map<string, number>()
    for (const e of item.effects) m.set(e.stat, (m.get(e.stat) ?? 0) + e.min)
    return m
  }
  const cMap = sum(candidate)
  const eMap = sum(current)
  const all  = new Set([...cMap.keys(), ...eMap.keys()])
  const out: Array<{ stat: string; delta: number }> = []
  for (const stat of all) {
    const d = (cMap.get(stat) ?? 0) - (eMap.get(stat) ?? 0)
    if (d !== 0) out.push({ stat, delta: d })
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5)
}

export function ItemCatalog({ slot, slotId, onClose }: Props) {
  const { t }     = useTranslation()
  const equipment = useDataStore(s => s.equipment)
  const equipItem = useBuildStore(s => s.equipItem)

  const currentId   = useBuildStore(s => s.equipped[slotId])
  const currentItem = useMemo(
    () => currentId != null ? (equipment ?? []).find(it => it.ankama_id === currentId) : undefined,
    [currentId, equipment],
  )

  const [search,    setSearch]    = useState('')
  const [minLevel,  setMinLevel]  = useState(0)
  const [maxLevel,  setMaxLevel]  = useState(200)
  const [elem,      setElem]      = useState<ElemFilter>('all')
  const [sort,      setSort]      = useState<SortKey>('level-desc')
  const [activeIdx, setActiveIdx] = useState(-1)
  const activeIdxRef              = useRef(-1)

  useEffect(() => { activeIdxRef.current = activeIdx }, [activeIdx])

  const items = useMemo<AppItem[]>(() => {
    if (!equipment) return []
    const filtered = equipment.filter(it =>
      it.slot === slot.apiSlot &&
      it.level >= minLevel &&
      it.level <= maxLevel &&
      itemMatchesElement(it, elem) &&
      (search === '' || it.name.toLowerCase().includes(search.toLowerCase()))
    )
    if (sort === 'level-desc') return [...filtered].sort((a, b) => b.level - a.level)
    if (sort === 'level-asc')  return [...filtered].sort((a, b) => a.level - b.level)
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [equipment, slot.apiSlot, minLevel, maxLevel, search, elem, sort])

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

          {/* Element + sort */}
          <div className="flex items-center gap-1 flex-wrap">
            {ELEM_FILTERS.map(({ filter, i18nKey, activeClass }) => (
              <button
                key={filter}
                onClick={() => setElem(filter)}
                className={[
                  'px-2.5 py-1 rounded-md text-[11px] border transition-colors font-medium',
                  elem === filter
                    ? activeClass
                    : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-forge-gold/40',
                ].join(' ')}
              >{t(i18nKey)}</button>
            ))}

            <div className="ml-auto flex gap-1">
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

          {/* Level range */}
          <div className="flex gap-2 text-xs text-forge-muted items-center">
            <span className="text-forge-muted/60">{t('level_range')}</span>
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
              const delta         = statDelta(item, currentItem)

              return (
                <li
                  key={item.ankama_id}
                  role="option"
                  aria-selected={isEquipped}
                  style={{ borderBottom: '1px solid #1a1f2e' }}
                >
                  <button
                    className="w-full flex items-center gap-3 px-4 transition-colors text-left"
                    style={{
                      height:     ROW_HEIGHT,
                      background: isHighlighted || isEquipped
                        ? 'linear-gradient(90deg, #1c2333 0%, #161b2680 100%)'
                        : 'transparent',
                    }}
                    onClick={() => handlePick(item)}
                    onMouseEnter={() => setActiveIdx(absoluteIdx)}
                  >
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

                    {/* Name + level */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate leading-tight ${isEquipped ? 'text-forge-gold' : 'text-forge-text'}`}>
                        {item.name}
                        {isEquipped && <span className="ml-1.5 text-[10px] text-forge-gold/70">✓ equipped</span>}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#4a5268' }}>Lv {item.level}</p>
                    </div>

                    {/* Stats / delta */}
                    <div className="text-right text-[11px] space-y-0.5 flex-shrink-0 max-w-[140px]">
                      {delta.length > 0
                        ? delta.map((d, di) => (
                            <p key={di} className={`truncate font-mono ${d.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {d.delta > 0 ? '+' : ''}{d.delta} {d.stat}
                            </p>
                          ))
                        : <>
                            {item.effects.slice(0, 4).map((e, ei) => (
                              <p key={ei} className="truncate" style={{ color: '#4a5268' }}>
                                {e.min !== e.max ? `${e.min}–${e.max}` : e.min} {e.stat}
                              </p>
                            ))}
                            {item.effects.length > 4 && (
                              <p style={{ color: '#333a50' }}>+{item.effects.length - 4} more</p>
                            )}
                          </>
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
