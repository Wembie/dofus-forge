import { useEffect, useRef, useState } from 'react'
import { cn } from './cn'

type StatValueProps = {
  value:      number
  signed?:    boolean    // show + prefix and color by sign
  className?: string
}

export function StatValue({ value, signed = false, className }: StatValueProps) {
  const prevRef = useRef(value)
  const [ticking, setTicking] = useState(false)

  // Flash the stat-tick keyframe (defined in index.css, previously unused)
  // whenever the computed value actually changes — equipping/unequipping
  // gear should feel like it did something, not just silently update text.
  useEffect(() => {
    if (prevRef.current === value) return
    prevRef.current = value
    setTicking(true)
    const tid = setTimeout(() => setTicking(false), 260)
    return () => clearTimeout(tid)
  }, [value])

  if (value === 0) {
    return (
      <span className={cn('font-mono tabular-nums text-[11px]', ticking && 'stat-tick', className)} style={{ color: 'var(--ink-faint)' }}>
        —
      </span>
    )
  }

  const positive = value > 0
  const color    = signed
    ? (positive ? 'var(--positive)' : 'var(--negative)')
    : 'var(--ink)'
  const display  = signed ? `${positive ? '+' : ''}${value}` : String(value)

  return (
    <span
      className={cn('font-mono tabular-nums text-[11px] font-medium', ticking && 'stat-tick', className)}
      style={{ color }}
    >
      {display}
    </span>
  )
}
