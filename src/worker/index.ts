import { Resvg } from '@cf-wasm/resvg/workerd'
import cinzelBold from './fonts/Cinzel-Bold.ttf'
import interRegular from './fonts/Inter-Regular.ttf'
import jetBrainsMonoBold from './fonts/JetBrainsMono-Bold.ttf'
import { renderBuildSvg, type OgFont } from './ogImage.ts'
import { fetchBuildMeta, fetchBuildPageMeta, profileExists, type BuildMeta, type BuildPageMeta } from './supabase.ts'
import { getClassNames, getEquipment, getSets, getTranslation, toDataUri, type Lang } from './data.ts'
import { buildOgImageData } from './buildImageData.ts'
import { withSecurityHeaders } from './securityHeaders.ts'

type Env = {
  ASSETS: Fetcher
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  // items/<id>-128.png and chars/<path>, also public at VITE_ASSETS_URL.
  ASSETS_BUCKET?: R2Bucket
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

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''))
}

async function renderOgImage(env: Env, origin: string, lang: Lang, build: BuildMeta): Promise<Response> {
  // Stats must be computed from the English equipment/sets data, same as the
  // client (store/dataStore.ts): STAT_MAP's keys are English effect names, so
  // feeding it a localized item's `effects` (e.g. "vitalidad" instead of
  // "Vitality") makes every gear bonus silently fall into unknownStats and
  // the image shows only base characteristic points, nowhere near the real
  // totals. The requested `lang` only overlays item *names* for display.
  const [equipmentEn, setsEn, classNames, translation] = await Promise.all([
    getEquipment(env.ASSETS, origin, 'en'),
    getSets(env.ASSETS, origin, 'en'),
    getClassNames(env.ASSETS, origin),
    getTranslation(env.ASSETS, origin, lang),
  ])

  let equipment = equipmentEn
  let sets = setsEn
  if (lang !== 'en') {
    const [equipmentLang, setsLang] = await Promise.all([
      getEquipment(env.ASSETS, origin, lang),
      getSets(env.ASSETS, origin, lang),
    ])
    const nameBySlotId = new Map(equipmentLang.map(it => [it.ankama_id, it.name]))
    const setNameById = new Map(setsLang.map(s => [s.ankama_id, s.name]))
    equipment = equipmentEn.map(it => ({ ...it, name: nameBySlotId.get(it.ankama_id) ?? it.name }))
    sets = setsEn.map(s => ({ ...s, name: setNameById.get(s.ankama_id) ?? s.name }))
  }

  const classLabel = classNames[build.class_slug]?.[lang] ?? build.class_slug

  const data = await buildOgImageData(env.ASSETS, origin, build, equipment, sets, classLabel, translation, env.ASSETS_BUCKET)
  const portraitPath = `/data/classes/${build.class_slug}${build.gender === 'female' ? '-f' : ''}.png`
  const portraitUri = await toDataUri(env.ASSETS, origin, portraitPath)

  const svg = await renderBuildSvg({ ...data, portraitUrl: portraitUri ?? '' }, FONTS)
  const resvg = await Resvg.async(svg)
  const png = resvg.render().asPng()

  return new Response(png as BufferSource, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
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
    .on('meta[name="twitter:image"]', { element(el) { el.setAttribute('content', imageUrl) } })
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

async function serveOgImage(request: Request, env: Env, url: URL, lang: Lang, id: string): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
  }

  // The visibility check runs before the cache lookup, so an image cached
  // while the build was public stops being served once it turns private,
  // gets hidden by a moderator or is deleted (fetchBuildMeta is edge-cached
  // for 60s, so that's the staleness window). The cache key is derived from
  // the build, never from the request: an arbitrary ?query can't force a
  // fresh render, and an edit (new updated_at) naturally gets a new image.
  const build = await fetchBuildMeta(env, id)
  if (!build) return new Response('Not found', { status: 404 })

  const cache = caches.default
  const cacheKey = new Request(`${url.origin}/og/${lang}/${id}.png?v=${Date.parse(build.updated_at) || 0}`)
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  if (env.OG_RATE_LIMITER) {
    const { success } = await env.OG_RATE_LIMITER.limit({ key: request.headers.get('cf-connecting-ip') ?? 'unknown' })
    if (!success) return new Response('Too many requests', { status: 429, headers: { 'Retry-After': '60' } })
  }

  const response = await renderOgImage(env, url.origin, lang, build)
  if (response.status === 200) await cache.put(cacheKey, response.clone())
  return response
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    const charMatch = url.pathname.match(CHAR_ROUTE)
    if (charMatch) return withSecurityHeaders(await serveCharacterAsset(env, charMatch[1]))

    const itemMatch = url.pathname.match(ITEM_IMAGE_ROUTE)
    if (itemMatch) return withSecurityHeaders(await serveItemAsset(itemMatch[1], env.ASSETS_BUCKET))

    const ogMatch = url.pathname.match(OG_IMAGE_ROUTE)
    if (ogMatch) {
      const [, lang, id] = ogMatch
      try {
        return withSecurityHeaders(await serveOgImage(request, env, url, lang as Lang, id))
      } catch (e) {
        console.error('OG image render failed', e)
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
