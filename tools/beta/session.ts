import { create } from 'zustand'
import { buildSnapshotFromState } from '../../src/features/share/codec.ts'
import { sanitizeSnapshot } from '../../src/engine/snapshot.ts'
import { useBuildStore, useDracorunes } from './buildStore.ts'
import { validDracorune, type DracoruneMap } from './dracorunes.ts'

const KEY = 'dofus-forge:beta-lab:v1'
export const useSession = create<{ canUndo: boolean; canRedo: boolean; storageError: boolean }>(() => ({ canUndo: false, canRedo: false, storageError: false }))
let history: string[] = []
let position = -1
let restoring = false
let version = ''

export function sessionDocument() {
  return { format: 'dofus-forge-beta', schema: 1, gameVersion: version, build: buildSnapshotFromState(useBuildStore.getState()), dracorunes: useDracorunes.getState().applied }
}

export function restoreDocument(raw: unknown) {
  const doc = raw as Partial<ReturnType<typeof sessionDocument>> | null
  if (doc?.format !== 'dofus-forge-beta' || doc.schema !== 1) throw new Error('beta_invalid_file')
  const build = sanitizeSnapshot(doc.build)
  if (!build) throw new Error('beta_invalid_file')
  const applied: DracoruneMap = {}
  if (doc.dracorunes && typeof doc.dracorunes === 'object') {
    for (const [slot, value] of Object.entries(doc.dracorunes)) {
      if (value && Number.isSafeInteger(value.itemId) && validDracorune(value.rune)) applied[slot] = value
    }
  }
  restoring = true
  try {
    useDracorunes.setState({ applied: {} })
    useBuildStore.getState().applySnapshot(build)
    const state = useBuildStore.getState()
    useDracorunes.setState({ applied: Object.fromEntries(Object.entries(applied).filter(([slot, v]) => state.equipped[slot as keyof typeof state.equipped] === v.itemId)) })
    state.setEquipment(state._equipment)
  } finally { restoring = false }
}

export function recordSession() {
  if (restoring) return
  const serialized = JSON.stringify(sessionDocument())
  if (history[position] !== serialized) {
    history = [...history.slice(0, position + 1), serialized].slice(-60)
    position = history.length - 1
  }
  try { localStorage.setItem(KEY, serialized); useSession.setState({ storageError: false }) }
  catch { useSession.setState({ storageError: true }) }
  useSession.setState({ canUndo: position > 0, canRedo: position < history.length - 1 })
}

export function startSession(gameVersion: string) {
  version = gameVersion
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) restoreDocument(JSON.parse(saved))
  } catch { useSession.setState({ storageError: true }) }
  recordSession()
  let queued = false
  let stopped = false
  const schedule = () => {
    if (restoring || queued || stopped) return
    queued = true
    queueMicrotask(() => { queued = false; if (!stopped) recordSession() })
  }
  const stopBuild = useBuildStore.subscribe(schedule)
  const stopDracos = useDracorunes.subscribe(schedule)
  return () => { stopped = true; stopBuild(); stopDracos() }
}

export function travelSession(delta: number) {
  const next = position + delta
  if (next < 0 || next >= history.length) return
  restoreDocument(JSON.parse(history[next]))
  position = next
  recordSession()
}
