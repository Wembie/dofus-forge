import { decodeAnimation, type Animation } from './anim'
import { decodeSkin, type Skin } from './skin'

const ROOT: string = import.meta.env.VITE_CHAR_ASSETS_URL ?? `${import.meta.env.BASE_URL}char/`

export interface BoneDef {
  fps: number
  nodes: string[]
  anims: Record<string, { frames: number; bounds: [number, number, number, number] | null }>
}

export interface Look {
  body: number
  head: number
  colors: number[]
}

export type Looks = Record<string, { male?: Look; female?: Look }>

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

export const loadBone = (bone: string) =>
  once(`bone:${bone}`, async () => (await get(`bones/${bone}.json`)).json() as Promise<BoneDef>)

export const loadAnimation = (bone: string, anim: string) =>
  once(`anim:${bone}/${anim}`, async () =>
    decodeAnimation(await (await get(`bones/${bone}/${anim}.bin`)).arrayBuffer())) as Promise<Animation>

export const loadSkin = (id: number) =>
  once(`skin:${id}`, async () => {
    const [geo, tex] = await Promise.all([get(`skins/${id}.bin`), get(`skins/${id}.webp`)])
    const [skin, image] = await Promise.all([
      geo.arrayBuffer().then(decodeSkin),
      tex.blob().then(b => createImageBitmap(b, { premultiplyAlpha: 'premultiply', colorSpaceConversion: 'none' })),
    ])
    return { skin, image } satisfies LoadedSkin
  })
