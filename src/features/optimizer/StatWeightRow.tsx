import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { OPTIMIZER_STATS } from './statList.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import type { StatWeight } from './types.ts'

type Props = {
  item:     StatWeight
  onChange: (weight: number) => void
  onRemove: () => void
}

export function StatWeightRow({ item, onChange, onRemove }: Props) {
  const { t } = useTranslation()
  const meta  = OPTIMIZER_STATS.find(s => s.key === item.stat)
  if (!meta) return null

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded"
      style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
    >
      <img src={statIconUrl(meta.icon)} alt="" width={14} height={14} className="object-contain flex-shrink-0" />
      <span className="text-[11px] font-medium w-28 truncate flex-shrink-0" style={{ color: meta.color }}>
        {t(meta.tKey)}
      </span>
      <input
        type="range"
        min={1}
        max={10}
        value={item.weight}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 min-w-0"
        title={`${t('optimizer_weight_label')}: ${item.weight}`}
      />
      <span className="text-[11px] font-mono w-7 text-right flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>
        {item.weight}
      </span>
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
