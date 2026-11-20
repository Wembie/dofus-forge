import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Star, Heart, User } from 'lucide-react'
import { STAT_META, fmtValue, statIconUrl } from '@/features/equipment/statDisplay.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import type { GuideElement, SetLink, GuideBuild } from '@/data/setGuide.ts'
import { ELEMENT_ICON, ELEMENT_STAT_KEY, setPath } from './setGuideLinks.ts'
import './set-pages.css'

/** Element chips; `iconOnly` keeps the name as the icon's alt text. */
export function ElementChips({ elements, iconOnly = false }: { elements: readonly GuideElement[]; size?: 'sm' | 'md'; iconOnly?: boolean }) {
  const { t } = useTranslation()
  if (elements.length === 0) return null
  return (
    <span className="sp-elements">
      {elements.map(el => (
        <span key={el} className="sp-element" data-element={el}>
          <img src={statIconUrl(ELEMENT_ICON[el])} alt={iconOnly ? t(ELEMENT_STAT_KEY[el]) : ''} />
          {!iconOnly && t(ELEMENT_STAT_KEY[el])}
        </span>
      ))}
    </span>
  )
}

/** One stat line: icon, signed value, label. */
export function StatLine({ stat, min, max = 0 }: { stat: string; min: number; max?: number }) {
  const { t } = useTranslation()
  const meta = STAT_META[stat]
  return (
    <span className={'sp-stat' + (min < 0 ? ' is-negative' : '')}>
      {meta?.icon ? <img src={statIconUrl(meta.icon)} alt="" /> : <i />}
      <b>{fmtValue(min, max, t('range_sep_neg'))}</b>
      <span>{meta ? t(meta.tKey) : stat}</span>
    </span>
  )
}

function ClassName({ id }: { id: string }) {
  return <>{useClassName(id)}</>
}

/** A set in a list: its first piece, level, pieces, elements, class, and what the full set adds. */
export function SetCard({ set }: { set: SetLink; index?: number }) {
  const { t, i18n } = useTranslation()
  return (
    <article className="sp-card" data-element={set.elements.length === 1 ? set.elements[0] : undefined}>
      {set.icon && (
        <span className="sp-card-icon" aria-hidden="true">
          <img src={set.icon} alt="" width={48} height={48} loading="lazy" decoding="async" />
        </span>
      )}
      <h3><Link to={setPath(i18n.language, set.slug)}>{set.name}</Link></h3>
      <p className="sp-card-meta">
        <span>{t('sets_card_level', { level: set.level })}</span>
        <span>{t('sets_card_pieces', { count: set.pieces })}</span>
        <ElementChips elements={set.elements} iconOnly />
        {set.classId && <span className="sp-class"><ClassName id={set.classId} /></span>}
      </p>
      {set.top && set.top.length > 0 && (
        <p className="sp-card-totals">
          <small>{t('sets_full_set')}</small>
          {set.top.map(s => <StatLine key={s.stat} stat={s.stat} min={s.value} />)}
        </p>
      )}
    </article>
  )
}

/** A community build in a guide page: no gear icons, so the page never needs the item catalog. */
export function GuideBuildCard({ build }: { build: GuideBuild }) {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const classInfo = CLASS_DATA.find(c => c.id === build.classSlug)
  const portrait = classInfo ? (build.gender === 'female' ? classInfo.imageFUrl : classInfo.imageUrl) : undefined
  return (
    <li>
      <Link to={`/${prefix}build/${build.id}`}>
        {portrait && <img src={portrait} alt="" width={40} height={40} loading="lazy" decoding="async" />}
        <span>
          <b>{build.name}</b>
          <small>
            <span>{t('sets_card_level', { level: build.level })}</span>
            {build.author && <span><User size={12} aria-hidden="true" />{build.author}</span>}
            {build.rating > 0 && <span className="is-rating"><Star size={12} aria-hidden="true" />{build.rating.toFixed(1)}</span>}
            {build.likes > 0 && <span><Heart size={12} aria-hidden="true" />{build.likes}</span>}
            <ElementChips elements={build.elements} iconOnly />
          </small>
        </span>
      </Link>
    </li>
  )
}

/** Section heading shared by the guide pages. */
export function GuideHeading({ title, note, id }: { title: string; note?: string; id?: string }) {
  return (
    <div id={id} className="sp-section-head">
      <h2>{title}</h2>
      {note && <p>{note}</p>}
    </div>
  )
}
