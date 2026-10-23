// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules() })

async function loaders(itemAssets?: string) {
  if (itemAssets) vi.stubEnv('VITE_ASSETS_URL', itemAssets)
  return import('../loaders.ts')
}

describe('item image URLs', () => {
  it('keeps the Worker route when no public bucket domain is configured', async () => {
    const { itemImageUrl } = await loaders()
    expect(itemImageUrl('/img/item/6007-128.png')).toBe('/img/item/6007-128.png')
  })

  it('points item icons at the bucket domain, leaving other URLs alone', async () => {
    const { itemImageUrl } = await loaders('https://assets.example.com')
    expect(itemImageUrl('/img/item/6007-128.png')).toBe('https://assets.example.com/items/6007-128.png')
    expect(itemImageUrl('https://api.dofusdu.de/dofus3/v1/img/item/1-128.png')).toBe('https://api.dofusdu.de/dofus3/v1/img/item/1-128.png')
    expect(itemImageUrl(null)).toBeNull()
  })

  it('rewrites the loaded equipment once and keeps the same array on repeat loads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ ankama_id: 1, image_url: '/img/item/1-128.png' }]))))
    const { loadEquipment } = await loaders('https://assets.example.com/')
    const first = await loadEquipment('en', 'v1')
    expect(first[0].image_url).toBe('https://assets.example.com/items/1-128.png')
    expect(await loadEquipment('en', 'v1')).toBe(first)
  })

  it('retries a missing icon once through the Worker route', async () => {
    const { installItemImageFallback } = await loaders('https://assets.example.com/')
    installItemImageFallback()
    const img = document.createElement('img')
    img.src = 'https://assets.example.com/items/9-128.png'
    document.body.appendChild(img)
    img.dispatchEvent(new Event('error'))
    expect(img.getAttribute('src')).toBe('/img/item/9-128.png')
    img.dispatchEvent(new Event('error'))
    expect(img.getAttribute('src')).toBe('/img/item/9-128.png')
  })
})
