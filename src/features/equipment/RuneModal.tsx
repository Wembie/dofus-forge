import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore, type SlotId } from '@/store/buildStore.ts'
import type { AppItem } from '@/data/loaders.ts'
import { STAT_META, statIconUrl, runeIconUrl } from './statDisplay.ts'

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
  const runes            = useBuildStore(s => s.runes[slotId] ?? {})
  const setRune          = useBuildStore(s => s.setRune)
  const clearRune        = useBuildStore(s => s.clearRune)
  const forjamagoName    = useBuildStore(s => s.forjamagoNames[slotId] ?? '')
  const setForjamagoName = useBuildStore(s => s.setForjamagoName)

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
          maxWidth:   480,
          maxHeight:  '90vh',
          background: 'var(--surface-void)',
          border:     '1px solid var(--metal-edge)',
          boxShadow:  `0 0 60px rgba(0,0,0,0.9), 0 0 0 1px color-mix(in srgb, var(--gold) 8%, transparent) inset`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--metal-edge)' }}
        >
          {item.image_url && (
            <div
              className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
              style={{
                width: 48, height: 48,
                background: 'linear-gradient(145deg, var(--surface-parchment), var(--surface-void))',
                border:     `1.5px solid color-mix(in srgb, var(--gold) 40%, transparent)`,
                boxShadow:  `color-mix(in srgb, var(--gold) 10%, transparent) 0 0 12px inset`,
              }}
            >
              <img src={item.image_url} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="font-display font-bold truncate leading-tight" style={{ color: 'var(--gold)', fontSize: 13 }}>
              {item.name}
            </p>
            <p className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--ink-faint)' }}>
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: 'color-mix(in srgb, var(--gold) 9%, transparent)',
                  border:     '1px solid color-mix(in srgb, var(--gold) 13%, transparent)',
                  color:      'var(--gold)',
                  opacity:    0.8,
                }}
              >✦ {t('magesmithy')}</span>
              <span>Lv {item.level}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-base transition-colors text-ink-muted hover:text-ink"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--metal-edge)' }}
            aria-label="Close"
          >×</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Active runes */}
          <div className="px-4 pt-4">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-faint)' }}>
                {t('active_runes')}
              </span>
              {runeEntries.length > 0 && (
                <span
                  className="text-[10px] font-mono rounded px-1.5 py-0.5"
                  style={{
                    background: 'color-mix(in srgb, var(--gold) 9%, transparent)',
                    color:      'color-mix(in srgb, var(--gold) 55%, transparent)',
                    border:     '1px solid color-mix(in srgb, var(--gold) 13%, transparent)',
                  }}
                >
                  {runeEntries.length}
                </span>
              )}
            </div>

            {runeEntries.length === 0 ? (
              <div
                className="rounded-xl flex items-center justify-center py-4 text-[11px]"
                style={{ background: 'var(--surface-void)', border: '1px dashed var(--metal-edge)', color: 'var(--ink-faint)', opacity: 0.5 }}
              >
                {t('no_runes')}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {runeEntries.map(([stat, val]) => {
                  const meta = STAT_META[stat]
                  const clr  = meta?.color ?? 'var(--gold)'
                  return (
                    <div
                      key={stat}
                      className="flex items-center gap-1.5 rounded-full pl-1 pr-1 py-0.5 transition-all"
                      style={{
                        background: `color-mix(in srgb, ${clr} 9%, transparent)`,
                        border:     `1px solid color-mix(in srgb, ${clr} 27%, transparent)`,
                      }}
                    >
                      {(() => {
                        const rUrl = runeIconUrl(stat)
                        if (rUrl) return (
                          <img src={rUrl} alt="" width={20} height={20}
                            className="object-contain flex-shrink-0"
                            style={{ filter: `drop-shadow(0 0 4px color-mix(in srgb, ${clr} 53%, transparent))` }}
                          />
                        )
                        if (meta?.icon) return (
                          <img src={statIconUrl(meta.icon)} alt="" width={14} height={14}
                            className="object-contain flex-shrink-0"
                            style={{ filter: `drop-shadow(0 0 4px color-mix(in srgb, ${clr} 53%, transparent))` }}
                          />
                        )
                        return null
                      })()}
                      <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: clr }}>
                        +{val}
                      </span>
                      <span className="text-[10px] pr-0.5" style={{ color: clr, opacity: 0.6 }}>
                        {meta ? t(meta.tKey) : stat}
                      </span>
                      <button
                        onClick={() => clearRune(slotId, stat)}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] leading-none transition-colors flex-shrink-0"
                        style={{ background: 'var(--surface-void)', color: 'var(--ink-faint)', border: '1px solid var(--metal-edge)' }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--negative)'
                          ;(e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--negative) 15%, var(--surface-void))'
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)'
                          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-void)'
                        }}
                        aria-label={t('rune_remove', { stat })}
                      >×</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 px-4 mt-4 mb-3">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--metal-edge))' }} />
            <span className="text-[10px] uppercase tracking-widest font-semibold flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>
              {t('add_rune')}
            </span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, var(--metal-edge))' }} />
          </div>

          {/* Stat icon grid */}
          <div className="px-4">
            <div
              className="grid gap-1.5 p-3 rounded-xl"
              style={{ gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
            >
              {RUNE_GRID.map(stat => {
                const meta    = STAT_META[stat]
                const clr     = meta?.color ?? 'var(--gold)'
                const active  = stat === selected
                const hasRune = (runes[stat] ?? 0) > 0

                return (
                  <button
                    key={stat}
                    onClick={() => setSelected(stat)}
                    title={meta ? t(meta.tKey) : stat}
                    className="relative flex items-center justify-center rounded-lg transition-all"
                    style={{
                      aspectRatio: '1',
                      background:  active
                        ? `color-mix(in srgb, ${clr} 13%, transparent)`
                        : hasRune
                        ? `color-mix(in srgb, ${clr} 6%, transparent)`
                        : 'var(--surface-void)',
                      border: active
                        ? `1.5px solid color-mix(in srgb, ${clr} 80%, transparent)`
                        : hasRune
                        ? `1px solid color-mix(in srgb, ${clr} 33%, transparent)`
                        : '1px solid var(--metal-edge)',
                      boxShadow: active
                        ? `0 0 8px color-mix(in srgb, ${clr} 27%, transparent)`
                        : 'none',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.background   = `color-mix(in srgb, ${clr} 9%, transparent)`
                        el.style.borderColor  = `color-mix(in srgb, ${clr} 53%, transparent)`
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.background  = hasRune
                          ? `color-mix(in srgb, ${clr} 6%, transparent)`
                          : 'var(--surface-void)'
                        el.style.borderColor = hasRune
                          ? `color-mix(in srgb, ${clr} 33%, transparent)`
                          : 'var(--metal-edge)'
                      }
                    }}
                  >
                    {(() => {
                      const rUrl = runeIconUrl(stat)
                      if (rUrl) return (
                        <img
                          src={rUrl}
                          alt={meta ? t(meta.tKey) : stat}
                          width={30}
                          height={30}
                          className="object-contain"
                          style={{
                            filter: active
                              ? `drop-shadow(0 0 6px color-mix(in srgb, ${clr} 80%, transparent)) brightness(1.15)`
                              : hasRune
                              ? `drop-shadow(0 0 3px color-mix(in srgb, ${clr} 40%, transparent)) brightness(0.95)`
                              : 'brightness(0.5) saturate(0.4)',
                          }}
                        />
                      )
                      if (meta?.icon) return (
                        <img
                          src={statIconUrl(meta.icon)}
                          alt={t(meta.tKey)}
                          width={20}
                          height={20}
                          className="object-contain"
                          style={{
                            filter: active
                              ? `drop-shadow(0 0 5px color-mix(in srgb, ${clr} 73%, transparent)) brightness(1.2)`
                              : hasRune
                              ? `drop-shadow(0 0 3px color-mix(in srgb, ${clr} 47%, transparent)) brightness(0.9)`
                              : 'brightness(0.55)',
                          }}
                        />
                      )
                      return (
                        <span className="text-[9px] font-bold" style={{ color: active ? 'var(--gold)' : 'var(--ink-faint)' }}>
                          {(meta ? t(meta.tKey) : stat).slice(0, 3)}
                        </span>
                      )
                    })()}

                    {hasRune && !active && (
                      <span
                        className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                        style={{ background: clr, boxShadow: `0 0 4px ${clr}` }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Selected stat info + controls */}
            <div
              className="mt-3 rounded-xl p-3 space-y-3"
              style={{
                background: 'var(--surface-void)',
                border:     `1px solid color-mix(in srgb, ${selMeta?.color ?? 'var(--gold)'} 20%, transparent)`,
              }}
            >
              {/* Stat info row */}
              <div className="flex items-center gap-2">
                {(() => {
                  const rUrl = runeIconUrl(selected)
                  const clr  = selMeta?.color ?? 'var(--gold)'
                  if (rUrl) return (
                    <img src={rUrl} alt="" width={28} height={28}
                      className="object-contain flex-shrink-0"
                      style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb, ${clr} 67%, transparent))` }}
                    />
                  )
                  if (selMeta?.icon) return (
                    <img src={statIconUrl(selMeta.icon)} alt="" width={20} height={20}
                      className="object-contain flex-shrink-0"
                      style={{ filter: `drop-shadow(0 0 5px color-mix(in srgb, ${clr} 60%, transparent))` }}
                    />
                  )
                  return null
                })()}
                <span className="font-semibold text-sm" style={{ color: selMeta?.color ?? 'var(--gold)' }}>
                  {selMeta ? t(selMeta.tKey) : selected}
                </span>
                {(runes[selected] ?? 0) > 0 && (
                  <span className="ml-auto text-[11px] font-mono" style={{ color: selMeta?.color ?? 'var(--gold)', opacity: 0.6 }}>
                    {t('rune_current', { value: runes[selected] })}
                  </span>
                )}
              </div>

              {/* Quick value buttons */}
              <div className="flex gap-1.5">
                {QUICK_VALUES.map(v => {
                  const clr = selMeta?.color ?? 'var(--gold)'
                  return (
                    <button
                      key={v}
                      onClick={() => setAddValue(v)}
                      className="flex-1 py-1 rounded-lg text-[11px] font-mono font-bold transition-all"
                      style={{
                        background: addValue === v
                          ? `color-mix(in srgb, ${clr} 13%, transparent)`
                          : 'var(--surface-void)',
                        border: addValue === v
                          ? `1.5px solid color-mix(in srgb, ${clr} 53%, transparent)`
                          : '1px solid var(--metal-edge)',
                        color: addValue === v ? clr : 'var(--ink-faint)',
                      }}
                      onMouseEnter={e => {
                        if (addValue !== v) {
                          const el = e.currentTarget as HTMLButtonElement
                          el.style.borderColor = `color-mix(in srgb, ${clr} 33%, transparent)`
                          el.style.color = 'var(--ink-muted)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (addValue !== v) {
                          const el = e.currentTarget as HTMLButtonElement
                          el.style.borderColor = 'var(--metal-edge)'
                          el.style.color = 'var(--ink-faint)'
                        }
                      }}
                    >+{v}</button>
                  )
                })}
              </div>

              {/* Custom input + Add button */}
              <div className="flex gap-2">
                <div
                  className="flex items-center gap-1 flex-1 rounded-lg px-2"
                  style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
                >
                  <button
                    onClick={() => setAddValue(v => Math.max(1, v - 1))}
                    className="w-6 h-7 flex items-center justify-center text-sm font-bold select-none transition-colors text-ink-faint hover:text-ink-muted"
                  >−</button>
                  <input
                    type="number"
                    value={addValue}
                    min={1}
                    max={9999}
                    onChange={e => setAddValue(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 bg-transparent text-center text-xs py-1 font-mono tabular-nums"
                    style={{ color: selMeta?.color ?? 'var(--gold)', outline: 'none', minWidth: 0 }}
                  />
                  <button
                    onClick={() => setAddValue(v => v + 1)}
                    className="w-6 h-7 flex items-center justify-center text-sm font-bold select-none transition-colors text-ink-faint hover:text-ink-muted"
                  >+</button>
                </div>

                {(() => {
                  const clr = selMeta?.color ?? 'var(--gold)'
                  return (
                    <button
                      onClick={addRune}
                      className="px-5 py-1.5 rounded-lg text-sm font-bold transition-all"
                      style={{
                        background: `linear-gradient(135deg, color-mix(in srgb, ${clr} 13%, transparent), color-mix(in srgb, ${clr} 7%, transparent))`,
                        border:     `1.5px solid color-mix(in srgb, ${clr} 47%, transparent)`,
                        color:      clr,
                        boxShadow:  `0 0 12px color-mix(in srgb, ${clr} 13%, transparent)`,
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.background = `linear-gradient(135deg, color-mix(in srgb, ${clr} 20%, transparent), color-mix(in srgb, ${clr} 13%, transparent))`
                        el.style.boxShadow  = `0 0 18px color-mix(in srgb, ${clr} 27%, transparent)`
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.background = `linear-gradient(135deg, color-mix(in srgb, ${clr} 13%, transparent), color-mix(in srgb, ${clr} 7%, transparent))`
                        el.style.boxShadow  = `0 0 12px color-mix(in srgb, ${clr} 13%, transparent)`
                      }}
                    >
                      {t('rune_add_btn')}
                    </button>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Forjamago signature */}
          <div className="px-4 pt-2 pb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-faint)' }}>
                {t('forjamago_name_label')}
              </span>
            </div>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
            >
              <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--ap)', opacity: 0.6 }}>✦</span>
              <input
                type="text"
                value={forjamagoName}
                onChange={e => setForjamagoName(slotId, e.target.value)}
                placeholder={t('forjamago_name_placeholder')}
                className="flex-1 bg-transparent text-[11px] outline-none"
                style={{ color: 'var(--ap)', caretColor: 'var(--ap)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
