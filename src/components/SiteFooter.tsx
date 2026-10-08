import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { langPathPrefix } from '@/i18n/langPath.ts'

/** Shared across every page (planner, Explore, My Builds, build detail,
 * About, How to Use) — gives every page the same internal-linking surface
 * (helps crawl discovery of About/How to Use/Explore) instead of each page
 * reinventing its own footer or having none at all. */
export function SiteFooter() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)

  return (
    <footer className="border-t border-forge-border mt-8 py-5 px-4 text-center space-y-3">
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-ink-muted">
        <Link to={`/${prefix}`} className="hover:text-gold transition-colors">{t('app_title')}</Link>
        <Link to={`/${prefix}about`} className="hover:text-gold transition-colors">{t('nav_about')}</Link>
        <Link to={`/${prefix}how-to-use`} className="hover:text-gold transition-colors">{t('nav_how_to_use')}</Link>
        <Link to={`/${prefix}explore`} className="hover:text-gold transition-colors">{t('explore_open')}</Link>
        <Link to={`/${prefix}my-builds`} className="hover:text-gold transition-colors">{t('my_builds')}</Link>
      </nav>
      <p className="text-[10px] max-w-xl mx-auto flex flex-wrap justify-center gap-x-4 gap-y-0.5" style={{ color: 'var(--ink-faint)' }}>
        <span><span style={{ color: 'var(--ink-muted)' }}>{t('credits_server')}: </span>Tal Kasha</span>
        <span><span style={{ color: 'var(--ink-muted)' }}>{t('credits_creator')}: </span>Juan / Wembie</span>
        <span><span style={{ color: 'var(--ink-muted)' }}>{t('credits_ingame')}: </span>Raik-Luck</span>
      </p>
      <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
        <span style={{ color: 'var(--ink-muted)' }}>{t('credits_community')}: </span>
        <a href="https://discord.gg/dhZMmDjrBH" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors underline-offset-2 hover:underline">Discord</a>
      </p>
    </footer>
  )
}
