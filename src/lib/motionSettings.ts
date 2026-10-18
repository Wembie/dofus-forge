const CURSOR_LS_KEY     = 'dofus-forge-cursor'
const PARTICLES_LS_KEY  = 'dofus-forge-particles'
const CHARACTER_LS_KEY  = 'dofus-forge-character'
export const MOTION_SETTINGS_EVENT = 'forge-motion-settings-change'

export function isCursorEnabled(): boolean {
  return localStorage.getItem(CURSOR_LS_KEY) === 'on'
}

export function setCursorEnabled(on: boolean) {
  localStorage.setItem(CURSOR_LS_KEY, on ? 'on' : 'off')
  window.dispatchEvent(new Event(MOTION_SETTINGS_EVENT))
}

export function isParticlesEnabled(): boolean {
  return localStorage.getItem(PARTICLES_LS_KEY) === 'on'
}

export function setParticlesEnabled(on: boolean) {
  localStorage.setItem(PARTICLES_LS_KEY, on ? 'on' : 'off')
  window.dispatchEvent(new Event(MOTION_SETTINGS_EVENT))
}

export type CharacterMode = '2d' | '3d'

export function getCharacterMode(): CharacterMode {
  const saved = localStorage.getItem(CHARACTER_LS_KEY)
  return saved === '2d' ? '2d' : '3d'
}

export function setCharacterMode(mode: CharacterMode) {
  localStorage.setItem(CHARACTER_LS_KEY, mode)
  window.dispatchEvent(new Event(MOTION_SETTINGS_EVENT))
}
