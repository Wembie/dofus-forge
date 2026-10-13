import { useTranslation } from 'react-i18next'
import { ALL_SLOTS, type SlotId, type RuneMap } from '@/store/buildStore.ts'
import type { BuildResult, StatConfig } from './types.ts'
import type { AppItem } from '@/data/loaders.ts'
import { OPTIMIZER_STATS } from './statList.ts'
import { statIconUrl, signatureRuneUrl } from '@/features/equipment/statDisplay.ts'

type Props = {
  result:      BuildResult
  rank:        number
  items:       AppItem[]
  stats:       StatConfig[]
  runes:       Partial<Record<SlotId, RuneMap>>
  lockedSlots: Set<SlotId>
  onLoad:      (result: BuildResult) => void
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function BuildResultCard({ result, rank, items, stats, runes, lockedSlots, onLoad }: Props) {
  const { t } = useTranslation()

  const itemMap = new Map(items.map(it => [it.ankama_id, it]))
  const equippedList = ALL_SLOTS
    .map(slot => ({ slot, item: itemMap.get(result.equipped[slot] ?? -1) }))
    .filter((e): e is { slot: SlotId; item: AppItem } => e.item != null)

  // Only a LOCKED slot's runes actually carry into the computed stats (the
  // optimizer never forges a brand-new item it just picked — see
  // optimizer.ts's lockedRuneEffects comment) — so this only ever flags
  // "yes" for gear the player already had forged runes on and kept, never
  // for anything the Forge itself chose.
  function hasForgedRune(slot: SlotId): boolean {
    if (!lockedSlots.has(slot)) return false
    return Object.values(runes[slot] ?? {}).some(v => v > 0)
  }

  // Every stat the user marked as a hard requirement (minVal > 0) must
  // always be shown — this used to be lumped in with priority-only stats
  // and capped at 6 total, so a build with 7+ required stats silently
  // dropped some of them from the card with no indication anything was
  // missing. Priority-only stats (weight > 0, no minVal) are secondary
  // context and still capped, but never at the cost of hiding a requirement.
  const requiredStats = stats.filter(s => s.minVal > 0).sort((a, b) => b.minVal - a.minVal)
  const priorityOnlyStats = stats.filter(s => s.minVal <= 0 && s.weight > 0).sort((a, b) => b.weight - a.weight)
  const topStats = [...requiredStats, ...priorityOnlyStats].slice(0, Math.max(6, requiredStats.length))
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
        <span className="text-base leading-none">{MEDALS[rank] ?? `#${rank}`}</span>
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
        {equippedList.map(({ slot, item }) => (
          <div key={slot} className="relative" title={hasForgedRune(slot) ? `${item.name} (Nv. ${item.level}) — ${t('magesmithy_title')}` : `${item.name} (Nv. ${item.level})`}>
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{
                background: 'var(--surface-panel)',
                border:     hasForgedRune(slot) ? '1px solid color-mix(in srgb, var(--ap) 60%, transparent)' : '1px solid var(--metal-edge)',
              }}
            >
              {item.image_url
                ? <img src={item.image_url} alt={item.name} width={32} height={32} className="object-contain" />
                : <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>?</span>
              }
            </div>
            {hasForgedRune(slot) && (
              <div
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--ap) 20%, var(--surface-void))', border: '1px solid var(--ap)' }}
              >
                <img src={signatureRuneUrl()} alt="" width={9} height={9} className="object-contain" />
              </div>
            )}
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
          onClick={() => onLoad(result)}
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
