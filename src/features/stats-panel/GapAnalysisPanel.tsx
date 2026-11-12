import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { useBuildStore } from '@/store/buildStore.ts'
import { analyzeGaps, type GapFinding, type GapSeverity } from './gapAnalysis.ts'

const SEVERITY_COLOR: Record<GapSeverity, string> = {
  critical: 'var(--negative)',
  warning:  'var(--gold)',
  info:     'var(--water)',
}

function findingMessage(t: (key: string, opts?: Record<string, unknown>) => string, f: GapFinding): string {
  switch (f.kind) {
    case 'empty_slot':   return t('gap_empty_slot', { slot: t(`slot_${f.slot}`) })
    case 'empty_dofus':  return t('gap_empty_dofus', { count: f.count })
    case 'low_ap':       return t('gap_low_ap', { value: f.value, target: f.target, level: f.level })
    case 'low_mp':       return t('gap_low_mp', { value: f.value, target: f.target, level: f.level })
    case 'negative_res': return t('gap_negative_res', { stat: t(f.statTKey) })
    case 'no_crit':      return t('gap_no_crit')
    case 'low_hp':       return t('gap_low_hp', { value: f.value, level: f.level })
  }
}

/** Collapsed by default — a slim summary row the player opens on demand,
 * so it never pushes the AP/MP/HP badges down unless they ask to see it. */
export function GapAnalysisPanel() {
  const { t }         = useTranslation()
  const stats         = useBuildStore(s => s.stats)
  const level         = useBuildStore(s => s.level)
  const equipped      = useBuildStore(s => s.equipped)
  const selectedClass = useBuildStore(s => s.selectedClass)

  const findings = useMemo(
    () => (stats ? analyzeGaps(stats, level, equipped) : []),
    [stats, level, equipped],
  )

  if (!selectedClass || !stats) return null

  const rowStyle = { background: 'var(--surface-stone)', border: '1px solid var(--metal-edge)' }

  if (findings.length === 0) {
    return (
      <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={rowStyle}>
        <span className="font-display text-[10px] uppercase tracking-[0.2em] font-bold flex-shrink-0" style={{ color: 'var(--gold)' }}>
          {t('gap_analysis_title')}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--positive)' }}>{t('gap_analysis_all_good')}</span>
      </div>
    )
  }

  return (
    <details className="group rounded-lg px-3 py-2" style={rowStyle}>
      <summary className="flex items-center gap-2 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="font-display text-[10px] uppercase tracking-[0.2em] font-bold flex-shrink-0" style={{ color: 'var(--gold)' }}>
          {t('gap_analysis_title')}
        </span>
        <span
          className="font-mono text-[10px] font-bold rounded-full px-1.5 leading-4 flex-shrink-0"
          style={{ background: 'color-mix(in srgb, var(--negative) 20%, transparent)', color: 'var(--negative)' }}
        >
          {findings.length}
        </span>
        <div className="flex-1" style={{ height: 1, background: 'linear-gradient(to right, var(--metal-edge), transparent)' }} />
        <ChevronRight size={13} className="flex-shrink-0 transition-transform group-open:rotate-90" style={{ color: 'var(--ink-faint)' }} />
      </summary>
      <div className="pt-2 space-y-1">
        {findings.map(f => (
          <div key={f.id} className="flex items-start gap-1.5">
            <span
              className="flex-shrink-0 rounded-full mt-1"
              style={{ width: 6, height: 6, background: SEVERITY_COLOR[f.severity] }}
            />
            <span className="text-[11px] leading-snug" style={{ color: 'var(--ink-muted)' }}>
              {findingMessage(t, f)}
            </span>
          </div>
        ))}
      </div>
    </details>
  )
}
