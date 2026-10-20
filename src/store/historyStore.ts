import { create } from 'zustand'
import { encodeBuild, decodeBuild } from '@/features/share/codec.ts'
import { useBuildStore, type BuildState } from './buildStore.ts'
import type { BuildSnapshot } from './buildStore.ts'

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

// Undo/redo apply a snapshot to the build store, which notifies the history
// tracker like any other change. `applying` keeps that change from being
// recorded as new history (it would wipe the redo stack), and `lastEncoded`
// always reflects what is on screen so the next real edit is recorded.
let applying    = false
let lastEncoded = ''

/** Records a build change in the history (called on every build store update). */
export function trackBuildChange(state: BuildState) {
  if (applying || !state.selectedClass) return
  const encoded = encodeBuild(state)
  if (encoded === lastEncoded) return
  lastEncoded = encoded
  useHistoryStore.getState().push(state)
}

// Undoing an edit must not unlink the build from its published row (or its
// remix origin): those aren't part of the snapshot, so carry them over.
function applyFromHistory(snap: BuildSnapshot) {
  const store = useBuildStore.getState()
  const { linkedBuildId, forkOf } = store
  applying = true
  try {
    store.applySnapshot(snap)
    const after = useBuildStore.getState()
    if (linkedBuildId) after.setLinkedBuildId(linkedBuildId)
    else if (forkOf) after.setForkOf(forkOf)
  } finally {
    applying = false
  }
  lastEncoded = encodeBuild(useBuildStore.getState())
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

    applyFromHistory(snap)
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

    applyFromHistory(snap)
    set({
      past:    [...past, next].slice(-MAX_HISTORY),
      future:  future.slice(1),
      canUndo: true,
      canRedo: future.length > 1,
    })
  },

  clear: () => {
    lastEncoded = ''
    set({ past: [], future: [], canUndo: false, canRedo: false })
  },
}))
