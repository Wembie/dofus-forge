import { useTranslation } from 'react-i18next'
import { Ban, Pin } from 'lucide-react'
import { ALL_SLOTS, type SlotId, type RuneMap } from '@/store/buildStore.ts'
import type { BuildResult, ForgeRequirement } from './types.ts'
import type { AppItem } from '@/data/loaders.ts'
import { OPTIMIZER_STATS, POWER_BOOSTED, runeStatLabelKey } from './statList.ts'
import { statIconUrl, signatureRuneUrl, runeIconUrl } from '@/features/equipment/statDisplay.ts'

type Props = {
  result:      BuildResult
  rank:        number
  items:       AppItem[]
  requirements: ForgeRequirement[]
  runes:       Partial<Record<SlotId, RuneMap>>
  lockedSlots: Set<SlotId>
  onLoad:      (result: BuildResult) => void
  onBan?:      (itemId: number) => void
  /** Pins an item for the next forge. */
  onPin?:      (itemId: number) => void
  ribbon?:     { label: string; gold: boolean }
  bannedItems?: number[]
  requiredItems?: number[]
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
const EXO_ICON = { ap: 'ap', mp: 'mp', range: 'range' } as const

export function BuildResultCard({ result, rank, items, requirements, runes, lockedSlots, onLoad, onBan, onPin, bannedItems = [], requiredItems = [], ribbon }: Props) {
  const { t } = useTranslation()
  const runeLabel = (stat: string) => { const k = runeStatLabelKey(stat); return k ? t(k) : stat }

  const itemMap = new Map(items.map(it => [it.ankama_id, it]))
  const equippedList = ALL_SLOTS
    .map(slot => ({ slot, item: itemMap.get(result.equipped[slot] ?? -1) }))
    .filter((e): e is { slot: SlotId; item: AppItem } => e.item != null)

  // Only a LOCKED slot keeps the player's own forged runes in the result.
  function hasForgedRune(slot: SlotId): boolean {
    if (!lockedSlots.has(slot)) return false
    return Object.values(runes[slot] ?? {}).some(v => v > 0)
  }

  // Minimums always show; ley-only stats fill the rest up to 6.
  const goalStats = requirements.filter(r => r.minimum > 0).sort((a, b) => b.weight - a.weight)
  const weightOnly = requirements.filter(r => r.minimum <= 0 && r.weight > 0).sort((a, b) => b.weight - a.weight)
  const shownStats = [...goalStats, ...weightOnly].slice(0, Math.max(6, goalStats.length))
  const statsNums = result.stats as unknown as Record<string, number>
  const hasGoals = goalStats.length > 0
  const pointsLeft = result.stats.pointsBudget - result.stats.pointsSpent

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--surface-void)',
        border:     `1px solid ${result.meetsRequired || !hasGoals
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
        {hasGoals && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-semibold ml-1"
            style={{
              background: result.meetsRequired
                ? 'color-mix(in srgb, var(--positive, #5cb85c) 15%, transparent)'
                : 'color-mix(in srgb, var(--negative) 15%, transparent)',
              color: result.meetsRequired ? 'var(--positive, #5cb85c)' : 'var(--negative)',
            }}
          >
            {result.meetsRequired ? '✓' : `${result.requirementsMet}/${result.requirementsTotal}`}
          </span>
        )}
        {ribbon && (
          <span
            className="forge-pop text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ml-1"
            style={{ color: 'var(--surface-void)', background: ribbon.gold ? 'var(--gold)' : 'var(--ink-faint)', boxShadow: ribbon.gold ? '0 0 10px -2px var(--gold)' : 'none' }}
          >
            {ribbon.label}
          </span>
        )}
        <span
          className="ml-auto text-[10px] font-mono"
          style={{ color: result.score < 0 ? 'var(--negative)' : 'var(--ink-faint)' }}
          title={t('optimizer_quality_hint')}
        >
          {t('optimizer_quality')}: {Math.round(result.score).toLocaleString()}
        </span>
      </div>

      {/* Item images */}
      <div className="px-3 py-2 flex flex-wrap gap-1.5">
        {equippedList.map(({ slot, item }) => {
          const exo = result.exo[slot]
          const rune = result.runes[slot]
          const forged = hasForgedRune(slot)
          const pinned = requiredItems.includes(item.ankama_id)
          return (
            <div
              key={slot}
              className="relative group"
              title={`${item.name} (Nv. ${item.level})${pinned ? ` — 📌 ${t('optimizer_pinned_badge')}` : ''}${forged ? ` — ${t('magesmithy_title')}` : ''}${exo ? ` — ${t(`optimizer_exo_${exo}`)}` : ''}${rune ? ` — ${t('optimizer_rune_badge', { value: rune.value, stat: runeLabel(rune.stat) })}` : ''}`}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{
                  background: pinned ? 'color-mix(in srgb, var(--gold) 12%, var(--surface-panel))' : 'var(--surface-panel)',
                  border:     pinned ? '1px solid var(--gold)' : forged || exo || rune ? '1px solid color-mix(in srgb, var(--ap) 60%, transparent)' : '1px solid var(--metal-edge)',
                  boxShadow:  pinned ? '0 0 8px -3px var(--gold)' : 'none',
                }}
              >
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} width={32} height={32} className="object-contain" />
                  : <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>?</span>
                }
              </div>
              {forged && (
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--ap) 20%, var(--surface-void))', border: '1px solid var(--ap)' }}
                >
                  <img src={signatureRuneUrl()} alt="" width={9} height={9} className="object-contain" />
                </div>
              )}
              {exo && (
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--ap) 20%, var(--surface-void))', border: '1px solid var(--ap)' }}
                >
                  <img src={statIconUrl(EXO_ICON[exo])} alt="" width={9} height={9} className="object-contain" />
                </div>
              )}
              {rune && (
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--gold) 20%, var(--surface-void))', border: '1px solid var(--gold)' }}
                >
                  <img src={runeIconUrl(rune.stat) ?? signatureRuneUrl()} alt="" width={9} height={9} className="object-contain" />
                </div>
              )}
              {pinned && (
                <div
                  className="absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--gold)' }}
                  aria-label={t('optimizer_pinned_badge')}
                >
                  <Pin size={9} style={{ color: 'var(--surface-void)' }} />
                </div>
              )}
              {onPin && !pinned && !lockedSlots.has(slot) && (
                <button
                  type="button"
                  onClick={() => onPin(item.ankama_id)}
                  className="absolute -top-1 -left-1 w-4 h-4 rounded-full items-center justify-center hidden group-hover:flex"
                  style={{ background: 'var(--surface-void)', border: '1px solid var(--gold)' }}
                  title={t('optimizer_pin_item')}
                  aria-label={t('optimizer_pin_item')}
                >
                  <Pin size={9} style={{ color: 'var(--gold)' }} />
                </button>
              )}
              {onBan && !pinned && !lockedSlots.has(slot) && !bannedItems.includes(item.ankama_id) && (
                <button
                  type="button"
                  onClick={() => onBan(item.ankama_id)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full items-center justify-center hidden group-hover:flex"
                  style={{ background: 'var(--surface-void)', border: '1px solid var(--negative)' }}
                  title={t('optimizer_ban_item')}
                  aria-label={t('optimizer_ban_item')}
                >
                  <Ban size={9} style={{ color: 'var(--negative)' }} />
                </button>
              )}
            </div>
          )
        })}
        {equippedList.length === 0 && (
          <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>—</span>
        )}
      </div>

      {/* Key stats grid */}
      {shownStats.length > 0 && (
        <div className="px-3 pb-3 grid gap-x-3 gap-y-1.5 grid-cols-2 sm:grid-cols-3">
          {shownStats.map(cfg => {
            const meta = OPTIMIZER_STATS.find(s => s.key === cfg.stat)
            if (!meta) return null
            const own = statsNums[cfg.stat] ?? 0
            const val = POWER_BOOSTED.has(cfg.stat) ? own + result.stats.power : own
            const meetsGoal = cfg.minimum <= 0 || val >= cfg.minimum
            return (
              <div
                key={cfg.stat}
                className="flex items-center gap-1.5"
                title={POWER_BOOSTED.has(cfg.stat) ? t('optimizer_power_included', { own, power: result.stats.power }) : t(meta.tKey)}
              >
                <img src={statIconUrl(meta.icon)} alt={t(meta.tKey)} width={13} height={13} className="object-contain flex-shrink-0" />
                <span className="text-[12px] font-mono font-bold" style={{ color: meetsGoal ? meta.color : 'var(--negative)' }}>
                  {val}
                </span>
                {cfg.minimum > 0 && (
                  <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>/{cfg.minimum}</span>
                )}
                {cfg.minimum > 0 && val > cfg.minimum && (
                  <span className="text-[9px] font-mono" style={{ color: 'var(--positive, #5cb85c)' }} title={t('optimizer_surplus_title')}>+{val - cfg.minimum}</span>
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
        <div className="flex flex-col gap-0.5">
          {hasGoals && (
            <span className="text-[10px]" style={{ color: result.meetsRequired ? 'var(--positive, #5cb85c)' : 'var(--negative)' }}>
              {result.meetsRequired ? t('optimizer_meets_required') : '⚠ ' + t('optimizer_missing_required')}
            </span>
          )}
          {pointsLeft > 0 && (
            <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_points_left', { n: pointsLeft })}</span>
          )}
        </div>
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
