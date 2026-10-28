import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Coffee, Mountain } from 'lucide-react'
import { ColombianMark } from '@/components/ColombianMark.tsx'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'

/** Shared across every page (planner, Explore, My Builds, build detail,
 * About, How to Use) — gives every page the same internal-linking surface
 * (helps crawl discovery of About/How to Use/Explore) instead of each page
 * reinventing its own footer or having none at all. */
export function SiteFooter() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const homePath = `/${langPathRootSegment(i18n.language)}`

  return (
    <footer className="border-t border-forge-border mt-8 py-5 px-4 text-center space-y-3">
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-ink-muted" aria-label={t('a11y_site_nav')}>
        <Link to={homePath} className="hover:text-gold transition-colors">{t('app_title')}</Link>
        <Link to={`/${prefix}about`} className="hover:text-gold transition-colors">{t('nav_about')}</Link>
        <Link to={`/${prefix}how-to-use`} className="hover:text-gold transition-colors">{t('nav_how_to_use')}</Link>
        <Link to={`/${prefix}forge-guide`} className="hover:text-gold transition-colors">{t('nav_forge_guide')}</Link>
        <Link to={`/${prefix}shortcuts`} className="hover:text-gold transition-colors">{t('nav_shortcuts')}</Link>
        <Link to={`/${prefix}explore`} className="hover:text-gold transition-colors">{t('explore_open')}</Link>
        <Link to={`/${prefix}my-builds`} className="hover:text-gold transition-colors">{t('my_builds')}</Link>
      </nav>
      <div
        role="img"
        aria-label={t('colombia_badge')}
        className="flex items-center justify-center gap-2"
        style={{ color: 'var(--ink-faint)' }}
      >
        <ColombianMark />
        <span className="text-[10px] font-medium tracking-wide" style={{ color: 'var(--ink-muted)' }}>
          {t('colombia_badge')}
        </span>
        <Coffee size={13} aria-hidden="true" style={{ color: 'var(--gold)' }} />
        <Mountain size={14} aria-hidden="true" style={{ color: 'var(--air)' }} />
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="flex-shrink-0">
          <path d="m9 14-4 7m6-6-1 6m3-6 1 6" stroke="#003893" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 13c0-2.9 2-5 4.8-5 2.3 0 4.3 1.8 4.3 4.1 0 2.7-2.1 4.9-4.9 4.9-2.2 0-3.7-1.3-4.2-4Z" stroke="var(--air)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.3 11.9c1.4-1 3.4-1 4.9-.2" stroke="#003893" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16.1" cy="5.5" r="3.1" stroke="#CE1126" strokeWidth="2" />
          <path d="m19 5.6 2.8 1.2L19 8.3" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16.3" cy="5.2" r=".4" fill="var(--ink)" />
        </svg>
      </div>
      <p className="text-[10px] max-w-xl mx-auto flex flex-wrap justify-center gap-x-4 gap-y-0.5" style={{ color: 'var(--ink-faint)' }}>
        <span><span style={{ color: 'var(--ink-muted)' }}>{t('credits_server')}: </span>Tal Kasha</span>
        <span><span style={{ color: 'var(--ink-muted)' }}>{t('credits_creator')}: </span>Juan / Wembie</span>
        <span><span style={{ color: 'var(--ink-muted)' }}>{t('credits_ingame')}: </span>Raik-Luck</span>
      </p>
      <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
        <span style={{ color: 'var(--ink-muted)' }}>{t('credits_community')}: </span>
        <a href="https://discord.gg/Rv8q4C8C5j" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors underline-offset-2 hover:underline">Discord</a>
        <span aria-hidden="true"> · </span>
        <a href="https://x.com/DofusForgeApp" target="_blank" rel="noopener noreferrer" aria-label={t('a11y_on_x')} className="hover:text-gold transition-colors underline-offset-2 hover:underline">X</a>
      </p>
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px]" style={{ color: 'var(--ink-faint)' }} aria-label={t('a11y_legal_nav')}>
        <Link to={`/${prefix}privacy`} className="hover:text-gold transition-colors underline-offset-2 hover:underline">{t('legal_privacy')}</Link>
        <Link to={`/${prefix}terms`} className="hover:text-gold transition-colors underline-offset-2 hover:underline">{t('legal_terms')}</Link>
        <a href="mailto:contact@dofusforge.com" className="hover:text-gold transition-colors underline-offset-2 hover:underline">{t('legal_contact')}</a>
      </nav>
      <p className="text-[10px] max-w-xl mx-auto" style={{ color: 'var(--ink-faint)' }}>{t('legal_ankama_disclaimer')}</p>
    </footer>
  )
}
