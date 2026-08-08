import { useEffect, useState } from 'react'
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

const ELEM_LABEL: Record<AppSpellElement, string> = {
  earth:   'Earth',
  fire:    'Fire',
  water:   'Water',
  air:     'Air',
  neutral: 'Neutral',
  mixed:   'Mixed',
}

type ElemFilter = AppSpellElement | 'all'
const FILTERS: ElemFilter[] = ['all', 'earth', 'fire', 'water', 'air', 'neutral', 'mixed']

function EffectLine({
  calcMin, calcMax, element, showCalc,
}: { calcMin: number; calcMax: number; element: Exclude<AppSpellElement, 'mixed'>; showCalc: boolean }) {
  const color = ELEM_COLOR[element]
  const dmg   = calcMin === calcMax ? String(calcMin) : `${calcMin}–${calcMax}`
  return (
    <span className="flex items-center gap-1 text-[10px]" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className={showCalc ? 'font-bold' : ''}>{dmg}</span>
    </span>
  )
}

function SpellRow({ spell, grade, stats }: { spell: AppSpell; grade: number; stats: StatBlock | null }) {
  const [open, setOpen] = useState(false)
  const lvl   = spell.levels.find(l => l.grade === grade) ?? spell.levels.at(-1)
  const color = ELEM_COLOR[spell.element]

  const rangeStr = !lvl || lvl.maxRange === 0
    ? 'Melee'
    : lvl.minRange === lvl.maxRange
      ? `${lvl.maxRange}`
      : `${lvl.minRange}–${lvl.maxRange}`

  const hasEffects = lvl && lvl.effects.length > 0

  // Compute effects: either calculated (with stats) or raw
  const displayEffects = lvl ? (
    stats && lvl.effects.length > 0
      ? calcEffects(lvl.effects, stats)
      : lvl.effects.map(e => ({ ...e, calcMin: e.min, calcMax: e.max }))
  ) : []

  const showCalc = Boolean(stats)

  // Quick preview: top 2 effects inline in row
  const preview = displayEffects.slice(0, 2)

  return (
    <li>
      <button
        className="w-full text-left transition-colors"
        onClick={() => hasEffects && setOpen(o => !o)}
        style={{ cursor: hasEffects ? 'pointer' : 'default' }}
      >
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
          style={{
            background: open ? `${color}10` : 'transparent',
            borderLeft: open ? `2px solid ${color}` : '2px solid transparent',
          }}
          onMouseEnter={e => {
            if (!open) (e.currentTarget as HTMLDivElement).style.background = '#1c2333'
          }}
          onMouseLeave={e => {
            if (!open) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
          }}
        >
          {/* Element dot */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: color, boxShadow: `0 0 4px ${color}88` }}
          />

          {/* Name */}
          <span className="flex-1 text-[11px] text-forge-text truncate font-medium">
            {spell.name}
          </span>

          {/* Inline damage preview */}
          {!open && preview.length > 0 && (
            <span className="flex items-center gap-1.5 flex-shrink-0">
              {preview.map((e, i) => (
                <EffectLine key={i} {...e} showCalc={showCalc} />
              ))}
            </span>
          )}

          {/* AP badge */}
          {lvl && (
            <span
              className="text-[10px] font-bold font-mono flex-shrink-0 px-1 rounded"
              style={{ color: '#c9a84c', background: '#c9a84c18' }}
            >
              {lvl.ap}AP
            </span>
          )}

          {/* Range */}
          <span className="text-[10px] flex-shrink-0" style={{ color: '#4a5268', minWidth: 32, textAlign: 'right' }}>
            {rangeStr}
          </span>

          {/* Crit */}
          {lvl && lvl.critChance > 0 && (
            <span className="text-[10px] flex-shrink-0" style={{ color: '#dc4e22' }}>
              {lvl.critChance}%
            </span>
          )}

          {/* Expand arrow */}
          {hasEffects && (
            <span className="text-[9px] flex-shrink-0" style={{ color: '#3a4268' }}>
              {open ? '▲' : '▼'}
            </span>
          )}
        </div>
      </button>

      {/* Expanded effects */}
      {open && lvl && (
        <div className="px-4 pb-2 space-y-1">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {displayEffects.map((e, i) => (
              <EffectLine key={i} {...e} showCalc={showCalc} />
            ))}
          </div>
          {showCalc && (
            <p className="text-[9px]" style={{ color: '#3a4268' }}>
              ★ Calculated with your stats
            </p>
          )}
          {lvl.maxPerTurn > 0 && (
            <p className="text-[9px]" style={{ color: '#3a4268' }}>
              Max {lvl.maxPerTurn}× / turn
            </p>
          )}
        </div>
      )}
    </li>
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

  const autoGrade               = spellGrade(level)
  const [manualGrade, setManual] = useState<number | null>(null)
  const grade                   = manualGrade ?? autoGrade
  const [elemFilter, setElemFilter] = useState<ElemFilter>('all')

  // Reset manual grade when class changes
  useEffect(() => { setManual(null) }, [selectedClass])

  useEffect(() => {
    if (selectedClass) loadSpells(lang, selectedClass)
  }, [loadSpells, lang, selectedClass])

  if (!selectedClass) return null

  const data     = spells.get(selectedClass)
  const filtered = data?.spells.filter(sp =>
    elemFilter === 'all' || sp.element === elemFilter
  ) ?? []

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-forge-gold text-sm uppercase tracking-widest">
          {t('spells')}
        </h3>

        {/* Grade selector: 1-6 buttons */}
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5,6].map(g => {
            const isAuto   = g === autoGrade && manualGrade == null
            const isActive = g === grade
            return (
              <button
                key={g}
                onClick={() => setManual(g === autoGrade && manualGrade === g ? null : g)}
                title={`Grade ${g}${g === autoGrade ? ' (auto)' : ''}`}
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
            {f === 'all' ? 'All' : ELEM_LABEL[f as AppSpellElement]}
          </button>
        ))}
      </div>

      {/* Stats indicator */}
      {stats && (
        <p className="text-[9px]" style={{ color: '#3a4268' }}>
          ★ Dmg calculated · STR {stats.strength} / INT {stats.intelligence} / CHA {stats.chance} / AGI {stats.agility}
        </p>
      )}

      {/* Spell list */}
      {!data ? (
        <p className="text-forge-muted text-xs animate-pulse py-2">{t('loading_data')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-[11px] py-2" style={{ color: '#3a4268' }}>No spells for this filter.</p>
      ) : (
        <ul className="max-h-[320px] overflow-y-auto space-y-px pr-0.5">
          {filtered.map(spell => (
            <SpellRow key={spell.id} spell={spell} grade={grade} stats={stats} />
          ))}
        </ul>
      )}
    </div>
  )
}
