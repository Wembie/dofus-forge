import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import { Sword } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { resolveClassName } from '@/features/class-picker/useClassName.ts'
import { ELEM_COLOR, fmtRange } from '@/features/spells/spellCalc.ts'
import { useEffect } from 'react'

/**
 * Read-only per-class spell guide — distinct from the planner's SpellsPanel,
 * which needs a full build (equipped items, allocated characteristics) to
 * compute live damage numbers. This shows the spells' base data (AP cost,
 * range, raw min–max effects at max grade) with no build required, so it
 * works as a standalone, crawlable, shareable page per class.
 */
export function ClassGuidePage() {
  const { classId } = useParams<{ classId: string }>()
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const lang = i18n.language.slice(0, 2)

  useLoadGameData()
  const dataLang   = useDataStore(s => s.lang)
  const loadSpells = useDataStore(s => s.loadSpells)
  const spellsMap  = useDataStore(s => s.spells)
  const classNames = useDataStore(s => s.classNames)

  const classInfo = CLASS_DATA.find(c => c.id === classId)

  useEffect(() => {
    if (classInfo) loadSpells(dataLang, classInfo.id)
  }, [loadSpells, dataLang, classInfo])

  const className = classInfo ? resolveClassName(classInfo.id, lang, classNames) : ''

  usePageSeo(lang as SeoLang, `classes/${classId ?? ''}`, {
    title: classInfo ? t('class_guide_seo_title', { class: className }) : undefined,
    description: classInfo ? t('class_guide_seo_description', { class: className }) : undefined,
    noindex: !classInfo,
  })

  if (!classInfo) {
    return (
      <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center gap-3 text-sm" style={{ color: 'var(--ink-faint)' }}>
        <p>{t('class_guide_not_found')}</p>
        <Link to={`/${prefix}`} className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>{t('app_title')}</Link>
      </div>
    )
  }

  const spells = spellsMap.get(classInfo.id)?.spells ?? []

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-3" style={{ animation: 'col-rise 520ms var(--ease-out) 0ms both' }}>
          <img src={classInfo.imageUrl} alt="" width={48} height={48} className="rounded-lg" style={{ border: '1px solid var(--metal-edge)' }} />
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--gold)' }}>{className}</h1>
            <p className="text-xs uppercase tracking-wide" style={{ color: ELEM_COLOR[classInfo.element === 'multi' ? 'neutral' : classInfo.element] }}>
              {t('element_header')}: {classInfo.element === 'multi' ? t('elem_neutral') : t(`elem_${classInfo.element}`)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>
            {t('class_guide_spells_title', { class: className })}
          </h2>

          {spells.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{t('loading_data')}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {spells.filter(sp => !sp.is_variant).map(sp => {
              const top = sp.levels[sp.levels.length - 1]
              return (
                <div key={sp.id} className="flex gap-3 p-3 rounded-lg" style={{ border: '1px solid var(--metal-edge)', background: 'var(--surface-stone)' }}>
                  {sp.image_url
                    ? <img src={sp.image_url} alt="" width={32} height={32} className="rounded flex-shrink-0" />
                    : <Sword size={20} style={{ color: 'var(--gold)', flexShrink: 0 }} />}
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{sp.name}</h3>
                    {sp.description && (
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{sp.description}</p>
                    )}
                    {top && (
                      <p className="text-[11px] mt-1 flex flex-wrap gap-x-3" style={{ color: 'var(--ink-faint)' }}>
                        <span>{t('class_guide_ap')} {top.ap}</span>
                        <span>{t('weapon_range_label')} {fmtRange(top.minRange, top.maxRange)}</span>
                        {top.effects.filter(e => e.kind === 'damage').map((e, i) => (
                          <span key={i} style={{ color: ELEM_COLOR[e.element] }}>{fmtRange(e.min, e.max)}</span>
                        ))}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Link
          to={`/${prefix}?class=${classInfo.id}`}
          className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
          style={{ borderColor: 'var(--metal-edge)', color: 'var(--gold)' }}
        >
          {t('class_guide_cta', { class: className })}
        </Link>
      </main>

      <SiteFooter />
    </div>
  )
}
