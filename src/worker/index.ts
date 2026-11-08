import { Resvg } from '@cf-wasm/resvg/workerd'
import cinzelBold from './fonts/Cinzel-Bold.ttf'
import interRegular from './fonts/Inter-Regular.ttf'
import jetBrainsMonoBold from './fonts/JetBrainsMono-Bold.ttf'
import type { OgFont } from './ogImage.ts'
import { buildCardKey, interpolate, pageCardKey, renderBuildCard, renderClassCard, renderSetCard, type OgSources } from './ogRender.ts'
import { fetchBuildMeta, fetchBuildPageMeta, profileExists, type BuildPageMeta } from './supabase.ts'
import { getClassNames, getTranslation, type Lang } from './data.ts'
import { withSecurityHeaders } from './securityHeaders.ts'

type Env = {
  ASSETS: Fetcher
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  // items/<id>-128.png and chars/<path>, also public at VITE_ASSETS_URL.
  ASSETS_BUCKET?: R2Bucket
  // Rendered share cards (keys in ogRender.ts). Private: no public domain, so
  // the visibility check below stays the only way to a build's card.
  OG_BUCKET?: R2Bucket
  // Optional "ratelimits" binding (docs/security/CLOUDFLARE_HARDENING.md);
  // without it renders are bounded only by the cache key below.
  OG_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> }
}

// Upstream image types the item fallback may serve on our origin; anything
// else (HTML, SVG) would run as same-origin content next to the session.
const SAFE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const LANGS: Lang[] = ['en', 'es', 'fr', 'pt']
// Also matches the page's .data file (client-side navigation data).
const BUILD_ROUTE = /^\/(?:(en|es|fr|pt)\/)?build\/([0-9a-f-]{36})(\.data)?\/?$/i
const PROFILE_ROUTE = /^\/(?:en\/|es\/|fr\/|pt\/)?u\/([^/]+?)(\.data)?\/?$/
const OG_IMAGE_ROUTE = /^\/og\/(en|es|fr|pt)\/([0-9a-f-]{36})\.png$/i
const PAGE_OG_ROUTE = /^\/og\/(en|es|fr|pt)\/(set|class)\/([a-z0-9-]{1,80})\.png$/
const CHAR_ROUTE = /^\/char\/((?:[\w-]+\/)*[\w.-]+\.(?:json|bin|webp))$/
const CHAR_TYPES: Record<string, string> = { json: 'application/json', bin: 'application/octet-stream', webp: 'image/webp' }
const ITEM_IMAGE_ROUTE = /^\/img\/item\/(\d+-(?:64|128)\.png)$/

// Written by React Router next to the prerendered pages: the bare document
// that boots the app on any route that has no HTML of its own (build pages,
// profiles, admin). Served without its extension because html_handling
// redirects /x.html to /x.
const SPA_FALLBACK = '/__spa-fallback'
const FILE_EXTENSION = /\.[a-z0-9]+$/i

// Every set page and class guide is prerendered, so a miss under these
// paths is a page that does not exist: a real 404 for crawlers, while the
// fallback still renders the app's not-found view for people.
const PRERENDERED_ONLY = /^(?:\/(?:en|es|fr|pt))?\/(?:sets|classes)\/[^/]+$/

async function serveFallback(env: Env, request: Request, status = 200): Promise<Response> {
  const fallback = await env.ASSETS.fetch(new Request(new URL(SPA_FALLBACK, request.url), { method: request.method }))
  return new Response(fallback.body, { status, headers: fallback.headers })
}

async function serveAsset(env: Env, request: Request): Promise<Response> {
  const response = await env.ASSETS.fetch(request)
  const url = new URL(request.url)
  if (response.status !== 404 || (request.method !== 'GET' && request.method !== 'HEAD') || FILE_EXTENSION.test(url.pathname)) {
    return response
  }
  return serveFallback(env, request, PRERENDERED_ONLY.test(url.pathname) ? 404 : 200)
}

const NOT_FOUND = () => new Response('Not found', { status: 404 })

/**
 * Builds and profiles are prerendered at deploy time, but can turn private
 * or be deleted afterwards. These paths run the Worker first
 * (wrangler.jsonc run_worker_first), which serves the prerendered file only
 * while the build is still public; otherwise the app document, which loads
 * the build in the browser under the visitor's own permissions. A failed
 * lookup counts as "not public": never serve a page that may be private.
 */
