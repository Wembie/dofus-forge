import './shims.ts'  // must stay first — see shims.ts for why
import { Resvg } from '@cf-wasm/resvg/workerd'
import cinzelBold from './fonts/Cinzel-Bold.ttf'
import interRegular from './fonts/Inter-Regular.ttf'
import jetBrainsMonoBold from './fonts/JetBrainsMono-Bold.ttf'
import { renderBuildSvg, type OgFont } from './ogImage.ts'
import { fetchBuildMeta } from './supabase.ts'
import { getClassNames, getEquipment, getSets, getTranslation, toDataUri, type Lang } from './data.ts'
import { buildOgImageData } from './buildImageData.ts'

type Env = {
  ASSETS: Fetcher
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

const LANGS: Lang[] = ['en', 'es', 'fr', 'pt']
const BUILD_ROUTE = /^\/(?:(en|es|fr|pt)\/)?build\/([0-9a-f-]{36})\/?$/i
const OG_IMAGE_ROUTE = /^\/og\/(en|es|fr|pt)\/([0-9a-f-]{36})\.png$/i

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
    // TEMP debug: show exactly what Supabase returned instead of silently
    // falling back, so we can see why fetchBuildMeta came back null here.
    const diagUrl = `${env.SUPABASE_URL}/rest/v1/builds?id=eq.${id}&select=name,visibility`
    const diagRes = await fetch(diagUrl, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
    })
    const diagBody = await diagRes.text()
    return new Response(`DEBUG build=null id=${id} keyLen=${env.SUPABASE_ANON_KEY?.length ?? 0} diagStatus=${diagRes.status} diagBody=${diagBody}`, { status: 500 })
  }

  const [equipment, sets, classNames, translation] = await Promise.all([
    getEquipment(env.ASSETS, origin, lang),
    getSets(env.ASSETS, origin, lang),
    getClassNames(env.ASSETS, origin),
    getTranslation(env.ASSETS, origin, lang),
  ])
  const classLabel = classNames[build.class_slug]?.[lang] ?? build.class_slug

  const data = await buildOgImageData(env.ASSETS, origin, build, equipment, sets, classLabel, translation)
  const portraitPath = `/data/classes/${build.class_slug}${build.gender === 'f' ? '-f' : ''}.png`
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
  const build = await fetchBuildMeta(env, id)
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
  const imageUrl = `${origin}/og/${lang}/${id}.png`

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    const ogMatch = url.pathname.match(OG_IMAGE_ROUTE)
    if (ogMatch) {
      const cache = caches.default
      const cached = await cache.match(request)
      if (cached) return cached

      const [, lang, id] = ogMatch
      try {
        const response = await renderOgImage(env, url.origin, lang as Lang, id)
        if (response.status === 200) await cache.put(request, response.clone())
        return response
      } catch (e) {
        // TEMP debug: surface the real error instead of silently falling back.
        return new Response(`DEBUG: ${e instanceof Error ? e.stack : String(e)}`, { status: 500 })
      }
    }

    const buildMatch = url.pathname.match(BUILD_ROUTE)
    if (buildMatch) {
      const assetResponse = await env.ASSETS.fetch(request)
      const [, langSeg, id] = buildMatch
      const lang = (LANGS.includes(langSeg as Lang) ? langSeg : 'en') as Lang
      try {
        return await rewriteBuildMeta(env, url.origin, lang, id, assetResponse)
      } catch {
        return assetResponse
      }
    }

    return env.ASSETS.fetch(request)
  },
}
