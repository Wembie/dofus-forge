import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter(el => typeof el.checkVisibility !== 'function' || el.checkVisibility())
}

// Dialogs stack (catalog → set detail on top); only the topmost one may
// react to Tab/Escape, otherwise the layer below yanks focus back out.
const stack: object[] = []

/**
 * Modal-dialog keyboard contract for any overlay: moves focus inside when
 * it activates (unless an autoFocus child already took it), keeps Tab
 * cycling within it, optionally closes on Escape, and returns focus to
 * whatever opened it on deactivate.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement>,
  active = true,
  onEscape?: () => void,
) {
  const escapeRef = useRef(onEscape)
  useEffect(() => { escapeRef.current = onEscape })

  useEffect(() => {
    if (!active) return
    const token = {}
    stack.push(token)
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const root = ref.current
    if (root && !root.contains(document.activeElement)) {
      const target = focusableIn(root)[0] ?? root
      target.focus({ preventScroll: true })
    }

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return
      if (e.key === 'Escape' && escapeRef.current) { escapeRef.current(); return }
      if (e.key !== 'Tab') return
      const panel = ref.current
      if (!panel) return
      const items = focusableIn(panel)
      if (items.length === 0) { e.preventDefault(); panel.focus(); return }
      const first = items[0]
      const last  = items[items.length - 1]
      const current = document.activeElement
      if (!panel.contains(current)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return }
      if (e.shiftKey && current === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && current === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const i = stack.indexOf(token)
      if (i !== -1) stack.splice(i, 1)
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [active, ref])
}