async function serveBuildPage(env: Env, request: Request, lang: Lang, id: string, isData: boolean): Promise<Response> {
  const build = await fetchBuildPageMeta(env, id).catch(() => null)
  const isPublic = build?.visibility === 'public'
  if (isData) return isPublic ? env.ASSETS.fetch(request) : NOT_FOUND()
  if (isPublic) {
    const prerendered = await env.ASSETS.fetch(request)
    if (prerendered.status !== 404) return prerendered
  }
  // Published since the last deploy, unlisted, private or gone: the app
  // document, with the preview tags filled in for public/unlisted builds.
  const fallback = await serveFallback(env, request)
  if (!build) return fallback
  try {
    return await rewriteBuildMeta(env, new URL(request.url).origin, lang, id, build, fallback)
  } catch {
    return fallback
  }
}

async function serveProfilePage(env: Env, request: Request, username: string, isData: boolean): Promise<Response> {
  const exists = await profileExists(env, username).catch(() => false)
  if (isData) return exists ? env.ASSETS.fetch(request) : NOT_FOUND()
  if (exists) {
    const prerendered = await env.ASSETS.fetch(request)
    if (prerendered.status !== 404) return prerendered
  }
  return serveFallback(env, request)
}

const FONTS: OgFont[] = [
  { name: 'Cinzel', data: cinzelBold, weight: 700, style: 'normal' },
  { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
  { name: 'JetBrainsMono', data: jetBrainsMonoBold, weight: 700, style: 'normal' },
]

const sources = (env: Env, origin: string): OgSources => ({ assets: env.ASSETS, origin, bucket: env.ASSETS_BUCKET, fonts: FONTS })

const PNG_HEADERS = { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' }

async function rasterize(svg: string): Promise<Uint8Array> {
  const resvg = await Resvg.async(svg)
  return resvg.render().asPng()
}

/**
 * A share card from this location's cache, else from the OG bucket, else
 * rendered and then kept in both. A render costs 15–200 ms of CPU, far past
 * the Free plan's 10 ms per request; the bucket is shared by every
 * Cloudflare location, so a card is rendered once in total rather than once
 * per location and cache expiry, and the set/class cards are stored ahead of
 * time by scripts/og-pregenerate.ts. Bucket errors fall through to
 * rendering: never worse than without the bucket.
 */
async function serveCard(
  request: Request,
  env: Env,
  ctx: ExecutionContext | undefined,
  cacheUrl: string,
  key: string,
  render: () => Promise<string | null>,
): Promise<Response> {
  const cache = caches.default
  const cacheKey = new Request(cacheUrl)
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  // Writes after the response when the runtime lets us; awaited in tests.
  const pending: Promise<unknown>[] = []
  const keep = (work: Promise<unknown> | undefined) => {
    if (!work) return
    const safe = work.catch(() => undefined)
    if (ctx) ctx.waitUntil(safe)
    else pending.push(safe)
  }

  const stored = await env.OG_BUCKET?.get(key).catch(() => null)
  if (stored) {
    const response = new Response(await stored.arrayBuffer(), { headers: PNG_HEADERS })
    keep(cache.put(cacheKey, response.clone()))
    await Promise.all(pending)
    return response
  }

  if (env.OG_RATE_LIMITER) {
    const { success } = await env.OG_RATE_LIMITER.limit({ key: request.headers.get('cf-connecting-ip') ?? 'unknown' })
    if (!success) return new Response('Too many requests', { status: 429, headers: { 'Retry-After': '60' } })
  }

  const svg = await render()
  if (svg === null) return new Response('Not found', { status: 404 })
  const png = await rasterize(svg)
  const response = new Response(png as BufferSource, { headers: PNG_HEADERS })
  keep(cache.put(cacheKey, response.clone()))
  keep(env.OG_BUCKET?.put(key, png, { httpMetadata: { contentType: 'image/png' } }))
  await Promise.all(pending)
  return response
}

async function gameDataVersion(env: Env, origin: string): Promise<string> {
  try {
    const res = await env.ASSETS.fetch(new Request(`${origin}/data/version.json`))
    return res.ok ? ((await res.json()) as { gameVersion?: string }).gameVersion ?? '0' : '0'
  } catch {
    return '0'
  }
}

// Set and class cards only change with the game data, so the cache key is the
// data version — never the request's own query, which can't force a re-render.
async function servePageOg(request: Request, env: Env, ctx: ExecutionContext | undefined, url: URL, lang: Lang, kind: 'set' | 'class', slug: string): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
  }
  const version = await gameDataVersion(env, url.origin)
  const src = sources(env, url.origin)
  return serveCard(
    request, env, ctx,
    `${url.origin}/og/${lang}/${kind}/${slug}.png?data=${version}`,
    pageCardKey(version, lang, kind, slug),
    () => (kind === 'set' ? renderSetCard(src, lang, slug) : renderClassCard(src, lang, slug)),
  )
}

