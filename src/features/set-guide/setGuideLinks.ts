import { langPathPrefix } from '@/i18n/langPath.ts'
import type { GuideElement } from '@/data/setGuide.ts'

export const ELEMENT_VAR: Record<GuideElement, string> = { earth: 'var(--earth)', fire: 'var(--fire)', water: 'var(--water)', air: 'var(--air)' }
export const ELEMENT_ICON: Record<GuideElement, string> = { earth: 'strength', fire: 'intelligence', water: 'chance', air: 'agility' }

/** A set page's path in the given language. */
export function setPath(lang: string, slug: string) {
  return `/${langPathPrefix(lang)}sets/${slug}`
}
