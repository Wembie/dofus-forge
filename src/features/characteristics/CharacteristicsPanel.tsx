import { useBuildStore } from '@/store/buildStore.ts'
import { pointCost, statBudget, SCROLL_BONUS } from '@/engine/characteristics.ts'
import { CHARACTERISTICS, type Characteristic } from '@/engine/types.ts'

const CHAR_LABELS: Record<Characteristic, string> = {
  vitality:     'Vitality',
  wisdom:       'Wisdom',
  strength:     'Strength',
  intelligence: 'Intelligence',
  chance:       'Chance',
  agility:      'Agility',
}

const CHAR_COLORS: Record<Characteristic, string> = {
  vitality:     'text-red-400',
  wisdom:       'text-violet-400',
  strength:     'text-forge-earth',
  intelligence: 'text-forge-fire',
  chance:       'text-forge-water',
  agility:      'text-forge-air',
}

export function CharacteristicsPanel() {
  const level       = useBuildStore(s => s.level)
  const allocated   = useBuildStore(s => s.allocated)
  const scrolled    = useBuildStore(s => s.scrolled)
  const addPoint    = useBuildStore(s => s.addPoint)
  const removePoint = useBuildStore(s => s.removePoint)
  const toggleScroll= useBuildStore(s => s.toggleScroll)

  const budget = statBudget(level)
  const spent  = CHARACTERISTICS.reduce((acc, c) => acc + pointCost(c, allocated[c]), 0)
  const remaining = budget - spent

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-forge-gold text-sm uppercase tracking-widest">Characteristics</h2>
        <span className={`text-xs font-mono ${remaining < 0 ? 'text-red-400' : 'text-forge-muted'}`}>
          {spent} / {budget} pts
        </span>
      </div>

      <div className="space-y-1">
        {CHARACTERISTICS.map(char => {
          const points  = allocated[char]
          const isScrolled = scrolled[char]
          const total   = points + (isScrolled ? SCROLL_BONUS : 0)
          const nextCost = pointCost(char, points + 1) - pointCost(char, points)
          const canAdd  = remaining >= nextCost

          return (
            <div key={char} className="flex items-center gap-1.5 group">
              {/* Scroll toggle */}
              <button
                onClick={() => toggleScroll(char)}
                title={`${isScrolled ? 'Remove' : 'Add'} scroll (+${SCROLL_BONUS})`}
                className={[
                  'w-4 h-4 rounded-sm border text-[9px] flex items-center justify-center flex-shrink-0 transition-all',
                  isScrolled
                    ? 'border-forge-gold bg-forge-gold text-forge-bg'
                    : 'border-forge-border text-forge-border hover:border-forge-gold/50',
                ].join(' ')}
                aria-label={`Scroll ${CHAR_LABELS[char]}`}
                aria-pressed={isScrolled}
              >S</button>

              {/* Label */}
              <span className={`w-24 text-xs ${CHAR_COLORS[char]} truncate`}>
                {CHAR_LABELS[char]}
              </span>

              {/* − button */}
              <button
                onClick={() => removePoint(char)}
                disabled={points <= 0}
                className="w-5 h-5 rounded text-xs bg-forge-card border border-forge-border text-forge-muted hover:text-forge-text disabled:opacity-30 transition-colors flex items-center justify-center"
                aria-label={`Remove ${CHAR_LABELS[char]} point`}
              >−</button>

              {/* Value */}
              <span className={`w-10 text-center text-sm font-mono font-semibold ${CHAR_COLORS[char]}`}>
                {total}
              </span>

              {/* + button */}
              <button
                onClick={() => addPoint(char)}
                disabled={!canAdd}
                className="w-5 h-5 rounded text-xs bg-forge-card border border-forge-border text-forge-muted hover:text-forge-text disabled:opacity-30 transition-colors flex items-center justify-center"
                aria-label={`Add ${CHAR_LABELS[char]} point`}
              >+</button>

              {/* Cost hint */}
              <span className="text-[10px] text-forge-muted/60 opacity-0 group-hover:opacity-100 transition-opacity">
                {nextCost}pt
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
