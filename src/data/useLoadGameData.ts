import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDataStore } from '@/store/dataStore.ts'

const SUPPORTED = ['en', 'es', 'fr', 'pt']

/** Loads item/set data for the active language — BuilderPage does this
 * inline already; pages that render equipment icons without going through
 * the builder (Explore, build detail, My Builds) call this instead. */
export function useLoadGameData() {
  const { i18n } = useTranslation()
  const load = useDataStore(s => s.load)
  useEffect(() => {
    const lang = i18n.language.slice(0, 2)
    load(SUPPORTED.includes(lang) ? lang : 'en')
  }, [load, i18n.language])
}
