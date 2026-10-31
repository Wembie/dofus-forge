import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Star, Heart, User } from 'lucide-react'
import { STAT_META, fmtValue, statIconUrl } from '@/features/equipment/statDisplay.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import type { GuideElement, SetLink, GuideBuild } from '@/data/setGuide.ts'
import { ELEMENT_VAR, ELEMENT_ICON, setPath } from './setGuideLinks.ts'


/** Element chips; `iconOnly` (long lists) keeps the name as the icon's alt text. */
export function ElementChips({ elements, size = 'sm', iconOnly = false }: { elements: readonly GuideElement[]; size?: 'sm' | 'md'; iconOnly?: boolean }) {
  const { t } = useTranslation()
  if (elements.length === 0) return null
  const icon = size === 'md' ? 14 : 11
  return (
    <span className="inline-flex flex-wrap gap-1">
      {elements.map(el => (
        <span
          key={el}
          className={`elem-chip inline-flex items-center gap-1 rounded-full font-semibold ${size === 'md' ? 'text-[11px] px-2 py-0.5' : iconOnly ? 'p-0.5' : 'text-[10px] px-1.5 py-px'}`}
          style={{ '--c': ELEMENT_VAR[el] } as CSSProperties}
        >
          <img src={statIconUrl(ELEMENT_ICON[el])} alt={iconOnly ? t(`elem_${el}`) : ''} width={icon} height={icon} className="object-contain" />
          {!iconOnly && t(`elem_${el}`)}
        </span>
      ))}
    </span>
  )
}

/** One stat line: icon, signed value, label — colored like the stats panel. */
export function StatLine({ stat, min, max = 0, dim = false }: { stat: string; min: number; max?: number; dim?: boolean }) {
  const { t } = useTranslation()
  const meta = STAT_META[stat]
  const color = min < 0 ? 'var(--negative)' : (meta?.color ?? 'var(--ink-muted)')
  return (
    <span className="flex items-center gap-1.5 min-w-0" style={{ opacity: dim ? 0.55 : 1 }}>
      {meta?.icon
        ? <img src={statIconUrl(meta.icon)} alt="" width={14} height={14} className="object-contain flex-shrink-0" />
        : <span className="flex-shrink-0" style={{ width: 14 }} />}
      <span className="font-mono font-bold text-[12px] tabular-nums flex-shrink-0" style={{ color }}>{fmtValue(min, max, t('range_sep_neg'))}</span>
      <span className="text-[12px] leading-tight truncate" style={{ color }}>{meta ? t(meta.tKey) : stat}</span>
    </span>
  )
}

/** A link card to a set page: what a list of sets shows for each one. */
export function SetCard({ set, index = 0 }: { set: SetLink; index?: number }) {
  const { t, i18n } = useTranslation()
  return (
    <Link
      to={setPath(i18n.language, set.slug)}
      className="set-card group flex items-center gap-3 p-2.5 rounded-lg min-w-0"
      // Long lists (the sets index) animate their first rows only.
      style={index < 24 ? { animation: `col-rise 360ms var(--ease-out) ${index * 18}ms both` } : undefined}
    >
      <span className="set-card-icon flex-shrink-0 rounded-md flex items-center justify-center">
        {set.icon && <img src={set.icon} alt="" width={40} height={40} loading="lazy" decoding="async" className="object-contain" />}
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block text-[13px] font-semibold leading-tight truncate text-ink group-hover:text-gold transition-colors">{set.name}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-ink-faint">
          <span className="font-mono">{t('sets_card_level', { level: set.level })}</span>
          <span>{t('sets_card_pieces', { count: set.pieces })}</span>
          <ElementChips elements={set.elements} iconOnly />
        </span>
      </span>
    </Link>
  )
}

/** A community build in a guide page: no gear icons, so the page never needs the item catalog. */
export function GuideBuildCard({ build }: { build: GuideBuild }) {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const classInfo = CLASS_DATA.find(c => c.id === build.classSlug)
  const portrait = classInfo ? (build.gender === 'female' ? classInfo.imageFUrl : classInfo.imageUrl) : undefined
  return (
    <Link
      to={`/${prefix}build/${build.id}`}
      className="group flex items-center gap-3 p-3 rounded-lg transition-colors min-w-0"
      style={{ background: 'var(--surface-panel)', borderTop: '1px solid var(--gold-deep)', borderRight: '1px solid var(--metal-edge)', borderBottom: '1px solid var(--metal-edge)', borderLeft: '1px solid var(--metal-edge)', boxShadow: 'var(--inset-bevel)' }}
    >
      {portrait && (
        <img src={portrait} alt="" width={40} height={40} loading="lazy" decoding="async" className="rounded-md object-cover flex-shrink-0" style={{ border: '1px solid var(--metal-edge)' }} />
      )}
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block text-[13px] font-semibold truncate group-hover:text-gold transition-colors" style={{ color: 'var(--ink)' }}>{build.name}</span>
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px]" style={{ color: 'var(--ink-faint)' }}>
          <span className="font-mono">{t('sets_card_level', { level: build.level })}</span>
          {build.author && <span className="inline-flex items-center gap-0.5"><User size={10} aria-hidden="true" />{build.author}</span>}
          {build.rating > 0 && <span className="inline-flex items-center gap-0.5" style={{ color: 'var(--gold)' }}><Star size={10} aria-hidden="true" />{build.rating.toFixed(1)}</span>}
          {build.likes > 0 && <span className="inline-flex items-center gap-0.5"><Heart size={10} aria-hidden="true" />{build.likes}</span>}
          <ElementChips elements={build.elements} />
        </span>
      </span>
    </Link>
  )
}

/** Section heading shared by the guide pages. */
export function GuideHeading({ title, note, id }: { title: string; note?: string; id?: string }) {
  return (
    <div id={id} className="scroll-mt-20">
      <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>{title}</h2>
      {note && <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-faint)' }}>{note}</p>}
    </div>
  )
}
