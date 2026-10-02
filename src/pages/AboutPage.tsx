import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Sparkles, Database, Heart, Users } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { Frame } from '@/ui'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'

const SECTIONS = [
  { key: 'why',  Icon: Sparkles },
  { key: 'data', Icon: Database },
  { key: 'free', Icon: Heart },
  { key: 'team', Icon: Users },
] as const

export function AboutPage() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'about', {
    title: t('about_seo_title'),
    description: t('about_seo_description'),
  })

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10 space-y-8">
        <div style={{ animation: 'col-rise 520ms var(--ease-out) 0ms both' }}>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--gold)' }}>
            {t('about_title')}
          </h1>
          <p className="text-sm leading-relaxed mt-3 max-w-2xl" style={{ color: 'var(--ink-muted)' }}>
            {t('about_intro')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SECTIONS.map(({ key, Icon }, i) => (
            <Frame key={key} padding="lg">
              <div style={{ animation: `col-rise 520ms var(--ease-out) ${i * 60}ms both` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} style={{ color: 'var(--gold)' }} />
                  <h2 className="font-display text-sm font-bold" style={{ color: 'var(--ink)' }}>
                    {t(`about_${key}_title`)}
                  </h2>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
                  {t(`about_${key}_body`)}
                </p>
              </div>
            </Frame>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to={`/${prefix}how-to-use`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            style={{ borderColor: 'var(--metal-edge)', color: 'var(--gold)' }}
          >
            {t('about_cta_howto')}
          </Link>
          <Link
            to={`/${prefix}explore`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            style={{ borderColor: 'var(--metal-edge)', color: 'var(--ink-muted)' }}
          >
            {t('about_cta_explore')}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
