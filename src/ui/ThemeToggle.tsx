import { useEffect, useState } from 'react'

const LS_KEY = 'dofus-forge-theme'

function getInitialTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem(LS_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.classList.toggle('light', theme === 'light')
  document.documentElement.classList.toggle('dark',  theme === 'dark')
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(LS_KEY, theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 rounded-lg border border-forge-border bg-forge-surface text-forge-muted hover:text-forge-text hover:border-forge-gold/40 transition-colors flex items-center justify-center text-sm"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

/** Apply theme on initial load (before React mounts) */
export function initTheme() {
  applyTheme(getInitialTheme())
}
