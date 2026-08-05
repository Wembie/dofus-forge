import { useTranslation } from 'react-i18next'
import { useDataStore } from '@/store/dataStore.ts'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'pt', label: 'PT' },
] as const

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const load     = useDataStore(s => s.load)
  const lang     = i18n.language.slice(0, 2)

  const handleChange = async (code: string) => {
    await i18n.changeLanguage(code)
    await load(code)  // reload item data in the selected language
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
          aria-label={`Switch to ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
