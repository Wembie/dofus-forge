import { type ElementType, type CSSProperties } from 'react'
import { motion } from 'motion/react'
import { cn } from './cn'

export type TabItem = {
  id:    string
  label: string
  Icon:  ElementType
}

type TabsProps = {
  items:     TabItem[]
  active:    string
  onChange:  (id: string) => void
  variant?:  'segment' | 'bottom-bar'
  className?: string
  style?:    CSSProperties
}

export function Tabs({ items, active, onChange, variant = 'segment', className, style }: TabsProps) {
  if (variant === 'bottom-bar') {
    return (
      <nav
        role="tablist"
        className={cn('flex items-stretch border-t', className)}
        style={{ background: 'var(--surface-stone)', borderColor: 'var(--metal-edge)', ...style }}
      >
        {items.map(({ id, label, Icon }) => {
          const isActive = id === active
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(id)}
              className={cn(
                'relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2',
                'text-[9px] font-medium uppercase tracking-wider',
                'transition-colors duration-fast ease-out',
                'focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-gold/50',
              )}
              style={{ color: isActive ? 'var(--gold)' : 'var(--ink-faint)' }}
            >
              {isActive && (
                <motion.span
                  layoutId="bottom-tab-indicator"
                  className="absolute top-0 left-2 right-2 h-px rounded-full"
                  style={{ background: 'var(--gold)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon size={16} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>
    )
  }

  // segment variant
  return (
    <div
      role="tablist"
      className={cn('flex items-center rounded-md p-0.5 gap-0.5', className)}
      style={{ background: 'var(--surface-stone)', border: '1px solid var(--metal-edge)' }}
    >
      {items.map(({ id, label, Icon }) => {
        const isActive = id === active
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-1.5 rounded-sm',
              'text-[11px] font-medium',
              'transition-colors duration-fast ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
              isActive ? 'text-gold' : 'text-ink-muted hover:text-ink',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="segment-tab-bg"
                className="absolute inset-0 rounded-sm"
                style={{
                  background: 'var(--surface-parchment)',
                  boxShadow:  'var(--inset-bevel)',
                  borderBottom: '1px solid var(--gold-deep)',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon size={12} />
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
