import { useEffect, useRef, useState } from 'react'
import { useToastStore, type Toast } from '@/store/toastStore.ts'

const EXIT_MS = 180

type Phase = 'entering' | 'visible' | 'exiting'
type ToastWithPhase = Toast & { phase: Phase }

/**
 * Tracks each toast's enter/exit phase locally so a removed toast can
 * animate out before actually leaving the DOM — the same behavior
 * AnimatePresence gave us, without pulling framer-motion (~170KB) into
 * the eager bundle just for this fade+slide.
 */
function useToastPhases(toasts: Toast[]) {
  const [display, setDisplay] = useState<ToastWithPhase[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const storeIds = new Set(toasts.map(t => t.id))

    setDisplay(prev => {
      const prevById = new Map(prev.map(p => [p.id, p]))
      const next: ToastWithPhase[] = []

      // Current store toasts: new ones enter, existing ones keep their phase.
      for (const t of toasts) {
        const existing = prevById.get(t.id)
        next.push(existing ? { ...t, phase: existing.phase } : { ...t, phase: 'entering' })
      }

      // Toasts removed from the store but still animating out.
      for (const p of prev) {
        if (!storeIds.has(p.id)) next.push({ ...p, phase: 'exiting' })
      }

      return next
    })

    // Kick off exit timers for anything that just left the store.
    for (const p of display) {
      if (!storeIds.has(p.id) && p.phase !== 'exiting' && !timers.current.has(p.id)) {
        const timer = setTimeout(() => {
          setDisplay(d => d.filter(x => x.id !== p.id))
          timers.current.delete(p.id)
        }, EXIT_MS)
        timers.current.set(p.id, timer)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toasts])

  // Flip freshly-entered toasts to 'visible' a frame later so the CSS
  // transition has an initial state to animate from.
  useEffect(() => {
    const hasEntering = display.some(t => t.phase === 'entering')
    if (!hasEntering) return
    const raf = requestAnimationFrame(() => {
      setDisplay(d => d.map(t => (t.phase === 'entering' ? { ...t, phase: 'visible' } : t)))
    })
    return () => cancelAnimationFrame(raf)
  }, [display])

  useEffect(() => {
    const timers_ = timers.current
    return () => { timers_.forEach(clearTimeout) }
  }, [])

  return display
}

export function Toaster() {
  const toasts      = useToastStore(s => s.toasts)
  const removeToast = useToastStore(s => s.removeToast)
  const display      = useToastPhases(toasts)

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
      {display.map(toast => {
        const shown = toast.phase === 'visible'
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer select-none"
            style={{
              background: 'var(--forge-surface)',
              border:     '1px solid var(--forge-border)',
              color:      'var(--forge-text)',
              boxShadow:  '0 4px 16px rgba(0,0,0,0.5)',
              opacity:    shown ? 1 : 0,
              transform:  shown ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.93)',
              transition: `opacity ${EXIT_MS}ms ease-out, transform ${EXIT_MS}ms ease-out`,
            }}
            onClick={() => removeToast(toast.id)}
          >
            <span className="text-base leading-none">{toast.icon}</span>
            <span>{toast.message}</span>
          </div>
        )
      })}
    </div>
  )
}
