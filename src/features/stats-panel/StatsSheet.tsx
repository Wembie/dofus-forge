import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Search } from 'lucide-react'
import type { StatBlock } from '@/engine/types.ts'
import { Modal } from '@/ui'
import { CombatViewTag } from '@/features/passives/CombatViewBar.tsx'

type SheetKey = Exclude<keyof StatBlock, 'unknownStats'> | 'unknownStats'

/** Every field of the StatBlock, grouped as the character sheet reads them. */
const STAT_SHEET_GROUPS: [string, SheetKey[]][] = [
  ['character', [
    'maxHp', 'ap', 'mp', 'range', 'vitality', 'wisdom', 'strength', 'intelligence', 'chance', 'agility',
    'power', 'initiative', 'prospecting', 'summons', 'pods', 'pointsBudget', 'pointsSpent',
  ]],
  ['section_damage', [
    'damage', 'neutralDamage', 'earthDamage', 'fireDamage', 'waterDamage', 'airDamage', 'critChance', 'critDamage',
    'meleeDamagePercent', 'rangedDamagePercent', 'spellDamagePercent', 'weaponDamagePercent', 'finalDamagePercent',
    'pushbackDamage', 'trapDamage', 'trapPower', 'reflectedDamage', 'neutralSteal', 'earthSteal', 'fireSteal',
    'waterSteal', 'airSteal', 'bestElemSteal', 'bestElemDamage',
  ]],
  ['section_resistances', [
    'neutralResFixed', 'earthResFixed', 'fireResFixed', 'waterResFixed', 'airResFixed',
    'neutralResPercent', 'earthResPercent', 'fireResPercent', 'waterResPercent', 'airResPercent',
    'neutralResPercentRaw', 'earthResPercentRaw', 'fireResPercentRaw', 'waterResPercentRaw', 'airResPercentRaw',
    'critResistance', 'pushbackResist', 'meleeResistPercent', 'rangedResistPercent', 'targetVulnerabilityPercent',
  ]],
  ['stats_group_control', [
    'apReduction', 'mpReduction', 'apParry', 'mpParry', 'lock', 'dodge', 'mpSteal', 'heals',
    'apRaw', 'mpRaw', 'rangeRaw', 'unknownStats',
  ]],
]

function StatsSheet({ stats }: { stats: StatBlock }) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  // "es" alone drops the thousands separator on four-digit values.
  const format = new Intl.NumberFormat(i18n.language === 'es' ? 'es-CO' : i18n.language)
  const needle = query.trim().toLocaleLowerCase()
  const groups = STAT_SHEET_GROUPS
    .map(([title, keys]) => [title, keys.filter(key => t(`sheet_stat_${key}`).toLocaleLowerCase().includes(needle))] as const)
    .filter(([, keys]) => keys.length > 0)

  return (
    <div className="stats-sheet">
      <div className="stats-sheet-controls">
        <label>
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">{t('stats_sheet_search')}</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('stats_sheet_search_placeholder')} />
        </label>
        <span>{t('stats_sheet_fields')}</span>
        <CombatViewTag />
      </div>
      {groups.length === 0 && <p className="stats-sheet-empty" role="status">{t('stats_sheet_no_match')}</p>}
      <div className="stats-sheet-columns">
        {groups.map(([title, keys]) => (
          <section key={title} className="stats-sheet-group" aria-label={t(title)}>
            <h3>{t(title)}</h3>
            <dl>
              {keys.map(key => {
                const label = t(`sheet_stat_${key}`)
                const value = stats[key]
                const text = typeof value === 'number'
                  ? format.format(value)
                  : Object.entries(value).map(([name, amount]) => `${name}: ${format.format(amount)}`).join(' · ') || t('stats_sheet_none')
                return (
                  <div key={key} data-stat={key} className={value === 0 ? 'is-zero' : undefined}>
                    <dt title={label}>{label}</dt>
                    <dd title={text}>{text}</dd>
                  </div>
                )
              })}
            </dl>
          </section>
        ))}
      </div>
    </div>
  )
}

/** Opens the full sheet: all 73 fields of the StatBlock, zero values included. */
export function StatsSheetButton({ stats }: { stats: StatBlock }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="stats-sheet-open" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span>{t('stats_sheet_open')}<small>{t('stats_sheet_open_hint')}</small></span>
        <ArrowRight size={17} aria-hidden="true" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t('stats_sheet_title')} size="4xl">
        <StatsSheet stats={stats} />
      </Modal>
    </>
  )
}
