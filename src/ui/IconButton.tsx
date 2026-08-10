import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export type IconButtonVariant = 'ghost' | 'subtle' | 'solid'
export type IconButtonSize    = 'xs' | 'sm' | 'md' | 'lg'

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label:     string       // required aria-label
  variant?:  IconButtonVariant
  size?:     IconButtonSize
  children:  ReactNode
}

const variantCls: Record<IconButtonVariant, string> = {
  ghost:  'bg-transparent text-ink-muted border-transparent hover:text-ink hover:bg-surface-raised active:bg-surface-panel',
  subtle: 'bg-surface-raised text-ink-muted border-metal-edge hover:text-ink hover:bg-surface-parchment active:bg-surface-stone',
  solid:  'bg-surface-parchment text-ink border-metal-edge hover:bg-surface-raised active:bg-surface-stone',
}

const sizeCls: Record<IconButtonSize, string> = {
  xs: 'w-5 h-5 rounded-xs',
  sm: 'w-6 h-6 rounded-sm',
  md: 'w-7 h-7 rounded-sm',
  lg: 'w-8 h-8 rounded-md',
}

export function IconButton({ label, variant = 'ghost', size = 'md', className, children, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center flex-shrink-0 border',
        'transition-colors duration-fast ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
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
