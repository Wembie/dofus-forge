import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { langFromPath, langPathRootSegment } from './i18n/langPath.ts'

const REDIRECT_LANGS = ['es', 'fr', 'pt']

/**
 * Layout for each language's page tree. The URL path segment (/, /es, /fr,
 * /pt) is the source of truth for the active language — this is what makes
 * each language a distinct, crawlable, correctly-described URL for SEO.
 * i18n.changeLanguage cascades to the existing effect in BuilderPage that
 * reloads item data per language.
 *
 * Title/description/canonical/hreflang are NOT set here — each page calls
 * usePageSeo itself with its own path, since a shared layout effect would
 * race page-level overrides (child effects fire before parent effects).
 */
export default function LangRoute() {
  const { i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const lang = langFromPath(location.pathname)
  const bareEnglish = lang === 'en' && location.pathname.split('/')[1] !== 'en'

  useEffect(() => {
    if (i18n.language.slice(0, 2) !== lang) i18n.changeLanguage(lang)
  }, [lang, i18n])

  // A returning visitor with a saved non-English language who lands on a bare
  // (English) URL goes to their language's page. Full page loads are already
  // redirected before render by the inline script in root.tsx; this covers
  // in-app navigation to a bare URL. Skipped when the navigation carries
  // `state.explicit` — set by LanguageSwitcher when the user deliberately
  // picks EN, which would otherwise loop back to the stored preference.
  useEffect(() => {
    if (!bareEnglish || (location.state as { explicit?: boolean } | null)?.explicit) return
    let stored: string | null = null
    try { stored = localStorage.getItem('dofus-forge-lang') } catch { /* private mode etc. */ }
    if (!stored || !REDIRECT_LANGS.includes(stored)) return
    // The hash is kept: Supabase's auth confirmation links land here with
    // #access_token=... in it, and dropping it silently loses the session.
    const path = location.pathname.replace(/\/+$/, '')
    navigate(`/${langPathRootSegment(stored)}${path}${location.search}${location.hash}`, { replace: true })
  }, [bareEnglish, location, navigate])

  return <Outlet />
}
