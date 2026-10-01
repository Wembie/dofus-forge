import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Compass, FolderOpen, Home, SunMoon, Volume2, Settings } from 'lucide-react'
import { toggleTheme } from '@/ui/ThemeToggle.tsx'
import { IconButton } from '@/ui'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { HeaderMenuButton } from '@/components/HeaderMenuButton.tsx'
import { CommandPalette } from '@/components/CommandPalette.tsx'
import { SettingsModal } from '@/components/SettingsModal.tsx'
import { toggleSound } from '@/lib/sound.ts'

const AuthButton = lazy(() => import('@/features/auth/AuthButton.tsx').then(m => ({ default: m.AuthButton })))

/** Same brand/nav/language/theme/auth controls as BuilderPage's header,
 * without the build-editing tools (undo/redo, optimizer, etc.) — used by
 * every page that isn't the builder itself (Explore, My Builds, build
 * detail) so navigating between them doesn't feel like leaving the app. */
export function SiteHeader() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const prefix = langPathPrefix(i18n.language)
  const isExplore  = location.pathname.includes('/explore')
  const isMyBuilds = location.pathname.includes('/my-builds')
  const [showSettings, setShowSettings] = useState(false)

  return (
    <header
      className="sticky top-0 z-40 px-3 sm:px-6 h-[52px] flex items-center gap-2 sm:gap-4"
      style={{
        background:   'linear-gradient(to bottom, var(--surface-stone), var(--surface-void))',
        borderBottom: '1px solid var(--metal-edge)',
        boxShadow:    '0 1px 0 color-mix(in srgb, var(--gold) 10%, transparent), 0 4px 28px rgba(0,0,0,0.65)',
      }}
    >
      <Link to={`/${prefix}`} className="flex items-center gap-2 flex-shrink-0" style={{ textDecoration: 'none' }}>
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
          <path d="M5 0 L10 5 L5 10 L0 5Z" fill="var(--gold)" opacity="0.9" />
        </svg>
        <h1
          className="font-display font-bold tracking-[0.18em] uppercase"
          style={{ fontSize: '0.82rem', color: 'var(--gold)', textShadow: '0 0 32px rgba(201,162,75,0.5), 0 1px 0 rgba(0,0,0,0.8)', letterSpacing: '0.2em' }}
        >
          {t('app_title')}
        </h1>
      </Link>

      <nav className="hidden sm:flex items-center gap-1.5 ml-1">
        <Link
          to={`/${prefix}explore`}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border"
          style={isExplore
            ? { background: 'color-mix(in srgb, var(--gold) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--gold) 45%, transparent)', color: 'var(--gold)' }
            : { background: 'transparent', borderColor: 'var(--metal-edge)', color: 'var(--ink-faint)' }}
        >
          <Compass size={13} />
          {t('explore_open')}
        </Link>
        <Link
          to={`/${prefix}my-builds`}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border"
          style={isMyBuilds
            ? { background: 'color-mix(in srgb, var(--gold) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--gold) 45%, transparent)', color: 'var(--gold)' }
            : { background: 'transparent', borderColor: 'var(--metal-edge)', color: 'var(--ink-faint)' }}
        >
          <FolderOpen size={13} />
          {t('my_builds')}
        </Link>
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <IconButton label={t('settings_title')} variant="subtle" size="md" onClick={() => setShowSettings(true)}>
          <Settings size={14} />
        </IconButton>
        <HeaderMenuButton
          className="sm:hidden"
          items={[
            { key: 'explore',   label: t('explore_open'), Icon: Compass,    active: isExplore,  onClick: () => navigate(`/${prefix}explore`) },
            { key: 'my-builds', label: t('my_builds'),    Icon: FolderOpen, active: isMyBuilds, onClick: () => navigate(`/${prefix}my-builds`) },
          ]}
        />
        <div className="hidden lg:block w-px h-5 mx-1" style={{ background: 'var(--metal-edge)' }} />
        <Suspense fallback={null}><AuthButton /></Suspense>
      </div>

      <CommandPalette
        commands={[
          { key: 'home',      label: t('app_title'),    Icon: Home,    onRun: () => navigate(`/${prefix}`) },
          { key: 'explore',   label: t('explore_open'), Icon: Compass, onRun: () => navigate(`/${prefix}explore`) },
          { key: 'my-builds', label: t('my_builds'),    Icon: FolderOpen, onRun: () => navigate(`/${prefix}my-builds`) },
          { key: 'settings',  label: t('settings_title'), Icon: Settings, onRun: () => setShowSettings(true) },
          { key: 'theme',     label: t('theme_label_dark') + ' / ' + t('theme_label_light'), Icon: SunMoon, onRun: toggleTheme },
          { key: 'sound',     label: t('sound_mute') + ' / ' + t('sound_unmute'), Icon: Volume2, onRun: toggleSound },
        ]}
      />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </header>
  )
}
