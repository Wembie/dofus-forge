import { createContext, useContext, useEffect } from 'react'

export type SeoLang = 'en' | 'es' | 'fr' | 'pt'

export const SITE = 'https://dofusforge.com'
export const DEFAULT_IMAGE = `${SITE}/og-preview.jpg`

const PATH: Record<SeoLang, string> = { en: '', es: '/es', fr: '/fr', pt: '/pt' }

const META: Record<SeoLang, { title: string; description: string }> = {
  en: {
    title: 'Dofus Forge — Build Planner for Dofus 3',
    description: 'Plan your Dofus 3 builds online — item catalog, set bonuses, magesmithy runes, stat optimizer, and shareable build URLs. Free, fast, always up to date.',
  },
  es: {
    title: 'Dofus Forge — Planificador de Builds para Dofus 3',
    description: 'Planifica tus builds de Dofus 3 online — catálogo de items, bonus de sets, runas de forjamagia, optimizador de stats y builds compartibles. Gratis y siempre actualizado.',
  },
  fr: {
    title: 'Dofus Forge — Planificateur de Builds pour Dofus 3',
    description: "Planifiez vos builds Dofus 3 en ligne — catalogue d'objets, bonus de panoplies, runes de forgemagie, optimiseur de stats et builds partageables. Gratuit, toujours à jour.",
  },
  pt: {
    title: 'Dofus Forge — Planejador de Builds para Dofus 3',
    description: 'Planeje suas builds de Dofus 3 online — catálogo de itens, bônus de conjuntos, runas de forjamagia, otimizador de stats e builds compartilháveis. Grátis e sempre atualizado.',
  },
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`
  let el = document.querySelector<HTMLLinkElement>(selector)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    if (hreflang) el.setAttribute('hreflang', hreflang)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

// No trailing slash: matches wrangler.jsonc's html_handling: "drop-trailing-slash".
// Real visits almost always arrive via a bare, non-slash URL (nobody types or
// shares a trailing slash) — canonicalizing to that form means most traffic
// never pays the 307 redirect round-trip that the opposite convention forced
// on every page load (observed live in Cloudflare's Web Vitals: 86ms P75 on
// the redirect leg of TTLB).
function normalizePath(path: string) {
  const trimmed = path.replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}` : ''
}

type SeoOptions = { title?: string; description?: string; noindex?: boolean; image?: string }

export type SeoTags = {
  lang:        SeoLang
  title:       string
  description: string
  canonical:   string
  /** hreflang alternates, x-default last. */
  alternates:  { hreflang: string; href: string }[]
  robots:      string
  ogLocale:    string
  image:       string
}

export function seoTags(lang: SeoLang, path = '', opts: SeoOptions = {}): SeoTags {
  const normalized = normalizePath(path)
  return {
    lang,
    title:       opts.title ?? META[lang].title,
    description: opts.description ?? META[lang].description,
    canonical:   `${SITE}${PATH[lang]}${normalized}`,
    alternates:  [
      ...(Object.keys(PATH) as SeoLang[]).map(code => ({ hreflang: code, href: `${SITE}${PATH[code]}${normalized}` })),
      { hreflang: 'x-default', href: `${SITE}${normalized}` },
    ],
    robots:      opts.noindex ? 'noindex, follow' : 'index, follow',
    ogLocale:    `${lang}_${lang === 'en' ? 'US' : lang.toUpperCase()}`,
    image:       opts.image ?? DEFAULT_IMAGE,
  }
}

/**
 * Set only while rendering HTML on the server: usePageSeo reports the page's
 * tags here during render (effects never run there), and root.tsx writes
 * them into <head>. In the browser there is no collector and the effect
 * below keeps <head> in sync on every navigation.
 */
export const SeoCollectorContext = createContext<((tags: SeoTags) => void) | null>(null)

/** The collected tags, handed back for the server's second render of the document. */
export const SeoTagsContext = createContext<SeoTags | null>(null)

/**
 * The tags the prerendered <head> was written with, for the first client
 * render. React 19 does not hydrate <title>/<meta>/<link> in place: it looks
 * for an existing element with the same attributes and inserts a new one when
 * there is none, so rendering anything else (the language defaults) left a
 * second canonical, description and hreflang set pointing at the home page.
 */
export function readSeoTags(doc: Document, lang: SeoLang): SeoTags {
  const defaults = seoTags(lang)
  const meta = (selector: string) => doc.head.querySelector<HTMLMetaElement>(`meta[${selector}]`)?.content
  const alternates = [...doc.head.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')]
    .map(link => ({ hreflang: link.getAttribute('hreflang')!, href: link.getAttribute('href')! }))
  return {
    lang,
    title:       doc.title || defaults.title,
    description: meta('name="description"') ?? defaults.description,
    canonical:   doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? defaults.canonical,
    alternates:  alternates.length ? alternates : defaults.alternates,
    robots:      meta('name="robots"') ?? defaults.robots,
    ogLocale:    meta('property="og:locale"') ?? defaults.ogLocale,
    image:       meta('property="og:image"') ?? defaults.image,
  }
}

/**
 * Sets per-page title, description, canonical URL, hreflang alternates
 * and (optionally) a noindex directive, keyed by the route's path
 * (without the /es /fr /pt prefix) so every indexable page — not just
 * the root — gets correct, distinct metadata instead of inheriting the
 * homepage's. Call this from the page component itself, not a shared
 * layout, since each route owns its own title/description.
 */
export function usePageSeo(lang: SeoLang, path = '', opts: SeoOptions = {}) {
  const { title, description, noindex = false, image } = opts
  const collect = useContext(SeoCollectorContext)
  collect?.(seoTags(lang, path, opts))

  useEffect(() => {
    const tags = seoTags(lang, path, { title, description, noindex, image })

    document.title = tags.title
    document.documentElement.lang = lang

    upsertMeta('name', 'description', tags.description)
    upsertMeta('property', 'og:title', tags.title)
    upsertMeta('property', 'og:description', tags.description)
    upsertMeta('name', 'twitter:title', tags.title)
    upsertMeta('name', 'twitter:description', tags.description)
    upsertMeta('property', 'og:image', tags.image)
    upsertMeta('name', 'twitter:image', tags.image)

    upsertLink('canonical', tags.canonical)
    upsertMeta('property', 'og:url', tags.canonical)
    upsertMeta('property', 'og:locale', tags.ogLocale)
    upsertMeta('name', 'robots', tags.robots)
    for (const { hreflang, href } of tags.alternates) upsertLink('alternate', href, hreflang)
  }, [lang, path, title, description, noindex, image])
}

/** Back-compat wrapper for routes that only need the language-level defaults (the root planner page). */
export function useSeoMeta(lang: SeoLang) {
  usePageSeo(lang, '')
}
