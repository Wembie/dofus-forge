import type { ReactNode } from 'react'
import { cn } from './cn'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

type TooltipProps = {
  content:    ReactNode
  children:   ReactNode
  side?:      TooltipSide
  className?: string
}

const positionCls: Record<TooltipSide, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full top-1/2 -translate-y-1/2 ml-2',
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  return (
    <div className="relative inline-flex group">
      {children}
      <div
        className={cn(
          'absolute z-50 pointer-events-none whitespace-nowrap',
          'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100',
          'transition-[opacity,transform] duration-fast ease-out',
          'rounded-[5px] border text-[12px] px-2.5 py-2',
          positionCls[side],
          className,
        )}
        style={{
          background:  'var(--surface)',
          borderColor: 'var(--line)',
          color:       'var(--text)',
          boxShadow:   '0 8px 24px rgb(0 0 0 / 0.3)',
          transformOrigin: side === 'top' ? 'bottom center' : side === 'bottom' ? 'top center' : 'center',
        }}
      >
        {content}
      </div>
    </div>
  )
}
