import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const render = vi.fn(() => ({ asPng: () => new Uint8Array([137, 80, 78, 71]) }))
vi.mock('@cf-wasm/resvg/workerd', () => ({ Resvg: { async: vi.fn(async () => ({ render })) } }))
vi.mock('../fonts/Cinzel-Bold.ttf', () => ({ default: new ArrayBuffer(0) }))
vi.mock('../fonts/Inter-Regular.ttf', () => ({ default: new ArrayBuffer(0) }))
vi.mock('../fonts/JetBrainsMono-Bold.ttf', () => ({ default: new ArrayBuffer(0) }))
vi.mock('../ogImage.ts', () => ({ renderBuildSvg: vi.fn(async () => '<svg/>') }))
vi.mock('../buildImageData.ts', () => ({ buildOgImageData: vi.fn(async () => ({})) }))
vi.mock('../data.ts', () => ({
  getEquipment: vi.fn(async () => []),
  getSets: vi.fn(async () => []),
  getClassNames: vi.fn(async () => ({})),
  getTranslation: vi.fn(async () => ({})),
  toDataUri: vi.fn(async () => undefined),
}))

const { default: worker } = await import('../index.ts')

const ID = '26ba3a5b-43a7-4e5d-ae86-4abb11865e4e'
const SUPABASE_URL = 'https://x.supabase.co'
let buildRow: Record<string, unknown> | null
let upstream: Response
const store = new Map<string, Response>()

function env(extra: Record<string, unknown> = {}) {
  return {
    ASSETS: { fetch: async () => new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } }) },
    SUPABASE_URL,
    SUPABASE_ANON_KEY: 'anon',
    ASSETS_BUCKET: { get: async () => null },
    ...extra,
  } as never
}

beforeEach(() => {
  store.clear()
  render.mockClear()
  buildRow = { name: 'B', class_slug: 'iop', level: 200, gender: 'male', visibility: 'public', snapshot: {}, profiles: null, updated_at: '2026-10-01T00:00:00Z' }
  upstream = new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'image/png' } })
  vi.stubGlobal('caches', {
    default: {
      match: async (req: Request) => store.get(req.url)?.clone(),
      put: async (req: Request, res: Response) => {
        if (req.method !== 'GET') throw new TypeError('Cache API only accepts GET')
        store.set(req.url, res)
      },
    },
  })
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (new URL(url).origin === new URL(SUPABASE_URL).origin) return new Response(JSON.stringify(buildRow ? [buildRow] : []), { status: 200 })
    return upstream
  }))
})
afterEach(() => vi.unstubAllGlobals())

const og = (query = '', init?: RequestInit) => worker.fetch(new Request(`https://dofusforge.com/og/en/${ID}.png${query}`, init), env())

describe('OG image route', () => {
  it('renders once per build version, whatever query string the request carries', async () => {
    expect((await og('?x=1')).status).toBe(200)
    expect((await og('?x=2')).status).toBe(200)
    expect((await og('')).status).toBe(200)
    expect(render).toHaveBeenCalledTimes(1)
  })

  it('re-renders after the build is edited (new updated_at)', async () => {
    await og()
    buildRow!.updated_at = '2026-10-02T00:00:00Z'
    await og()
    expect(render).toHaveBeenCalledTimes(2)
  })

  it('stops serving a cached image once the build is private, hidden or deleted', async () => {
    expect((await og()).status).toBe(200)
    buildRow = null
    expect((await og()).status).toBe(404)
  })

  it('rejects methods other than GET/HEAD without rendering', async () => {
    const res = await og('', { method: 'POST' })
    expect(res.status).toBe(405)
    expect(render).not.toHaveBeenCalled()
  })

  it('answers 429 from the optional rate limiter before rendering', async () => {
    const limiter = { limit: vi.fn(async () => ({ success: false })) }
    const res = await worker.fetch(new Request(`https://dofusforge.com/og/en/${ID}.png`), env({ OG_RATE_LIMITER: limiter }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
    expect(render).not.toHaveBeenCalled()
  })

  it('sends security headers on cache hits too', async () => {
    await og()
    const hit = await og()
    expect(hit.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(hit.headers.get('Strict-Transport-Security')).toContain('max-age=')
  })
})

describe('item image fallback', () => {
  const item = () => worker.fetch(new Request('https://dofusforge.com/img/item/999999-64.png'), env())

  it('serves upstream PNGs with a pinned image type', async () => {
    const res = await item()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
  })

  it.each(['text/html', 'image/svg+xml', 'application/octet-stream'])('never serves upstream %s on our origin', async type => {
    upstream = new Response('<script>alert(1)</script>', { headers: { 'Content-Type': type } })
    const res = await item()
    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Type')).not.toBe(type)
  })
})
