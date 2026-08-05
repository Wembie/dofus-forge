import { useState, useMemo, useCallback } from 'react'
import { useDataStore } from '@/store/dataStore.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import type { SlotId } from '@/store/buildStore.ts'
import type { SlotConfig } from './slotConfig.ts'
import type { AppItem } from '@/data/loaders.ts'

type Props = {
  slot:   SlotConfig
  slotId: SlotId
  onClose: () => void
}

const LEVELS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200]

export function ItemCatalog({ slot, slotId, onClose }: Props) {
  const equipment = useDataStore(s => s.equipment)
  const equipItem = useBuildStore(s => s.equipItem)

  const [search,   setSearch]   = useState('')
  const [minLevel, setMinLevel] = useState(0)
  const [maxLevel, setMaxLevel] = useState(200)

  const items = useMemo<AppItem[]>(() => {
    if (!equipment) return []
    return equipment.filter(it =>
      it.slot === slot.apiSlot &&
      it.level >= minLevel &&
      it.level <= maxLevel &&
      (search === '' || it.name.toLowerCase().includes(search.toLowerCase()))
    ).sort((a, b) => b.level - a.level)
  }, [equipment, slot.apiSlot, minLevel, maxLevel, search])

  const handlePick = useCallback((item: AppItem) => {
    equipItem(slotId, item.ankama_id)
    onClose()
  }, [equipItem, slotId, onClose])

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
          <h3 className="font-display text-forge-gold font-bold">
            {slot.icon} {slot.label}
          </h3>
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
            placeholder="Search items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="w-full bg-forge-surface border border-forge-border rounded px-3 py-1.5 text-sm text-forge-text placeholder:text-forge-muted/50 focus:outline-none focus:border-forge-gold"
          />
          <div className="flex gap-2 text-xs text-forge-muted items-center">
            <span>Lv</span>
            <select
              value={minLevel}
              onChange={e => setMinLevel(Number(e.target.value))}
              className="bg-forge-surface border border-forge-border rounded px-1.5 py-1 text-forge-text focus:outline-none"
            >
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <span>–</span>
            <select
              value={maxLevel}
              onChange={e => setMaxLevel(Number(e.target.value))}
              className="bg-forge-surface border border-forge-border rounded px-1.5 py-1 text-forge-text focus:outline-none"
            >
              {LEVELS.map(l => <option key={l} value={l}>{l === 0 ? '—' : l}</option>)}
            </select>
            <span className="ml-auto text-forge-muted/60">{items.length} items</span>
          </div>
        </div>

        {/* List */}
        <ul className="overflow-y-auto flex-1 divide-y divide-forge-border/50" role="listbox">
          {items.length === 0 && (
            <li className="p-6 text-center text-forge-muted text-sm">No items found</li>
          )}
          {items.map(item => (
            <li key={item.ankama_id} role="option" aria-selected={false}>
              <button
                className="w-full flex items-center gap-3 p-3 hover:bg-forge-surface transition-colors text-left group"
                onClick={() => handlePick(item)}
              >
                {item.image_url
                  ? <img src={item.image_url} alt="" className="w-10 h-10 object-contain flex-shrink-0" loading="lazy" />
                  : <div className="w-10 h-10 rounded bg-forge-surface border border-forge-border flex items-center justify-center text-forge-muted text-lg">{slot.icon}</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-forge-text text-sm font-medium truncate group-hover:text-white transition-colors">
                    {item.name}
                  </p>
                  <p className="text-forge-muted text-xs">Lv {item.level}</p>
                </div>
                <div className="text-right text-xs text-forge-muted/70 space-y-0.5 flex-shrink-0 max-w-[120px]">
                  {item.effects.slice(0, 3).map((e, i) => (
                    <p key={i} className="truncate">
                      {e.min !== e.max ? `${e.min}–${e.max}` : e.min} {e.stat}
                    </p>
                  ))}
                  {item.effects.length > 3 && (
                    <p className="text-forge-muted/50">+{item.effects.length - 3} more</p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
