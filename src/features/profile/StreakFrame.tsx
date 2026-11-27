import type { ReactNode } from 'react'
import type { StreakFrameTier } from './milestones.ts'
import './streakFrame.css'

export function StreakFrameOrnament({ tier }: { tier: StreakFrameTier | null }) {
  if (!tier) return null
  const engraved = tier !== 'bronze'
  const crest = tier === 'gold' || tier === 'molten'
  return (
    <svg className="streak-frame-ornament" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <circle className="frame-rim" cx="60" cy="60" r="54" />
      {engraved && <circle className="frame-etch" cx="60" cy="60" r="57" />}
      <path className="frame-clasp" d="M2 56 6 53 12 56 12 64 6 67 2 64ZM108 56 114 53 118 56 118 64 114 67 108 64Z" />
      <path className="frame-rivet" d="M5 59H9V61H5ZM111 59H115V61H111Z" />
      {engraved && <path className="frame-clasp" d="M54 5 60 2 66 5 64 10H56Z" />}
      {crest ? (
        <g>
          <path className="frame-clasp" d="M48 110 54 107H66L72 110 67 117 60 120 53 117Z" />
          <path className="frame-stamp" d="M53 110H67L65 113H62V115H65V116H55V115H58V113H56Z" />
          {tier === 'molten' && <path className="frame-inlay" d="M59 2 62 5 60 8 57 5ZM3 60 6 57 9 60 6 63ZM111 60 114 57 117 60 114 63Z" />}
        </g>
      ) : <path className="frame-clasp" d="M56 111H64L66 115 60 118 54 115Z" />}
    </svg>
  )
}

export function StreakFrame({ tier, children }: { tier: StreakFrameTier | null; children: ReactNode }) {
  return <span className="streak-frame" data-tier={tier ?? undefined}>{children}<StreakFrameOrnament tier={tier} /></span>
}
