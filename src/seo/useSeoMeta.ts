import { useEffect } from 'react'

export type SeoLang = 'en' | 'es' | 'fr' | 'pt'

const SITE = 'https://dofusforge.com'

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

function removeMeta(attr: 'name' | 'property', key: string) {
  document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)?.remove()
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

function normalizePath(path: string) {
  const trimmed = path.replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}/` : '/'
}

/**
 * Sets per-page title, description, canonical URL, hreflang alternates
 * and (optionally) a noindex directive, keyed by the route's path
 * (without the /es /fr /pt prefix) so every indexable page — not just
 * the root — gets correct, distinct metadata instead of inheriting the
 * homepage's. Call this from the page component itself, not a shared
 * layout, since each route owns its own title/description.
 */
export function usePageSeo(
  lang: SeoLang,
  path = '',
  opts: { title?: string; description?: string; noindex?: boolean } = {},
) {
  const { title, description, noindex = false } = opts

  useEffect(() => {
    const normalized = normalizePath(path)
    const fallback = META[lang]
    const pageTitle = title ?? fallback.title
    const pageDescription = description ?? fallback.description

    document.title = pageTitle
    document.documentElement.lang = lang

    upsertMeta('name', 'description', pageDescription)
    upsertMeta('property', 'og:title', pageTitle)
    upsertMeta('property', 'og:description', pageDescription)
    upsertMeta('name', 'twitter:title', pageTitle)
    upsertMeta('name', 'twitter:description', pageDescription)

    const canonicalUrl = `${SITE}${PATH[lang]}${normalized}`
    upsertLink('canonical', canonicalUrl)
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('property', 'og:locale', `${lang}_${lang === 'en' ? 'US' : lang.toUpperCase()}`)

    if (noindex) {
      upsertMeta('name', 'robots', 'noindex, follow')
    } else {
      removeMeta('name', 'robots')
      ;(Object.keys(PATH) as SeoLang[]).forEach(code => {
        upsertLink('alternate', `${SITE}${PATH[code]}${normalized}`, code)
      })
      upsertLink('alternate', `${SITE}${normalized}`, 'x-default')
    }
  }, [lang, path, title, description, noindex])
}

/** Back-compat wrapper for routes that only need the language-level defaults (the root planner page). */
export function useSeoMeta(lang: SeoLang) {
  usePageSeo(lang, '')
}
