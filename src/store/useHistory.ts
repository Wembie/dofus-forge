import { useEffect } from 'react'
import { useBuildStore } from './buildStore.ts'
import { useHistoryStore, trackBuildChange } from './historyStore.ts'

export function useHistory() {
  const undo = useHistoryStore(s => s.undo)
  const redo = useHistoryStore(s => s.redo)

  // Record build changes; undo/redo themselves are excluded inside the store,
  // so the header buttons and the keyboard shortcuts behave the same.
  useEffect(() => useBuildStore.subscribe(trackBuildChange), [])

  // Keyboard shortcuts: Ctrl+Z = undo, Ctrl+Shift+Z or Ctrl+Y = redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])
}
