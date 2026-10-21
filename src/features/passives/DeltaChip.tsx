import { useTranslation } from 'react-i18next'

/** What the active combat passives add to a stat (combat view only). */
export function DeltaChip({ delta, suffix = '' }: { delta?: number; suffix?: string }) {
  const { t } = useTranslation()
  if (!delta) return null
  const color = delta > 0 ? 'var(--gold)' : 'var(--negative)'
  return (
    <span
      className="font-mono text-[9px] font-bold tabular-nums leading-none rounded px-1 py-0.5"
      style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
      title={t('stats_from_passives')}
    >
      {delta > 0 ? '+' : '−'}{Math.abs(delta).toLocaleString()}{suffix}
    </span>
  )
}
