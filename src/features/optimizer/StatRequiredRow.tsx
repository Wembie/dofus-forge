import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { OPTIMIZER_STATS } from './statList.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import type { StatRequired } from './types.ts'

type Props = {
  item:     StatRequired
  onChange: (minVal: number) => void
  onRemove: () => void
}

export function StatRequiredRow({ item, onChange, onRemove }: Props) {
  const { t } = useTranslation()
  const meta  = OPTIMIZER_STATS.find(s => s.key === item.stat)
  if (!meta) return null

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded"
      style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
    >
      <img src={statIconUrl(meta.icon)} alt="" width={14} height={14} className="object-contain flex-shrink-0" />
      <span className="text-[11px] font-medium flex-1 truncate" style={{ color: meta.color }}>
        {t(meta.tKey)}
      </span>
      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>≥</span>
      <input
        type="number"
        value={item.minVal}
        min={0}
        onChange={e => onChange(Math.max(0, Number(e.target.value)))}
        className="w-16 text-[11px] text-right rounded px-1.5 py-0.5 outline-none flex-shrink-0"
        style={{
          background: 'var(--surface-panel)',
          border:     '1px solid var(--metal-edge)',
          color:      'var(--ink)',
        }}
      />
      <button
        onClick={onRemove}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors"
        style={{ color: 'var(--ink-faint)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--negative)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-faint)')}
      >
        <X size={12} />
      </button>
    </div>
  )
}
