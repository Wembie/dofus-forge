import type { ReactNode } from 'react'
import { cn } from './cn'

type SectionHeaderProps = {
  label:     string
  action?:   ReactNode
  size?:     'sm' | 'md'
  className?: string
}

export function SectionHeader({ label, action, size = 'md', className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <h3
        className={cn(
          'font-display font-bold uppercase tracking-widest leading-none',
          size === 'sm' ? 'text-[10px]' : 'text-xs',
        )}
        style={{ color: 'var(--gold)' }}
      >
        {label}
      </h3>
      {action && <div className="flex items-center gap-1">{action}</div>}
    </div>
  )
}
