import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { fetchBackend } from './fetchBackend.ts'

/**
 * Starts the browser's i18n instance in the URL's language. Resolves once
 * that language's strings are loaded, so the first client render produces
 * the same text as the prerendered HTML it hydrates. The detector only
 * caches the choice (localStorage) for the bare-URL language redirect.
 */
export function initI18n(lng: string) {
  return i18n
    .use(fetchBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      lng,
      fallbackLng: 'en',
      supportedLngs: ['en', 'es', 'fr', 'pt'],
      ns: ['translation'],
      defaultNS: 'translation',
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'dofus-forge-lang',
      },
      interpolation: {
        escapeValue: false,  // React escapes by default
      },
    })
}

// Pages set <html lang> via usePageSeo, but a language switch without a
// route change (or a page that skips usePageSeo) would leave it stale.
i18n.on('languageChanged', lng => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng.slice(0, 2)
})

export default i18n
