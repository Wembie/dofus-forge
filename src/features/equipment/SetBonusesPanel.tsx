import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import type { AppSet, AppEffect } from '@/data/loaders.ts'

function effectLabel(e: AppEffect): string {
  const sign = e.min >= 0 ? '+' : ''
  const val  = e.min !== e.max ? `${e.min}–${e.max}` : `${sign}${e.min}`
  return `${val} ${e.stat}`
}

function SetCard({ set, count }: { set: AppSet; count: number }) {
  const tiers     = Object.entries(set.bonuses)
    .map(([k, v]) => ({ pieces: Number(k), effects: v }))
    .sort((a, b) => a.pieces - b.pieces)
  const maxPieces = tiers.at(-1)?.pieces ?? 0

  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-forge-text truncate">{set.name}</span>
        <span className="font-mono text-[10px] text-forge-gold flex-shrink-0">{count}/{maxPieces}</span>
      </div>

      {tiers.map(({ pieces, effects }) => {
        const active = pieces <= count
        return (
          <div
            key={pieces}
            className={`pl-2 border-l-2 transition-colors ${active ? 'border-forge-gold' : 'border-forge-border'}`}
          >
            <span className={`text-[10px] font-mono mr-1 ${active ? 'text-forge-muted' : 'text-forge-muted/30'}`}>
              {pieces}pc:
            </span>
            {effects.map((e: AppEffect, i: number) => (
              <span key={i} className={`text-[10px] ${active ? 'text-forge-text' : 'text-forge-muted/30'}`}>
                {i > 0 && <span className="mx-0.5 text-forge-border">·</span>}
                {effectLabel(e)}
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export function SetBonusesPanel() {
  const { t }      = useTranslation()
  const equipped   = useBuildStore(s => s.equipped)
  const _equipment = useBuildStore(s => s._equipment)
  const _sets      = useBuildStore(s => s._sets)

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
    <div className="mt-4 pt-4 border-t border-forge-border space-y-3">
      <h2 className="font-display text-forge-gold text-sm uppercase tracking-widest">{t('active_sets')}</h2>
      <div className="space-y-4">
        {activeSets.map(({ set, count }) => (
          <SetCard key={set.ankama_id} set={set} count={count} />
        ))}
      </div>
    </div>
  )
}
