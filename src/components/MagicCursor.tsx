import { useEffect, useRef, useState } from 'react'
import { isCursorEnabled, MOTION_SETTINGS_EVENT } from '@/lib/motionSettings.ts'

const INTERACTIVE_SELECTOR = 'button, a, [role="button"], input, select, textarea, [data-cursor-interactive]'

/** A small trailing glow that follows the real cursor — never replaces it
 * (system cursor stays visible, so keyboard/assistive-tech users lose
 * nothing). Skipped entirely on touch devices (no mouse to follow), under
 * prefers-reduced-motion, and when disabled in Settings. Position updates
 * go straight to the DOM via refs, never React state, so mousemove can't
 * trigger a re-render. */
export function MagicCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(isCursorEnabled)

  useEffect(() => {
    const sync = () => setEnabled(isCursorEnabled())
    window.addEventListener(MOTION_SETTINGS_EVENT, sync)
    return () => window.removeEventListener(MOTION_SETTINGS_EVENT, sync)
  }, [])

  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const dot = dotRef.current
    if (!dot) return

    let raf = 0
    let x = -100
    let y = -100
    let visible = false

    function onMove(e: MouseEvent) {
      x = e.clientX
      y = e.clientY
      if (!visible) { visible = true; dot!.style.opacity = '1' }
      if (!raf) raf = requestAnimationFrame(apply)
      const hoveringInteractive = (e.target as Element | null)?.closest?.(INTERACTIVE_SELECTOR)
      dot!.classList.toggle('magic-cursor-active', !!hoveringInteractive)
    }
    function apply() {
      raf = 0
      dot!.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
    }
    function onLeave() {
      visible = false
      dot!.style.opacity = '0'
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
      dot.style.opacity = '0'
    }
  }, [enabled])

  return <div ref={dotRef} className="magic-cursor" aria-hidden="true" />
}
