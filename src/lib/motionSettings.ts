const CURSOR_LS_KEY     = 'dofus-forge-cursor'
const PARTICLES_LS_KEY  = 'dofus-forge-particles'
export const MOTION_SETTINGS_EVENT = 'forge-motion-settings-change'

export function isCursorEnabled(): boolean {
  return localStorage.getItem(CURSOR_LS_KEY) !== 'off'
}

export function setCursorEnabled(on: boolean) {
  localStorage.setItem(CURSOR_LS_KEY, on ? 'on' : 'off')
  window.dispatchEvent(new Event(MOTION_SETTINGS_EVENT))
}

export function isParticlesEnabled(): boolean {
  return localStorage.getItem(PARTICLES_LS_KEY) !== 'off'
}

export function setParticlesEnabled(on: boolean) {
  localStorage.setItem(PARTICLES_LS_KEY, on ? 'on' : 'off')
  window.dispatchEvent(new Event(MOTION_SETTINGS_EVENT))
}
