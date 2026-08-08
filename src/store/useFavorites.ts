import { useSyncExternalStore, useCallback } from 'react'

const LS_KEY = 'dofus-forge-favorites-v1'

function loadSet(): Set<number> {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as number[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}

let _favs = loadSet()
const _listeners = new Set<() => void>()

function notify() { _listeners.forEach(fn => fn()) }

function subscribe(fn: () => void) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

function getSnapshot() { return _favs }

export function useFavorites() {
  const favs = useSyncExternalStore(subscribe, getSnapshot)

  const isFav = useCallback((id: number) => favs.has(id), [favs])

  const toggle = useCallback((id: number) => {
    const next = new Set(_favs)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    _favs = next
    localStorage.setItem(LS_KEY, JSON.stringify([...next]))
    notify()
  }, [])

  return { isFav, toggle, favCount: favs.size }
}
