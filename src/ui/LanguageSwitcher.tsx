import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router'

export const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
] as const

/** Current language and a setter that changes it through the URL.
 *
 * Navigating updates the path, which LangRoute picks up to call
 * i18n.changeLanguage — the URL stays the single source of truth for the
 * language (required for /es /fr /pt to be distinct, crawlable, correctly
 * indexed pages). The current sub-path is kept (e.g. /classes/cra, /about)
 * instead of bouncing back to the planner. `explicit: true` tells RootRoute
 * this is a deliberate choice, not a fresh page load — otherwise choosing
 * English loops back to whatever language was cached in localStorage. */
export function useLanguageChange() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const lang = i18n.language.slice(0, 2)

  const change = (code: string) => {
    if (code === lang) return
    const currentCode = lang === 'en' ? null : lang
    const subPath = currentCode
      ? location.pathname.replace(new RegExp(`^/${currentCode}(?=/|$)`), '') || '/'
      : location.pathname
    const path = code === 'en' ? subPath : `/${code}${subPath}`
    navigate(`${path}${location.search}`, { state: { explicit: true } })
  }

  return [lang, change] as const
}
