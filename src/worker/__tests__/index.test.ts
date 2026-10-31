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

describe('prerendered build and profile pages', () => {
  const PRERENDERED = '<html>prerendered build</html>'
  const FALLBACK = '<html><head><title>Dofus Forge</title><meta property="og:title" content="Dofus Forge" /></head><body>app</body></html>'
  let profileRows: unknown[]

  // dist/client as the ASSETS binding sees it: one prerendered build page
  // (+ its .data), one prerendered profile, and the SPA fallback.
  function siteEnv() {
    return env({
      ASSETS: {
        fetch: async (req: Request) => {
          const path = new URL(req.url).pathname
          if (path === '/__spa-fallback') return new Response(FALLBACK, { headers: { 'Content-Type': 'text/html' } })
          if (path === `/es/build/${ID}` || path === '/u/someone') return new Response(PRERENDERED, { headers: { 'Content-Type': 'text/html' } })
          if (path === `/es/build/${ID}.data` || path === '/u/someone.data') return new Response('data')
          return new Response('Not found', { status: 404 })
        },
      },
    })
  }
  const get = (path: string) => worker.fetch(new Request(`https://dofusforge.com${path}`), siteEnv())

  beforeEach(() => {
    profileRows = [{ username: 'someone' }]
    vi.stubGlobal('HTMLRewriter', class {
      private handlers: [string, { element(el: { setInnerContent(v: string): void; setAttribute(k: string, v: string): void }): void }][] = []
      on(selector: string, handler: (typeof this.handlers)[number][1]) { this.handlers.push([selector, handler]); return this }
      async transform(res: Response) {
        let html = await res.text()
        for (const [selector, h] of this.handlers) {
          if (selector === 'meta[property="og:title"]') h.element({ setInnerContent() {}, setAttribute: (_k, v) => { html = html.replace('content="Dofus Forge"', `content="${v}"`) } })
        }
        return new Response(html, res)
      }
    })
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const u = new URL(url)
      if (u.pathname.endsWith('/profiles')) return new Response(JSON.stringify(profileRows))
      if (u.origin === new URL(SUPABASE_URL).origin) return new Response(JSON.stringify(buildRow ? [buildRow] : []))
      return upstream
    }))
  })

  it('serves the prerendered page while the build is public', async () => {
    const res = await get(`/es/build/${ID}`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(PRERENDERED)
  })

  it('never serves the prerendered page once the build is private or deleted', async () => {
    buildRow = null
    const res = await get(`/es/build/${ID}`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).not.toContain('prerendered')
    expect(html).toContain('<body>app</body>')
  })

  it('serves an unlisted build through the app document, with its preview tags', async () => {
    buildRow!.visibility = 'unlisted'
    const html = await (await get(`/es/build/${ID}`)).text()
    expect(html).not.toContain('prerendered')
    expect(html).toContain('content="B — ')
  })

  it('treats a failed lookup as not public', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network') }))
    expect(await (await get(`/es/build/${ID}`)).text()).not.toContain('prerendered')
  })

  it('serves a build published after the deploy through the app document', async () => {
    const other = '11111111-2222-4333-8444-555555555555'
    const html = await (await get(`/es/build/${other}`)).text()
    expect(html).toContain('<body>app</body>')
  })

  it('gates the .data file the same way', async () => {
    expect((await get(`/es/build/${ID}.data`)).status).toBe(200)
    buildRow!.visibility = 'private'
    expect((await get(`/es/build/${ID}.data`)).status).toBe(404)
  })

  it('serves a prerendered profile only while it exists', async () => {
    expect(await (await get('/u/someone')).text()).toBe(PRERENDERED)
    expect((await get('/u/someone.data')).status).toBe(200)
    profileRows = []
    expect(await (await get('/u/someone')).text()).not.toContain('prerendered')
    expect((await get('/u/someone.data')).status).toBe(404)
  })

  it('never queries Supabase for an impossible username', async () => {
    const res = await get('/u/a,b)or(x')
    expect(res.status).toBe(200)
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })
})

describe('pages that are all prerendered', () => {
  const FALLBACK = '<html><body>app</body></html>'
  const siteEnv = () => env({
    ASSETS: {
      fetch: async (req: Request) => {
        const path = new URL(req.url).pathname
        if (path === '/__spa-fallback') return new Response(FALLBACK, { headers: { 'Content-Type': 'text/html' } })
        if (path === '/es/sets/gobball-set') return new Response('<html>set</html>', { headers: { 'Content-Type': 'text/html' } })
        return new Response('Not found', { status: 404 })
      },
    },
  })
  const get = (path: string) => worker.fetch(new Request(`https://dofusforge.com${path}`), siteEnv())

  it('serves an existing set page as is', async () => {
    const res = await get('/es/sets/gobball-set')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<html>set</html>')
  })

  it('answers 404 with the app document for a set or class that does not exist', async () => {
    for (const path of ['/sets/nope', '/fr/sets/nope', '/classes/nope', '/pt/classes/nope']) {
      const res = await get(path)
      expect(res.status, path).toBe(404)
      expect(await res.text()).toBe(FALLBACK)
    }
  })

  it('keeps serving the app document with 200 for routes without their own page', async () => {
    expect((await get('/c/some-collection')).status).toBe(200)
  })
})
