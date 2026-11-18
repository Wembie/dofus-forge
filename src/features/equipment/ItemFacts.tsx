import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Crosshair, EyeOff, Repeat2, Sparkles, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { IGNORED_EFFECT_IDS } from '@/engine/statMap.ts'
import { SPELL_ITEM_EFFECT_IDS } from '@/data/effectIds.ts'
import type { StatBlock } from '@/engine/types.ts'
import type { AppEffect, AppItem } from '@/data/loaders.ts'
import { isAttackEffect } from './catalogFilters.ts'
import { STAT_FIELDS, STAT_META, fmtValue, isIgnored, statIconUrl } from './statDisplay.ts'

/** Effects an item card shows: no display-only junk, attacks apart for weapons, spell effects. */
export function itemFacts(item: AppItem) {
  const all = item.effects.filter(e => !isIgnored(e.stat) && (e.effect_id == null || !IGNORED_EFFECT_IDS.has(e.effect_id)))
  const weapon = item.slot === 'weapon' || item.ap_cost != null
  return {
    attack: weapon ? all.filter(isAttackEffect) : [],
    stats:  weapon ? all.filter(e => !isAttackEffect(e)) : all,
    spells: item.effects.filter(e => e.formatted && SPELL_ITEM_EFFECT_IDS.has(e.effect_id ?? -1)),
  }
}

const SPELL_STAT_ICONS: Record<number, string> = { 204: 'Range', 207: 'AP', 208: 'Range', 226: '% Critical', 243: 'Damage', 245: 'Damage', 274: 'Range' }
const SPELL_SPECIAL_ICONS: Record<number, LucideIcon> = { 205: EyeOff, 209: EyeOff, 227: Timer, 240: Crosshair, 276: Repeat2, 279: Repeat2 }

function EffectRow({ effect, attack }: { effect: AppEffect; attack?: boolean }) {
  const { t } = useTranslation()
  const meta = STAT_META[effect.stat]
  const negative = !attack && effect.min < 0
  const value = attack
    ? effect.min === effect.max || effect.max === 0 ? String(effect.min) : `${effect.min} – ${effect.max}`
    : fmtValue(effect.min, effect.max, t('range_sep_neg'))
  return (
    <li className={negative ? 'is-negative' : undefined}>
      {meta?.icon ? <img src={statIconUrl(meta.icon)} alt="" loading="lazy" /> : <i />}
      <b>{value}</b>
      <span>{meta ? t(meta.tKey) : effect.stat}</span>
    </li>
  )
}

/** Everything a piece does, so it reads without opening it: ability, weapon
 * attack, effects, spell effects and lore. */
