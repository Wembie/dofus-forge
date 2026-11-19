import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Sparkles, Database, Heart, Users, BookOpen, Layers, Wand2, Share2, Compass, Hammer, type LucideIcon } from 'lucide-react'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { resolveClassName } from '@/features/class-picker/useClassName.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { fetchTotalBuildsCount } from '@/features/builds/api.ts'
import { Actions, GoLink, Reading, SectionHead } from '@/features/reading/Reading.tsx'

const CARDS: [string, LucideIcon][] = [['why', Sparkles], ['data', Database], ['free', Heart], ['team', Users]]
const FEATURES: [string, LucideIcon][] = [['catalog', BookOpen], ['sets', Layers], ['runes', Sparkles], ['optimizer', Wand2], ['share', Share2], ['explore', Compass]]
const FAQ_NUMS = [1, 2, 3, 4, 5] as const

export function AboutPage() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const lang = i18n.language.slice(0, 2)
  usePageSeo(lang as SeoLang, 'about', {
    title: t('about_seo_title'),
    description: t('about_seo_description'),
  })
  // The class list's names come from the table bundled with the app (resolveClassName),
  // or from the store when another page already loaded the game data.
  const classNames = useDataStore(s => s.classNames)
  const nf = new Intl.NumberFormat(i18n.language === 'es' ? 'es-CO' : i18n.language)

  const [totalBuilds, setTotalBuilds] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchTotalBuildsCount().then(({ count, error }) => { if (!cancelled && !error) setTotalBuilds(count) })
    return () => { cancelled = true }
  }, [])

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
    <Reading
      kicker={t('reading_kicker_about')}
      title={t('about_title')}
      intro={
        <>
          <p>{t('about_intro')}</p>
          {totalBuilds !== null && totalBuilds > 0 && (
            <p className="rd-pill">
              <Hammer size={15} aria-hidden="true" />
              {t('about_total_builds', { count: totalBuilds, formattedCount: nf.format(totalBuilds) })}
            </p>
          )}
        </>
      }
      toc={[
        { id: 'about-project', label: t('reading_about_project') },
        { id: 'about-features', label: t('seo_features_title') },
        { id: 'about-classes', label: t('seo_classes_title') },
        { id: 'about-faq', label: t('seo_faq_title') },
      ]}
    >
      <section id="about-project" className="rd-section">
        <div className="rd-cards is-grid">
          {CARDS.map(([key, Icon]) => (
            <article key={key}>
              <Icon size={18} aria-hidden="true" />
              <h2>{t(`about_${key}_title`)}</h2>
              <p>{t(`about_${key}_body`)}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="about-features" className="rd-section">
        <SectionHead>{t('seo_features_title')}</SectionHead>
        <div className="rd-features">
          {FEATURES.map(([key, Icon]) => (
            <article key={key}>
              <span className="rd-section-icon"><Icon size={17} aria-hidden="true" /></span>
              <h3>{t(`seo_feature_${key}_title`)}</h3>
              <p>{t(`seo_feature_${key}_desc`)}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="about-classes" className="rd-section">
        <SectionHead>{t('seo_classes_title')}</SectionHead>
        <p className="rd-lead">{t('seo_classes_body')}</p>
        <ul className="rd-classes">
          {CLASS_DATA.map(c => (
            <li key={c.id}>
              <Link to={`/${prefix}classes/${c.id}`}>
                <img src={c.imageUrl} alt="" loading="lazy" />
                {resolveClassName(c.id, lang, classNames)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section id="about-faq" className="rd-section">
        <SectionHead>{t('seo_faq_title')}</SectionHead>
        <dl className="rd-qa">
          {FAQ_NUMS.map(n => (
            <div key={n}>
              <dt>{t(`seo_faq_q${n}`)}</dt>
              <dd>{t(`seo_faq_a${n}`)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <Actions>
        <GoLink to={`/${prefix}how-to-use`} primary>{t('about_cta_howto')}</GoLink>
        <GoLink to={`/${prefix}explore`}><Compass size={17} aria-hidden="true" />{t('about_cta_explore')}</GoLink>
      </Actions>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </Reading>
  )
}

export default AboutPage
