import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Coffee, Mountain } from 'lucide-react'
import { BrandMark } from '@/ui'
import { ColombianMark } from '@/components/ColombianMark.tsx'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'

// Date of the project's first commit.
const FOUNDED_AT = Date.UTC(2026, 7, 4)
const FOUNDED_YEAR = 2026

function Cyclist() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9 14-4 7m6-6-1 6m3-6 1 6" stroke="#003893" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13c0-2.9 2-5 4.8-5 2.3 0 4.3 1.8 4.3 4.1 0 2.7-2.1 4.9-4.9 4.9-2.2 0-3.7-1.3-4.2-4Z" stroke="var(--air)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.3 11.9c1.4-1 3.4-1 4.9-.2" stroke="#003893" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16.1" cy="5.5" r="3.1" stroke="#CE1126" strokeWidth="2" />
      <path d="m19 5.6 2.8 1.2L19 8.3" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16.3" cy="5.2" r=".4" fill="var(--ink)" />
    </svg>
  )
}

/** Shared by every page: the same internal links everywhere (crawl discovery
 * of the reading pages, Explore and Sets), credits, community, legal links,
 * Ankama's disclaimer and the age of the project. */
export function SiteFooter() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const homePath = `/${langPathRootSegment(i18n.language)}`
  // Pages are prerendered at build time, so anything derived from "now" is
  // set after mount; otherwise the baked HTML and hydration disagree.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => setNow(Date.now()), [])
  const nowYear = now === null ? null : new Date(now).getUTCFullYear()
  const daysOnline = now === null ? null : Math.floor((now - FOUNDED_AT) / 86_400_000)
  const foundedLabel = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(FOUNDED_AT)
  const page = (segment: string, label: string) => <Link to={`/${prefix}${segment}`}>{t(label)}</Link>

  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-brand">
          <Link to={homePath} className="site-brand">
            <BrandMark size={26} />
            <span className="brand-wordmark">{t('app_title')}</span>
          </Link>
          <p>{t('footer_tagline')}</p>
          <p className="site-colombia" role="img" aria-label={t('colombia_badge')}>
            <ColombianMark />
            <span aria-hidden="true">{t('colombia_badge')}</span>
            <Coffee size={14} aria-hidden="true" style={{ color: 'var(--gold)' }} />
            <Mountain size={14} aria-hidden="true" style={{ color: 'var(--air)' }} />
            <Cyclist />
          </p>
        </div>
        <nav aria-label={t('a11y_site_nav')}>
          <h2>{t('footer_group_product')}</h2>
          <Link to={homePath}>{t('nav_workshop')}</Link>
          {page('explore', 'explore_open')}
          {page('my-builds', 'my_builds')}
          {page('sets', 'nav_sets')}
        </nav>
        <nav aria-label={t('footer_group_learn')}>
          <h2>{t('footer_group_learn')}</h2>
          {page('how-to-use', 'nav_how_to_use')}
          {page('forge-guide', 'nav_forge_guide')}
          {page('damage-guide', 'nav_damage_guide')}
          {page('shortcuts', 'nav_shortcuts')}
          {page('about', 'nav_about')}
        </nav>
        <div className="site-footer-credits">
          <h2>{t('footer_group_credits')}</h2>
          <dl>
            <div><dt>{t('credits_server')}</dt><dd>Tal Kasha</dd></div>
            <div><dt>{t('credits_creator')}</dt><dd>Juan / Wembie</dd></div>
            <div><dt>{t('credits_ingame')}</dt><dd>Raik-Luck</dd></div>
            <div>
              <dt>{t('credits_community')}</dt>
              <dd>
                <a href="https://discord.gg/Rv8q4C8C5j" target="_blank" rel="noopener noreferrer">Discord</a>
                <a href="https://x.com/DofusForgeApp" target="_blank" rel="noopener noreferrer" aria-label={t('a11y_on_x')}>X</a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="site-footer-legal">
        <nav aria-label={t('a11y_legal_nav')}>
          {page('privacy', 'legal_privacy')}
          {page('terms', 'legal_terms')}
          <a href="mailto:contact@dofusforge.com">{t('legal_contact')}</a>
        </nav>
        <p>{t('legal_ankama_disclaimer')}</p>
        <p className="site-footer-age">
          <span>© {FOUNDED_YEAR}{nowYear && nowYear > FOUNDED_YEAR ? `–${nowYear}` : ''} {t('app_title')}</span>
          <span aria-hidden="true">·</span>
          <span>{t('footer_founded', { date: foundedLabel })}</span>
          {daysOnline !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span>{t('footer_days_online', { count: daysOnline })}</span>
            </>
          )}
        </p>
      </div>
    </footer>
  )
}
