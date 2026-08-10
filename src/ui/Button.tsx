import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:  ButtonVariant
  size?:     ButtonSize
  children:  ReactNode
}

const variantCls: Record<ButtonVariant, string> = {
  primary:   'bg-gold text-ink-invert border-transparent hover:bg-gold-bright active:bg-gold-deep',
  secondary: 'bg-surface-raised text-ink border-metal-edge hover:bg-surface-parchment hover:border-metal-strong active:bg-surface-stone',
  ghost:     'bg-transparent text-ink-muted border-transparent hover:text-ink hover:bg-surface-raised active:bg-surface-panel',
  danger:    'bg-transparent text-bad border-metal-edge hover:bg-bad/10 active:bg-bad/20',
}

const sizeCls: Record<ButtonSize, string> = {
  xs: 'px-2 py-0.5 text-[10px] rounded-xs gap-1',
  sm: 'px-2.5 py-1 text-[11px] rounded-sm gap-1',
  md: 'px-4 py-1.5 text-xs rounded-md gap-1.5',
  lg: 'px-5 py-2 text-sm rounded-md gap-2',
}

export function Button({ variant = 'secondary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium border',
        'transition-colors duration-fast ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1',
        'disabled:opacity-40 disabled:pointer-events-none',
        variantCls[variant],
        sizeCls[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
