import { useEffect } from 'react'

export type SeoLang = 'en' | 'es' | 'fr' | 'pt'

const SITE = 'https://wembie.github.io/dofus-forge'

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

/**
 * Sets document.title, meta description, canonical URL, and hreflang
 * alternates to match the active language route. This is what lets
 * Google index /es/ /fr/ /pt/ as distinct, correctly-described pages
 * instead of duplicates of the English root.
 */
export function useSeoMeta(lang: SeoLang) {
  useEffect(() => {
    const m = META[lang]
    document.title = m.title
    document.documentElement.lang = lang

    upsertMeta('name',     'description',       m.description)
    upsertMeta('property', 'og:title',           m.title)
    upsertMeta('property', 'og:description',     m.description)
    upsertMeta('name',     'twitter:title',       m.title)
    upsertMeta('name',     'twitter:description', m.description)

    const canonicalUrl = `${SITE}${PATH[lang]}/`
    upsertLink('canonical', canonicalUrl)
    upsertMeta('property', 'og:url', canonicalUrl)

    ;(Object.keys(PATH) as SeoLang[]).forEach(code => {
      upsertLink('alternate', `${SITE}${PATH[code]}/`, code)
    })
    upsertLink('alternate', `${SITE}/`, 'x-default')
  }, [lang])
}
