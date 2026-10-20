import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

// Component tests: a real i18next instance (so `i18n.language` exists) with
// no resources, so every translation renders its own key and tests can query by it.
if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({ lng: 'es', resources: {}, interpolation: { escapeValue: false } })
}

export default i18next
