import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const LS_KEY = 'dofus-forge-theme'

function getInitialTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem(LS_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.classList.toggle('light', theme === 'light')
  document.documentElement.classList.toggle('dark',  theme === 'dark')
}

export function ThemeToggle() {
  const { t }             = useTranslation()
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(LS_KEY, theme)
  }, [theme])

  const toggle = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 rounded-lg border border-metal-edge bg-surface-stone text-ink-muted hover:text-ink hover:border-gold-deep transition-colors flex items-center justify-center text-sm"
      aria-label={theme === 'dark' ? t('theme_switch_light') : t('theme_switch_dark')}
      title={theme === 'dark' ? t('theme_label_light') : t('theme_label_dark')}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

/** Apply theme on initial load (before React mounts) */
export function initTheme() {
  applyTheme(getInitialTheme())
}
