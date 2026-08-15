import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import { useBuildStore } from '@/store/buildStore.ts'
import type { AppSet, AppEffect } from '@/data/loaders.ts'
import { SetDetailModal } from './SetDetailModal.tsx'
import { IconButton, Frame } from '@/ui'
import { STAT_META, statIconUrl } from './statDisplay.ts'

// ── Piece progress dots ───────────────────────────────────────────────────────

function PieceDots({ count, max }: { count: number; max: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className="rounded-full transition-all"
          style={{
            width:      i < count ? 9 : 6,
            height:     i < count ? 9 : 6,
            background: i < count ? 'var(--gold)' : 'var(--metal-edge)',
          }}
        />
      ))}
    </div>
  )
}

// ── Effect row ────────────────────────────────────────────────────────────────

function EffectRow({ e, active }: { e: AppEffect; active: boolean }) {
  const { t }  = useTranslation()
  const meta   = STAT_META[e.stat]
  const isNeg  = e.min < 0
  const color  = active
    ? (isNeg ? 'var(--negative)' : (meta?.color ?? 'var(--ink-muted)'))
    : 'var(--ink-faint)'
  const sign   = e.min >= 0 ? '+' : ''
  const val    = (e.min !== e.max && e.max !== 0 && e.max > e.min)
    ? `${sign}${e.min}–${e.max}`
    : `${sign}${e.min}`

  return (
    <div className="flex items-center gap-1.5" style={{ opacity: active ? 1 : 0.4 }}>
      {meta?.icon
        ? <img src={statIconUrl(meta.icon)} alt="" width={13} height={13}
            style={{ objectFit: 'contain', flexShrink: 0 }} />
        : <span style={{ width: 13, flexShrink: 0 }} />
      }
      <span className="font-mono font-bold text-[12px] tabular-nums flex-shrink-0" style={{ color }}>
        {val}
      </span>
      <span className="text-[12px] leading-tight truncate" style={{ color }}>
        {meta ? t(meta.tKey) : e.stat}
      </span>
    </div>
  )
}

// ── Compact set card — shows only current active tier ────────────────────────

function SetCard({ set, count, onOpen }: { set: AppSet; count: number; onOpen: () => void }) {
  const { t }      = useTranslation()
  const tiers      = Object.entries(set.bonuses)
    .map(([k, v]) => ({ pieces: Number(k), effects: v }))
    .sort((a, b) => a.pieces - b.pieces)
  const maxPieces  = tiers.at(-1)?.pieces ?? 0
  const activeTier = [...tiers].reverse().find(tier => tier.pieces <= count) ?? null
  const nextTier   = tiers.find(tier => tier.pieces > count) ?? null
  const showTier   = activeTier ?? nextTier
  const isLocked   = activeTier == null

  return (
    <Frame material="panel" padding="none" className="rounded-xl min-w-0">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ background: 'var(--surface-void)', borderBottom: '1px solid var(--metal-edge)' }}
      >
        <PieceDots count={count} max={maxPieces} />

        <button
          onClick={onOpen}
          className="flex-1 text-left text-[13px] font-bold truncate min-w-0 transition-opacity hover:opacity-75"
          style={{ color: 'var(--gold)' }}
          title={set.name}
        >
          {set.name}
        </button>

        <span
          className="font-mono text-[12px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded"
          style={{
            background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
            color:      'var(--gold)',
            border:     '1px solid color-mix(in srgb, var(--gold) 20%, transparent)',
          }}
        >
          {count}<span style={{ color: 'var(--gold-deep)' }}>/{maxPieces}</span>
        </span>

        <IconButton label="View set" variant="subtle" size="sm" onClick={onOpen} title={t('view_set')}>
          <Eye size={13} />
        </IconButton>
      </div>

      {/* Active tier effects only */}
      {showTier && (
        <div className="px-3 py-2.5">
          <span
            className="inline-block text-[11px] font-mono font-bold mb-2 px-1.5 py-px rounded"
            style={{
              background: isLocked
                ? 'color-mix(in srgb, var(--ink-faint) 10%, transparent)'
                : 'color-mix(in srgb, var(--gold) 12%, transparent)',
              color: isLocked ? 'var(--ink-faint)' : 'var(--gold)',
              border: isLocked
                ? '1px solid color-mix(in srgb, var(--metal-edge) 60%, transparent)'
                : '1px solid color-mix(in srgb, var(--gold) 20%, transparent)',
            }}
          >
            {isLocked ? t('set_next_tier', { n: showTier.pieces }) : t('set_tier', { n: showTier.pieces })}
          </span>
          <div className="flex flex-col gap-1">
            {showTier.effects.map((e: AppEffect, i: number) => (
              <EffectRow key={i} e={e} active={!isLocked} />
            ))}
          </div>
        </div>
      )}
    </Frame>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function SetBonusesPanel() {
  const { t }      = useTranslation()
  const equipped   = useBuildStore(s => s.equipped)
  const _equipment = useBuildStore(s => s._equipment)
  const _sets      = useBuildStore(s => s._sets)

  const [openSet, setOpenSet] = useState<AppSet | null>(null)

  const activeSets = useMemo(() => {
    const equipMap   = new Map(_equipment.map(it => [it.ankama_id, it]))
    const countBySet = new Map<number, number>()

    for (const id of Object.values(equipped)) {
      if (id == null) continue
      const item = equipMap.get(id)
      if (item?.set_id != null) {
        countBySet.set(item.set_id, (countBySet.get(item.set_id) ?? 0) + 1)
      }
    }

    return _sets
      .filter(s => countBySet.has(s.ankama_id))
      .map(s => ({ set: s, count: countBySet.get(s.ankama_id)! }))
      .sort((a, b) => b.count - a.count)
  }, [equipped, _equipment, _sets])

  if (activeSets.length === 0) return null

  const gridClass =
    activeSets.length === 1 ? '' :
    activeSets.length === 2 ? 'grid grid-cols-2 gap-3' :
                              'grid grid-cols-3 gap-3'

  return (
    <>
      <div className="px-3 pb-4">
        <div className="flex items-center gap-2 pt-3 mb-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
          <h2 className="font-display text-forge-gold text-sm uppercase tracking-widest flex-1">
            {t('active_sets')}
          </h2>
          <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>
            {t('set_count', { count: activeSets.length })}
          </span>
        </div>

        <div className={gridClass || 'space-y-2'}>
          {activeSets.map(({ set, count }) => (
            <SetCard
              key={set.ankama_id}
              set={set}
              count={count}
              onOpen={() => setOpenSet(set)}
            />
          ))}
        </div>
      </div>

      {openSet && (
        <SetDetailModal set={openSet} onClose={() => setOpenSet(null)} />
      )}
    </>
  )
}
