import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Plus, Shield } from 'lucide-react'
import type { Characteristic, StatBlock } from '@/engine/types.ts'
import type { BuildState } from '@/store/buildStore.ts'
import { runeStat } from '@/engine/runes.ts'
import { statIconUrl, STAT_FIELDS, STAT_META } from '../equipment/statDisplay.ts'
import { Tooltip } from '@/ui/Tooltip.tsx'
import { DeltaChip } from '@/features/passives/DeltaChip.tsx'
import { StatsSheetButton } from './StatsSheet.tsx'
import { useBuildStore } from '@/store/buildStore.ts'
import { useCombatStats } from '@/store/useCombatStats.ts'
import { useCombatView, useHasPassives } from '@/store/useCombatView.ts'

type Key = Exclude<keyof StatBlock, 'unknownStats'>

// Game caps: AP 12, MP 6, range 6, and 50% for each resistance.
const CAPS: Partial<Record<Key, [Key, number]>> = { ap: ['apRaw', 12], mp: ['mpRaw', 6], range: ['rangeRaw', 6] }
const RES_PCT_CAP = 50

const SUMMARY: { key: Key; label: string; suffix?: string }[] = [
  { key: 'maxHp', label: 'badge_hp' },
  { key: 'ap', label: 'badge_ap' },
  { key: 'mp', label: 'badge_mp' },
  { key: 'range', label: 'badge_range' },
  { key: 'critChance', label: 'stat_crit_chance', suffix: '%' },
  { key: 'summons', label: 'stat_summons' },
]

/** Icon and the stat's usual name, as every list of the stats panel shows it. */
function StatName({ field }: { field: Key }) {
  const { t } = useTranslation()
  const meta = STAT_FIELDS[field]
  return (
    <span className="stats-name">
      {meta && <img src={statIconUrl(meta.icon)} alt="" width={14} height={14} />}
      {meta ? t(meta.tKey) : t(`sheet_stat_${field}`)}
    </span>
  )
}
// Vitality is left out: its effect is already the HP above.
const CHARACTERISTICS: Key[] = ['wisdom', 'strength', 'intelligence', 'chance', 'agility']
// Power adds to the four elemental characteristics, not to wisdom.
const POWERED = new Set<Key>(['strength', 'intelligence', 'chance', 'agility'])
const ELEMENTS = [
  { el: 'neutral', icon: 'neutral_resistance' },
  { el: 'earth', icon: 'earth_resistance' },
  { el: 'fire', icon: 'fire_resistance' },
  { el: 'water', icon: 'water_resistance' },
  { el: 'air', icon: 'air_resistance' },
] as const
// Below the elements: critical and pushback damage with their fixed resistance.
const EXTRA_ROWS = [
  { name: 'elem_critical', icon: 'crit_damage', dmg: 'critDamage', res: 'critResistance' },
  { name: 'elem_push', icon: 'push_damage', dmg: 'pushbackDamage', res: 'pushbackResist' },
] as const
const GROUPS: [string, Key[]][] = [
  ['stats_combat', ['initiative', 'heals']],
  ['stats_group_control_panel', ['lock', 'dodge', 'apReduction', 'mpReduction', 'apParry', 'mpParry']],
  ['stats_group_bonuses', ['damage', 'power', 'prospecting', 'pods']],
]
const DAMAGE_MODS: Key[] = [
  'meleeDamagePercent', 'rangedDamagePercent', 'spellDamagePercent', 'weaponDamagePercent',
  'finalDamagePercent', 'targetVulnerabilityPercent', 'meleeResistPercent', 'rangedResistPercent',
]

/** The workshop's stats: headline values, characteristics, elements, three
 * groups, and — when present — damage modifiers, runes and unmapped effects.
 * With `base` (the gear stats) `s` is the combat view and each value shows
 * what the active passives add. */
