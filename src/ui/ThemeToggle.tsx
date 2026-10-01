const LS_KEY      = 'dofus-forge-theme'
const THEME_EVENT = 'forge-theme-change'
export const THEME_EVENT_NAME = THEME_EVENT

export function getCurrentTheme(): 'dark' | 'light' {
  return getInitialTheme()
}

function getInitialTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem(LS_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.classList.toggle('light', theme === 'light')
  document.documentElement.classList.toggle('dark',  theme === 'dark')
}

/** Flips the theme and dispatches an event so every mounted consumer
 * (SettingsModal, command palette) re-syncs instead of going stale — theme
 * is only ever changed from the Settings modal or the command palette now,
 * there's no standalone toggle button anymore. */
export function toggleTheme() {
  const next = getInitialTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  localStorage.setItem(LS_KEY, next)
  window.dispatchEvent(new Event(THEME_EVENT))
}

/** Apply theme on initial load (before React mounts) */
export function initTheme() {
  applyTheme(getInitialTheme())
}
