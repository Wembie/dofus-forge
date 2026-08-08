import { useState } from 'react'
import { useBuildStore, type SlotId } from '@/store/buildStore.ts'
import type { AppItem } from '@/data/loaders.ts'
import { STAT_META, statIconUrl } from './statDisplay.ts'

const RUNE_STATS = [
  'AP', 'MP', 'Range',
  'Vitality', 'Wisdom', 'Strength', 'Intelligence', 'Chance', 'Agility',
  'Power',
  'Damage',
  'Earth Damage', 'Fire Damage', 'Water Damage', 'Air Damage', 'Neutral Damage',
  'Earth steal', 'Fire steal', 'Water steal', 'Air steal', 'Neutral steal',
  'Earth Resistance', 'Fire Resistance', 'Water Resistance', 'Air Resistance', 'Neutral Resistance',
  '% Earth Resistance', '% Fire Resistance', '% Water Resistance', '% Air Resistance', '% Neutral Resistance',
  '% Critical', 'Critical Damage', 'Critical Resistance',
  'Initiative', 'Lock', 'Dodge', 'Prospecting', 'Summons', 'Heal',
  'AP Reduction', 'MP Reduction', 'AP Parry', 'MP Parry',
  'Pushback Damage', 'Pushback Resistance', 'Trap Damage', 'Power (traps)',
  '% Melee Damage', '% Ranged Damage', '% Spell Damage', '% Weapon Damage',
  '% Melee Resistance', '% Ranged Resistance',
]

type Props = {
  slotId:  SlotId
  item:    AppItem
  onClose: () => void
}

export function RuneModal({ slotId, item, onClose }: Props) {
  const runes     = useBuildStore(s => s.runes[slotId] ?? {})
  const setRune   = useBuildStore(s => s.setRune)
  const clearRune = useBuildStore(s => s.clearRune)

  const [selectedStat, setSelectedStat] = useState(RUNE_STATS[0])
  const [addValue, setAddValue]         = useState(1)

  const runeEntries = Object.entries(runes).filter(([, v]) => v > 0)

  function addRune() {
    if (addValue <= 0) return
    const existing = runes[selectedStat] ?? 0
    setRune(slotId, selectedStat, existing + addValue)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#0f1320', border: '1px solid #2a3347', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-3.5"
          style={{ background: 'linear-gradient(180deg, #1a2035 0%, #141929 100%)', borderBottom: '1px solid #2a3347' }}
        >
          {item.image_url && (
            <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden"
              style={{ background: 'linear-gradient(145deg, #1c1530, #0d0b1e)', border: '1px solid #c9a84c44' }}>
              <img src={item.image_url} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-forge-gold font-bold text-sm truncate">{item.name}</h3>
            <p className="text-[11px] mt-0.5" style={{ color: '#4a5268' }}>Magesmithy · Lv {item.level}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors text-lg leading-none"
            style={{ background: '#1c2333', border: '1px solid #2a3347', color: '#7a8499' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e8eaf0' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#7a8499' }}
            aria-label="Close"
          >×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Active runes */}
          {runeEntries.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-2 font-medium" style={{ color: '#4a5268' }}>
                Active Runes
              </p>
              <div className="space-y-1.5">
                {runeEntries.map(([stat, val]) => {
                  const meta = STAT_META[stat]
                  return (
                    <div
                      key={stat}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                      style={{ background: '#131828', border: '1px solid #c9a84c33' }}
                    >
                      {meta?.icon
                        ? <img src={statIconUrl(meta.icon)} alt="" width={14} height={14}
                            className="flex-shrink-0 object-contain"
                            style={{ filter: `drop-shadow(0 0 3px ${meta.color}88)` }}
                          />
                        : <span className="w-3.5 flex-shrink-0" />
                      }
                      <span className="flex-1 text-xs font-mono tabular-nums" style={{ color: meta?.color ?? '#c0c8e0' }}>
                        +{val}
                      </span>
                      <span className="flex-1 text-xs truncate" style={{ color: '#8090b0' }}>
                        {meta?.label ?? stat}
                      </span>
                      <button
                        onClick={() => clearRune(slotId, stat)}
                        className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs transition-colors"
                        style={{ background: '#1c2333', color: '#4a5268' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#4a5268' }}
                        aria-label={`Remove ${stat} rune`}
                      >×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add rune */}
          <div className="rounded-lg p-3 space-y-3" style={{ background: '#080c14', border: '1px solid #1c2333' }}>
            <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: '#4a5268' }}>Add Rune</p>

            {/* Stat select */}
            <select
              value={selectedStat}
              onChange={e => setSelectedStat(e.target.value)}
              className="w-full rounded px-2 py-1.5 text-xs appearance-none cursor-pointer"
              style={{ background: '#0b0d18', border: '1px solid #2a3347', color: '#c0c8e0', outline: 'none' }}
            >
              {RUNE_STATS.map(s => {
                const meta = STAT_META[s]
                return <option key={s} value={s}>{meta?.label ?? s}</option>
              })}
            </select>

            {/* Value input + Add button */}
            <div className="flex gap-2">
              <div
                className="flex items-center gap-0.5 flex-1 rounded px-1"
                style={{ background: '#0b0d18', border: '1px solid #2a3347' }}
              >
                <button
                  onClick={() => setAddValue(v => Math.max(1, v - 1))}
                  className="w-6 h-7 flex items-center justify-center text-sm font-bold select-none transition-colors"
                  style={{ color: '#4a5268' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#c0c8e0' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#4a5268' }}
                >−</button>
                <input
                  type="number"
                  value={addValue}
                  min={1}
                  max={999}
                  onChange={e => setAddValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 bg-transparent text-center text-xs py-1 font-mono tabular-nums"
                  style={{ color: '#c0c8e0', outline: 'none', minWidth: 0 }}
                />
                <button
                  onClick={() => setAddValue(v => v + 1)}
                  className="w-6 h-7 flex items-center justify-center text-sm font-bold select-none transition-colors"
                  style={{ color: '#4a5268' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#c0c8e0' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#4a5268' }}
                >+</button>
              </div>

              <button
                onClick={addRune}
                className="px-4 py-1.5 rounded text-xs font-medium transition-colors"
                style={{ background: '#1c2740', border: '1px solid #c9a84c55', color: '#c9a84c' }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#22304e'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#c9a84c99'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#1c2740'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#c9a84c55'
                }}
              >Add</button>
            </div>
          </div>

          {runeEntries.length === 0 && (
            <p className="text-center text-[11px] py-2" style={{ color: '#2a3347' }}>
              No runes applied to this item
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
