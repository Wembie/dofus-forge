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
            width:      i < count ? 7 : 5,
            height:     i < count ? 7 : 5,
            background: i < count ? 'var(--gold)' : 'var(--metal-edge)',
          }}
        />
      ))}
    </div>
  )
}

// ── Set card ──────────────────────────────────────────────────────────────────

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
    <div className="flex items-center gap-1" style={{ opacity: active ? 1 : 0.28 }}>
      {meta?.icon
        ? <img src={statIconUrl(meta.icon)} alt="" width={10} height={10}
            style={{ objectFit: 'contain', flexShrink: 0 }} />
        : <span style={{ width: 10, flexShrink: 0 }} />
      }
      <span className="font-mono font-bold text-[10px] tabular-nums flex-shrink-0" style={{ color }}>
        {val}
      </span>
      <span className="text-[10px] leading-tight" style={{ color }}>
        {meta ? t(meta.tKey) : e.stat}
      </span>
    </div>
  )
}

function SetCard({ set, count, onOpen }: { set: AppSet; count: number; onOpen: () => void }) {
  const tiers     = Object.entries(set.bonuses)
    .map(([k, v]) => ({ pieces: Number(k), effects: v }))
    .sort((a, b) => a.pieces - b.pieces)
  const maxPieces = tiers.at(-1)?.pieces ?? 0

  return (
    <Frame material="panel" padding="none" className="rounded-xl">
      {/* Card header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background:   'var(--surface-void)',
          borderBottom: '1px solid var(--metal-edge)',
        }}
      >
        <PieceDots count={count} max={maxPieces} />

        <button
          onClick={onOpen}
          className="flex-1 text-left text-[12px] font-bold truncate transition-colors hover:text-forge-gold"
          style={{ color: 'var(--gold)' }}
          title={`View ${set.name} — ${count}/${maxPieces} pieces`}
        >
          {set.name}
        </button>

        <span
          className="font-mono text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded"
          style={{
            background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
            color:      'var(--gold)',
            border:     '1px solid color-mix(in srgb, var(--gold) 20%, transparent)',
          }}
        >
          {count}<span style={{ color: 'var(--gold-deep)' }}>/{maxPieces}</span>
        </span>

        <IconButton
          label="View set"
          variant="subtle"
          size="sm"
          onClick={onOpen}
          title="View set & equip items"
        >
          <Eye size={12} />
        </IconButton>
      </div>

      {/* Tier bonuses */}
      <div className="px-3 py-2 space-y-1.5">
        {tiers.map(({ pieces, effects }) => {
          const active = pieces <= count
          const isNext = !active && pieces === tiers.find(t => t.pieces > count)?.pieces

          return (
            <div key={pieces} className="flex gap-2">
              <span
                className="flex-shrink-0 text-[10px] font-bold font-mono w-6 text-right leading-tight pt-0.5"
                style={{ color: active ? 'var(--gold)' : isNext ? 'var(--ink-faint)' : 'var(--metal-edge)' }}
              >
                {pieces}pc
              </span>

              <div
                className="w-px flex-shrink-0 rounded-full"
                style={{
                  background: active ? 'var(--gold)' : isNext ? 'var(--metal-edge)' : 'var(--surface-raised)',
                  minHeight:  14,
                }}
              />

              <div className="flex flex-col gap-0.5">
                {effects.map((e: AppEffect, i: number) => (
                  <EffectRow key={i} e={e} active={active} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
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

  return (
    <>
      <div className="px-3 pb-4 space-y-2">
        <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--metal-edge)' }}>
          <h2 className="font-display text-forge-gold text-xs uppercase tracking-widest flex-1">
            {t('active_sets')}
          </h2>
          <span className="text-[9px] font-mono" style={{ color: 'var(--ink-faint)' }}>
            {activeSets.length} set{activeSets.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-2">
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
