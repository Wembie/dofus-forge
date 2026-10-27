import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from './cn'
import { useFocusTrap } from './useFocusTrap'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full'

export type ModalProps = {
  open:       boolean
  onClose:    () => void
  title?:     string
  /** Accessible name when the modal draws its own heading instead of `title`. */
  ariaLabel?:  string
  labelledBy?: string
  size?:      ModalSize
  className?: string
  children:   ReactNode
}

const sizeMap: Record<ModalSize, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  '2xl':'max-w-2xl',
  '3xl':'max-w-3xl',
  '4xl':'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)]',
}

const EXIT_MS = 150

/**
 * Mount/unmount + enter/exit visibility state without an animation
 * library: `shouldRender` keeps the node in the DOM through the exit
 * transition; `isVisible` is flipped a frame after mount so the CSS
 * transition has an initial state to animate FROM (otherwise the browser
 * paints straight to the final state with no visible transition).
 */
function useMountTransition(open: boolean, exitMs: number) {
  const [shouldRender, setShouldRender] = useState(open)
  const [isVisible, setIsVisible]       = useState(false)

  useEffect(() => {
    let raf: number
    let timeout: ReturnType<typeof setTimeout>
    if (open) {
      setShouldRender(true)
      raf = requestAnimationFrame(() => setIsVisible(true))
    } else {
      setIsVisible(false)
      timeout = setTimeout(() => setShouldRender(false), exitMs)
    }
    return () => { cancelAnimationFrame(raf); clearTimeout(timeout) }
  }, [open, exitMs])

  return { shouldRender, isVisible }
}

export function Modal({ open, onClose, title, ariaLabel, labelledBy, size = 'md', className, children }: ModalProps) {
  const { t }    = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const autoId   = useId()
  const titleId  = title ? autoId : labelledBy
  const { shouldRender, isVisible } = useMountTransition(open, EXIT_MS)

  // Gated on shouldRender: the panel only exists a render after `open` flips.
  useFocusTrap(panelRef, open && shouldRender, onClose)

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!shouldRender) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ opacity: isVisible ? 1 : 0, transition: `opacity ${EXIT_MS}ms ease-out` }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(10,13,19,.8)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={titleId ? undefined : ariaLabel}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full rounded-frame overflow-hidden flex flex-col focus:outline-none',
          'max-h-[90vh]',
          sizeMap[size],
          className,
        )}
        style={{
          background:  'var(--surface-panel)',
          border:      '1px solid var(--metal-edge-strong)',
          boxShadow:   'var(--shadow-frame), var(--inset-bevel)',
          opacity:     isVisible ? 1 : 0,
          transform:   isVisible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(12px)',
          transition:  'opacity 220ms cubic-bezier(.2,.8,.2,1), transform 220ms cubic-bezier(.2,.8,.2,1)',
        }}
      >
        {/* Header */}
        {title && (
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--metal-edge)' }}
          >
            <h2
              id={titleId}
              className="font-display font-bold text-sm uppercase tracking-widest truncate"
              style={{ color: 'var(--gold)' }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label={t('modal_close')}
              className={cn(
                'flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-sm',
                'transition-colors duration-fast ease-out',
                'text-ink-faint hover:text-ink hover:bg-surface-raised',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
              )}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
