import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BookOpen, Layers, Wand2, Share2, Compass, Sparkles } from 'lucide-react'
import { langPathPrefix } from '@/i18n/langPath.ts'

const FEATURES = [
  { key: 'catalog',   Icon: BookOpen },
  { key: 'sets',      Icon: Layers },
  { key: 'runes',     Icon: Sparkles },
  { key: 'optimizer', Icon: Wand2 },
  { key: 'share',     Icon: Share2 },
  { key: 'explore',   Icon: Compass },
] as const

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const

/**
 * Crawlable marketing/explainer content for the homepage. The planner
 * above is a canvas-driven tool with almost no indexable text — this
 * section is what gives Google actual keyword-rich copy to match
 * queries like "dofus build planner" or "dofus sets" against, plus a
 * FAQPage rich-result via the inline JSON-LD.
 */
export function SeoContent() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_KEYS.map(k => ({
      '@type': 'Question',
      name: t(`seo_faq_${k}`),
      acceptedAnswer: { '@type': 'Answer', text: t(`seo_faq_a${k.slice(1)}`) },
    })),
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-10 space-y-10" style={{ color: 'var(--ink-muted)' }}>
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>
          {t('seo_about_title')}
        </h2>
        <p className="text-sm leading-relaxed max-w-2xl">{t('seo_about_body')}</p>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>
          {t('seo_features_title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ key, Icon }) => (
            <div key={key} className="flex gap-3 p-3 rounded-lg" style={{ border: '1px solid var(--metal-edge)', background: 'var(--surface-stone)' }}>
              <Icon size={18} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{t(`seo_feature_${key}_title`)}</h3>
                <p className="text-xs mt-0.5 leading-relaxed">{t(`seo_feature_${key}_desc`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>
          {t('seo_how_title')}
        </h2>
        <ol className="text-sm leading-relaxed space-y-1.5 list-decimal list-inside">
          <li>{t('seo_how_1')}</li>
          <li>{t('seo_how_2')}</li>
          <li>{t('seo_how_3')}</li>
          <li>{t('seo_how_4')}</li>
        </ol>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>
          {t('seo_faq_title')}
        </h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{t(`seo_faq_q${n}`)}</h3>
              <p className="text-xs mt-0.5 leading-relaxed">{t(`seo_faq_a${n}`)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to={`/${prefix}explore`}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
          style={{ borderColor: 'var(--metal-edge)', color: 'var(--gold)' }}
        >
          {t('explore_open')}
        </Link>
        <Link
          to={`/${prefix}my-builds`}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
          style={{ borderColor: 'var(--metal-edge)', color: 'var(--ink-muted)' }}
        >
          {t('my_builds')}
        </Link>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </section>
  )
}
