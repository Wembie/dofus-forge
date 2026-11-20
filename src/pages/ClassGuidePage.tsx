import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { ArrowRight, Hammer, Heart, Star, Sword, User } from 'lucide-react'
import { langFromPath, langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { usePageSeo, pageOgImage, type SeoLang } from '@/seo/useSeoMeta.ts'
import { DOFUS_GAME_VERSION } from '@/data/gameVersion.ts'
import { Breadcrumbs } from '@/seo/JsonLd.tsx'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { Actions, GoLink, Reading, SectionHead } from '@/features/reading/Reading.tsx'
import { ELEM_COLOR, fmtRange } from '@/features/spells/spellCalc.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import type { AppSpell } from '@/data/spellLoaders.ts'
import { loadClassGuide } from '@/data/classGuide.server.ts'
import { loadClassBuildGuide } from '@/data/setPages.server.ts'
import { GUIDE_ELEMENTS, type GuideElement } from '@/data/setGuide.ts'
import { SetCard } from '@/features/set-guide/SetGuideUI.tsx'
import { ELEMENT_ICON, ELEMENT_STAT_KEY, setPath } from '@/features/set-guide/setGuideLinks.ts'

// Runs at build time for every prerendered guide; client navigations read
// the resulting .data file, so the spells, sets and builds are in the HTML
// from the start.
export async function loader({ params, request }: LoaderFunctionArgs) {
  const lang = langFromPath(new URL(request.url).pathname)
  const classId = params.classId ?? ''
  const spells = await loadClassGuide(lang, classId)
  return spells && { ...spells, ...await loadClassBuildGuide(lang, classId) }
}

/**
 * Read-only per-class guide: the sets that build each element by level,
 * the class's own sets, community builds and the spells' base data (AP,
 * range, raw damage at max grade) — no build needed, so it is a crawlable,
 * shareable page per class.
 */
export function ClassGuidePage() {
  const { classId } = useParams<{ classId: string }>()
  const guide = useLoaderData<typeof loader>()
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const homePath = `/${langPathRootSegment(i18n.language)}`
  const lang = i18n.language.slice(0, 2)

  const classInfo = guide ? CLASS_DATA.find(c => c.id === classId) : undefined
  const className = guide?.className ?? ''

  usePageSeo(lang as SeoLang, `classes/${classId ?? ''}`, {
    title: classInfo ? t('class_guide_seo_title', { class: className }) : undefined,
    description: classInfo ? t('class_guide_seo_description', { class: className }) : undefined,
    noindex: !classInfo,
    image: classInfo && classId ? pageOgImage(lang as SeoLang, 'class', classId, DOFUS_GAME_VERSION) : undefined,
  })

  if (!classInfo || !guide) {
    return (
      <Reading kicker={t('reading_kicker_class')} title={t('class_guide_not_found')}>
        <Actions><GoLink to={homePath} primary>{t('app_title')}</GoLink></Actions>
      </Reading>
    )
  }

  const plannerPath = `${homePath}?class=${classInfo.id}`
  const own = (GUIDE_ELEMENTS as readonly string[]).includes(classInfo.element) ? (classInfo.element as GuideElement) : null
  // The class's own element leads; the others follow in the usual order.
  const elements = own ? [own, ...GUIDE_ELEMENTS.filter(e => e !== own)] : [...GUIDE_ELEMENTS]
  const bracketLabel = (min: number, max: number) => (min === max ? t('sets_bracket_single', { level: min }) : t('sets_bracket_range', { min, max }))
  const toc = [
    { id: 'builds-by-element', label: t('class_guide_nav_elements') },
    ...(guide.classSets.length > 0 ? [{ id: 'class-sets', label: t('class_guide_nav_class_sets') }] : []),
    { id: 'community-builds', label: t('class_guide_nav_builds') },
    { id: 'spells', label: t('class_guide_nav_spells') },
  ]

  return (
    <Reading
      className="rd-class"
      before={
        <div className="rd-crumbs">
          <Breadcrumbs crumbs={[
            { label: t('app_title'), to: homePath },
            { label: className, to: `/${prefix}classes/${classInfo.id}` },
          ]} />
        </div>
      }
      kicker={t('reading_kicker_class')}
      title={
        <span className="rd-class-title" data-element={own ?? undefined}>
          <img src={classInfo.imageUrl} alt="" />
          {className}
          <span className="rd-element">{t(own ? ELEMENT_STAT_KEY[own] : 'elem_neutral')}</span>
        </span>
      }
      intro={
        <>
          <p>{t('class_guide_intro', { class: className })}</p>
          <Actions>
            <GoLink to={plannerPath} primary><Hammer size={17} aria-hidden="true" />{t('class_guide_cta', { class: className })}</GoLink>
          </Actions>
        </>
      }
      toc={toc}
    >
      <nav className="rd-class-switch" aria-label={t('reading_other_classes')}>
        {CLASS_DATA.map(c => (
          <ClassSwitchLink key={c.id} id={c.id} image={c.imageUrl} current={c.id === classInfo.id} prefix={prefix} />
        ))}
      </nav>

      <section id="builds-by-element" className="rd-section">
        <SectionHead>{t('class_guide_elements_title', { class: className })}</SectionHead>
        <p className="rd-lead">{t('class_guide_elements_note')}</p>
        <div className="rd-elements">
          {elements.map(el => (
            <article key={el} data-element={el} className="rd-element-panel">
              <div className="rd-element-head">
                <img src={statIconUrl(ELEMENT_ICON[el])} alt="" />
                <h3>{t('class_guide_element_build', { class: className, stat: t(ELEMENT_STAT_KEY[el]), element: t(`elem_${el}`) })}</h3>
                {el === own && <span className="rd-main">{t('class_guide_element_main')}</span>}
              </div>
              <dl>
                {guide.byElement[el].map(b => (
                  <div key={b.min}>
                    <dt>{bracketLabel(b.min, b.max)}</dt>
                    <dd>
                      {b.sets.map(s => (
                        <Link key={s.id} to={setPath(i18n.language, s.slug)}>
                          {s.icon && <img src={s.icon} alt="" loading="lazy" decoding="async" />}
                          <span>{s.name}</span>
                          <small>{s.level}</small>
                        </Link>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
              <Link className="rd-element-cta" to={plannerPath}>
                <Hammer size={15} aria-hidden="true" />
                {t('class_guide_element_cta', { class: className, element: t(ELEMENT_STAT_KEY[el]) })}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {guide.classSets.length > 0 && (
        <section id="class-sets" className="rd-section">
          <SectionHead>{t('class_guide_class_sets_title', { class: className })}</SectionHead>
          <p className="rd-lead">{t('class_guide_class_sets_note', { class: className })}</p>
          <div className="sp-grid">
            {guide.classSets.map(s => <SetCard key={s.id} set={s} />)}
          </div>
        </section>
      )}

      <section id="community-builds" className="rd-section">
        <SectionHead>{t('class_guide_builds_title', { class: className })}</SectionHead>
        {guide.builds.length > 0 ? (
          <ul className="rd-builds">
            {guide.builds.map(b => (
              <li key={b.id}>
                <Link to={`/${prefix}build/${b.id}`}>
                  <img src={b.gender === 'female' ? classInfo.imageFUrl : classInfo.imageUrl} alt="" loading="lazy" />
                  <span>
                    <b>{b.name}</b>
                    <small>
                      <span>{t('sets_card_level', { level: b.level })}</span>
                      {b.author && <span><User size={12} aria-hidden="true" />{b.author}</span>}
                      {b.rating > 0 && <span className="is-rating"><Star size={12} aria-hidden="true" />{b.rating.toFixed(1)}</span>}
                      {b.likes > 0 && <span><Heart size={12} aria-hidden="true" />{b.likes}</span>}
                      {b.elements.map(el => <span key={el} className="rd-element" data-element={el}>{t(ELEMENT_STAT_KEY[el])}</span>)}
                    </small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rd-muted">
            {t('class_guide_builds_empty', { class: className })}{' '}
            <Link className="rd-link" to={plannerPath}>{t('class_guide_cta', { class: className })}</Link>
          </p>
        )}
        <Link className="rd-link" to={`/${prefix}explore`}>{t('class_guide_builds_more')}</Link>
      </section>

      <section id="spells" className="rd-section">
        <SectionHead>{t('class_guide_spells_title', { class: className })}</SectionHead>
        <p className="rd-lead">{t('class_guide_spells_note')}</p>
        {guide.spells.length === 0 ? (
          <p className="rd-muted" role="status">{t('loading_data')}</p>
        ) : (
          <div className="rd-spells">
            {guide.spells.map(sp => <SpellCard key={sp.id} sp={sp} />)}
          </div>
        )}
      </section>

      <Actions>
        <GoLink to={plannerPath} primary>
          <Hammer size={17} aria-hidden="true" />
          {t('class_guide_cta', { class: className })}
          <ArrowRight size={16} aria-hidden="true" />
        </GoLink>
      </Actions>
    </Reading>
  )
}

function ClassSwitchLink({ id, image, current, prefix }: { id: string; image: string; current: boolean; prefix: string }) {
  const name = useClassName(id)
  return (
    <Link to={`/${prefix}classes/${id}`} aria-current={current ? 'page' : undefined} aria-label={name} title={name}>
      <img src={image} alt="" loading="lazy" />
    </Link>
  )
}

function SpellCard({ sp }: { sp: AppSpell }) {
  const { t } = useTranslation()
  const top = sp.levels[sp.levels.length - 1]
  const damage = top?.effects.filter(e => e.kind === 'damage') ?? []
  return (
    <article style={{ '--rd-spell': damage[0] ? ELEM_COLOR[damage[0].element] : 'var(--line)' } as CSSProperties}>
      <div className="rd-spell-head">
        {sp.image_url ? <img src={sp.image_url} alt="" loading="lazy" /> : <Sword size={28} aria-hidden="true" />}
        <span>
          <h3>{sp.name}</h3>
          {top && <small>{t('class_guide_grade_label', { grade: top.grade })}</small>}
        </span>
      </div>
      {sp.description && <p>{sp.description}</p>}
      {top && (
        <ul>
          <li><img src={statIconUrl('ap')} alt="" /><b>{top.ap}</b> {t('class_guide_ap')}</li>
          <li><img src={statIconUrl('range')} alt="" /><b>{fmtRange(top.minRange, top.maxRange)}</b> {t('weapon_range_label')}</li>
          {damage.map((e, i) => (
            <li key={i}>
              <i style={{ background: ELEM_COLOR[e.element] }} aria-hidden="true" />
              <b>{fmtRange(e.min, e.max)}</b> {t('class_guide_damage_label')} {t(`elem_${e.element}`)}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export default ClassGuidePage
