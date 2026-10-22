import { Resvg } from '@cf-wasm/resvg/workerd'
import cinzelBold from './fonts/Cinzel-Bold.ttf'
import interRegular from './fonts/Inter-Regular.ttf'
import jetBrainsMonoBold from './fonts/JetBrainsMono-Bold.ttf'
import { renderBuildSvg, type OgFont } from './ogImage.ts'
import { fetchBuildMeta, fetchBuildPageMeta } from './supabase.ts'
import { getClassNames, getEquipment, getSets, getTranslation, toDataUri, type Lang } from './data.ts'
import { buildOgImageData } from './buildImageData.ts'

type Env = {
  ASSETS: Fetcher
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  CHAR_ASSETS?: R2Bucket
  ITEM_ASSETS?: R2Bucket
}

const LANGS: Lang[] = ['en', 'es', 'fr', 'pt']
const BUILD_ROUTE = /^\/(?:(en|es|fr|pt)\/)?build\/([0-9a-f-]{36})\/?$/i
const OG_IMAGE_ROUTE = /^\/og\/(en|es|fr|pt)\/([0-9a-f-]{36})\.png$/i
const CHAR_ROUTE = /^\/char\/((?:[\w-]+\/)*[\w.-]+\.(?:json|bin|webp))$/
const CHAR_TYPES: Record<string, string> = { json: 'application/json', bin: 'application/octet-stream', webp: 'image/webp' }
const ITEM_IMAGE_ROUTE = /^\/img\/item\/(\d+-(?:64|128)\.png)$/

const FONTS: OgFont[] = [
  { name: 'Cinzel', data: cinzelBold, weight: 700, style: 'normal' },
  { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
  { name: 'JetBrainsMono', data: jetBrainsMonoBold, weight: 700, style: 'normal' },
]

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''))
}

async function renderOgImage(env: Env, origin: string, lang: Lang, id: string): Promise<Response> {
  const build = await fetchBuildMeta(env, id)
  if (!build) {
    return new Response('Not found', { status: 404 })
  }

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

  const data = await buildOgImageData(env.ASSETS, origin, build, equipment, sets, classLabel, translation)
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

async function rewriteBuildMeta(env: Env, origin: string, lang: Lang, id: string, assetResponse: Response): Promise<Response> {
  const build = await fetchBuildPageMeta(env, id)
  if (!build) return assetResponse

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
  const object = await env.CHAR_ASSETS?.get(key)
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
async function serveItemAsset(key: string, itemAssets: R2Bucket | undefined): Promise<Response> {
  const object = await itemAssets?.get(key)
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
    return new Response(liveResponse.body, {
      headers: {
        'Content-Type': liveResponse.headers.get('Content-Type') ?? 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'SAMEORIGIN')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    const charMatch = url.pathname.match(CHAR_ROUTE)
    if (charMatch) return withSecurityHeaders(await serveCharacterAsset(env, charMatch[1]))

    const itemMatch = url.pathname.match(ITEM_IMAGE_ROUTE)
    if (itemMatch) return withSecurityHeaders(await serveItemAsset(itemMatch[1], env.ITEM_ASSETS))

    const ogMatch = url.pathname.match(OG_IMAGE_ROUTE)
    if (ogMatch) {
      const cache = caches.default
      const cached = await cache.match(request)
      if (cached) return cached

      const [, lang, id] = ogMatch
      try {
        const response = await renderOgImage(env, url.origin, lang as Lang, id)
        if (response.status === 200) await cache.put(request, response.clone())
        return withSecurityHeaders(response)
      } catch (e) {
        console.error('OG image render failed', e)
        return new Response('Internal error', { status: 500 })
      }
    }

    const buildMatch = url.pathname.match(BUILD_ROUTE)
    if (buildMatch) {
      const assetResponse = await env.ASSETS.fetch(request)
      const [, langSeg, id] = buildMatch
      const lang = (LANGS.includes(langSeg as Lang) ? langSeg : 'en') as Lang
      try {
        return withSecurityHeaders(await rewriteBuildMeta(env, url.origin, lang, id, assetResponse))
      } catch {
        return withSecurityHeaders(assetResponse)
      }
    }

    const assetResponse = await env.ASSETS.fetch(request)
    if (url.pathname.startsWith('/assets/') && assetResponse.headers.get('Content-Type')?.startsWith('text/html')) {
      return withSecurityHeaders(new Response('Not found', { status: 404 }))
    }
    return withSecurityHeaders(assetResponse)
  },
}
