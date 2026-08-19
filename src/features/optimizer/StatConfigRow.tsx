import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { StatConfig } from './types.ts'
import type { OptimizerStatMeta } from './statList.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'

type Props = {
  meta:     OptimizerStatMeta
  item:     StatConfig
  onChange: (updated: StatConfig) => void
  onRemove: () => void
}

export function StatConfigRow({ meta, item, onChange, onRemove }: Props) {
  const { t } = useTranslation()
  const [minRaw, setMinRaw] = useState(item.minVal > 0 ? String(item.minVal) : '')

  // Reset raw when stat changes (new row added for a different stat)
  useEffect(() => {
    setMinRaw(item.minVal > 0 ? String(item.minVal) : '')
  }, [item.stat])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2"
      style={{
        background: 'var(--surface-stone)',
        border:     '1px solid var(--metal-edge)',
      }}
    >
      {/* Icon + name */}
      <img src={statIconUrl(meta.icon)} alt="" width={14} height={14} className="object-contain flex-shrink-0" />
      <span
        className="text-[11px] font-semibold flex-1 min-w-0 truncate"
        style={{ color: meta.color }}
      >
        {t(meta.tKey)}
      </span>

      {/* Weight slider */}
      <span className="text-[9px] uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>
        {t('optimizer_weight_label')}
      </span>
      <input
        type="range"
        min="1"
        max="10"
        value={item.weight}
        onChange={e => onChange({ ...item, weight: Number(e.target.value) })}
        style={{ width: 64, accentColor: meta.color }}
        className="flex-shrink-0"
      />
      <span
        className="text-[11px] font-mono font-bold w-4 text-center flex-shrink-0"
        style={{ color: meta.color }}
      >
        {item.weight}
      </span>

      {/* Separator */}
      <span className="flex-shrink-0" style={{ color: 'var(--metal-edge)', fontSize: 12 }}>|</span>

      {/* Min constraint */}
      <span className="text-[9px] uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>
        {t('optimizer_min_val_label')}
      </span>
      <input
        type="number"
        min="0"
        placeholder="—"
        value={minRaw}
        onChange={e => {
          const raw = e.target.value
          setMinRaw(raw)
          const n = parseInt(raw, 10)
          onChange({ ...item, minVal: isNaN(n) || n < 0 ? 0 : n })
        }}
        onBlur={() => {
          const n = parseInt(minRaw, 10)
          if (isNaN(n) || n <= 0) {
            setMinRaw('')
            onChange({ ...item, minVal: 0 })
          } else {
            setMinRaw(String(n))
          }
        }}
        className="w-16 text-right rounded px-1.5 py-0.5 outline-none text-[11px] font-mono flex-shrink-0"
        style={{
          background: 'var(--surface-panel)',
          border:     `1px solid ${item.minVal > 0 ? 'color-mix(in srgb, ' + meta.color + ' 40%, var(--metal-edge))' : 'var(--metal-edge)'}`,
          color:      item.minVal > 0 ? meta.color : 'var(--ink-muted)',
        }}
      />

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors"
        style={{ color: 'var(--ink-faint)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--negative)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-faint)')}
        aria-label="Remove"
      >
        <X size={11} />
      </button>
    </div>
  )
}
