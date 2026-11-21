import { decodeAnimation, type Animation } from './anim'
import { decodeSkin, type Skin } from './skin'
import type { SlotRule } from './slots'

const ASSETS_URL = import.meta.env.VITE_ASSETS_URL?.trim().replace(/\/?$/, '/').replace(/^\/$/, '') || undefined
const ROOT: string = ASSETS_URL ? `${ASSETS_URL}chars/` : `${import.meta.env.BASE_URL}char/`

export interface BoneDef {
  fps: number
  nodes: string[]
  /** part names of the bone's own skin (skins/b<bone>), by graphic index */
  graphics?: string[]
  anims: Record<string, { frames: number; bounds: [number, number, number, number] | null }>
}

export interface Look {
  body: number
  head: number
  colors: number[]
  /** look scale; pets and mounts are drawn at their own scale divided by this */
  scale?: number
}

export type Looks = Record<string, { male?: Look; female?: Look }>

/** pet item id → creature bone and look scale (percent) */
export type Pets = Record<string, { bone: string; scale: number; colors?: number[] }>

/** mount / petsmount item id → mount bone, palette, look scale (percent), extra skins (armour…) */
export type Mounts = Record<string, { bone: string; colors?: number[]; scale?: number; skins?: number[] }>

export interface Gear {
  /** hat / cape / shield item id → the skin worn over the character */
  items: Record<string, number>
  /** item skin → the head slots it empties */
  rules: Record<string, SlotRule[]>
}

export interface LoadedSkin {
  skin: Skin
  image: ImageBitmap
}

const cache = new Map<string, Promise<unknown>>()

function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined
  if (!p) {
    p = load()
    p.catch(() => cache.delete(key))
    cache.set(key, p)
  }
  return p
}

async function get(path: string): Promise<Response> {
  const res = await fetch(ROOT + path)
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res
}

// The index files change with every data fix (a hat paired with its real
// skin…); the version in the URL makes each release fetch them anew instead
// of reusing a copy a browser cached for days.
const index = (name: string) => get(`${name}.json?v=${__APP_VERSION__}`)

export const loadLooks = () => once('looks', async () => (await index('looks')).json() as Promise<Looks>)

export const loadPets = () => once('pets', async () => (await index('pets')).json() as Promise<Pets>)

export const loadMounts = () => once('mounts', async () => (await index('mounts')).json() as Promise<Mounts>)

export const loadGear = () => once('gear', async () => (await index('gear')).json() as Promise<Gear>)

export const loadBone = (bone: string) =>
  once(`bone:${bone}`, async () => (await get(`bones/${bone}.json`)).json() as Promise<BoneDef>)

export const loadAnimation = (bone: string, anim: string) =>
  once(`anim:${bone}/${anim}`, async () =>
    decodeAnimation(await (await get(`bones/${bone}/${anim}.bin`)).arrayBuffer())) as Promise<Animation>

/** A body/head skin id, or `b<bone>` for a bone's own graphics. */
export const loadSkin = (id: number | string) =>
  once(`skin:${id}`, async () => {
    const [geo, tex] = await Promise.all([get(`skins/${id}.bin`), get(`skins/${id}.webp`)])
    const [skin, image] = await Promise.all([
      geo.arrayBuffer().then(decodeSkin),
      tex.blob().then(b => createImageBitmap(b, { premultiplyAlpha: 'premultiply', colorSpaceConversion: 'none' })),
    ])
    return { skin, image } satisfies LoadedSkin
  })
