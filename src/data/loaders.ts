const BASE = import.meta.env.BASE_URL  // '/dofus-forge/'

const cache = new Map<string, unknown>()

async function fetchJson<T>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`)
  const data = await res.json() as T
  cache.set(path, data)
  return data
}

export type IndexItem = {
  id:    number
  name:  string
  type:  string
  slot:  string
  level: number
}

export type AppEffect = { stat: string; min: number; max: number }

export type AppItem = {
  ankama_id:   number
  name:        string
  level:       number
  type:        string
  slot:        string
  effects:     AppEffect[]
  set_id:      number | null
  image_url:   string | null
  description?: string
  ability?:    string
}

export type AppSet = {
  ankama_id: number
  name:      string
  items:     number[]
  bonuses:   Record<number, AppEffect[]>
}

export async function loadIndex(lang: string): Promise<IndexItem[]> {
  return fetchJson<IndexItem[]>(`data/${lang}/index.json`)
}

export async function loadEquipment(lang: string): Promise<AppItem[]> {
  return fetchJson<AppItem[]>(`data/${lang}/equipment.json`)
}

export async function loadSets(lang: string): Promise<AppSet[]> {
  return fetchJson<AppSet[]>(`data/${lang}/sets.json`)
}

export async function loadVersion(): Promise<{ gameVersion: string; generatedAt: string }> {
  return fetchJson('data/version.json')
}
