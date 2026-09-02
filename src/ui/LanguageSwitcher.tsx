import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'pt', label: 'PT' },
] as const

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const lang     = i18n.language.slice(0, 2)

  // Navigating updates the URL path, which LangRoute picks up to call
  // i18n.changeLanguage — this keeps the URL as the single source of
  // truth for language (required for /es /fr /pt to be distinct,
  // crawlable, correctly-indexed pages).
  const handleChange = (code: string) => {
    const path = code === 'en' ? '/' : `/${code}/`
    // `explicit: true` tells RootRoute this is a deliberate choice, not a
    // fresh page load — otherwise clicking EN loops back to whatever
    // language was last cached in localStorage.
    navigate(`${path}${location.search}`, { state: { explicit: true } })
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Language">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => handleChange(code)}
          className={[
            'px-2 py-1 rounded text-xs font-mono font-medium transition-colors',
            lang === code
              ? 'bg-forge-gold text-forge-bg'
              : 'text-forge-muted hover:text-forge-text',
          ].join(' ')}
          aria-pressed={lang === code}
          aria-label={t('lang_switch', { lang: label })}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
