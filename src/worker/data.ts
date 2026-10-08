export type Lang = 'en' | 'es' | 'fr' | 'pt'

export type WorkerAppItem = {
  ankama_id: number
  name: string
  slot: string
  set_id: number | null
  image_url: string | null
  effects: { stat: string; min: number; max: number }[]
}

export type WorkerAppSet = {
  ankama_id: number
  name: string
  items: number[]
  bonuses: Record<number, { stat: string; min: number; max: number }[]>
}

// Per-isolate cache — a warm Worker instance serves many requests, so static
// JSON (equipment/sets/class-names/translation) is fetched from the deployed
// assets at most once per language per isolate, not once per request.
const cache = new Map<string, unknown>()

async function fetchAsset<T>(assets: Fetcher, origin: string, path: string): Promise<T> {
  const cacheKey = path
  const cached = cache.get(cacheKey)
  if (cached) return cached as T

  const res = await assets.fetch(new Request(`${origin}${path}`))
  if (!res.ok) throw new Error(`asset fetch failed: ${path} (${res.status})`)
  const data = (await res.json()) as T
  cache.set(cacheKey, data)
  return data
}

export function getEquipment(assets: Fetcher, origin: string, lang: Lang) {
  return fetchAsset<WorkerAppItem[]>(assets, origin, `/data/${lang}/equipment.json`)
}

export function getSets(assets: Fetcher, origin: string, lang: Lang) {
  return fetchAsset<WorkerAppSet[]>(assets, origin, `/data/${lang}/sets.json`)
}

export function getClassNames(assets: Fetcher, origin: string) {
  return fetchAsset<Record<string, Record<Lang, string>>>(assets, origin, '/data/class-names.json')
}

export function getTranslation(assets: Fetcher, origin: string, lang: Lang) {
  return fetchAsset<Record<string, string>>(assets, origin, `/locales/${lang}/translation.json`)
}

const iconCache = new Map<string, string>()

/** Fetches an image (from our own assets or a remote URL) and inlines it as a
 * base64 data URI — satori does not reliably fetch remote <img src> itself,
 * and resvg (our SVG→PNG renderer) can't decode WebP, so stat icons must be
 * requested as .png explicitly (equipment icons from dofusdu.de are already
 * PNG). */
export async function toDataUri(assets: Fetcher, origin: string, url: string): Promise<string | undefined> {
  const cached = iconCache.get(url)
  if (cached) return cached
  try {
    const res = url.startsWith('/') ? await assets.fetch(new Request(`${origin}${url}`)) : await fetch(url)
    if (!res.ok) return undefined
    const contentType = res.headers.get('content-type') ?? 'image/png'
    const buf = await res.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
    const uri = `data:${contentType};base64,${base64}`
    iconCache.set(url, uri)
    return uri
  } catch {
    return undefined
  }
}

// resvg can't decode WebP, but the app's real stat icons (ap, mp, range,
// and the 6 characteristics) are shipped as .webp — public/data/stats/*.png
// only exists for a few unrelated effect icons (strength_damage, dofus,
// pull, ...), not these, so blindly requesting "<name>.png" from there once
// silently served a handful of stale/mismatched leftover PNGs. Every icon
// this OG renderer needs is instead pre-converted once from the real .webp
// source into its own folder, kept separate from the app's real icon set.
export function statIconDataUri(assets: Fetcher, origin: string, name: string): Promise<string | undefined> {
  return toDataUri(assets, origin, `/data/stats-og/${name}.png`)
}
