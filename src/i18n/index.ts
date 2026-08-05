import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

const BASE = import.meta.env.BASE_URL  // '/dofus-forge/'

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr', 'pt'],
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: `${BASE}locales/{{lng}}/{{ns}}.json`,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'dofus-forge-lang',
    },
    interpolation: {
      escapeValue: false,  // React escapes by default
    },
  })

export default i18n
