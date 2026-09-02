import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSeoMeta, type SeoLang } from './seo/useSeoMeta.ts'

/**
 * Wraps a route so the URL path segment (/, /es, /fr, /pt) is the
 * source of truth for the active language — this is what makes each
 * language a distinct, crawlable, correctly-described URL for SEO.
 * i18n.changeLanguage cascades to the existing effect in BuilderPage
 * that reloads item data per language.
 */
export function LangRoute({ lang, children }: { lang: SeoLang; children: ReactNode }) {
  const { i18n } = useTranslation()

  useEffect(() => {
    if (i18n.language.slice(0, 2) !== lang) i18n.changeLanguage(lang)
  }, [lang, i18n])

  useSeoMeta(lang)

  return <>{children}</>
}
