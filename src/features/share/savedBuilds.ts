const LS_KEY = 'dofus-forge-builds-v1'

export type SavedBuild = {
  id:      string
  name:    string
  encoded: string
  savedAt: number
}

/** Legacy local saves from before builds moved to the cloud (M47) — kept
 * read-only so ComparePanel's "Build B" picker still finds them. */
export function listBuilds(): SavedBuild[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as SavedBuild[]
  } catch {
    return []
  }
}
