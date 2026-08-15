import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from './cn'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'

export type ModalProps = {
  open:       boolean
  onClose:    () => void
  title?:     string
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
  full: 'max-w-[calc(100vw-2rem)]',
}

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

export function Modal({ open, onClose, title, size = 'md', className, children }: ModalProps) {
  const { t }    = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId  = title ? 'modal-title' : undefined

  // Focus trap + ESC
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return

    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    focusable[0]?.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || focusable.length === 0) return
      const first = focusable[0]
      const last  = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(10,13,19,.8)' }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              'relative z-10 w-full rounded-frame overflow-hidden flex flex-col',
              'max-h-[90vh]',
              sizeMap[size],
              className,
            )}
            style={{
              background:  'var(--surface-panel)',
              border:      '1px solid var(--metal-edge-strong)',
              boxShadow:   'var(--shadow-frame), var(--inset-bevel)',
            }}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
