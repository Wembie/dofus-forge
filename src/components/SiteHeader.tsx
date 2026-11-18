import { Suspense, lazy, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { BookOpen, Compass, FolderOpen, Hammer, Home, Info, Keyboard, Library, Menu, Moon, Search, Settings, ShieldCheck, SunMedium, SunMoon, Volume2 } from 'lucide-react'
import { getCurrentTheme, toggleTheme, THEME_EVENT_NAME } from '@/ui/ThemeToggle.tsx'
import { BrandMark } from '@/ui'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { CommandPalette, openCommandPalette } from '@/components/CommandPalette.tsx'
import { SettingsModal } from '@/components/SettingsModal.tsx'
import { SiteNavSheet } from '@/components/SiteNavSheet.tsx'
import { toggleSound } from '@/lib/sound.ts'
import { useAuthStore } from '@/store/authStore.ts'

const AuthButton = lazy(() => import('@/features/auth/AuthButton.tsx').then(m => ({ default: m.AuthButton })))
const NotificationBell = lazy(() => import('@/features/notifications/NotificationBell.tsx').then(m => ({ default: m.NotificationBell })))

/** Theme switch for the header; follows changes made from preferences or the palette. */
export function ThemeButton() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<string | null>(null)
  useEffect(() => {
    const sync = () => setTheme(getCurrentTheme())
    sync()
    window.addEventListener(THEME_EVENT_NAME, sync)
    return () => window.removeEventListener(THEME_EVENT_NAME, sync)
  }, [])
  return (
    <button type="button" className="site-icon" onClick={toggleTheme} aria-label={t('theme_switch')} title={t('theme_switch')}>
      {theme === 'light' ? <Moon size={18} /> : <SunMedium size={18} />}
    </button>
  )
}

/** The site header shared by every page except the workshop: brand, main
 * destinations as real links (crawlable), all-actions palette, theme,
 * preferences, notifications, account and, on narrow screens, the full menu. */
export function SiteHeader() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const prefix = langPathPrefix(i18n.language)
  const homePath = `/${langPathRootSegment(i18n.language)}`
  const isAdmin = useAuthStore(s => s.profile?.role === 'admin')
  const at = (segment: string) => new RegExp(`(?:^|/)${segment}(?:/|$)`).test(pathname)
  const [showSettings, setShowSettings] = useState(false)
  const [showNav, setShowNav] = useState(false)

  const links: [string, string, typeof Compass][] = [
    ['explore', 'explore_open', Compass],
    ['my-builds', 'my_builds', FolderOpen],
    ['sets', 'nav_sets', Library],
    ...(isAdmin ? [['admin', 'admin_nav', ShieldCheck] as [string, string, typeof Compass]] : []),
  ]

  return (
    <header className="site-header">
      <a href="#main-content" className="skip-link">{t('skip_to_main')}</a>
      {/* Persistent brand, not a heading: each page has its own <h1>. */}
      <Link to={homePath} className="site-brand">
        <BrandMark />
        <span className="brand-wordmark">{t('app_title')}</span>
      </Link>

      <nav className="site-nav" aria-label={t('a11y_main_nav')}>
        <Link to={homePath}>
          <Hammer size={15} aria-hidden="true" />
          {t('nav_workshop')}
        </Link>
        {links.map(([segment, label]) => (
          <Link key={segment} to={`/${prefix}${segment}`} aria-current={at(segment) ? 'page' : undefined}>
            {t(label)}
          </Link>
        ))}
      </nav>

      <div className="site-actions">
        <button type="button" className="site-icon site-wide" onClick={openCommandPalette}
          aria-label={`${t('palette_open')} (Ctrl K)`} title={`${t('palette_open')} · Ctrl K`}>
          <Search size={18} />
        </button>
        <ThemeButton />
        <button type="button" className="site-icon site-wide" onClick={() => setShowSettings(true)} aria-label={t('settings_title')} title={t('settings_title')}>
          <Settings size={18} />
        </button>
        <Suspense fallback={null}><NotificationBell /></Suspense>
        <Suspense fallback={null}><AuthButton /></Suspense>
        <button type="button" className="site-icon site-menu" onClick={() => setShowNav(true)} aria-label={t('open_menu')}>
          <Menu size={22} />
        </button>
      </div>

      <CommandPalette
        commands={[
          { key: 'home',       label: t('app_title'),      Icon: Home,       onRun: () => navigate(homePath) },
          { key: 'explore',    label: t('explore_open'),   Icon: Compass,    onRun: () => navigate(`/${prefix}explore`) },
          { key: 'my-builds',  label: t('my_builds'),      Icon: FolderOpen, onRun: () => navigate(`/${prefix}my-builds`) },
          { key: 'sets',       label: t('nav_sets'),       Icon: Library,    onRun: () => navigate(`/${prefix}sets`) },
          { key: 'how-to-use', label: t('nav_how_to_use'), Icon: BookOpen,   onRun: () => navigate(`/${prefix}how-to-use`) },
          { key: 'shortcuts',  label: t('nav_shortcuts'),  Icon: Keyboard,   onRun: () => navigate(`/${prefix}shortcuts`) },
          { key: 'about',      label: t('nav_about'),      Icon: Info,       onRun: () => navigate(`/${prefix}about`) },
          ...(isAdmin ? [{ key: 'admin', label: t('admin_nav'), Icon: ShieldCheck, onRun: () => navigate(`/${prefix}admin`) }] : []),
          { key: 'settings',  label: t('settings_title'), Icon: Settings, onRun: () => setShowSettings(true) },
          { key: 'theme',     label: t('theme_label_dark') + ' / ' + t('theme_label_light'), Icon: SunMoon, onRun: toggleTheme },
          { key: 'sound',     label: t('sound_mute') + ' / ' + t('sound_unmute'), Icon: Volume2, onRun: toggleSound },
        ]}
      />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <SiteNavSheet open={showNav} onClose={() => setShowNav(false)} isAdmin={isAdmin} onSettings={() => setShowSettings(true)} />
    </header>
  )
}
