import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Users } from 'lucide-react'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { analyzeGaps, type GapFinding, type GapSeverity } from './gapAnalysis.ts'
import { fetchCommunityBenchmark, BENCHMARK_KEYS, type CommunityBenchmark } from './communityBenchmark.ts'
import { STAT_DEF_BY_KEY } from '@/features/compare/compareStats.ts'

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

type BenchStatus = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; data: CommunityBenchmark } | { kind: 'empty' }

function BenchmarkSection({ status, onRequest }: { status: BenchStatus; onRequest: () => void }) {
  const { t } = useTranslation()

  if (status.kind === 'idle') {
    return (
      <button
        type="button"
        onClick={onRequest}
        className="flex items-center justify-center gap-1.5 w-full rounded-md py-1.5 text-[11px] font-bold uppercase tracking-wide transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background:  'var(--gold)',
          color:       'var(--surface-void)',
          boxShadow:   '0 2px 10px -2px color-mix(in srgb, var(--gold) 55%, transparent)',
        }}
      >
        <Users size={12} />
        {t('gap_benchmark_cta')}
      </button>
    )
  }
  if (status.kind === 'loading') {
    return <p className="text-[10px] italic" style={{ color: 'var(--ink-faint)' }}>{t('gap_benchmark_loading')}</p>
  }
  if (status.kind === 'empty') {
    return <p className="text-[10px] italic" style={{ color: 'var(--ink-faint)' }}>{t('gap_benchmark_empty')}</p>
  }

  const { data } = status
  return (
    <div className="space-y-1">
      {BENCHMARK_KEYS.map(key => {
        const pct = data.percentiles[key]
        if (pct == null) return null
        const def = STAT_DEF_BY_KEY.get(key)
        const label = def ? t(def.tKey) : key
        const color = pct >= 50 ? 'var(--positive)' : 'var(--gold)'
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-bold flex-shrink-0" style={{ color, minWidth: 28 }}>{pct}%</span>
            <span className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
              {t('gap_benchmark_row', { stat: label, pct })}
            </span>
          </div>
        )
      })}
      <p className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>
        {t('gap_benchmark_sample', { count: data.sampleSize, min: data.levelMin, max: data.levelMax })}
      </p>
    </div>
  )
}

/** Collapsed by default — a slim summary row the player opens on demand,
 * so it never pushes the AP/MP/HP badges down unless they ask to see it. */
export function GapAnalysisPanel() {
  const { t }         = useTranslation()
  const stats         = useBuildStore(s => s.stats)
  const level         = useBuildStore(s => s.level)
  const equipped      = useBuildStore(s => s.equipped)
  const selectedClass = useBuildStore(s => s.selectedClass)
  const equipment      = useDataStore(s => s.equipment)
  const sets           = useDataStore(s => s.sets)
  const [bench, setBench] = useState<BenchStatus>({ kind: 'idle' })

  const findings = useMemo(
    () => (stats ? analyzeGaps(stats, level, equipped) : []),
    [stats, level, equipped],
  )

  if (!selectedClass || !stats) return null

  const rowStyle = { background: 'var(--surface-stone)', border: '1px solid var(--metal-edge)' }

  // Only fires on an explicit click (the "Compare" button below) — expanding
  // the panel to read the gap list must never trigger a network request.
  function handleRequestBenchmark() {
    if (bench.kind !== 'idle' || !equipment || !sets || !selectedClass || !stats) return
    setBench({ kind: 'loading' })
    fetchCommunityBenchmark(selectedClass, level, stats, equipment, sets).then(result => {
      setBench(result ? { kind: 'ready', data: result } : { kind: 'empty' })
    })
  }

  return (
    <details className="group rounded-lg px-3 py-2" style={rowStyle}>
      <summary className="flex items-center gap-2 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="font-display text-[10px] uppercase tracking-[0.2em] font-bold flex-shrink-0" style={{ color: 'var(--gold)' }}>
          {t('gap_analysis_title')}
        </span>
        {findings.length > 0 ? (
          <span
            className="font-mono text-[10px] font-bold rounded-full px-1.5 leading-4 flex-shrink-0"
            style={{ background: 'color-mix(in srgb, var(--negative) 20%, transparent)', color: 'var(--negative)' }}
          >
            {findings.length}
          </span>
        ) : (
          <span className="text-[11px]" style={{ color: 'var(--positive)' }}>{t('gap_analysis_all_good')}</span>
        )}
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
      <div className="mt-2 pt-2 space-y-1" style={{ borderTop: '1px solid var(--metal-edge)' }}>
        <span className="font-display text-[9px] uppercase tracking-[0.18em] font-bold" style={{ color: 'var(--gold-muted)' }}>
          {t('gap_benchmark_title')}
        </span>
        <BenchmarkSection status={bench} onRequest={handleRequestBenchmark} />
      </div>
    </details>
  )
}
