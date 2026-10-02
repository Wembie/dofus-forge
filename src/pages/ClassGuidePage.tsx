import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import { Sword } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { CLASS_DATA, ELEMENT_HEX } from '@/features/class-picker/classData.ts'
import { resolveClassName } from '@/features/class-picker/useClassName.ts'
import { ELEM_COLOR, fmtRange } from '@/features/spells/spellCalc.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import type { AppSpell } from '@/data/spellLoaders.ts'

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
        <Link to={`/${prefix}`} className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>{t('app_title')}</Link>
      </div>
    )
  }

  const spells = spellsMap.get(classInfo.id)?.spells.filter(sp => !sp.is_variant) ?? []

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 space-y-8">
        {/* Class hero — same element-gradient treatment as ClassPicker's selected-class card */}
        <div
          className="flex items-center gap-4 p-4 rounded-xl relative overflow-hidden"
          style={{
            animation:   'col-rise 520ms var(--ease-out) 0ms both',
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

        <div className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>
              {t('class_guide_spells_title', { class: className })}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>{t('class_guide_spells_note')}</p>
          </div>

          {spells.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{t('loading_data')}</p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {spells.map((sp, i) => <SpellCard key={sp.id} sp={sp} index={i} t={t} />)}
          </div>
        </div>

        <Link
          to={`/${prefix}?class=${classInfo.id}`}
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

function SpellCard({ sp, index, t }: { sp: AppSpell; index: number; t: (key: string, opts?: Record<string, unknown>) => string }) {
  const top = sp.levels[sp.levels.length - 1]
  const damageEffects = top?.effects.filter(e => e.kind === 'damage') ?? []
  const accent = damageEffects[0] ? ELEM_COLOR[damageEffects[0].element] : 'var(--metal-edge)'

  return (
    <div
      className="flex gap-3 p-4 rounded-lg"
      style={{
        animation:  `col-rise 420ms var(--ease-out) ${Math.min(index * 30, 400)}ms both`,
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
