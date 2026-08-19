import { useTranslation } from 'react-i18next'
import { ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import type { BuildResult, StatWeight } from './types.ts'
import type { AppItem } from '@/data/loaders.ts'
import { OPTIMIZER_STATS } from './statList.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'

type Props = {
  result:  BuildResult
  rank:    1 | 2 | 3
  items:   AppItem[]
  weights: StatWeight[]
  onLoad:  (equipped: Partial<Record<SlotId, number>>) => void
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function BuildResultCard({ result, rank, items, weights, onLoad }: Props) {
  const { t } = useTranslation()

  const itemMap      = new Map(items.map(it => [it.ankama_id, it]))
  const equippedList = ALL_SLOTS
    .map(slot => itemMap.get(result.equipped[slot] ?? -1))
    .filter((it): it is AppItem => it != null)

  // Top-4 weighted stats to show in summary
  const topStats = [...weights]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)

  const statsNums = result.stats as unknown as Record<string, number>

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'var(--surface-void)',
        border:     `1px solid ${result.meetsRequired ? 'var(--metal-edge-strong)' : 'color-mix(in srgb, var(--negative) 40%, var(--metal-edge))'}`,
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid var(--metal-edge)', background: 'var(--surface-stone)' }}
      >
        <span className="text-base leading-none">{MEDALS[rank]}</span>
        <span className="text-[12px] font-bold font-display tracking-wider" style={{ color: 'var(--gold)' }}>
          {t('optimizer_rank', { n: rank })}
        </span>
        <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>
          {t('optimizer_score')}: {Math.round(result.score)}
        </span>
      </div>

      {/* Item images */}
      <div className="px-3 py-2 flex flex-wrap gap-1">
        {equippedList.map((item, idx) => (
          <div key={idx} title={item.name} className="relative">
            <div
              className="w-8 h-8 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)' }}
            >
              {item.image_url
                ? <img src={item.image_url} alt={item.name} width={28} height={28} className="object-contain" />
                : <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>?</span>
              }
            </div>
          </div>
        ))}
        {equippedList.length === 0 && (
          <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>—</span>
        )}
      </div>

      {/* Key stats */}
      {topStats.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-x-3 gap-y-0.5">
          {topStats.map(w => {
            const meta = OPTIMIZER_STATS.find(s => s.key === w.stat)
            if (!meta) return null
            return (
              <span key={w.stat} className="flex items-center gap-1 text-[11px]">
                <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain" />
                <span style={{ color: meta.color }} className="font-mono">{statsNums[w.stat] ?? 0}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Footer: requirements badge + load button */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ borderTop: '1px solid var(--metal-edge)' }}
      >
        <span
          className="text-[10px]"
          style={{ color: result.meetsRequired ? 'var(--positive, #5cb85c)' : 'var(--negative)' }}
        >
          {result.meetsRequired ? t('optimizer_meets_required') : '⚠ ' + t('optimizer_missing_required')}
        </span>
        <button
          onClick={() => onLoad(result.equipped)}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold flex-shrink-0 transition-colors"
          style={{
            background:  'color-mix(in srgb, var(--gold) 15%, transparent)',
            border:      '1px solid color-mix(in srgb, var(--gold) 40%, transparent)',
            color:       'var(--gold)',
          }}
        >
          {t('optimizer_load_build')} ▶
        </button>
      </div>
    </div>
  )
}
