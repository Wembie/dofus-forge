import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { STAT_DEF_BY_KEY } from './compareStats.ts'
import type { StatBlock } from '@/engine/types.ts'

// Mixed-scale stats (HP in the thousands, AP in the single digits) read fine
// on one radar only because each axis is normalized against its own A-vs-B
// max, not a shared scale — the shape shows who dominates each axis, not
// absolute magnitude.
const RADAR_KEYS: (keyof StatBlock)[] = ['maxHp', 'ap', 'mp', 'range', 'critChance', 'initiative']

const SIZE   = 200
const CENTER = SIZE / 2
const RADIUS = 72

function pointAt(angleDeg: number, r: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) }
}

function polygonPoints(values: number[]) {
  return values
    .map((v, i) => {
      const p = pointAt((360 / values.length) * i, RADIUS * Math.max(0, Math.min(1, v)))
      return `${p.x},${p.y}`
    })
    .join(' ')
}

export function CompareRadar({ statsA, statsB }: { statsA: StatBlock; statsB: StatBlock }) {
  const { t } = useTranslation()
  const n = RADAR_KEYS.length

  const { normA, normB } = useMemo(() => {
    const a: number[] = []
    const b: number[] = []
    for (const key of RADAR_KEYS) {
      const av = Number(statsA[key]) || 0
      const bv = Number(statsB[key]) || 0
      const axisMax = Math.max(av, bv, 1)
      a.push(av / axisMax)
      b.push(bv / axisMax)
    }
    return { normA: a, normB: b }
  }, [statsA, statsB])

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" style={{ maxWidth: 220, margin: '0 auto', display: 'block' }}>
      {[0.25, 0.5, 0.75, 1].map(ring => (
        <polygon
          key={ring}
          points={polygonPoints(RADAR_KEYS.map(() => ring))}
          style={{ fill: 'none', stroke: 'var(--metal-edge)', strokeWidth: 0.5, opacity: 0.6 }}
        />
      ))}
      {RADAR_KEYS.map((_, i) => {
        const p = pointAt((360 / n) * i, RADIUS)
        return (
          <line
            key={i}
            x1={CENTER} y1={CENTER} x2={p.x} y2={p.y}
            style={{ stroke: 'var(--metal-edge)', strokeWidth: 0.5, opacity: 0.6 }}
          />
        )
      })}
      <polygon
        points={polygonPoints(normB)}
        style={{ fill: 'color-mix(in srgb, var(--water) 22%, transparent)', stroke: 'var(--water)', strokeWidth: 1.5 }}
      />
      <polygon
        points={polygonPoints(normA)}
        style={{ fill: 'color-mix(in srgb, var(--gold) 22%, transparent)', stroke: 'var(--gold)', strokeWidth: 1.5 }}
      />
      {RADAR_KEYS.map((key, i) => {
        const def = STAT_DEF_BY_KEY.get(key)
        if (!def) return null
        const p = pointAt((360 / n) * i, RADIUS + 16)
        return (
          <g key={key} transform={`translate(${p.x - 7}, ${p.y - 7})`}>
            <title>{t(def.tKey)}</title>
            <image href={statIconUrl(def.icon)} width={14} height={14} />
          </g>
        )
      })}
    </svg>
  )
}
