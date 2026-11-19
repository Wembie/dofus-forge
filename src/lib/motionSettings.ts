import { readLocal } from '@/lib/storage.ts'

const CHARACTER_LS_KEY  = 'dofus-forge-character'
export const MOTION_SETTINGS_EVENT = 'forge-motion-settings-change'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth'
}

export type CharacterMode = '2d' | '3d'

export function getCharacterMode(): CharacterMode {
  const saved = readLocal(CHARACTER_LS_KEY)
  return saved === '2d' ? '2d' : '3d'
}

export function setCharacterMode(mode: CharacterMode) {
  localStorage.setItem(CHARACTER_LS_KEY, mode)
  window.dispatchEvent(new Event(MOTION_SETTINGS_EVENT))
}
