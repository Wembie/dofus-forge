import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { fetchBackend } from './fetchBackend.ts'

i18n
  .use(fetchBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
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

// Pages set <html lang> via usePageSeo, but a language switch without a
// route change (or a page that skips usePageSeo) would leave it stale.
i18n.on('languageChanged', lng => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng.slice(0, 2)
})

export default i18n