export function ItemFactsList({ item, lore = true }: { item: AppItem; lore?: boolean }) {
  const { t } = useTranslation()
  const { attack, stats, spells } = itemFacts(item)
  return (
    <>
      {item.ability && (
        <div className="facts-ability">
          {item.ability.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
        </div>
      )}
      {attack.length > 0 && (
        <div role="group" className="facts-group" aria-label={t('weapon_attack')}>
          <h5>{t('weapon_attack')}</h5>
          <ul className="facts-effects is-attack">{attack.map((e, i) => <EffectRow key={i} effect={e} attack />)}</ul>
        </div>
      )}
      {stats.length > 0 && (
        <div role="group" className="facts-group" aria-label={t('effects')}>
          {attack.length > 0 && <h5>{t('effects')}</h5>}
          <ul className="facts-effects">{stats.map((e, i) => <EffectRow key={i} effect={e} />)}</ul>
        </div>
      )}
      {spells.length > 0 && (
        <div role="group" className="facts-group" aria-label={t('item_spell_effects')}>
          <h5><Sparkles size={11} aria-hidden="true" /> {t('item_spell_effects')}</h5>
          <ul className="facts-spells">
            {spells.map((e, i) => {
              const text = e.formatted!
              const cut = text.indexOf(':')
              const Icon = SPELL_SPECIAL_ICONS[e.effect_id ?? -1]
              const meta = STAT_META[SPELL_STAT_ICONS[e.effect_id ?? -1] ?? 'Damage']
              return (
                <li key={i}>
                  <span className="facts-spell-icon">
                    {Icon ? <Icon size={13} strokeWidth={1.8} /> : <img src={statIconUrl(meta.icon)} alt="" />}
                  </span>
                  <span>
                    <b>{cut >= 0 ? text.slice(0, cut).trim() : text}</b>
                    {cut >= 0 && <small>{text.slice(cut + 1).trim()}</small>}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {lore && item.description && <p className="facts-lore">{item.description}</p>}
    </>
  )
}

/** Shows a card in the side panel when the pointer rests on it, so the impact
 * reads without a click (the click equips). The short delay keeps cards
 * crossed on the way to the panel from replacing it. */
export function useHoverIntent<T>(show: (value: T) => void, delay = 160) {
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  return {
    enter(value: T) {
      // Only while the panel sits beside the grid; on one column it would swap the view.
      if (!matchMedia('(hover: hover) and (min-width: 701px)').matches) return
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => show(value), delay)
    },
    leave() { clearTimeout(timer.current) },
  }
}

/** Hover or focus peek of a piece: its card above everything, placed so it fits the viewport. */
export function ItemPeek({ item, children }: { item: AppItem; children: ReactNode }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const card = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!open || !anchor.current || !card.current) return
    const a = anchor.current.getBoundingClientRect()
    const c = card.current.getBoundingClientRect()
    const left = Math.min(Math.max(8, a.left + a.width / 2 - c.width / 2), innerWidth - c.width - 8)
    const below = a.bottom + 8 + c.height < innerHeight
    Object.assign(card.current.style, {
      left: left + 'px',
      top: (below ? a.bottom + 8 : Math.max(8, a.top - c.height - 8)) + 'px',
      visibility: 'visible',
    })
  }, [open])
  return (
    <span ref={anchor} className="peek-anchor"
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
      {children}
      {open && createPortal(
        <div ref={card} className="item-peek" role="tooltip">
          <header>
            {item.image_url && <img src={item.image_url} alt="" />}
            <span><b>{item.name}</b><small>{t('catalog_level_short', { level: item.level })}</small></span>
          </header>
          <ItemFactsList item={item} lore={false} />
        </div>,
        document.body,
      )}
    </span>
  )
}

const DELTA_KEYS = ['maxHp', 'ap', 'mp', 'range', 'strength', 'intelligence', 'chance', 'agility', 'power', 'critChance'] as const

/** Current build → build with the change, the same ten totals in every picker. */
export function ImpactDeltas({ preview }: { preview: StatBlock }) {
  const { t } = useTranslation()
  const stats = useBuildStore(s => s.stats)
  return (
    <dl className="catalog-deltas">
      {DELTA_KEYS.map(key => {
        const before = stats?.[key] ?? 0
        const after = preview[key] ?? 0
        const diff = after - before
        return (
          <div key={key} className={diff ? 'has-change' : undefined}>
            <dt><img src={statIconUrl(STAT_FIELDS[key].icon)} alt="" width={14} height={14} />{t(STAT_FIELDS[key].tKey)}</dt>
            <dd>
              {before} <ArrowRight size={12} aria-hidden="true" /> <b>{after}</b>
              <em className={diff < 0 ? 'negative' : diff > 0 ? 'positive' : ''}>{diff > 0 ? '+' : ''}{diff}</em>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/** A tier's effects, with production's names and icons. */
export function SetBonusEffects({ effects }: { effects: AppEffect[] }) {
  const { t } = useTranslation()
  if (!effects.length) return <span>{t('setcat_no_effects')}</span>
  return (
    <>
      {effects.map((e, i) => {
        const meta = STAT_META[e.stat]
        return (
          <span key={i} className={e.min < 0 ? 'is-negative' : undefined}>
            {meta?.icon && <img src={statIconUrl(meta.icon)} alt="" />}
            <b>{fmtValue(e.min, e.max)}</b> {meta ? t(meta.tKey) : e.stat}
          </span>
        )
      })}
    </>
  )
}
