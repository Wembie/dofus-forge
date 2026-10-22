import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchBuildMeta, fetchBuildPageMeta } from '../supabase.ts'

afterEach(() => vi.unstubAllGlobals())

const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' }
const ID = '26ba3a5b-43a7-4e5d-ae86-4abb11865e4e'

describe('fetchBuildMeta', () => {
  it('requests the build through its link header, so an unlisted build gets a preview', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ name: 'B', visibility: 'unlisted' }]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchBuildMeta(env, ID)).resolves.toMatchObject({ name: 'B' })
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect((init.headers as Record<string, string>)['x-build-id']).toBe(ID)
  })

  it('never queries for something that is not a build id', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchBuildMeta(env, 'x,visibility.eq.unlisted')).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('the page meta asks only for the fields the meta tags use, cached at the edge', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ name: 'B', visibility: 'public' }]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await fetchBuildPageMeta(env, ID)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { cf?: { cacheTtl?: number } }]
    expect(url).toContain('select=name,class_slug,level,visibility,updated_at')
    expect(url).not.toContain('snapshot')
    expect(init.cf?.cacheTtl).toBe(60)
  })
})
