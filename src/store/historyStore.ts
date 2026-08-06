import { create } from 'zustand'
import { encodeBuild, decodeBuild } from '@/features/share/codec.ts'
import { useBuildStore, type BuildState } from './buildStore.ts'

const MAX_HISTORY = 40

interface HistoryState {
  past:   string[]   // encoded snapshots, oldest first
  future: string[]   // encoded snapshots for redo, most-recent first
  canUndo: boolean
  canRedo: boolean
  push:   (state: BuildState) => void
  undo:   () => void
  redo:   () => void
  clear:  () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past:    [],
  future:  [],
  canUndo: false,
  canRedo: false,

  push: (state) => {
    if (!state.selectedClass) return
    const encoded = encodeBuild(state)
    set(s => {
      const past = [...s.past, encoded].slice(-MAX_HISTORY)
      return { past, future: [], canUndo: past.length > 1, canRedo: false }
    })
  },

  undo: () => {
    const { past, future } = get()
    if (past.length < 2) return

    const current = past[past.length - 1]
    const prev    = past[past.length - 2]
    const snap    = decodeBuild(prev)
    if (!snap) return

    useBuildStore.getState().applySnapshot(snap)
    set({
      past:    past.slice(0, -1),
      future:  [current, ...future].slice(0, MAX_HISTORY),
      canUndo: past.length > 2,
      canRedo: true,
    })
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return

    const next = future[0]
    const snap = decodeBuild(next)
    if (!snap) return

    useBuildStore.getState().applySnapshot(snap)
    set({
      past:    [...past, next].slice(-MAX_HISTORY),
      future:  future.slice(1),
      canUndo: true,
      canRedo: future.length > 1,
    })
  },

  clear: () => set({ past: [], future: [], canUndo: false, canRedo: false }),
}))
