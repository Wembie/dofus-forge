import { langPathPrefix } from '@/i18n/langPath.ts'
import type { GuideElement } from '@/data/setGuide.ts'

export const ELEMENT_VAR: Record<GuideElement, string> = { earth: 'var(--earth)', fire: 'var(--fire)', water: 'var(--water)', air: 'var(--air)' }
export const ELEMENT_ICON: Record<GuideElement, string> = { earth: 'strength', fire: 'intelligence', water: 'chance', air: 'agility' }
// A GuideElement classifies a set/build by its dominant characteristic, not by
// elemental damage — label it with that characteristic (stat_* keys already
// translated in all locales), not the earth/fire/water/air element name.
export const ELEMENT_STAT_KEY: Record<GuideElement, string> = { earth: 'stat_strength', fire: 'stat_intelligence', water: 'stat_chance', air: 'stat_agility' }

/** A set page's path in the given language. */
export function setPath(lang: string, slug: string) {
  return `/${langPathPrefix(lang)}sets/${slug}`
}
