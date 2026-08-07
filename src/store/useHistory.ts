import { useEffect, useRef } from 'react'
import { useBuildStore } from './buildStore.ts'
import { useHistoryStore } from './historyStore.ts'
import { encodeBuild } from '@/features/share/codec.ts'

let lastEncoded = ''

export function useHistory() {
  const undo    = useHistoryStore(s => s.undo)
  const redo    = useHistoryStore(s => s.redo)
  const push    = useHistoryStore(s => s.push)
  const skipRef = useRef(false)

  // Subscribe to build state changes and push to history
  useEffect(() => {
    const unsub = useBuildStore.subscribe(state => {
      if (skipRef.current) return
      if (!state.selectedClass) return
      const encoded = encodeBuild(state)
      if (encoded === lastEncoded) return
      lastEncoded = encoded
      push(state)
    })
    return unsub
  }, [push])

  // Keyboard shortcuts: Ctrl+Z = undo, Ctrl+Shift+Z or Ctrl+Y = redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        skipRef.current = true
        undo()
        skipRef.current = false
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        skipRef.current = true
        redo()
        skipRef.current = false
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])
}