async function rewriteBuildMeta(env: Env, origin: string, lang: Lang, id: string, build: BuildPageMeta, assetResponse: Response): Promise<Response> {
  const [classNames, translation] = await Promise.all([
    getClassNames(env.ASSETS, origin),
    getTranslation(env.ASSETS, origin, lang),
  ])
  const classLabel = classNames[build.class_slug]?.[lang] ?? build.class_slug

  const titleTpl = translation.build_detail_seo_title ?? '{{class}} — Dofus Forge'
  const descTpl = translation.build_detail_seo_description ?? '{{class}} build, level {{level}} — Dofus Forge'
  const title = build.name
    ? `${build.name} — ${interpolate(titleTpl, { class: classLabel, level: build.level })}`
    : interpolate(titleTpl, { class: classLabel, level: build.level })
  const description = interpolate(descTpl, { class: classLabel, level: build.level })

  const langPrefix = lang === 'en' ? '' : `/${lang}`
  const canonicalUrl = `${origin}${langPrefix}/build/${id}`
  // ?v=<updated_at> busts both our own edge cache and link-preview caches
  // (Discord, WhatsApp, ...) whenever the build changes — those services
  // cache by exact image URL, so without this a stale image can stick
  // around well past our own Cache-Control window after an edit.
  const imageVersion = Date.parse(build.updated_at) || Date.now()
  const imageUrl = `${origin}/og/${lang}/${id}.png?v=${imageVersion}`

  return new HTMLRewriter()
    .on('html', { element(el) { el.setAttribute('lang', lang) } })
    .on('title', { element(el) { el.setInnerContent(title) } })
    .on('meta[name="description"]', { element(el) { el.setAttribute('content', description) } })
    .on('meta[property="og:title"]', { element(el) { el.setAttribute('content', title) } })
    .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', description) } })
    .on('meta[name="twitter:title"]', { element(el) { el.setAttribute('content', title) } })
    .on('meta[name="twitter:description"]', { element(el) { el.setAttribute('content', description) } })
    .on('meta[property="og:url"]', { element(el) { el.setAttribute('content', canonicalUrl) } })
    .on('link[rel="canonical"]', { element(el) { el.setAttribute('href', canonicalUrl) } })
    .on('meta[property="og:image"]', { element(el) { el.setAttribute('content', imageUrl) } })
    .on('meta[property="og:image:type"]', { element(el) { el.setAttribute('content', 'image/png') } })
    .on('meta[property="og:image:alt"]', { element(el) { el.setAttribute('content', title) } })
    .on('meta[name="twitter:image"]', { element(el) { el.setAttribute('content', imageUrl) } })
    .on('meta[name="twitter:image:alt"]', { element(el) { el.setAttribute('content', title) } })
    .transform(assetResponse)
}

// Animated character assets (scripts/extract-characters.py) live in R2, not
// in the static bundle: they are tens of megabytes and change only with game
// updates.
async function serveCharacterAsset(env: Env, key: string): Promise<Response> {
  const object = await env.ASSETS_BUCKET?.get(`chars/${key}`)
  if (!object) return new Response('Not found', { status: 404 })
  return new Response(object.body, {
    headers: {
      'Content-Type': CHAR_TYPES[key.split('.').pop() ?? ''] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'ETag': object.httpEtag,
    },
  })
}

