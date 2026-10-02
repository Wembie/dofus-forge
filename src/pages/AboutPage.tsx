import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Sparkles, Database, Heart, Users, BookOpen, Layers, Wand2, Share2, Compass } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { Frame } from '@/ui'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'

const SECTIONS = [
  { key: 'why',  Icon: Sparkles },
  { key: 'data', Icon: Database },
  { key: 'free', Icon: Heart },
  { key: 'team', Icon: Users },
] as const

const FEATURES = [
  { key: 'catalog',   Icon: BookOpen },
  { key: 'sets',      Icon: Layers },
  { key: 'runes',     Icon: Sparkles },
  { key: 'optimizer', Icon: Wand2 },
  { key: 'share',     Icon: Share2 },
  { key: 'explore',   Icon: Compass },
] as const

const FAQ_NUMS = [1, 2, 3, 4, 5] as const

export function AboutPage() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'about', {
    title: t('about_seo_title'),
    description: t('about_seo_description'),
  })

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_NUMS.map(n => ({
      '@type': 'Question',
      name: t(`seo_faq_q${n}`),
      acceptedAnswer: { '@type': 'Answer', text: t(`seo_faq_a${n}`) },
    })),
  }

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

        <div className="space-y-4">
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>
            {t('seo_features_title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ key, Icon }, i) => (
              <div
                key={key}
                className="flex gap-3 p-3 rounded-lg"
                style={{ border: '1px solid var(--metal-edge)', background: 'var(--surface-stone)', animation: `col-rise 420ms var(--ease-out) ${i * 50}ms both` }}
              >
                <Icon size={18} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{t(`seo_feature_${key}_title`)}</h3>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{t(`seo_feature_${key}_desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>
            {t('seo_classes_title')}
          </h2>
          <p className="text-xs leading-relaxed max-w-2xl" style={{ color: 'var(--ink-muted)' }}>
            {t('seo_classes_body')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CLASS_DATA.map(c => (
              <Link
                key={c.id}
                to={`/${prefix}?class=${c.id}`}
                className="px-2 py-1 rounded text-xs border transition-colors"
                style={{ borderColor: 'var(--metal-edge)', color: 'var(--ink-muted)' }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>
            {t('seo_faq_title')}
          </h2>
          <div className="space-y-3">
            {FAQ_NUMS.map(n => (
              <div key={n}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{t(`seo_faq_q${n}`)}</h3>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{t(`seo_faq_a${n}`)}</p>
              </div>
            ))}
          </div>
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

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </main>

      <SiteFooter />
    </div>
  )
}
