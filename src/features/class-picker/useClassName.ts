import { useTranslation } from 'react-i18next'
import { useDataStore } from '@/store/dataStore.ts'
import { CLASS_DATA } from './classData.ts'

/**
 * Resolves the official Ankama-localized class name for the given
 * language, falling back to the English name in classData.ts if the
 * data hasn't loaded yet (or is missing for that class/lang).
 *
 * Class names genuinely differ by language (Sacrier/Sacrieur, Rogue/
 * Roublard/Tymador/Ladino, Iop/Yopuka, ...) — see public/data/class-names.json,
 * generated in scripts/fetch-spells.ts from Ankama's own text tables.
 *
 * classId is a plain string (not the DofusClass union) since some
 * callers (e.g. compare mode's "build B") only carry a stored string.
 */
export function resolveClassName(
  classId: string,
  lang: string,
  classNames: Record<string, Record<string, string>> | null,
): string {
  const localized = classNames?.[classId]?.[lang]
  if (localized) return localized
  return CLASS_DATA.find(c => c.id === classId)?.name ?? classId
}

/** Hook form for a single class lookup, reactive to the active language. */
export function useClassName(classId: string | null | undefined): string {
  const { i18n } = useTranslation()
  const classNames = useDataStore(s => s.classNames)
  if (!classId) return ''
  return resolveClassName(classId, i18n.language.slice(0, 2), classNames)
}
