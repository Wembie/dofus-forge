import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sword } from 'lucide-react'
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
  earth:   'var(--earth)',
  fire:    'var(--fire)',
  water:   'var(--water)',
  air:     'var(--air)',
  neutral: 'var(--neutral)',
  mixed:   'var(--gold)',
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
      style={{ background: 'var(--surface-void)', border: `1px solid color-mix(in srgb, ${color} 13%, transparent)` }}
    >
      <div
        className="flex-shrink-0 rounded overflow-hidden flex items-center justify-center"
        style={{
          width: 44, height: 44,
          background: 'linear-gradient(145deg, var(--surface-parchment), var(--surface-void))',
          border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        }}
      >
        {spell.image_url
          ? <img src={spell.image_url} alt="" width={44} height={44} loading="lazy" className="object-contain" />
          : <span className="text-xl" style={{ color }}>✦</span>
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold truncate leading-tight mb-1" style={{ color }}>
          {spell.name}
        </p>

        {lvl && (
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-1">
            <span
              className="text-[10px] font-bold font-mono px-1 rounded"
              style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)' }}
            >{lvl.ap}AP</span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>{rangeStr}</span>
            {lvl.critChance > 0 && (
              <span className="text-[10px]" style={{ color: 'var(--crit)' }}>{lvl.critChance}%</span>
            )}
            {lvl.maxPerTurn > 0 && (
              <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
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
                    <span className="text-[10px] font-mono" style={{ color: 'var(--ink-muted)' }}>
                      {t('spell_push', { cells: e.calcMin })}
                    </span>
                    {pushDmg > 0 && (
                      <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: 'var(--ink-muted)' }}>
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
                  <span key={i} className="text-[10px] font-mono block" style={{ color: 'var(--gold)' }}>{label}</span>
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
                      <span className="text-[9px]" style={{ color: 'var(--gold)' }}>✦</span>
                      <span
                        className="text-[10px] font-mono tabular-nums font-bold"
                        style={{ color: 'var(--crit)' }}
                      >{fmtRange(critE.calcMin, critE.calcMax)}</span>
                    </span>
                  )}
                </div>
              )
            })}

            {showTotal && (
              <div
                className="flex items-center gap-1.5 mt-0.5 pt-0.5"
                style={{ borderTop: '1px solid var(--metal-edge)' }}
              >
                <span className="flex items-center gap-0.5">
                  <span className="text-[9px] font-mono" style={{ color: 'var(--ink-faint)' }}>Σ</span>
                  <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: 'var(--ink-muted)' }}>
                    {fmtRange(
                      damageEffects.reduce((s, e) => s + e.calcMin, 0) + pushDmg,
                      damageEffects.reduce((s, e) => s + e.calcMax, 0) + pushDmg,
                    )}
                  </span>
                </span>
                {hasCrit && critDmgEffects.length >= 1 && (
                  <span className="flex items-center gap-0.5">
                    <span className="text-[9px]" style={{ color: 'var(--gold)' }}>✦</span>
                    <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: 'var(--crit)' }}>
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
          <span className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--ink-faint)' }}>
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
        style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
      >
        <div
          className="flex-shrink-0 rounded flex items-center justify-center"
          style={{ width: 44, height: 44, background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)' }}
        >
          <Sword size={20} style={{ color: 'var(--ink-faint)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate leading-tight mb-1" style={{ color: 'var(--ink-faint)' }}>
            {t('weapon_fist')}
          </p>
          <div className="flex items-center gap-x-2">
            <span className="text-[10px] font-bold font-mono px-1 rounded" style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)' }}>1AP</span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>{t('spell_melee')}</span>
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

  const weaponPct = stats
    ? stats.weaponDamagePercent + rangePct(minR, maxR, stats)
    : 0

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
      style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
    >
      <div
        className="flex-shrink-0 rounded overflow-hidden flex items-center justify-center"
        style={{ width: 44, height: 44, background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)' }}
      >
        {weapon.image_url
          ? <img src={weapon.image_url} alt="" width={44} height={44} loading="lazy" className="object-contain" />
          : <Sword size={20} style={{ color: 'var(--ink-faint)' }} />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold truncate leading-tight mb-1" style={{ color: 'var(--ink-muted)' }}>
          {weapon.name}
        </p>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-1">
          {ap > 0 && (
            <span className="text-[10px] font-bold font-mono px-1 rounded" style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)' }}>
              {ap}AP
            </span>
          )}
          <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>{rangeStr}</span>
          {crit > 0 && (
            <span className="text-[10px]" style={{ color: 'var(--crit)' }}>
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
                    <span className="text-[9px]" style={{ color: 'var(--gold)' }}>✦</span>
                    <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: 'var(--crit)' }}>
                      {fmtRange(critLow, critHigh)}
                    </span>
                  </span>
                )}
              </div>
            ))}

            {showTotal && (
              <div
                className="flex items-center gap-1.5 mt-0.5 pt-0.5"
                style={{ borderTop: '1px solid var(--metal-edge)' }}
              >
                <span className="flex items-center gap-0.5">
                  <span className="text-[9px] font-mono" style={{ color: 'var(--ink-faint)' }}>Σ</span>
                  <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: 'var(--ink-muted)' }}>
                    {fmtRange(totalNormMin, totalNormMax)}
                  </span>
                </span>
                {hasCrit && (
                  <span className="flex items-center gap-0.5">
                    <span className="text-[9px]" style={{ color: 'var(--gold)' }}>✦</span>
                    <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: 'var(--crit)' }}>
                      {fmtRange(totalCritMin, totalCritMax)}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--ink-faint)' }}>
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
                  background:  isActive ? 'var(--gold)' : isAuto ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
                  color:       isActive ? 'var(--ink-invert)' : isAuto ? 'var(--gold)' : 'var(--ink-faint)',
                  border:      isActive ? '1px solid var(--gold)' : '1px solid var(--metal-edge)',
                }}
              >{g}</button>
            )
          })}
          {manualGrade != null && (
            <button
              onClick={() => setManual(null)}
              className="ml-0.5 text-[9px] transition-colors"
              style={{ color: 'var(--ink-faint)' }}
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
              background:  f === 'all' ? 'var(--metal-edge)' : `color-mix(in srgb, ${ELEM_COLOR[f as AppSpellElement]} 13%, transparent)`,
              borderColor: f === 'all' ? 'var(--ink-muted)' : ELEM_COLOR[f as AppSpellElement],
              color:       f === 'all' ? 'var(--ink)' : ELEM_COLOR[f as AppSpellElement],
            } : {
              background:  'transparent',
              borderColor: 'var(--metal-edge)',
              color:       'var(--ink-faint)',
            }}
          >
            {f === 'all' ? t('elem_all') : t(ELEM_KEYS[f as AppSpellElement])}
          </button>
        ))}
      </div>

      {stats && (
        <p className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>
          ★ {t('spell_calculated')}
        </p>
      )}

      {/* Weapon attack */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--ink-muted)' }}>
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
              <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--ink-muted)' }}>
                {t('spell_col_normal')}
              </p>
              {normalSpells.length === 0 ? (
                <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('no_spells_filter')}</p>
              ) : normalSpells.map(spell => (
                <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} />
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--ink-muted)' }}>
                {t('spell_col_variant')}
              </p>
              {variantSpells.length === 0 ? (
                <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('no_spells_filter')}</p>
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
          <p className="text-[10px] uppercase tracking-widest font-medium pt-1" style={{ color: 'var(--ink-muted)', borderTop: '1px solid var(--metal-edge)' }}>
            {t('common_spells')}
          </p>
          <div className="grid grid-cols-2 gap-x-3">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--ink-faint)' }}>
                {t('spell_col_normal')}
              </p>
              {normalCommon.length === 0 ? (
                <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('no_spells_filter')}</p>
              ) : normalCommon.map(spell => (
                <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} />
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--ink-faint)' }}>
                {t('spell_col_variant')}
              </p>
              {variantCommon.length === 0 ? (
                <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('no_spells_filter')}</p>
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
