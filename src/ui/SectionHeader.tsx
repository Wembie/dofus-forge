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
      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
        <div style={{ width: 3, height: size === 'sm' ? 10 : 12, background: 'var(--gold-deep)', borderRadius: 1, flexShrink: 0 }} />
        <h3
          className={cn(
            'font-display font-bold uppercase tracking-widest leading-none flex-shrink-0',
            size === 'sm' ? 'text-[10px]' : 'text-[11px]',
          )}
          style={{ color: 'var(--gold)' }}
        >
          {label}
        </h3>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--gold-deep), transparent)', opacity: 0.45, minWidth: 8 }} />
      </div>
      {action && <div className="flex items-center gap-1 flex-shrink-0">{action}</div>}
    </div>
  )
}