// Item icons (scripts/upload-items.mjs) mirror DofusDude's image CDN into R2
// so the catalog doesn't depend on that third party's live uptime. A miss
// (item added since the last manual sync) falls back to their live CDN so
// the image still shows up instead of breaking.
async function serveItemAsset(key: string, bucket: R2Bucket | undefined): Promise<Response> {
  const object = await bucket?.get(`items/${key}`)
  if (object) {
    return new Response(object.body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800, immutable',
        'ETag': object.httpEtag,
      },
    })
  }

  // A hung/slow dofusdu.de (it's been down before — this is exactly the
  // outage this whole mirror exists to route around) must not hang this
  // request too: without a timeout, a dead upstream resolves only after
  // Cloudflare's own multi-second connect timeout instead of failing fast.
  try {
    const liveResponse = await fetch(`https://api.dofusdu.de/dofus3/v1/img/item/${key}`, { signal: AbortSignal.timeout(5000) })
    if (!liveResponse.ok) return new Response('Not found', { status: liveResponse.status })
    const type = liveResponse.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() ?? ''
    if (!SAFE_IMAGE_TYPES.includes(type)) return new Response('Not found', { status: 404 })
    return new Response(liveResponse.body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

async function serveOgImage(request: Request, env: Env, ctx: ExecutionContext | undefined, url: URL, lang: Lang, id: string): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
  }

  // The visibility check runs before any cache or bucket lookup, so a card
  // stored while the build was public stops being served once it turns
  // private, gets hidden by a moderator or is deleted (fetchBuildMeta is
  // edge-cached for 60s, so that's the staleness window). The keys come from
  // the build, never from the request: an arbitrary ?query can't force a
  // fresh render, and an edit (new updated_at) naturally gets a new card.
  const build = await fetchBuildMeta(env, id)
  if (!build) return new Response('Not found', { status: 404 })

  return serveCard(
    request, env, ctx,
    `${url.origin}/og/${lang}/${id}.png?v=${Date.parse(build.updated_at) || 0}`,
    buildCardKey(id, lang, build.updated_at),
    () => renderBuildCard(sources(env, url.origin), lang, build),
  )
}

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    const charMatch = url.pathname.match(CHAR_ROUTE)
    if (charMatch) return withSecurityHeaders(await serveCharacterAsset(env, charMatch[1]))

    const itemMatch = url.pathname.match(ITEM_IMAGE_ROUTE)
    if (itemMatch) return withSecurityHeaders(await serveItemAsset(itemMatch[1], env.ASSETS_BUCKET))

    const ogMatch = url.pathname.match(OG_IMAGE_ROUTE)
    if (ogMatch) {
      const [, lang, id] = ogMatch
      try {
        return withSecurityHeaders(await serveOgImage(request, env, ctx, url, lang as Lang, id))
      } catch (e) {
        console.error('OG image render failed', e)
        return withSecurityHeaders(new Response('Internal error', { status: 500 }))
      }
    }

    const pageOgMatch = url.pathname.match(PAGE_OG_ROUTE)
    if (pageOgMatch) {
      const [, lang, kind, slug] = pageOgMatch
      try {
        return withSecurityHeaders(await servePageOg(request, env, ctx, url, lang as Lang, kind as 'set' | 'class', slug))
      } catch (e) {
        console.error('page OG image render failed', e)
        return withSecurityHeaders(new Response('Internal error', { status: 500 }))
      }
    }

    const buildMatch = url.pathname.match(BUILD_ROUTE)
    if (buildMatch) {
      const [, langSeg, id, data] = buildMatch
      const lang = (LANGS.includes(langSeg as Lang) ? langSeg : 'en') as Lang
      return withSecurityHeaders(await serveBuildPage(env, request, lang, id, !!data))
    }

    const profileMatch = url.pathname.match(PROFILE_ROUTE)
    if (profileMatch) {
      const [, username, data] = profileMatch
      return withSecurityHeaders(await serveProfilePage(env, request, decodeURIComponent(username), !!data))
    }

    const assetResponse = await serveAsset(env, request)
    if (url.pathname.startsWith('/assets/') && assetResponse.headers.get('Content-Type')?.startsWith('text/html')) {
      return withSecurityHeaders(new Response('Not found', { status: 404 }))
    }
    return withSecurityHeaders(assetResponse)
  },
}
