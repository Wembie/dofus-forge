import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const

/**
 * Crawlable marketing/explainer content for the homepage. The planner
 * above is a canvas-driven tool with almost no indexable text — this
 * section gives Google keyword-rich copy to match queries like "dofus
 * build planner" or "dofus sets" against, plus a FAQPage rich-result via
 * the inline JSON-LD. Kept deliberately short: a one-line pitch + the
 * class list (unique here — real ?class= deep links) + the FAQ. The full
 * "what is this" and "how it works" writeups live on their own pages
 * (/about, /how-to-use) instead of being duplicated here on top of the
 * actual tool.
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

      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>
          {t('seo_classes_title')}
        </h2>
        <p className="text-xs leading-relaxed max-w-2xl">{t('seo_classes_body')}</p>
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
          to={`/${prefix}about`}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
          style={{ borderColor: 'var(--metal-edge)', color: 'var(--gold)' }}
        >
          {t('nav_about')}
        </Link>
        <Link
          to={`/${prefix}how-to-use`}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
          style={{ borderColor: 'var(--metal-edge)', color: 'var(--gold)' }}
        >
          {t('nav_how_to_use')}
        </Link>
        <Link
          to={`/${prefix}explore`}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
          style={{ borderColor: 'var(--metal-edge)', color: 'var(--ink-muted)' }}
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
