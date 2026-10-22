import { decodeAnimation, type Animation } from './anim'
import { decodeSkin, type Skin } from './skin'

const ROOT: string = import.meta.env.VITE_CHAR_ASSETS_URL?.replace(/\/?$/, '/') ?? `${import.meta.env.BASE_URL}char/`

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

/** mount / petsmount item id → mount bone, palette, look scale (percent) */
export type Mounts = Record<string, { bone: string; colors?: number[]; scale?: number }>

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

export const loadLooks = () => once('looks', async () => (await get('looks.json')).json() as Promise<Looks>)

export const loadPets = () => once('pets', async () => (await get('pets.json')).json() as Promise<Pets>)

export const loadMounts = () => once('mounts', async () => (await get('mounts.json')).json() as Promise<Mounts>)

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
