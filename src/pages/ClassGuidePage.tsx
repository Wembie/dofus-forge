import { useTranslation } from 'react-i18next'
import { useParams, Link, useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { Sword, Hammer } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { langFromPath, langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { Breadcrumbs } from '@/seo/JsonLd.tsx'
import { CLASS_DATA, ELEMENT_HEX } from '@/features/class-picker/classData.ts'
import { ELEM_COLOR, fmtRange } from '@/features/spells/spellCalc.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import type { AppSpell } from '@/data/spellLoaders.ts'
import { loadClassGuide } from '@/data/classGuide.server.ts'
import { loadClassBuildGuide } from '@/data/setPages.server.ts'
import { GUIDE_ELEMENTS, type GuideElement } from '@/data/setGuide.ts'
import { GuideBuildCard, GuideHeading, SetCard } from '@/features/set-guide/SetGuideUI.tsx'
import { ELEMENT_VAR, ELEMENT_ICON, setPath } from '@/features/set-guide/setGuideLinks.ts'

// Runs at build time for every prerendered guide; client navigations read
// the resulting .data file, so the spells, sets and builds are in the HTML
// from the start.
export async function loader({ params, request }: LoaderFunctionArgs) {
  const lang = langFromPath(new URL(request.url).pathname)
  const classId = params.classId ?? ''
  const spells = await loadClassGuide(lang, classId)
  return spells && { ...spells, ...await loadClassBuildGuide(lang, classId) }
}

type BuildGuide = NonNullable<Awaited<ReturnType<typeof loader>>>

const ELEMENT_STAT: Record<GuideElement, string> = { earth: 'stat_strength', fire: 'stat_intelligence', water: 'stat_chance', air: 'stat_agility' }

/**
 * Read-only per-class spell guide — distinct from the planner's SpellsPanel,
 * which needs a full build (equipped items, allocated characteristics) to
 * compute live damage numbers. This shows the spells' base data (AP cost,
 * range, raw min–max effects at max grade) with no build required, so it
 * works as a standalone, crawlable, shareable page per class.
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
  const elemColor = classInfo ? ELEMENT_HEX[classInfo.element] : 'var(--gold)'

  usePageSeo(lang as SeoLang, `classes/${classId ?? ''}`, {
    title: classInfo ? t('class_guide_seo_title', { class: className }) : undefined,
    description: classInfo ? t('class_guide_seo_description', { class: className }) : undefined,
    noindex: !classInfo,
  })

  if (!classInfo) {
    return (
      <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center gap-3 text-sm" style={{ color: 'var(--ink-faint)' }}>
        <p>{t('class_guide_not_found')}</p>
        <Link to={homePath} className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>{t('app_title')}</Link>
      </div>
    )
  }

  const spells = guide?.spells ?? []
  // The class's own element leads; the others follow in the usual order.
  const elements = [...GUIDE_ELEMENTS].sort((a, b) => Number(b === classInfo.element) - Number(a === classInfo.element))
  const sections = [
    { id: 'builds-by-element', label: t('class_guide_nav_elements') },
    ...(guide && guide.classSets.length > 0 ? [{ id: 'class-sets', label: t('class_guide_nav_class_sets') }] : []),
    { id: 'community-builds', label: t('class_guide_nav_builds') },
    { id: 'spells', label: t('class_guide_nav_spells') },
  ]

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />

      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        <Breadcrumbs crumbs={[
          { label: t('app_title'), to: homePath },
          { label: className, to: `/${prefix}classes/${classInfo.id}` },
        ]} />
        {/* Class hero — same element-gradient treatment as ClassPicker's selected-class card */}
        <div
          className="flex items-center gap-4 p-4 rounded-xl relative overflow-hidden"
          style={{
            animation:   'page-rise 520ms var(--ease-out) 0ms both',
            background:  `linear-gradient(135deg, color-mix(in srgb, ${elemColor} 14%, var(--surface-panel)), var(--surface-void))`,
            borderTop:   `2px solid color-mix(in srgb, ${elemColor} 55%, transparent)`,
            borderRight: '1px solid var(--metal-edge)',
            borderBottom:'1px solid var(--metal-edge)',
            borderLeft:  '1px solid var(--metal-edge)',
            boxShadow:   `0 0 28px color-mix(in srgb, ${elemColor} 14%, transparent), var(--inset-bevel)`,
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `radial-gradient(ellipse at 20% 50%, color-mix(in srgb, ${elemColor} 10%, transparent) 0%, transparent 65%)`,
          }} />
          <div
            className="rounded-lg overflow-hidden flex-shrink-0 relative z-10"
            style={{
              width: 72, height: 72,
              border: `1.5px solid color-mix(in srgb, ${elemColor} 55%, transparent)`,
              boxShadow: `0 0 18px color-mix(in srgb, ${elemColor} 32%, transparent)`,
              background: 'var(--surface-panel)',
            }}
          >
            <img src={classInfo.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="relative z-10 min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-wide" style={{ color: elemColor }}>{className}</h1>
            <span
              className="inline-block mt-1 text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
              style={{ color: elemColor, border: `1px solid color-mix(in srgb, ${elemColor} 45%, transparent)`, background: `color-mix(in srgb, ${elemColor} 10%, transparent)` }}
            >
              {classInfo.element === 'multi' ? t('elem_neutral') : t(`elem_${classInfo.element}`)}
            </span>
          </div>
        </div>

        <p className="text-sm leading-relaxed max-w-3xl" style={{ color: 'var(--ink-muted)' }}>{t('class_guide_intro', { class: className })}</p>

        <nav aria-label={t('class_guide_nav_label')} className="flex flex-wrap gap-2">
          {sections.map(s => (
            <a key={s.id} href={`#${s.id}`} className="text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors hover:text-gold" style={{ borderColor: 'var(--metal-edge)', color: 'var(--ink-muted)' }}>
              {s.label}
            </a>
          ))}
        </nav>

        {guide && (
          <>
            <section className="space-y-4">
              <GuideHeading id="builds-by-element" title={t('class_guide_elements_title', { class: className })} note={t('class_guide_elements_note')} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {elements.map(el => (
                  <ElementBuildPanel
                    key={el}
                    element={el}
                    className={className}
                    brackets={guide.byElement[el]}
                    recommended={el === classInfo.element}
                    plannerPath={`${homePath}?class=${classInfo.id}`}
                  />
                ))}
              </div>
            </section>

            {guide.classSets.length > 0 && (
              <section className="space-y-3">
                <GuideHeading id="class-sets" title={t('class_guide_class_sets_title', { class: className })} note={t('class_guide_class_sets_note', { class: className })} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {guide.classSets.map((s, i) => <SetCard key={s.id} set={s} index={i} />)}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <GuideHeading id="community-builds" title={t('class_guide_builds_title', { class: className })} />
              {guide.builds.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {guide.builds.map(b => <GuideBuildCard key={b.id} build={b} />)}
                </div>
              ) : (
                <p className="text-xs rounded-xl p-4" style={{ color: 'var(--ink-faint)', background: 'var(--surface-stone)', border: '1px solid var(--metal-edge)' }}>
                  {t('class_guide_builds_empty', { class: className })}{' '}
                  <Link to={`${homePath}?class=${classInfo.id}`} className="font-semibold hover:underline" style={{ color: 'var(--gold)' }}>{t('class_guide_cta', { class: className })}</Link>
                </p>
              )}
              <Link to={`/${prefix}explore`} className="inline-block text-xs font-semibold hover:underline" style={{ color: 'var(--gold)' }}>{t('class_guide_builds_more')}</Link>
            </section>
          </>
        )}

        <div className="space-y-4">
          <GuideHeading id="spells" title={t('class_guide_spells_title', { class: className })} note={t('class_guide_spells_note')} />

          {spells.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{t('loading_data')}</p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {spells.map((sp, i) => <SpellCard key={sp.id} sp={sp} index={i} t={t} />)}
          </div>
        </div>

        <Link
          to={`${homePath}?class=${classInfo.id}`}
          className="inline-block px-4 py-2 rounded-lg text-sm font-semibold border transition-colors"
          style={{
            borderColor: `color-mix(in srgb, ${elemColor} 50%, transparent)`,
            color: elemColor,
            background: `color-mix(in srgb, ${elemColor} 8%, transparent)`,
          }}
        >
          {t('class_guide_cta', { class: className })}
        </Link>
      </main>

      <SiteFooter />
    </div>
  )
}

function ElementBuildPanel({ element, className, brackets, recommended, plannerPath }: {
  element: GuideElement
  className: string
  brackets: BuildGuide['byElement'][GuideElement]
  recommended: boolean
  plannerPath: string
}) {
  const { t, i18n } = useTranslation()
  const color = ELEMENT_VAR[element]
  const bracketLabel = (min: number, max: number) => (min === max ? t('sets_bracket_single', { level: min }) : t('sets_bracket_range', { min, max }))
  return (
    <article
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        background:   'var(--surface-stone)',
        borderTop:    `2px solid color-mix(in srgb, ${color} 60%, transparent)`,
        borderRight:  '1px solid var(--metal-edge)',
        borderBottom: '1px solid var(--metal-edge)',
        borderLeft:   '1px solid var(--metal-edge)',
        boxShadow:    'var(--inset-bevel)',
      }}
    >
      <header className="flex items-center gap-2.5 px-4 py-3" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${color} 12%, transparent), transparent)` }}>
        <img src={statIconUrl(ELEMENT_ICON[element])} alt="" width={22} height={22} className="object-contain" />
        <h3 className="text-sm font-bold" style={{ color }}>
          {t('class_guide_element_build', { class: className, stat: t(ELEMENT_STAT[element]), element: t(`elem_${element}`) })}
        </h3>
        {recommended && (
          <span className="ml-auto text-[9px] uppercase tracking-widest font-bold px-1.5 py-px rounded" style={{ color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 35%, transparent)' }}>
            {t('class_guide_element_main')}
          </span>
        )}
      </header>
      <div className="px-4 pb-4 pt-1 space-y-2.5 flex-1">
        {brackets.map(b => (
          <div key={b.min} className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--ink-faint)' }}>{bracketLabel(b.min, b.max)}</p>
            <div className="flex flex-wrap gap-1.5">
              {b.sets.map(s => (
                <Link
                  key={s.id}
                  to={setPath(i18n.language, s.slug)}
                  className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md text-[11px] font-medium transition-colors hover:text-gold"
                  style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)', color: 'var(--ink-muted)' }}
                >
                  {s.icon && <img src={s.icon} alt="" width={20} height={20} loading="lazy" decoding="async" className="object-contain" />}
                  {s.name}
                  <span className="font-mono text-[9px]" style={{ color: 'var(--ink-faint)' }}>{s.level}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Link
        to={plannerPath}
        className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors"
        style={{ color, borderTop: '1px solid var(--metal-edge)', background: `color-mix(in srgb, ${color} 6%, transparent)` }}
      >
        <Hammer size={13} aria-hidden="true" />
        {t('class_guide_element_cta', { class: className, element: t(`elem_${element}`) })}
      </Link>
    </article>
  )
}

function SpellCard({ sp, index, t }: { sp: AppSpell; index: number; t: (key: string, opts?: Record<string, unknown>) => string }) {
  const top = sp.levels[sp.levels.length - 1]
  const damageEffects = top?.effects.filter(e => e.kind === 'damage') ?? []
  const accent = damageEffects[0] ? ELEM_COLOR[damageEffects[0].element] : 'var(--metal-edge)'

  return (
    <div
      className="flex gap-3 p-4 rounded-lg"
      style={{
        animation:  `page-rise 420ms var(--ease-out) ${Math.min(index * 30, 400)}ms both`,
        background: 'var(--surface-stone)',
        borderTop:    `2px solid color-mix(in srgb, ${accent} 55%, transparent)`,
        borderRight:  '1px solid var(--metal-edge)',
        borderBottom: '1px solid var(--metal-edge)',
        borderLeft:   '1px solid var(--metal-edge)',
        boxShadow: 'var(--inset-bevel)',
      }}
    >
      <div
        className="rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ width: 44, height: 44, background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)' }}
      >
        {sp.image_url
          ? <img src={sp.image_url} alt="" width={44} height={44} className="object-cover" />
          : <Sword size={20} style={{ color: 'var(--gold)' }} />}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{sp.name}</h3>
          {top && (
            <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
              {t('class_guide_grade_label', { grade: top.grade })}
            </span>
          )}
        </div>
        {sp.description && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{sp.description}</p>
        )}
        {top && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
              <img src={statIconUrl('ap')} alt="" width={13} height={13} className="object-contain" />
              {t('class_guide_ap')} <strong style={{ color: 'var(--ink-muted)' }}>{top.ap}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
              <img src={statIconUrl('range')} alt="" width={13} height={13} className="object-contain" />
              {t('weapon_range_label')} <strong style={{ color: 'var(--ink-muted)' }}>{fmtRange(top.minRange, top.maxRange)}</strong>
            </span>
            {damageEffects.map((e, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[11px]" style={{ color: ELEM_COLOR[e.element] }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ELEM_COLOR[e.element] }} />
                {t('class_guide_damage_label')} ({t(`elem_${e.element}`)}) <strong>{fmtRange(e.min, e.max)}</strong>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ClassGuidePage
