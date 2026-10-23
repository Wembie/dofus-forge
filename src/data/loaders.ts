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

export type AppEffect = { stat: string; min: number; max: number; effect_id?: number }

export type AppCondition = {
  stat:     string   // English stat name (e.g. "Strength", "Chance")
  operator: string   // ">", "<", ">=", "<="
  value:    number
}

export type AppItem = {
  ankama_id:   number
  name:        string
  level:       number
  type:        string
  slot:        string
  effects:     AppEffect[]
  conditions?: AppCondition[]
  set_id:      number | null
  image_url:   string | null
  description?: string
  ability?:    string
  // Weapon combat stats (only present for weapon-slot items)
  ap_cost?:     number
  crit_chance?: number
  crit_bonus?:  number
  min_range?:   number
  max_range?:   number
  max_per_turn?: number
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

// Item icons are R2 objects. Through the Worker's /img/item/ route every
// icon is a Worker invocation (an Explore page alone draws hundreds); with
// VITE_ASSETS_URL set they load from the bucket's public domain, served
// from Cloudflare's cache without running the Worker.
const ITEM_IMG_ROUTE = '/img/item/'
const ASSETS_URL = import.meta.env.VITE_ASSETS_URL?.trim().replace(/\/?$/, '/').replace(/^\/$/, '') || undefined
const ITEM_ASSETS = ASSETS_URL && `${ASSETS_URL}items/`

export function itemImageUrl(url: string | null): string | null {
  if (!url || !ITEM_ASSETS || !url.startsWith(ITEM_IMG_ROUTE)) return url
  return ITEM_ASSETS + url.slice(ITEM_IMG_ROUTE.length)
}

/** An icon missing from the bucket (item added after the last upload-items
 * sync) retries once through the Worker route, which falls back to the
 * upstream CDN. Error events don't bubble, hence the capture listener. */
export function installItemImageFallback() {
  if (!ITEM_ASSETS) return
  document.addEventListener('error', event => {
    const img = event.target
    if (!(img instanceof HTMLImageElement) || img.dataset.itemFallback || !img.src.startsWith(ITEM_ASSETS)) return
    img.dataset.itemFallback = '1'
    img.src = ITEM_IMG_ROUTE + img.src.slice(ITEM_ASSETS.length)
  }, true)
}

const withItemImages = new WeakMap<AppItem[], AppItem[]>()

export async function loadEquipment(lang: string, bust: string): Promise<AppItem[]> {
  const raw = await fetchJson<AppItem[]>(`data/${lang}/equipment.json`, bust)
  if (!ITEM_ASSETS) return raw
  let mapped = withItemImages.get(raw)
  if (!mapped) {
    mapped = raw.map(item => ({ ...item, image_url: itemImageUrl(item.image_url) }))
    withItemImages.set(raw, mapped)
  }
  return mapped
}

export async function loadSets(lang: string, bust: string): Promise<AppSet[]> {
  return fetchJson<AppSet[]>(`data/${lang}/sets.json`, bust)
}

/** classSlug -> { lang -> official Ankama-localized class name }. Single
 *  file, all languages — see scripts/fetch-spells.ts (breed.shortNameId
 *  resolved against each language's text table, same mechanism as spell
 *  names). Class names genuinely differ per language (e.g. Sacrier/
 *  Sacrieur, Rogue/Roublard/Tymador/Ladino), so this can't be hand-guessed. */
export async function loadClassNames(bust: string): Promise<Record<string, Record<string, string>>> {
  return fetchJson<Record<string, Record<string, string>>>('data/class-names.json', bust)
}
