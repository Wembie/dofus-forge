import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { AppSpell, AppSpellElement } from '@/data/spellLoaders.ts'
import { calcEffects } from './spellDamage.ts'
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

type ElemFilter = AppSpellElement | 'all'
const FILTERS: ElemFilter[] = ['all', 'earth', 'fire', 'water', 'air', 'neutral']

function SpellCard({ spell, grade, stats }: { spell: AppSpell; grade: number; stats: StatBlock | null }) {
  const { t }    = useTranslation()
  const lvl      = spell.levels.find(l => l.grade === grade) ?? spell.levels.at(-1)
  const color    = ELEM_COLOR[spell.element]
  const showCalc = Boolean(stats)

  const displayEffects = useMemo(() => {
    if (!lvl) return []
    if (stats && lvl.effects.length > 0) return calcEffects(lvl.effects, stats)
    return lvl.effects.map(e => ({ ...e, calcMin: e.min, calcMax: e.max }))
  }, [lvl, stats])

  const rangeStr = !lvl || lvl.maxRange === 0
    ? t('spell_melee')
    : lvl.minRange === lvl.maxRange
      ? `${lvl.maxRange}`
      : `${lvl.minRange}–${lvl.maxRange}`

  return (
    <div
      className="rounded-lg p-2.5 flex gap-2.5"
      style={{
        background:  '#0d1219',
        border:      `1px solid ${color}22`,
      }}
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
          ? <img
              src={spell.image_url}
              alt=""
              width={44}
              height={44}
              loading="lazy"
              className="object-contain"
            />
          : <span className="text-xl" style={{ color }}>✦</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <p
          className="text-[11px] font-semibold truncate leading-tight mb-1"
          style={{ color }}
        >
          {spell.name}
        </p>

        {/* Stats row */}
        {lvl && (
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-1">
            <span
              className="text-[10px] font-bold font-mono px-1 rounded"
              style={{ color: '#c9a84c', background: '#c9a84c18' }}
            >{lvl.ap}AP</span>

            <span className="text-[10px] font-mono" style={{ color: '#4a5580' }}>
              {rangeStr}
            </span>

            {lvl.critChance > 0 && (
              <span className="text-[10px]" style={{ color: '#dc4e22' }}>
                {lvl.critChance}%
              </span>
            )}

            {lvl.maxPerTurn > 0 && (
              <span className="text-[10px]" style={{ color: '#3a4a68' }}>
                {t('spell_max_per_turn', { count: lvl.maxPerTurn })}
              </span>
            )}
          </div>
        )}

        {/* Damage effects */}
        {displayEffects.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {displayEffects.map((e, i) => {
              const c   = ELEM_COLOR[e.element]
              const dmg = e.calcMin === e.calcMax ? String(e.calcMin) : `${e.calcMin}–${e.calcMax}`
              return (
                <span key={i} className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c }} />
                  <span
                    className="text-[10px] font-mono tabular-nums"
                    style={{ color: c, fontWeight: showCalc ? 700 : 400 }}
                  >{dmg}</span>
                </span>
              )
            })}
          </div>
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

  if (!selectedClass) return null

  const data     = spells.get(selectedClass)
  const allSpells = data?.spells ?? []

  const normalSpells  = allSpells.filter(sp => !sp.is_variant && (elemFilter === 'all' || sp.element === elemFilter))
  const variantSpells = allSpells.filter(sp =>  sp.is_variant && (elemFilter === 'all' || sp.element === elemFilter))

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

      {/* Two-column spell grid */}
      {!data ? (
        <p className="text-forge-muted text-xs animate-pulse py-2">{t('loading_data')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3">
          {/* Left: Normal spells */}
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

          {/* Right: Variant spells */}
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
      )}
    </div>
  )
}
