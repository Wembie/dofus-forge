import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

type FrameMaterial = 'stone' | 'parchment' | 'raised' | 'panel'
type FramePadding  = 'none' | 'xs' | 'sm' | 'md' | 'lg'

export type FrameProps = HTMLAttributes<HTMLDivElement> & {
  material?:  FrameMaterial
  padding?:   FramePadding
  elevation?: boolean
  inset?:     boolean
  gold?:      boolean
  children?:  ReactNode
}

const materialBg: Record<FrameMaterial, string> = {
  stone:     'bg-surface-stone',
  parchment: 'bg-surface-parchment',
  raised:    'bg-surface-raised',
  panel:     'bg-surface-panel',
}

const paddingCls: Record<FramePadding, string> = {
  none: 'p-0',
  xs:   'p-2',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
}

export function Frame({
  material  = 'stone',
  padding   = 'md',
  elevation = false,
  inset     = false,
  gold      = false,
  className,
  style,
  children,
  ...props
}: FrameProps) {
  const shadows = [
    'var(--inset-bevel)',
    elevation ? 'var(--shadow-frame)' : null,
    inset     ? 'var(--well-inset)'   : null,
  ].filter(Boolean).join(', ')

  return (
    <div
      className={cn('rounded-frame overflow-hidden', materialBg[material], paddingCls[padding], className)}
      style={{
        border:    `1px solid ${gold ? 'var(--gold-deep)' : 'var(--metal-edge)'}`,
        boxShadow: shadows,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
