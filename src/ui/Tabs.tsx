import { useLayoutEffect, useRef, useState, type ElementType, type CSSProperties } from 'react'
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

type IndicatorRect = { left: number; width: number }

/**
 * Measures the active tab button and positions a CSS-transitioned
 * indicator behind/under it — replaces framer-motion's `layoutId` shared
 * layout animation, which pulled the ~170KB motion/framer-motion bundle
 * into the eager main chunk just for this sliding highlight. A plain
 * `transition: transform/width` on an absolutely-positioned element gets
 * the same slide, animated natively by the browser compositor.
 */
function useSlidingIndicator(containerRef: React.RefObject<HTMLDivElement | null>, activeId: string) {
  const [rect, setRect]     = useState<IndicatorRect | null>(null)
  const hasMounted          = useRef(false)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const measure = () => {
      const activeEl = container.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeId)}"]`)
      if (!activeEl) return
      const containerRect = container.getBoundingClientRect()
      const activeRect    = activeEl.getBoundingClientRect()
      setRect({ left: activeRect.left - containerRect.left, width: activeRect.width })
    }

    measure()
    hasMounted.current = true

    const ro = new ResizeObserver(measure)
    ro.observe(container)
    return () => ro.disconnect()
  }, [activeId, containerRef])

  return { rect, animate: hasMounted.current }
}

export function Tabs({ items, active, onChange, variant = 'segment', className, style }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { rect, animate } = useSlidingIndicator(containerRef, active)

  if (variant === 'bottom-bar') {
    return (
      <nav
        ref={containerRef}
        role="tablist"
        className={cn('relative flex items-stretch border-t', className)}
        style={{ background: 'var(--surface-stone)', borderColor: 'var(--metal-edge)', ...style }}
      >
        {rect && (
          <span
            className="absolute top-0 h-px rounded-full pointer-events-none"
            style={{
              left:       rect.left + 8,
              width:      Math.max(0, rect.width - 16),
              background: 'var(--gold)',
              transition: animate ? 'left 260ms cubic-bezier(.2,.8,.2,1), width 260ms cubic-bezier(.2,.8,.2,1)' : 'none',
            }}
          />
        )}
        {items.map(({ id, label, Icon }) => {
          const isActive = id === active
          return (
            <button
              key={id}
              data-tab-id={id}
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
      ref={containerRef}
      role="tablist"
      className={cn('relative flex items-center rounded-md p-0.5 gap-0.5', className)}
      style={{ background: 'var(--surface-stone)', border: '1px solid var(--metal-edge)' }}
    >
      {rect && (
        <span
          className="absolute top-0.5 bottom-0.5 rounded-sm pointer-events-none"
          style={{
            left:       rect.left,
            width:      rect.width,
            background: 'var(--surface-parchment)',
            boxShadow:  'var(--inset-bevel)',
            borderBottom: '1px solid var(--gold-deep)',
            transition: animate ? 'left 260ms cubic-bezier(.2,.8,.2,1), width 260ms cubic-bezier(.2,.8,.2,1)' : 'none',
          }}
        />
      )}
      {items.map(({ id, label, Icon }) => {
        const isActive = id === active
        return (
          <button
            key={id}
            data-tab-id={id}
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
