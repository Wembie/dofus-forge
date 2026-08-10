import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { AppSpell, AppSpellElement } from '@/data/spellLoaders.ts'
import type { AppItem } from '@/data/loaders.ts'
import { calcEffects, calcDamage } from './spellDamage.ts'
import type { StatBlock } from '@/engine/types.ts'

function spellGrade(level: number): number {
  if (level >= 200) return 6
  if (level >= 150) return 5
  if (level >= 125) return 4
  if (level >= 100) return 3
  if (level >= 50)  return 2
  return 1
}

const ELEM_COLOR: Record<AppSpellElement, string> = {
  earth:   '#b8860b',
  fire:    '#dc4e22',
  water:   '#2a8fd4',
  air:     '#6ab04c',
  neutral: '#9b9b9b',
  mixed:   '#c9a84c',
}

const WEAPON_ATTACK_STAT: Record<string, Exclude<AppSpellElement, 'mixed'>> = {
  'Neutral damage': 'neutral',
  'Earth damage':   'earth',
  'Fire damage':    'fire',
  'Water damage':   'water',
  'Air damage':     'air',
  'Earth steal':    'earth',
  'Fire steal':     'fire',
  'Air steal':      'air',
  'Neutral steal':  'neutral',
}

function fmtRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`
}

/** % melee or ranged bonus from stats, inferred from spell/weapon range values.
 *  maxRange=0 → self-cast, no distance modifier.
 *  minRange=0 → can hit adjacent → melee bonus applies.
 *  minRange>0 → always ranged → ranged bonus applies.
 */
function rangePct(minRange: number, maxRange: number, stats: StatBlock): number {
  if (maxRange === 0) return 0
  return minRange === 0 ? stats.meleeDamagePercent : stats.rangedDamagePercent
}

type ElemFilter = AppSpellElement | 'all'
const FILTERS: ElemFilter[] = ['all', 'earth', 'fire', 'water', 'air', 'neutral']

function SpellCard({ spell, grade, stats }: { spell: AppSpell; grade: number; stats: StatBlock | null }) {
  const { t }    = useTranslation()
  const lvl      = spell.levels.find(l => l.grade === grade) ?? spell.levels.at(-1)
  const color    = ELEM_COLOR[spell.element]
  const showCalc = Boolean(stats)

  // spellDamagePercent + melee/ranged inferred from spell range
  const spellPct = stats && lvl
    ? stats.spellDamagePercent + rangePct(lvl.minRange, lvl.maxRange, stats)
    : 0

  const displayEffects = useMemo(() => {
    if (!lvl) return []
    if (stats && lvl.effects.length > 0) return calcEffects(lvl.effects, stats, spellPct)
    return lvl.effects.map(e => ({ ...e, calcMin: e.min, calcMax: e.max }))
  }, [lvl, stats, spellPct])

  const critDisplayEffects = useMemo(() => {
    if (!lvl?.critEffects || lvl.critEffects.length === 0) return []
    if (stats) return calcEffects(lvl.critEffects, stats, spellPct)
    return lvl.critEffects.map(e => ({ ...e, calcMin: e.min, calcMax: e.max }))
  }, [lvl, stats, spellPct])

  const hasCrit         = critDisplayEffects.length > 0
  const damageEffects   = displayEffects.filter(e => e.kind === 'damage')
  const critDmgEffects  = critDisplayEffects.filter(e => e.kind === 'damage')
  const pushDmg         = (stats && displayEffects.some(e => e.kind === 'push')) ? stats.pushbackDamage : 0
  const showTotal       = damageEffects.length >= 2 || (damageEffects.length >= 1 && pushDmg > 0)

  const rangeStr = !lvl || lvl.maxRange === 0
    ? t('spell_melee')
    : lvl.minRange === lvl.maxRange
      ? `${lvl.maxRange}`
      : `${lvl.minRange}–${lvl.maxRange}`

  return (
    <div
      className="rounded-lg p-2.5 flex gap-2.5"
      style={{ background: '#0d1219', border: `1px solid ${color}22` }}
    >
      {/* Spell image */}
      <div
        className="flex-shrink-0 rounded overflow-hidden flex items-center justify-center"
        style={{
          width: 44, height: 44,
          background: 'linear-gradient(145deg, #151c2a, #0d1219)',
          border: `1px solid ${color}33`,
        }}
      >
        {spell.image_url
          ? <img src={spell.image_url} alt="" width={44} height={44} loading="lazy" className="object-contain" />
          : <span className="text-xl" style={{ color }}>✦</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold truncate leading-tight mb-1" style={{ color }}>
          {spell.name}
        </p>

        {lvl && (
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-1">
            <span
              className="text-[10px] font-bold font-mono px-1 rounded"
              style={{ color: '#c9a84c', background: '#c9a84c18' }}
            >{lvl.ap}AP</span>
            <span className="text-[10px] font-mono" style={{ color: '#4a5580' }}>{rangeStr}</span>
            {lvl.critChance > 0 && (
              <span className="text-[10px]" style={{ color: '#dc4e22' }}>{lvl.critChance}%</span>
            )}
            {lvl.maxPerTurn > 0 && (
              <span className="text-[10px]" style={{ color: '#3a4a68' }}>
                {t('spell_max_per_turn', { count: lvl.maxPerTurn })}
              </span>
            )}
          </div>
        )}

        {displayEffects.length > 0 ? (
          <div className="space-y-0.5">
            {displayEffects.map((e, i) => {
              if (e.kind === 'push') {
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono" style={{ color: '#6b7fa8' }}>
                      {t('spell_push', { cells: e.calcMin })}
                    </span>
                    {pushDmg > 0 && (
                      <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: '#6b7fa8' }}>
                        {pushDmg}
                      </span>
                    )}
                  </div>
                )
              }
              if (e.kind === 'ap' || e.kind === 'mp') {
                const label = e.kind === 'ap'
                  ? t('spell_steal_ap', { n: e.calcMin })
                  : t('spell_steal_mp', { n: e.calcMin })
                return (
                  <span key={i} className="text-[10px] font-mono block" style={{ color: '#c9a84c' }}>{label}</span>
                )
              }
              const c     = ELEM_COLOR[e.element]
              const critE = hasCrit ? critDmgEffects.find(ce => ce.element === e.element) : null
              return (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c }} />
                    <span
                      className="text-[10px] font-mono tabular-nums"
                      style={{ color: c, fontWeight: showCalc ? 700 : 400 }}
                    >{fmtRange(e.calcMin, e.calcMax)}</span>
                  </span>
                  {critE && (
                    <span className="flex items-center gap-0.5">
                      <span className="text-[9px]" style={{ color: '#c9a84c' }}>✦</span>
                      <span
                        className="text-[10px] font-mono tabular-nums font-bold"
                        style={{ color: '#e8a020' }}
                      >{fmtRange(critE.calcMin, critE.calcMax)}</span>
                    </span>
                  )}
                </div>
              )
            })}

            {showTotal && (
              <div
                className="flex items-center gap-1.5 mt-0.5 pt-0.5"
                style={{ borderTop: '1px solid #1c2333' }}
              >
                <span className="flex items-center gap-0.5">
                  <span className="text-[9px] font-mono" style={{ color: '#4a5580' }}>Σ</span>
                  <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: '#8090b0' }}>
                    {fmtRange(
                      damageEffects.reduce((s, e) => s + e.calcMin, 0) + pushDmg,
                      damageEffects.reduce((s, e) => s + e.calcMax, 0) + pushDmg,
                    )}
                  </span>
                </span>
                {hasCrit && critDmgEffects.length >= 1 && (
                  <span className="flex items-center gap-0.5">
                    <span className="text-[9px]" style={{ color: '#c9a84c' }}>✦</span>
                    <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: '#e8a020' }}>
                      {fmtRange(
                        critDmgEffects.reduce((s, e) => s + e.calcMin, 0) + pushDmg,
                        critDmgEffects.reduce((s, e) => s + e.calcMax, 0) + pushDmg,
                      )}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="text-[9px] uppercase tracking-wide" style={{ color: '#2a3347' }}>
            {t('spell_support')}
          </span>
        )}
      </div>
    </div>
  )
}

function WeaponCard({ weapon, stats }: { weapon: AppItem | null; stats: StatBlock | null }) {
  const { t } = useTranslation()

  const attackEffects = useMemo(() => {
    if (!weapon) return []
    return weapon.effects.filter(e => Object.prototype.hasOwnProperty.call(WEAPON_ATTACK_STAT, e.stat))
  }, [weapon])

  if (!weapon) {
    return (
      <div
        className="rounded-lg p-2.5 flex gap-2.5"
        style={{ background: '#0d1219', border: '1px solid #2a334733' }}
      >
        <div
          className="flex-shrink-0 rounded flex items-center justify-center text-lg"
          style={{ width: 44, height: 44, background: '#0f1623', border: '1px solid #2a334744' }}
        >
          ✊
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate leading-tight mb-1" style={{ color: '#4a5580' }}>
            {t('weapon_fist')}
          </p>
          <div className="flex items-center gap-x-2">
            <span className="text-[10px] font-bold font-mono px-1 rounded" style={{ color: '#c9a84c', background: '#c9a84c18' }}>1AP</span>
            <span className="text-[10px] font-mono" style={{ color: '#4a5580' }}>{t('spell_melee')}</span>
          </div>
        </div>
      </div>
    )
  }

  const ap      = weapon.ap_cost     ?? 0
  const minR    = weapon.min_range   ?? 0
  const maxR    = weapon.max_range   ?? 0
  const crit    = weapon.crit_chance ?? 0
  const critBon = weapon.crit_bonus  ?? 0
  const rangeStr = maxR === 0
    ? t('spell_melee')
    : minR === maxR ? `${maxR}` : `${minR}–${maxR}`

  const showTotal = attackEffects.length >= 2
  const hasCrit   = crit > 0 && stats != null

  // weaponDamagePercent + melee/ranged inferred from weapon range
  const weaponPct = stats
    ? stats.weaponDamagePercent + rangePct(minR, maxR, stats)
    : 0

  // crit_bonus is bonus crit CHANCE (shown in the crit% badge), not damage.
  // Actual crit damage bonus = stats.critDamage (flat from equipped items).
  const critDmgBonus = hasCrit ? stats.critDamage : 0

  const computed = attackEffects.map(e => {
    const elem     = WEAPON_ATTACK_STAT[e.stat]!
    const c        = ELEM_COLOR[elem]
    const baseMax  = e.max > 0 ? e.max : e.min
    const low      = stats ? calcDamage(e.min,   elem, stats, weaponPct) : e.min
    const high     = stats ? calcDamage(baseMax, elem, stats, weaponPct) : baseMax
    return { elem, c, low, high, critLow: low + critDmgBonus, critHigh: high + critDmgBonus }
  })

  const totalNormMin = computed.reduce((s, e) => s + e.low,      0)
  const totalNormMax = computed.reduce((s, e) => s + e.high,     0)
  const totalCritMin = computed.reduce((s, e) => s + e.critLow,  0)
  const totalCritMax = computed.reduce((s, e) => s + e.critHigh, 0)

  return (
    <div
      className="rounded-lg p-2.5 flex gap-2.5"
      style={{ background: '#0d1219', border: '1px solid #2a334733' }}
    >
      {/* Weapon image */}
      <div
        className="flex-shrink-0 rounded overflow-hidden flex items-center justify-center"
        style={{ width: 44, height: 44, background: '#0f1623', border: '1px solid #2a334744' }}
      >
        {weapon.image_url
          ? <img src={weapon.image_url} alt="" width={44} height={44} loading="lazy" className="object-contain" />
          : <span className="text-xl" style={{ color: '#4a5580' }}>⚔</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold truncate leading-tight mb-1" style={{ color: '#8090b0' }}>
          {weapon.name}
        </p>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-1">
          {ap > 0 && (
            <span className="text-[10px] font-bold font-mono px-1 rounded" style={{ color: '#c9a84c', background: '#c9a84c18' }}>
              {ap}AP
            </span>
          )}
          <span className="text-[10px] font-mono" style={{ color: '#4a5580' }}>{rangeStr}</span>
          {crit > 0 && (
            <span className="text-[10px]" style={{ color: '#dc4e22' }}>
              {crit}%{critBon > 0 ? ` (+${critBon})` : ''}
            </span>
          )}
        </div>

        {computed.length > 0 ? (
          <div className="space-y-0.5">
            {computed.map(({ c, low, high, critLow, critHigh }, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c }} />
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: c, fontWeight: stats ? 700 : 400 }}>
                    {fmtRange(low, high)}
                  </span>
                </span>
                {hasCrit && (
                  <span className="flex items-center gap-0.5">
                    <span className="text-[9px]" style={{ color: '#c9a84c' }}>✦</span>
                    <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: '#e8a020' }}>
                      {fmtRange(critLow, critHigh)}
                    </span>
                  </span>
                )}
              </div>
            ))}

            {/* Total row for multi-element weapons */}
            {showTotal && (
              <div
                className="flex items-center gap-1.5 mt-0.5 pt-0.5"
                style={{ borderTop: '1px solid #1c2333' }}
              >
                <span className="flex items-center gap-0.5">
                  <span className="text-[9px] font-mono" style={{ color: '#4a5580' }}>Σ</span>
                  <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: '#8090b0' }}>
                    {fmtRange(totalNormMin, totalNormMax)}
                  </span>
                </span>
                {hasCrit && (
                  <span className="flex items-center gap-0.5">
                    <span className="text-[9px]" style={{ color: '#c9a84c' }}>✦</span>
                    <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: '#e8a020' }}>
                      {fmtRange(totalCritMin, totalCritMax)}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="text-[9px] uppercase tracking-wide" style={{ color: '#2a3347' }}>
            {t('spell_support')}
          </span>
        )}
      </div>
    </div>
  )
}

export function SpellsPanel() {
  const { t }         = useTranslation()
  const selectedClass = useBuildStore(s => s.selectedClass)
  const level         = useBuildStore(s => s.level)
  const stats         = useBuildStore(s => s.stats)
  const equipped      = useBuildStore(s => s.equipped)
  const _equipment    = useBuildStore(s => s._equipment)
  const lang          = useDataStore(s => s.lang)
  const loadSpells    = useDataStore(s => s.loadSpells)
  const spells        = useDataStore(s => s.spells)

  const autoGrade                = spellGrade(level)
  const [manualGrade, setManual] = useState<number | null>(null)
  const grade                    = manualGrade ?? autoGrade
  const [elemFilter, setElemFilter] = useState<ElemFilter>('all')

  useEffect(() => { setManual(null) }, [selectedClass])

  useEffect(() => {
    if (selectedClass) loadSpells(lang, selectedClass)
  }, [loadSpells, lang, selectedClass])

  const equippedWeapon = useMemo((): AppItem | null => {
    const weaponId = equipped.weapon
    if (weaponId == null) return null
    return _equipment.find(it => it.ankama_id === weaponId) ?? null
  }, [equipped.weapon, _equipment])

  const classData      = selectedClass ? spells.get(selectedClass) : null
  const commonData     = spells.get('common')
  const allClassSpells = classData?.spells ?? []
  const allCommonSpells = commonData?.spells ?? []

  const normalSpells  = allClassSpells.filter(sp => !sp.is_variant && (elemFilter === 'all' || sp.element === elemFilter))
  const variantSpells = allClassSpells.filter(sp =>  sp.is_variant && (elemFilter === 'all' || sp.element === elemFilter))
  const normalCommon  = allCommonSpells.filter(sp => !sp.is_variant && (elemFilter === 'all' || sp.element === elemFilter))
  const variantCommon = allCommonSpells.filter(sp =>  sp.is_variant && (elemFilter === 'all' || sp.element === elemFilter))

  const ELEM_KEYS: Record<AppSpellElement, string> = {
    earth:   'elem_earth',
    fire:    'elem_fire',
    water:   'elem_water',
    air:     'elem_air',
    neutral: 'elem_neutral',
    mixed:   'elem_mixed',
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-forge-gold text-sm uppercase tracking-widest">
          {t('spells')}
        </h3>

        {/* Grade selector */}
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5,6].map(g => {
            const isAuto   = g === autoGrade && manualGrade == null
            const isActive = g === grade
            return (
              <button
                key={g}
                onClick={() => setManual(g === autoGrade && manualGrade === g ? null : g)}
                title={`${t('spell_grade', { grade: g })}${g === autoGrade ? ' (auto)' : ''}`}
                className="w-5 h-5 rounded text-[10px] font-bold font-mono transition-colors"
                style={{
                  background:  isActive ? '#c9a84c' : isAuto ? '#c9a84c18' : 'transparent',
                  color:       isActive ? '#0f1320' : isAuto ? '#c9a84c' : '#3a4268',
                  border:      isActive ? '1px solid #c9a84c' : '1px solid #2a3347',
                }}
              >{g}</button>
            )
          })}
          {manualGrade != null && (
            <button
              onClick={() => setManual(null)}
              className="ml-0.5 text-[9px] transition-colors"
              style={{ color: '#3a4268' }}
              title="Reset to auto grade"
            >↺</button>
          )}
        </div>
      </div>

      {/* Element filter */}
      <div className="flex flex-wrap gap-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setElemFilter(f)}
            className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors border"
            style={elemFilter === f ? {
              background:  f === 'all' ? '#1c2333' : `${ELEM_COLOR[f as AppSpellElement]}22`,
              borderColor: f === 'all' ? '#4a5268' : ELEM_COLOR[f as AppSpellElement],
              color:       f === 'all' ? '#e8eaf0' : ELEM_COLOR[f as AppSpellElement],
            } : {
              background:  'transparent',
              borderColor: '#2a3347',
              color:       '#3a4268',
            }}
          >
            {f === 'all' ? t('elem_all') : t(ELEM_KEYS[f as AppSpellElement])}
          </button>
        ))}
      </div>

      {/* Stats indicator */}
      {stats && (
        <p className="text-[9px]" style={{ color: '#3a4268' }}>
          ★ {t('spell_calculated')}
        </p>
      )}

      {/* Weapon attack */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: '#3a4a68' }}>
          {t('weapon_attack')}
        </p>
        <WeaponCard weapon={equippedWeapon} stats={stats} />
      </div>

      {/* Class spells */}
      {selectedClass && (
        !classData ? (
          <p className="text-forge-muted text-xs animate-pulse py-2">{t('loading_data')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: '#3a4a68' }}>
                {t('spell_col_normal')}
              </p>
              {normalSpells.length === 0 ? (
                <p className="text-[10px]" style={{ color: '#2a3347' }}>{t('no_spells_filter')}</p>
              ) : normalSpells.map(spell => (
                <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} />
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: '#3a4a68' }}>
                {t('spell_col_variant')}
              </p>
              {variantSpells.length === 0 ? (
                <p className="text-[10px]" style={{ color: '#2a3347' }}>{t('no_spells_filter')}</p>
              ) : variantSpells.map(spell => (
                <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} />
              ))}
            </div>
          </div>
        )
      )}

      {/* Common spells */}
      {commonData && (normalCommon.length > 0 || variantCommon.length > 0) && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-medium pt-1" style={{ color: '#3a4a68', borderTop: '1px solid #1c2333' }}>
            {t('common_spells')}
          </p>
          <div className="grid grid-cols-2 gap-x-3">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: '#2a3a50' }}>
                {t('spell_col_normal')}
              </p>
              {normalCommon.length === 0 ? (
                <p className="text-[10px]" style={{ color: '#2a3347' }}>{t('no_spells_filter')}</p>
              ) : normalCommon.map(spell => (
                <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} />
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: '#2a3a50' }}>
                {t('spell_col_variant')}
              </p>
              {variantCommon.length === 0 ? (
                <p className="text-[10px]" style={{ color: '#2a3347' }}>{t('no_spells_filter')}</p>
              ) : variantCommon.map(spell => (
                <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
