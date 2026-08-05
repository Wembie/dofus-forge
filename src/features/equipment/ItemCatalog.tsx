import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDataStore } from '@/store/dataStore.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import type { SlotId } from '@/store/buildStore.ts'
import type { SlotConfig } from './slotConfig.ts'
import type { AppItem } from '@/data/loaders.ts'
import { itemMatchesElement, ELEM_FILTERS, type ElemFilter } from './itemElement.ts'
import { useVirtualList } from '@/ui/useVirtualList.ts'

const ROW_HEIGHT = 64

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
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 4)
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal
      aria-label={`Select ${slot.label}`}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-forge-card border border-forge-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-forge-border">
          <h3 className="font-display text-forge-gold font-bold">{slot.icon} {slot.label}</h3>
          <button
            onClick={onClose}
            className="text-forge-muted hover:text-forge-text transition-colors text-xl leading-none"
            aria-label="Close"
          >×</button>
        </div>

        {/* Filters */}
        <div className="p-3 border-b border-forge-border space-y-2">
          <input
            type="search"
            placeholder={t('search_items')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="w-full bg-forge-surface border border-forge-border rounded px-3 py-1.5 text-sm text-forge-text placeholder:text-forge-muted/50 focus:outline-none focus:border-forge-gold"
          />

          {/* Element + sort row */}
          <div className="flex items-center gap-1 flex-wrap">
            {ELEM_FILTERS.map(({ filter, i18nKey, activeClass }) => (
              <button
                key={filter}
                onClick={() => setElem(filter)}
                className={[
                  'px-2 py-0.5 rounded text-[11px] border transition-colors',
                  elem === filter
                    ? activeClass
                    : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-forge-gold',
                ].join(' ')}
              >{t(i18nKey)}</button>
            ))}

            <div className="ml-auto flex gap-1">
              {(Object.keys(SORT_LABELS) as SortKey[]).map(sk => (
                <button
                  key={sk}
                  onClick={() => setSort(sk)}
                  className={[
                    'px-2 py-0.5 rounded text-[11px] border transition-colors',
                    sort === sk
                      ? 'border-forge-gold text-forge-gold'
                      : 'border-forge-border text-forge-muted hover:text-forge-text hover:border-forge-gold',
                  ].join(' ')}
                >{SORT_LABELS[sk]}</button>
              ))}
            </div>
          </div>

          {/* Level range */}
          <div className="flex gap-2 text-xs text-forge-muted items-center">
            <span>{t('level_range')}</span>
            <select value={minLevel} onChange={e => setMinLevel(Number(e.target.value))}
              className="bg-forge-surface border border-forge-border rounded px-1.5 py-1 text-forge-text focus:outline-none">
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <span>–</span>
            <select value={maxLevel} onChange={e => setMaxLevel(Number(e.target.value))}
              className="bg-forge-surface border border-forge-border rounded px-1.5 py-1 text-forge-text focus:outline-none">
              {LEVELS.map(l => <option key={l} value={l}>{l === 0 ? '—' : l}</option>)}
            </select>
            <span className="ml-auto text-forge-muted/60">{t('item_count', { count: items.length })}</span>
          </div>
        </div>

        {/* List */}
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-forge-muted text-sm">{t('no_items')}</p>
          </div>
        ) : (
          <ul
            ref={containerRef}
            onScroll={onScroll}
            className="overflow-y-auto flex-1 divide-y divide-forge-border"
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
                <li key={item.ankama_id} role="option" aria-selected={isEquipped}>
                  <button
                    className={[
                      'w-full flex items-center gap-3 p-3 transition-colors text-left',
                      isHighlighted ? 'bg-forge-surface' : 'hover:bg-forge-surface',
                    ].join(' ')}
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => handlePick(item)}
                    onMouseEnter={() => setActiveIdx(absoluteIdx)}
                  >
                    {item.image_url
                      ? <img src={item.image_url} alt="" className="w-10 h-10 object-contain flex-shrink-0" loading="lazy" />
                      : <div className="w-10 h-10 rounded bg-forge-surface border border-forge-border flex items-center justify-center text-forge-muted text-lg flex-shrink-0">{slot.icon}</div>
                    }

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isEquipped ? 'text-forge-gold' : 'text-forge-text'}`}>
                        {item.name}
                        {isEquipped && <span className="ml-1 text-[10px]">✓</span>}
                      </p>
                      <p className="text-forge-muted text-xs">Lv {item.level}</p>
                    </div>

                    <div className="text-right text-[11px] space-y-px flex-shrink-0 max-w-[120px]">
                      {delta.length > 0
                        ? delta.map((d, di) => (
                            <p key={di} className={`truncate ${d.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {d.delta > 0 ? '+' : ''}{d.delta} {d.stat}
                            </p>
                          ))
                        : <>
                            {item.effects.slice(0, 3).map((e, ei) => (
                              <p key={ei} className="text-forge-muted/70 truncate">
                                {e.min !== e.max ? `${e.min}–${e.max}` : e.min} {e.stat}
                              </p>
                            ))}
                            {item.effects.length > 3 && (
                              <p className="text-forge-muted/50">{t('more_effects', { count: item.effects.length - 3 })}</p>
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
      </div>
    </div>
  )
}
