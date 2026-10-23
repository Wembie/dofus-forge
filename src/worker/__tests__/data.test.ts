import { describe, it, expect } from 'vitest'
import { toDataUri } from '../data.ts'

const spaFallback = { fetch: async () => new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }) } as unknown as Fetcher

describe('toDataUri', () => {
  it('reads item icons from the bucket instead of the static assets', async () => {
    const bucket = { get: async (key: string) => (key === 'items/7-128.png' ? { arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer } : null) } as unknown as R2Bucket
    await expect(toDataUri(spaFallback, 'https://x', '/img/item/7-128.png', bucket)).resolves.toBe('data:image/png;base64,iVBORw==')
    await expect(toDataUri(spaFallback, 'https://x', '/img/item/8-128.png', bucket)).resolves.toBeUndefined()
  })

  it('never inlines a non-image response (the SPA fallback page) as an icon', async () => {
    await expect(toDataUri(spaFallback, 'https://x', '/data/stats-og/missing.png')).resolves.toBeUndefined()
  })
})
