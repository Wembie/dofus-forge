import { useTranslation } from 'react-i18next'
import { Anvil, BookOpen, ChevronDown, Flame, Gauge, HelpCircle, Lock, Pin, Scale, Sparkles, Trophy, type LucideIcon } from 'lucide-react'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { ForgeScene } from '@/features/optimizer/ForgeParts.tsx'
import { Actions, GoLink, Reading, SectionHead } from '@/features/reading/Reading.tsx'

type Section = { id: string; Icon: LucideIcon; count: number; layout: 'steps' | 'grid' | 'heat' | 'faq'; example?: boolean }

const SECTIONS: Section[] = [
  { id: 'start',      Icon: Flame,      count: 5, layout: 'steps' },
  { id: 'order',      Icon: Scale,      count: 4, layout: 'grid', example: true },
  { id: 'intensity',  Icon: Gauge,      count: 4, layout: 'heat' },
  { id: 'items',      Icon: Pin,        count: 5, layout: 'grid', example: true },
  { id: 'slots',      Icon: Lock,       count: 2, layout: 'grid' },
  { id: 'forgemagic', Icon: Sparkles,   count: 4, layout: 'grid' },
  { id: 'forging',    Icon: Anvil,      count: 4, layout: 'grid' },
  { id: 'results',    Icon: Trophy,     count: 5, layout: 'grid' },
  { id: 'faq',        Icon: HelpCircle, count: 5, layout: 'faq' },
]
const HEAT = [35, 60, 85, 100]

export function ForgeGuidePage() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const homePath = `/${langPathRootSegment(i18n.language)}`
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'forge-guide', {
    title: t('forgeguide_seo_title'),
    description: t('forgeguide_seo_description'),
  })

  return (
    <Reading
      className="rd-forge"
      kicker={t('forgeguide_kicker')}
      title={t('forgeguide_title')}
      intro={
        <>
          <p>{t('forgeguide_intro')}</p>
          <Actions>
            <GoLink to={`${homePath}?forge=1`} primary><Flame size={17} aria-hidden="true" />{t('forgeguide_cta_open')}</GoLink>
            <GoLink to={`/${prefix}how-to-use`}><BookOpen size={17} aria-hidden="true" />{t('forgeguide_cta_howto')}</GoLink>
          </Actions>
        </>
      }
      hero={<div className="rd-forge-scene" aria-hidden="true"><ForgeScene heat={0.85} burst={0} tempering={false} /></div>}
      tocLabel={t('forgeguide_toc')}
      toc={SECTIONS.map(s => ({ id: s.id, label: t(`forgeguide_${s.id}_title`), Icon: s.Icon }))}
    >
      {SECTIONS.map(s => {
        const items = Array.from({ length: s.count }, (_, i) => i + 1)
        return (
          <section key={s.id} id={s.id} className="rd-section">
            <SectionHead Icon={s.Icon}>{t(`forgeguide_${s.id}_title`)}</SectionHead>
            <p className="rd-lead">{t(`forgeguide_${s.id}_intro`)}</p>
            {s.layout === 'faq' ? (
              <div className="rd-faq">
                {items.map(n => (
                  <details key={n}>
                    <summary>
                      {t(`forgeguide_faq_${n}_title`)}
                      <ChevronDown size={16} aria-hidden="true" />
                    </summary>
                    <p>{t(`forgeguide_faq_${n}_body`)}</p>
                  </details>
                ))}
              </div>
            ) : (
              <ol className={`rd-cards is-${s.layout}`}>
                {items.map((n, i) => (
                  <li key={n}>
                    {s.layout === 'steps' && <span className="rd-card-n">{n}</span>}
                    {s.layout === 'heat' && (
                      <span className={'rd-heat' + (i === 3 ? ' is-max' : '')} aria-hidden="true"><i style={{ width: `${HEAT[i]}%` }} /></span>
                    )}
                    <h3>{t(`forgeguide_${s.id}_${n}_title`)}</h3>
                    <p>{t(`forgeguide_${s.id}_${n}_body`)}</p>
                  </li>
                ))}
              </ol>
            )}
            {s.example && (
              <p className="rd-example">
                <b>{t('forgeguide_example')}</b>
                {t(`forgeguide_${s.id}_example`)}
              </p>
            )}
          </section>
        )
      })}
      <Actions>
        <GoLink to={`${homePath}?forge=1`} primary><Flame size={17} aria-hidden="true" />{t('forgeguide_cta_open')}</GoLink>
      </Actions>
    </Reading>
  )
}

export default ForgeGuidePage
