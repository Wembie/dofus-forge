import { useSyncExternalStore } from 'react'
import { ITEM_PASSIVES } from '@/engine/passives.ts'
import { useBuildStore } from './buildStore.ts'

// "With passives" view: switched in the stats sheet header, followed by the
// characteristics panel too. Per-viewer
// preference; storage can be unavailable (private mode), so it falls back
// to the gear view.
const KEY = 'dofus-forge:stats-with-passives'

function read(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

let on = read()
const listeners = new Set<() => void>()

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function setCombatView(next: boolean) {
  on = next
  try { localStorage.setItem(KEY, next ? '1' : '0') } catch { /* the view still switches */ }
  listeners.forEach(fn => fn())
}

/** Re-reads the stored preference (tests, other tabs). */
export function reloadCombatView() {
  on = read()
  listeners.forEach(fn => fn())
}

export function useCombatView(): boolean {
  return useSyncExternalStore(subscribe, () => on, () => false)
}

/** An equipped item has a combat passive with stats (the switch only makes sense then). */
export function useHasPassives(): boolean {
  return useBuildStore(s => Object.values(s.equipped).some(id => id != null && ITEM_PASSIVES.has(id)))
}