export function StatsOverview({ s, base, runes, inCombat, onAllocate }: {
  s: StatBlock
  base?: StatBlock
  runes: BuildState['runes']
  inCombat: boolean
  /** Workshop only: opens the characteristics window, on one of them if given. */
  onAllocate?: (focus?: Characteristic) => void
}) {
  const { t, i18n } = useTranslation()
  const fmt = new Intl.NumberFormat(i18n.language === 'es' ? 'es-CO' : i18n.language)
  const delta = (key: Key) => (base ? (s[key] as number) - (base[key] as number) : 0)

  const runeTotals = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const slotRunes of Object.values(runes)) {
      if (!slotRunes) continue
      for (const [key, value] of Object.entries(slotRunes)) if (value > 0) acc[runeStat(key)] = (acc[runeStat(key)] ?? 0) + value
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [runes])
  const pointsLeft = (base ?? s).pointsBudget - (base ?? s).pointsSpent
  const mods = DAMAGE_MODS.filter(key => s[key] !== 0)
  const unknown = Object.entries(s.unknownStats)

  return (
    <div className="stats-overview">
      <div className="stats-summary">
        {SUMMARY.map(({ key, label, suffix }) => {
          const value = s[key] as number
          const cap = CAPS[key]
          const over = cap ? (s[cap[0]] as number) - cap[1] : 0
          return (
            <div key={key} className={`stats-metric is-${key}${value < 0 ? ' is-negative' : ''}`}>
              <span className="stats-metric-label"><img src={statIconUrl(STAT_FIELDS[key].icon)} alt="" width={14} height={14} />{t(label)}</span>
              <strong>{fmt.format(value)}{suffix && <em>{suffix}</em>}</strong>
              {over > 0 && <span className="stats-over" title={t('stats_over_cap', { cap: cap![1] })}>▲{over}</span>}
              <DeltaChip delta={delta(key)} suffix={suffix} />
            </div>
          )
        })}
      </div>

      {onAllocate && (
        <div className={'stats-points' + (pointsLeft > 0 ? ' is-pending' : '')}>
          <h3>{t('characteristics')}</h3>
          <span className="stats-points-left">
            {pointsLeft > 0 ? t('stats_points_left', { count: pointsLeft, n: fmt.format(pointsLeft) }) : <><Check size={13} aria-hidden="true" />{t('stats_points_done')}</>}
          </span>
        </div>
      )}
      <dl className={'stats-characteristics' + (onAllocate ? ' has-allocate' : '')} aria-label={t('characteristics')}>
        {CHARACTERISTICS.map(key => {
          const own = s[key] as number
          const powered = POWERED.has(key) && s.power !== 0
          const value = <span className="stats-total">{fmt.format(powered ? own + s.power : own)}</span>
          return (
            <div key={key}>
              <dt>
                <StatName field={key} />
                {onAllocate && (
                  <button type="button" className="stats-char-add" onClick={() => onAllocate(key as Characteristic)}
                    aria-label={t('stats_allocate_stat', { name: t(STAT_FIELDS[key]?.tKey ?? `stat_${key}`) })}>
                    <Plus size={12} aria-hidden="true" />
                  </button>
                )}
              </dt>
              <dd>
                {powered ? (
                  <Tooltip content={(
                    <div className="space-y-0.5">
                      <div>{t('stats_power_own', { value: fmt.format(own) })}</div>
                      <div style={{ color: 'var(--gold)' }}>{t('stats_power_bonus', { value: `${s.power > 0 ? '+' : '−'}${fmt.format(Math.abs(s.power))}` })}</div>
                    </div>
                  )}><span className="stats-has-breakdown">{value}</span></Tooltip>
                ) : value}
                <DeltaChip delta={delta(key)} />
              </dd>
            </div>
          )
        })}
      </dl>

      <table className="stats-elements">
        <caption className="sr-only">{t('section_elements')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('stats_col_element')}</th>
            <th scope="col">{t('header_dmg')}</th>
            <th scope="col">{t('header_res')}</th>
            <th scope="col">{t('header_res_pct')}</th>
          </tr>
        </thead>
        <tbody>
          {ELEMENTS.map(({ el, icon }) => {
            const dmg = s[`${el}Damage` as Key] as number
            const fixed = s[`${el}ResFixed` as Key] as number
            const pct = s[`${el}ResPercent` as Key] as number
            const raw = s[`${el}ResPercentRaw` as Key] as number
            const dmgCell = <>{fmt.format(dmg)} <DeltaChip delta={delta(`${el}Damage` as Key)} /></>
            return (
              <tr key={el} className={dmg === 0 && fixed === 0 && pct === 0 ? 'is-empty' : undefined}>
                <th scope="row" className={`is-${el}`}><img src={statIconUrl(icon)} alt="" width={17} height={17} />{t(`elem_${el}`)}</th>
                <td>
                  {s.damage ? (
                    <Tooltip content={(
                      <div className="space-y-0.5">
                        <div>{t('dmg_breakdown_own', { value: dmg - s.damage })}</div>
                        <div style={{ color: 'var(--gold)' }}>{t('dmg_breakdown_bonus', { value: s.damage })}</div>
                      </div>
                    )}><span className="stats-has-breakdown">{dmgCell}</span></Tooltip>
                  ) : dmgCell}
                </td>
                <td>{fmt.format(fixed)}</td>
                <td>
                  <span className="stats-res">
                    {raw > RES_PCT_CAP && <span className="stats-over">▲{raw - RES_PCT_CAP}</span>}
                    <span className={raw >= RES_PCT_CAP ? 'is-capped' : undefined}>{pct}<small>%</small></span>
                    <DeltaChip delta={delta(`${el}ResPercent` as Key)} suffix="%" />
                    <span className="stats-res-track" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, pct * 2))}%` }} /></span>
                  </span>
                </td>
              </tr>
            )
          })}
          {EXTRA_ROWS.map((r, i) => (
            <tr key={r.name} className={[i === 0 && 'is-first-extra', s[r.dmg] === 0 && s[r.res] === 0 && 'is-empty'].filter(Boolean).join(' ') || undefined}>
              <th scope="row"><img src={statIconUrl(r.icon)} alt="" width={17} height={17} />{t(r.name)}</th>
              <td>{fmt.format(s[r.dmg])} <DeltaChip delta={delta(r.dmg)} /></td>
              <td>{fmt.format(s[r.res])}</td>
              <td><span className="stats-res-none" aria-hidden="true">—</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="stats-groups">
        {GROUPS.map(([title, keys]) => (
          <section key={title} aria-label={t(title)}>
            <h3>{t(title)}</h3>
            {keys.map(key => (
              <div key={key} className="stats-row">
                <StatName field={key} />
                <b>{fmt.format(s[key] as number)} <DeltaChip delta={delta(key)} /></b>
              </div>
            ))}
          </section>
        ))}
      </div>

      {(mods.length > 0 || runeTotals.length > 0) && (
        <div className="stats-groups">
          {mods.length > 0 && (
            <section aria-label={t('section_damage_mods')}>
              <h3>{t('section_damage_mods')}</h3>
              {mods.map(key => (
                <div key={key} className="stats-row">
                  <StatName field={key} />
                  <b>{(s[key] as number) > 0 ? '+' : ''}{s[key] as number}% <DeltaChip delta={delta(key)} suffix="%" /></b>
                </div>
              ))}
            </section>
          )}
          {runeTotals.length > 0 && (
            <section aria-label={t('magesmithy')}>
              <h3>{t('magesmithy')}</h3>
              {runeTotals.map(([stat, value]) => (
                <div key={stat} className="stats-row">
                  <span className="stats-name">
                    {STAT_META[stat] && <img src={statIconUrl(STAT_META[stat].icon)} alt="" width={14} height={14} />}
                    {STAT_META[stat] ? t(STAT_META[stat].tKey) : stat}
                  </span>
                  <b>+{value}</b>
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      {unknown.length > 0 && (
        <details className="stats-unknown">
          <summary>{t('unmapped_stats', { count: unknown.length })}</summary>
          {unknown.map(([k, v]) => (
            <div key={k} className="stats-row"><span>{k}</span><b>{v > 0 ? '+' : ''}{v}</b></div>
          ))}
        </details>
      )}

      <p className="stats-note">
        <Shield size={15} aria-hidden="true" />
        <span>{t('stats_general_damage_note')} {t(inCombat ? 'stats_combat_view_note' : 'stats_gear_view_note')}</span>
      </p>
      <StatsSheetButton stats={s} />
    </div>
  )
}

/** Mobile strip under the workshop heading: HP, AP, MP and range at a glance. */
export function StatsQuick() {
  const { t, i18n } = useTranslation()
  const base = useBuildStore(st => st.stats)
  const combatStats = useCombatStats()
  const combatView = useCombatView()
  const hasPassives = useHasPassives()
  const s = combatView && hasPassives && combatStats ? combatStats : base
  if (!s) return null
  const fmt = new Intl.NumberFormat(i18n.language === 'es' ? 'es-CO' : i18n.language)
  return (
    <dl className="stats-quick">
      {SUMMARY.slice(0, 4).map(({ key, label }) => (
        <div key={key} className={`is-${key}${(s[key] as number) < 0 ? ' is-negative' : ''}`}>
          <dt><img src={statIconUrl(STAT_FIELDS[key].icon)} alt="" width={13} height={13} />{t(label)}</dt>
          <dd>{fmt.format(s[key] as number)}</dd>
        </div>
      ))}
    </dl>
  )
}
