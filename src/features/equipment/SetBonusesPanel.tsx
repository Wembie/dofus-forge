import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import type { AppSet, AppEffect } from '@/data/loaders.ts'
import { SetDetailModal } from './SetDetailModal.tsx'

function effectLabel(e: AppEffect): string {
  const sign = e.min >= 0 ? '+' : ''
  const val  = (e.min !== e.max && e.max !== 0 && e.max > e.min)
    ? `${sign}${e.min}–${e.max}`
    : `${sign}${e.min}`
  return `${val} ${e.stat}`
}

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
            background: i < count ? '#c9a84c' : '#2a3347',
            boxShadow:  i < count ? '0 0 5px #c9a84c88' : 'none',
          }}
        />
      ))}
    </div>
  )
}

// ── Set card ──────────────────────────────────────────────────────────────────

function SetCard({ set, count, onOpen }: { set: AppSet; count: number; onOpen: () => void }) {
  const tiers     = Object.entries(set.bonuses)
    .map(([k, v]) => ({ pieces: Number(k), effects: v }))
    .sort((a, b) => a.pieces - b.pieces)
  const maxPieces = tiers.at(-1)?.pieces ?? 0

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#0b0e1a', border: '1px solid #1c2333' }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background:   'linear-gradient(90deg, #13182a 0%, #0d1020 100%)',
          borderBottom: '1px solid #1c2740',
        }}
      >
        <PieceDots count={count} max={maxPieces} />

        <button
          onClick={onOpen}
          className="flex-1 text-left text-[12px] font-bold truncate transition-colors hover:text-forge-gold"
          style={{ color: '#c9a84c' }}
          title={`View ${set.name} — ${count}/${maxPieces} pieces`}
        >
          {set.name}
        </button>

        <span
          className="font-mono text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded"
          style={{ background: '#c9a84c18', color: '#c9a84c', border: '1px solid #c9a84c33' }}
        >
          {count}<span style={{ color: '#7a5a20' }}>/{maxPieces}</span>
        </span>

        <button
          onClick={onOpen}
          className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-sm transition-colors"
          style={{ background: '#1c2740', border: '1px solid #2a3f60', color: '#4a6888' }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#22304e'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#7ab8e0'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#1c2740'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#4a6888'
          }}
          title="View set & equip items"
          aria-label="View set"
        >⊕</button>
      </div>

      {/* Tier bonuses */}
      <div className="px-3 py-2 space-y-1.5">
        {tiers.map(({ pieces, effects }) => {
          const active = pieces <= count
          const isNext = !active && tiers.find(t => !t || true) && pieces === tiers.find(t => t.pieces > count)?.pieces

          return (
            <div key={pieces} className="flex gap-2">
              {/* Tier label */}
              <span
                className="flex-shrink-0 text-[10px] font-bold font-mono w-6 text-right leading-tight pt-0.5"
                style={{ color: active ? '#c9a84c' : isNext ? '#4a5268' : '#2a3347' }}
              >
                {pieces}pc
              </span>

              {/* Border */}
              <div
                className="w-px flex-shrink-0 rounded-full"
                style={{
                  background: active ? '#c9a84c' : isNext ? '#2a3347' : '#1c2333',
                  minHeight:  14,
                }}
              />

              {/* Effects */}
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {effects.map((e: AppEffect, i: number) => (
                  <span
                    key={i}
                    className="text-[10px] leading-tight"
                    style={{ color: active ? '#c0c8e0' : isNext ? '#2a3a50' : '#1c2740' }}
                  >
                    {effectLabel(e)}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
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
        <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid #1c2333' }}>
          <h2 className="font-display text-forge-gold text-xs uppercase tracking-widest flex-1">
            {t('active_sets')}
          </h2>
          <span className="text-[9px] font-mono" style={{ color: '#2a3347' }}>
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
