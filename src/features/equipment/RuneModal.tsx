import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore, type SlotId } from '@/store/buildStore.ts'
import type { AppItem } from '@/data/loaders.ts'
import { STAT_META, statIconUrl } from './statDisplay.ts'

// Ordered grid: most-used rune stats, 7 per row
const RUNE_GRID = [
  'Vitality', 'Strength', 'Intelligence', 'Chance', 'Agility', 'Wisdom', 'Power',
  'AP', 'MP', 'Range', 'Damage', 'Earth Damage', 'Fire Damage', 'Water Damage',
  'Air Damage', 'Neutral Damage', '% Critical', 'Critical Damage', 'Critical Resistance',
  'Earth Resistance', 'Fire Resistance', 'Water Resistance', 'Air Resistance', 'Neutral Resistance',
  'Initiative', 'Lock', 'Dodge', 'Heal', 'Prospecting', 'AP Reduction', 'MP Reduction',
]

const QUICK_VALUES = [1, 5, 10, 25, 50, 100]

type Props = {
  slotId:  SlotId
  item:    AppItem
  onClose: () => void
}

export function RuneModal({ slotId, item, onClose }: Props) {
  const { t }     = useTranslation()
  const runes     = useBuildStore(s => s.runes[slotId] ?? {})
  const setRune   = useBuildStore(s => s.setRune)
  const clearRune = useBuildStore(s => s.clearRune)

  const [selected, setSelected] = useState(RUNE_GRID[0])
  const [addValue, setAddValue] = useState(10)

  const runeEntries = Object.entries(runes).filter(([, v]) => v > 0)
  const selMeta     = STAT_META[selected]

  function addRune() {
    if (addValue <= 0) return
    setRune(slotId, selected, (runes[selected] ?? 0) + addValue)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,4,14,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{
          maxWidth:    480,
          maxHeight:   '90vh',
          background:  'linear-gradient(175deg, #0e1122 0%, #090c18 100%)',
          border:      '1px solid #2a3347',
          boxShadow:   '0 0 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(201,168,76,0.08) inset',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{
            background:   'linear-gradient(180deg, #141829 0%, #0f1220 100%)',
            borderBottom: '1px solid #1c2740',
          }}
        >
          {item.image_url && (
            <div
              className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
              style={{
                width: 48, height: 48,
                background: 'linear-gradient(145deg, #1c1530, #0d0b1e)',
                border:     '1.5px solid rgba(201,168,76,0.4)',
                boxShadow:  '0 0 12px rgba(201,168,76,0.1) inset',
              }}
            >
              <img src={item.image_url} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="font-display font-bold truncate leading-tight" style={{ color: '#c9a84c', fontSize: 13 }}>
              {item.name}
            </p>
            <p className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: '#4a5268' }}>
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{ background: '#1a1530', border: '1px solid #c9a84c33', color: '#c9a84c99' }}
              >✦ {t('magesmithy')}</span>
              <span>Lv {item.level}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-base transition-colors"
            style={{ background: '#1c2333', border: '1px solid #2a3347', color: '#5a6480' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e0e8f0' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#5a6480' }}
            aria-label="Close"
          >×</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* ── Active runes ─────────────────────────────────────────── */}
          <div className="px-4 pt-4">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#3a4a68' }}>
                {t('active_runes')}
              </span>
              {runeEntries.length > 0 && (
                <span
                  className="text-[10px] font-mono rounded px-1.5 py-0.5"
                  style={{ background: '#c9a84c18', color: '#c9a84c88', border: '1px solid #c9a84c22' }}
                >
                  {runeEntries.length}
                </span>
              )}
            </div>

            {runeEntries.length === 0 ? (
              <div
                className="rounded-xl flex items-center justify-center py-4 text-[11px]"
                style={{ background: '#080b14', border: '1px dashed #1c2333', color: '#2a3347' }}
              >
                {t('no_runes')}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {runeEntries.map(([stat, val]) => {
                  const meta = STAT_META[stat]
                  return (
                    <div
                      key={stat}
                      className="flex items-center gap-1.5 rounded-full pl-1.5 pr-1 py-1 transition-all"
                      style={{
                        background: meta ? `${meta.color}18` : '#1a1f30',
                        border:     meta ? `1px solid ${meta.color}44` : '1px solid #2a3347',
                      }}
                    >
                      {meta?.icon && (
                        <img
                          src={statIconUrl(meta.icon)}
                          alt=""
                          width={14}
                          height={14}
                          className="object-contain flex-shrink-0"
                          style={{ filter: `drop-shadow(0 0 4px ${meta.color}88)` }}
                        />
                      )}
                      <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: meta?.color ?? '#c9a84c' }}>
                        +{val}
                      </span>
                      <span className="text-[10px] pr-0.5" style={{ color: `${meta?.color ?? '#c0c8e0'}99` }}>
                        {meta?.label ?? stat}
                      </span>
                      <button
                        onClick={() => clearRune(slotId, stat)}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] leading-none transition-colors flex-shrink-0"
                        style={{ background: '#0e1020', color: '#3a4268', border: '1px solid #2a3347' }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLButtonElement).style.color = '#f87171'
                          ;(e.currentTarget as HTMLButtonElement).style.background = '#2a1020'
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLButtonElement).style.color = '#3a4268'
                          ;(e.currentTarget as HTMLButtonElement).style.background = '#0e1020'
                        }}
                        aria-label={t('rune_remove', { stat })}
                      >×</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Divider ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 mt-4 mb-3">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #1c2740)' }} />
            <span className="text-[10px] uppercase tracking-widest font-semibold flex-shrink-0" style={{ color: '#3a4a68' }}>
              {t('add_rune')}
            </span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #1c2740)' }} />
          </div>

          {/* ── Stat icon grid ───────────────────────────────────────── */}
          <div className="px-4">
            <div
              className="grid gap-1.5 p-3 rounded-xl"
              style={{
                gridTemplateColumns: 'repeat(7, 1fr)',
                background: '#080b14',
                border:     '1px solid #1c2333',
              }}
            >
              {RUNE_GRID.map(stat => {
                const meta   = STAT_META[stat]
                const active = stat === selected
                const hasRune = (runes[stat] ?? 0) > 0

                return (
                  <button
                    key={stat}
                    onClick={() => setSelected(stat)}
                    title={meta?.label ?? stat}
                    className="relative flex items-center justify-center rounded-lg transition-all"
                    style={{
                      aspectRatio: '1',
                      background:  active
                        ? `${meta?.color ?? '#c9a84c'}22`
                        : hasRune
                        ? `${meta?.color ?? '#c9a84c'}0e`
                        : '#0b0e1a',
                      border: active
                        ? `1.5px solid ${meta?.color ?? '#c9a84c'}cc`
                        : hasRune
                        ? `1px solid ${meta?.color ?? '#c9a84c'}55`
                        : '1px solid #1c2333',
                      boxShadow: active ? `0 0 8px ${meta?.color ?? '#c9a84c'}44` : 'none',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.background = `${meta?.color ?? '#c9a84c'}18`
                        el.style.borderColor = `${meta?.color ?? '#c9a84c'}88`
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.background = hasRune ? `${meta?.color ?? '#c9a84c'}0e` : '#0b0e1a'
                        el.style.borderColor = hasRune ? `${meta?.color ?? '#c9a84c'}55` : '#1c2333'
                      }
                    }}
                  >
                    {meta?.icon ? (
                      <img
                        src={statIconUrl(meta.icon)}
                        alt={meta.label}
                        width={20}
                        height={20}
                        className="object-contain"
                        style={{
                          filter: active
                            ? `drop-shadow(0 0 5px ${meta.color}bb) brightness(1.2)`
                            : hasRune
                            ? `drop-shadow(0 0 3px ${meta.color}77) brightness(0.9)`
                            : 'brightness(0.55)',
                        }}
                      />
                    ) : (
                      <span className="text-[9px] font-bold" style={{ color: active ? '#c9a84c' : '#3a4268' }}>
                        {(meta?.label ?? stat).slice(0, 3)}
                      </span>
                    )}

                    {/* Tiny dot if already has rune */}
                    {hasRune && !active && (
                      <span
                        className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                        style={{ background: meta?.color ?? '#c9a84c', boxShadow: `0 0 4px ${meta?.color ?? '#c9a84c'}` }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* ── Selected stat info + controls ─────────────────────── */}
            <div className="mt-3 rounded-xl p-3 space-y-3"
              style={{ background: '#080b14', border: `1px solid ${selMeta?.color ?? '#c9a84c'}33` }}>

              {/* Stat info row */}
              <div className="flex items-center gap-2">
                {selMeta?.icon && (
                  <img
                    src={statIconUrl(selMeta.icon)}
                    alt=""
                    width={20}
                    height={20}
                    className="object-contain flex-shrink-0"
                    style={{ filter: `drop-shadow(0 0 5px ${selMeta.color}99)` }}
                  />
                )}
                <span className="font-semibold text-sm" style={{ color: selMeta?.color ?? '#c9a84c' }}>
                  {selMeta?.label ?? selected}
                </span>
                {(runes[selected] ?? 0) > 0 && (
                  <span className="ml-auto text-[11px] font-mono" style={{ color: `${selMeta?.color ?? '#c9a84c'}99` }}>
                    {t('rune_current', { value: runes[selected] })}
                  </span>
                )}
              </div>

              {/* Quick value buttons */}
              <div className="flex gap-1.5">
                {QUICK_VALUES.map(v => (
                  <button
                    key={v}
                    onClick={() => setAddValue(v)}
                    className="flex-1 py-1 rounded-lg text-[11px] font-mono font-bold transition-all"
                    style={{
                      background:  addValue === v ? `${selMeta?.color ?? '#c9a84c'}22` : '#0e1020',
                      border:      addValue === v ? `1.5px solid ${selMeta?.color ?? '#c9a84c'}88` : '1px solid #1c2333',
                      color:       addValue === v ? (selMeta?.color ?? '#c9a84c') : '#3a4268',
                    }}
                    onMouseEnter={e => {
                      if (addValue !== v) {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.borderColor = `${selMeta?.color ?? '#c9a84c'}55`
                        el.style.color = '#8090b0'
                      }
                    }}
                    onMouseLeave={e => {
                      if (addValue !== v) {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.borderColor = '#1c2333'
                        el.style.color = '#3a4268'
                      }
                    }}
                  >+{v}</button>
                ))}
              </div>

              {/* Custom input + Add button */}
              <div className="flex gap-2">
                <div
                  className="flex items-center gap-1 flex-1 rounded-lg px-2"
                  style={{ background: '#0b0e1a', border: '1px solid #1c2740' }}
                >
                  <button
                    onClick={() => setAddValue(v => Math.max(1, v - 1))}
                    className="w-6 h-7 flex items-center justify-center text-sm font-bold select-none transition-colors"
                    style={{ color: '#3a4268' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#8090b0' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3a4268' }}
                  >−</button>
                  <input
                    type="number"
                    value={addValue}
                    min={1}
                    max={9999}
                    onChange={e => setAddValue(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 bg-transparent text-center text-xs py-1 font-mono tabular-nums"
                    style={{ color: selMeta?.color ?? '#c9a84c', outline: 'none', minWidth: 0 }}
                  />
                  <button
                    onClick={() => setAddValue(v => v + 1)}
                    className="w-6 h-7 flex items-center justify-center text-sm font-bold select-none transition-colors"
                    style={{ color: '#3a4268' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#8090b0' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3a4268' }}
                  >+</button>
                </div>

                <button
                  onClick={addRune}
                  className="px-5 py-1.5 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${selMeta?.color ?? '#c9a84c'}22, ${selMeta?.color ?? '#c9a84c'}11)`,
                    border:     `1.5px solid ${selMeta?.color ?? '#c9a84c'}77`,
                    color:      selMeta?.color ?? '#c9a84c',
                    boxShadow:  `0 0 12px ${selMeta?.color ?? '#c9a84c'}22`,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = `linear-gradient(135deg, ${selMeta?.color ?? '#c9a84c'}33, ${selMeta?.color ?? '#c9a84c'}22)`
                    el.style.boxShadow  = `0 0 18px ${selMeta?.color ?? '#c9a84c'}44`
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = `linear-gradient(135deg, ${selMeta?.color ?? '#c9a84c'}22, ${selMeta?.color ?? '#c9a84c'}11)`
                    el.style.boxShadow  = `0 0 12px ${selMeta?.color ?? '#c9a84c'}22`
                  }}
                >
                  {t('rune_add_btn')}
                </button>
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}
