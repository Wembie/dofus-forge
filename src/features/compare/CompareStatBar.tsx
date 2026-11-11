import { useTranslation } from 'react-i18next'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import type { CompareStatDef } from './compareStats.ts'

export function CompareStatBar({ def, a, b }: { def: CompareStatDef; a: number; b: number }) {
  const { t } = useTranslation()
  const sfx = def.suffix ?? ''
  const axisMax = Math.max(a, b, 1)
  const pctA = (a / axisMax) * 100
  const pctB = (b / axisMax) * 100
  const aColor = a === 0 && b === 0 ? 'var(--ink-faint)' : a >= b ? 'var(--gold)' : 'var(--ink-faint)'
  const bColor = a === 0 && b === 0 ? 'var(--ink-faint)' : b >= a ? 'var(--water)' : 'var(--ink-faint)'

  return (
    <div className="flex flex-col gap-1 py-1.5">
      <div className="flex items-center justify-center gap-1">
        <img src={statIconUrl(def.icon)} alt="" width={11} height={11} className="object-contain" />
        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: def.color }}>
          {t(def.tKey)}
        </span>
      </div>
      <div className="grid items-center" style={{ gridTemplateColumns: '44px 1fr 44px', gap: 6 }}>
        <span className="text-right font-mono tabular-nums text-[11px] font-bold" style={{ color: aColor }}>
          {a === 0 ? '—' : `${a}${sfx}`}
        </span>
        <div className="flex items-stretch h-[7px] rounded-full overflow-hidden" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
          <div className="h-full flex-1 flex justify-end">
            <div className="h-full rounded-l-full" style={{ width: `${pctA}%`, background: 'var(--gold)', opacity: a >= b ? 1 : 0.55 }} />
          </div>
          <div style={{ width: 2, background: 'var(--metal-edge)', flexShrink: 0 }} />
          <div className="h-full flex-1 flex justify-start">
            <div className="h-full rounded-r-full" style={{ width: `${pctB}%`, background: 'var(--water)', opacity: b >= a ? 1 : 0.55 }} />
          </div>
        </div>
        <span className="text-left font-mono tabular-nums text-[11px] font-bold" style={{ color: bColor }}>
          {b === 0 ? '—' : `${b}${sfx}`}
        </span>
      </div>
    </div>
  )
}
