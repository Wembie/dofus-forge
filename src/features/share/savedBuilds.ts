const LS_KEY = 'dofus-forge-builds-v1'

export type SavedBuild = {
  id:      string
  name:    string
  encoded: string
  savedAt: number
}

export function listBuilds(): SavedBuild[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as SavedBuild[]
  } catch {
    return []
  }
}

export function saveBuild(name: string, encoded: string): SavedBuild {
  const builds = listBuilds()
  const entry: SavedBuild = {
    id:      crypto.randomUUID(),
    name:    name.trim() || 'Unnamed build',
    encoded,
    savedAt: Date.now(),
  }
  builds.unshift(entry)
  localStorage.setItem(LS_KEY, JSON.stringify(builds))
  return entry
}

export function deleteBuild(id: string): void {
  const builds = listBuilds().filter(b => b.id !== id)
  localStorage.setItem(LS_KEY, JSON.stringify(builds))
}

export function renameBuild(id: string, name: string): void {
  const builds = listBuilds().map(b => b.id === id ? { ...b, name } : b)
  localStorage.setItem(LS_KEY, JSON.stringify(builds))
}
