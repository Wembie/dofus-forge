import i18next from 'i18next'
import en from '../../public/locales/en/translation.json'
import es from '../../public/locales/es/translation.json'
import fr from '../../public/locales/fr/translation.json'
import pt from '../../public/locales/pt/translation.json'
import type { PathLang } from './langPath.ts'

const RESOURCES = { en, es, fr, pt }

/**
 * A fresh instance per render: the server renders several languages (and,
 * once pages render on the Worker, concurrent requests), so the browser's
 * shared singleton would leak one page's language into another.
 */
export function createServerI18n(lng: PathLang) {
  const instance = i18next.createInstance()
  instance.init({
    lng,
    fallbackLng: 'en',
    resources: { en: { translation: RESOURCES.en }, [lng]: { translation: RESOURCES[lng] } },
    defaultNS: 'translation',
    initImmediate: false,
    interpolation: { escapeValue: false },
  })
  return instance
}
