import { useTranslation } from 'react-i18next'
import { Hammer, Wand2 } from 'lucide-react'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { Actions, GoLink, Reading } from '@/features/reading/Reading.tsx'

const STEPS = [1, 2, 3, 4, 5, 6, 7, 8] as const

export function HowToUsePage() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const homePath = `/${langPathRootSegment(i18n.language)}`
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'how-to-use', {
    title: t('howto_seo_title'),
    description: t('howto_seo_description'),
  })

  return (
    <Reading
      kicker={t('reading_kicker_guide')}
      title={t('howto_title')}
      intro={<p>{t('howto_intro')}</p>}
      toc={STEPS.map(n => ({ id: `step${n}`, label: t(`howto_step${n}_title`) }))}
    >
      <ol className="rd-steps">
        {STEPS.map(n => (
          <li key={n} id={`step${n}`}>
            <span className="rd-step-n" aria-hidden="true">{n}</span>
            <div>
              <h2>{t(`howto_step${n}_title`)}</h2>
              <p>{t(`howto_step${n}_body`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <Actions>
        <GoLink to={homePath} primary><Hammer size={17} aria-hidden="true" />{t('howto_cta_start')}</GoLink>
        <GoLink to={`/${prefix}about`}>{t('howto_cta_about')}</GoLink>
        <GoLink to={`/${prefix}forge-guide`}><Wand2 size={17} aria-hidden="true" />{t('nav_forge_guide')}</GoLink>
      </Actions>
    </Reading>
  )
}

export default HowToUsePage
