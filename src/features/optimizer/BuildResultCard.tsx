import { useTranslation } from 'react-i18next'
import { ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import type { BuildResult, StatConfig } from './types.ts'
import type { AppItem } from '@/data/loaders.ts'
import { OPTIMIZER_STATS } from './statList.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'

type Props = {
  result:  BuildResult
  rank:    1 | 2 | 3
  items:   AppItem[]
  stats:   StatConfig[]
  onLoad:  (equipped: Partial<Record<SlotId, number>>) => void
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function BuildResultCard({ result, rank, items, stats, onLoad }: Props) {
  const { t } = useTranslation()

  const itemMap      = new Map(items.map(it => [it.ankama_id, it]))
  const equippedList = ALL_SLOTS
    .map(slot => itemMap.get(result.equipped[slot] ?? -1))
    .filter((it): it is AppItem => it != null)

  const topStats = stats
    .filter(s => s.minVal > 0 || s.weight > 0)
    .sort((a, b) => (b.minVal - a.minVal) || (b.weight - a.weight))
    .slice(0, 6)
  const statsNums = result.stats as unknown as Record<string, number>
  const hasRequired = stats.some(s => s.minVal > 0)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--surface-void)',
        border:     `1px solid ${result.meetsRequired || !hasRequired
          ? 'var(--metal-edge-strong)'
          : 'color-mix(in srgb, var(--negative) 45%, var(--metal-edge))'}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid var(--metal-edge)', background: 'var(--surface-stone)' }}
      >
        <span className="text-base leading-none">{MEDALS[rank]}</span>
        <span className="text-[12px] font-bold font-display tracking-wider" style={{ color: 'var(--gold)' }}>
          {t('optimizer_rank', { n: rank })}
        </span>
        {hasRequired && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-semibold ml-1"
            style={{
              background: result.meetsRequired
                ? 'color-mix(in srgb, var(--positive, #5cb85c) 15%, transparent)'
                : 'color-mix(in srgb, var(--negative) 15%, transparent)',
              color: result.meetsRequired ? 'var(--positive, #5cb85c)' : 'var(--negative)',
            }}
          >
            {result.meetsRequired ? '✓' : '⚠'}
          </span>
        )}
        <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>
          {t('optimizer_score')}: {Math.round(result.score)}
        </span>
      </div>

      {/* Item images */}
      <div className="px-3 py-2 flex flex-wrap gap-1.5">
        {equippedList.map((item, idx) => (
          <div key={idx} title={`${item.name} (Nv. ${item.level})`}>
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{
                background: 'var(--surface-panel)',
                border:     '1px solid var(--metal-edge)',
              }}
            >
              {item.image_url
                ? <img src={item.image_url} alt={item.name} width={32} height={32} className="object-contain" />
                : <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>?</span>
              }
            </div>
          </div>
        ))}
        {equippedList.length === 0 && (
          <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>—</span>
        )}
      </div>

      {/* Key stats grid */}
      {topStats.length > 0 && (
        <div
          className="px-3 pb-3 grid gap-x-3 gap-y-1.5"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
        >
          {topStats.map(cfg => {
            const meta = OPTIMIZER_STATS.find(s => s.key === cfg.stat)
            if (!meta) return null
            const val = statsNums[cfg.stat] ?? 0
            const meetsMin = cfg.minVal <= 0 || val >= cfg.minVal
            return (
              <div key={cfg.stat} className="flex items-center gap-1.5">
                <img src={statIconUrl(meta.icon)} alt="" width={13} height={13} className="object-contain flex-shrink-0" />
                <span
                  className="text-[12px] font-mono font-bold"
                  style={{ color: meetsMin ? meta.color : 'var(--negative)' }}
                >
                  {val}
                </span>
                {cfg.minVal > 0 && (
                  <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>
                    /{cfg.minVal}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ borderTop: '1px solid var(--metal-edge)' }}
      >
        {hasRequired ? (
          <span
            className="text-[10px]"
            style={{ color: result.meetsRequired ? 'var(--positive, #5cb85c)' : 'var(--negative)' }}
          >
            {result.meetsRequired ? t('optimizer_meets_required') : '⚠ ' + t('optimizer_missing_required')}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={() => onLoad(result.equipped)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold flex-shrink-0 transition-colors"
          style={{
            background:  'color-mix(in srgb, var(--ap) 15%, transparent)',
            border:      '1px solid color-mix(in srgb, var(--ap) 40%, transparent)',
            color:       'var(--ap)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--ap) 25%, transparent)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--ap) 15%, transparent)'
          }}
        >
          {t('optimizer_load_build')} →
        </button>
      </div>
    </div>
  )
}
