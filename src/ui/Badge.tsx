import type { ReactNode } from 'react'
import { cn } from './cn'

type BadgeProps = {
  value:      ReactNode
  label?:     string
  color?:     string    // CSS var token e.g. 'var(--vitality)'
  size?:      'sm' | 'md' | 'lg'
  className?: string
}

export function Badge({ value, label, color, size = 'md', className }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center rounded-md border',
        size === 'sm' && 'px-1.5 py-0.5 gap-0',
        size === 'md' && 'px-2 py-1 gap-0',
        size === 'lg' && 'px-3 py-1.5 gap-0.5',
        className,
      )}
      style={{
        background:  color ? `color-mix(in srgb, ${color} 10%, var(--surface-panel))` : 'var(--surface-panel)',
        borderColor: color ? `color-mix(in srgb, ${color} 30%, var(--metal-edge))`    : 'var(--metal-edge)',
      }}
    >
      <span
        className={cn(
          'font-display font-bold tabular-nums leading-none',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base',
        )}
        style={{ color: color ?? 'var(--ink)' }}
      >
        {value}
      </span>
      {label && (
        <span
          className={cn(
            'font-medium uppercase tracking-wider',
            size === 'sm' && 'text-[8px]',
            size === 'md' && 'text-[9px]',
            size === 'lg' && 'text-[10px]',
          )}
          style={{ color: 'var(--ink-faint)' }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
