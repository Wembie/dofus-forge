import { cn } from './cn'

type StatValueProps = {
  value:      number
  signed?:    boolean    // show + prefix and color by sign
  className?: string
}

export function StatValue({ value, signed = false, className }: StatValueProps) {
  if (value === 0) {
    return (
      <span className={cn('font-mono tabular-nums text-[11px]', className)} style={{ color: 'var(--ink-faint)' }}>
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
      className={cn('font-mono tabular-nums text-[11px] font-medium', className)}
      style={{ color }}
    >
      {display}
    </span>
  )
}
