import { useTranslation } from 'react-i18next'
import type { AppItem, AppCondition } from '@/data/loaders.ts'
import { WEAPON_ATTACK_IDS, IGNORED_EFFECT_IDS } from '@/engine/statMap.ts'
import { isExoticKey, runeStat } from '@/engine/runes.ts'
import { WEAPON_ATTACK_STAT, IS_STEAL } from '@/features/spells/spellCalc.ts'
import { STAT_META, isIgnored, fmtValue, statIconUrl, runeKeyIconUrl, runeIconFallback } from './statDisplay.ts'
import { ItemSpellEffects } from './ItemSpellEffects.tsx'
import './item-card.css'

type Line = { stat: string; min: number; max: number; transformed?: boolean }

export interface ItemCardProps {
  item: AppItem
  runes?: Record<string, number>
  forjamagoName?: string
  /** A transformed weapon's neutral attack, shown in the chosen element. */
  weaponTransform?: { element: string; ratio: number } | null
  set?: { name: string; count: number; max: number; nextBonus?: string }
}

/**
 * Everything about one item, as the hover card shows it on the workshop's
 * slots and on a published build: name, ability, attack, effects, spell
 * effects, magesmithy, set, conditions and lore. Flat and quiet; each section
 * is separated by a thin rule.
 */
export function ItemCard({ item, runes, forjamagoName, weaponTransform, set }: ItemCardProps) {
  const { t } = useTranslation()
  const all = item.effects.filter(e => !isIgnored(e.stat) && (e.effect_id == null || !IGNORED_EFFECT_IDS.has(e.effect_id)))
  const isWeapon = item.slot === 'weapon' || item.ap_cost != null
  const isAttack = (e: (typeof all)[number]) => e.effect_id != null && WEAPON_ATTACK_IDS.has(e.effect_id)
  const rawAttack = isWeapon ? all.filter(isAttack) : []
  const stats = isWeapon ? all.filter(e => !isAttack(e)) : all
  const attack: Line[] = weaponTransform && isWeapon
    ? rawAttack.map(e => {
        if (WEAPON_ATTACK_STAT[e.stat] !== 'neutral') return e
        const element = weaponTransform.element.charAt(0).toUpperCase() + weaponTransform.element.slice(1)
        const r = weaponTransform.ratio / 100
        // Neutral damage or steal alike; the game rounds transformed damage down.
        return { ...e, stat: `${element} ${IS_STEAL(e.stat) ? 'steal' : 'damage'}`, min: Math.floor(e.min * r), max: e.max > 0 ? Math.floor(e.max * r) : 0, transformed: true }
      })
    : rawAttack
  const activeRunes = Object.entries(runes ?? {}).filter(([, v]) => v > 0).sort(([a], [b]) => Number(isExoticKey(b)) - Number(isExoticKey(a)))
  const ability = item.ability?.split('\n').filter(Boolean) ?? []

  const line = (e: Line, i: number, kind: 'attack' | 'stat') => {
    const meta = STAT_META[e.stat]
    const value = kind === 'attack'
      ? (e.min === e.max || e.max === 0 ? String(e.min) : `${e.min} ${t('range_sep_neg')} ${e.max}`)
      : fmtValue(e.min, e.max, t('range_sep_neg'))
    return (
      <li key={i} className={e.min < 0 && kind === 'stat' ? 'is-negative' : undefined} style={meta?.color ? { color: meta.color } : undefined}>
        {meta?.icon ? <img src={statIconUrl(meta.icon)} alt="" width={13} height={13} /> : <i />}
        {e.stat === 'Pushes back cell'
          ? <span>{t('spell_push', { cells: e.min })}</span>
          : <><b>{value}</b><span>{meta ? t(meta.tKey) : e.stat}</span>{e.transformed && <small>{weaponTransform!.ratio}%</small>}</>}
      </li>
    )
  }

  return (
    <div className="item-card">
      <header className="item-card-head">
        <p className="item-card-name">{item.name}</p>
        <p className="item-card-meta">{t('level')} {item.level} · {item.type}</p>
        {set && <p className="item-card-set">{set.name} <span>{set.count}/{set.max}</span></p>}
      </header>

      {ability.length > 0 && (
        <section className="item-card-ability">
          {ability.map((text, i) => <p key={i} className={i === 0 ? 'is-title' : undefined}>{text}</p>)}
        </section>
      )}

      {attack.length > 0 && (
        <section>
          <h4>{t('weapon_attack')}</h4>
          <ul className="item-card-lines">{attack.map((e, i) => line(e, i, 'attack'))}</ul>
        </section>
      )}

      {stats.length > 0 && (
        <section>
          <h4>{t('effects')}</h4>
          <ul className="item-card-lines">{stats.map((e, i) => line(e, i, 'stat'))}</ul>
        </section>
      )}

      <ItemSpellEffects effects={item.effects} />

      {activeRunes.length > 0 && (
        <section>
          <h4>{t('magesmithy')}</h4>
          <ul className="item-card-lines is-runes">
            {activeRunes.map(([stat, value]) => {
              const meta = STAT_META[runeStat(stat)]
              const url = runeKeyIconUrl(stat)
              return (
                <li key={stat}>
                  {url ? <img src={url} onError={runeIconFallback(stat)} alt="" width={15} height={15} /> : <i />}
                  <b>+{value}</b>
                  <span>{meta ? t(meta.tKey) : runeStat(stat)}</span>
                  {isExoticKey(stat) && <small>{t('rune_tr_tag')}</small>}
                </li>
              )
            })}
          </ul>
          {forjamagoName && <p className="item-card-note">{t('modified_by')}: {forjamagoName}</p>}
        </section>
      )}

      {set?.nextBonus && <p className="item-card-note is-section">{t('next_bonus')}: {set.nextBonus}</p>}

      {item.conditions && item.conditions.length > 0 && (
        <section>
          <h4>{t('conditions')}</h4>
          <ul className="item-card-lines">
            {item.conditions.map((c: AppCondition, i: number) => {
              const meta = STAT_META[c.stat]
              return (
                <li key={i}>
                  {meta?.icon ? <img src={statIconUrl(meta.icon)} alt="" width={13} height={13} /> : <i />}
                  <span>{meta ? t(meta.tKey) : c.stat} {c.operator} {c.value}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {item.description && <p className="item-card-lore">{item.description}</p>}
    </div>
  )
}
