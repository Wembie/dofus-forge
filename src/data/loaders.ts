const BASE = import.meta.env.BASE_URL  // '/dofus-forge/'

const cache = new Map<string, unknown>()

async function fetchJson<T>(path: string, bust?: string): Promise<T> {
  const key = bust ? `${path}?v=${encodeURIComponent(bust)}` : path
  if (cache.has(key)) return cache.get(key) as T
  const res = await fetch(`${BASE}${key}`)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`)
  const data = await res.json() as T
  cache.set(key, data)
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

export async function loadVersion(): Promise<{ gameVersion: string; generatedAt: string }> {
  return fetchJson('data/version.json')
}

export async function loadIndex(lang: string, bust: string): Promise<IndexItem[]> {
  return fetchJson<IndexItem[]>(`data/${lang}/index.json`, bust)
}

export async function loadEquipment(lang: string, bust: string): Promise<AppItem[]> {
  return fetchJson<AppItem[]>(`data/${lang}/equipment.json`, bust)
}

export async function loadSets(lang: string, bust: string): Promise<AppSet[]> {
  return fetchJson<AppSet[]>(`data/${lang}/sets.json`, bust)
}
