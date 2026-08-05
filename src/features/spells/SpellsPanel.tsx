import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { AppSpellElement } from '@/data/spellLoaders.ts'

function spellGrade(level: number): number {
  if (level >= 200) return 6
  if (level >= 150) return 5
  if (level >= 125) return 4
  if (level >= 100) return 3
  if (level >= 50)  return 2
  return 1
}

const ELEM_DOT: Record<AppSpellElement, string> = {
  earth:   'bg-forge-earth',
  fire:    'bg-forge-fire',
  water:   'bg-forge-water',
  air:     'bg-forge-air',
  neutral: 'bg-forge-neutral',
  mixed:   'bg-forge-gold',
}

export function SpellsPanel() {
  const { t }         = useTranslation()
  const selectedClass = useBuildStore(s => s.selectedClass)
  const level         = useBuildStore(s => s.level)
  const lang          = useDataStore(s => s.lang)
  const loadSpells    = useDataStore(s => s.loadSpells)
  const spells        = useDataStore(s => s.spells)

  useEffect(() => {
    if (selectedClass) loadSpells(lang, selectedClass)
  }, [loadSpells, lang, selectedClass])

  if (!selectedClass) return null

  const data  = spells.get(selectedClass)
  const grade = spellGrade(level)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-forge-gold font-bold text-sm">{t('spells')}</h3>
        <span className="text-[10px] text-forge-muted border border-forge-border rounded px-1.5 py-0.5">
          {t('spell_grade', { grade })}
        </span>
      </div>

      {!data ? (
        <p className="text-forge-muted text-xs animate-pulse">{t('loading_data')}</p>
      ) : (
        <ul className="max-h-[300px] overflow-y-auto space-y-px">
          {data.spells.map(spell => {
            const lvl = spell.levels.find(l => l.grade === grade) ?? spell.levels.at(-1)
            const rangeStr = !lvl || lvl.maxRange === 0 ? '' :
              lvl.minRange === lvl.maxRange ? `${lvl.maxRange}` :
              `${lvl.minRange}–${lvl.maxRange}`

            return (
              <li
                key={spell.id}
                className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-forge-card text-[11px]"
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ELEM_DOT[spell.element]}`} />
                <span className="flex-1 text-forge-text truncate">{spell.name}</span>
                {lvl && (
                  <>
                    <span className="text-forge-muted flex-shrink-0">{lvl.ap}AP</span>
                    {rangeStr && (
                      <span className="text-forge-muted/60 flex-shrink-0 text-[10px]">{rangeStr}</span>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
