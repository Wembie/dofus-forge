import { CLASS_DATA, ELEMENT_COLORS } from './classData.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import type { DofusClass } from '@/engine/types.ts'

export function ClassPicker() {
  const selected    = useBuildStore(s => s.selectedClass)
  const setClass    = useBuildStore(s => s.setClass)
  const level       = useBuildStore(s => s.level)
  const setLevel    = useBuildStore(s => s.setLevel)

  return (
    <div className="space-y-4">
      <h2 className="font-display text-forge-gold text-sm uppercase tracking-widest">Class</h2>

      <div className="grid grid-cols-3 gap-1.5">
        {CLASS_DATA.map(cls => {
          const isSelected = selected === cls.id
          const colors     = ELEMENT_COLORS[cls.element]
          return (
            <button
              key={cls.id}
              onClick={() => setClass(cls.id as DofusClass)}
              className={[
                'relative flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all duration-150',
                'text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-gold',
                isSelected
                  ? `${colors} bg-forge-card shadow-lg scale-[1.03]`
                  : 'border-forge-border text-forge-muted hover:border-forge-gold/40 hover:text-forge-text bg-forge-surface',
              ].join(' ')}
              aria-pressed={isSelected}
            >
              <span className="text-lg leading-none select-none" aria-hidden>{cls.icon}</span>
              <span className="leading-tight text-center">{cls.name}</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-1.5">
        <h2 className="font-display text-forge-gold text-sm uppercase tracking-widest">Level</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLevel(level - 1)}
            disabled={level <= 1}
            className="w-7 h-7 rounded bg-forge-card border border-forge-border text-forge-muted hover:text-forge-text disabled:opacity-30 transition-colors"
            aria-label="Decrease level"
          >−</button>
          <input
            type="number"
            min={1}
            max={200}
            value={level}
            onChange={e => setLevel(Number(e.target.value))}
            className="w-16 text-center bg-forge-surface border border-forge-border rounded text-forge-text text-sm py-1 focus:outline-none focus:border-forge-gold"
            aria-label="Character level"
          />
          <button
            onClick={() => setLevel(level + 1)}
            disabled={level >= 200}
            className="w-7 h-7 rounded bg-forge-card border border-forge-border text-forge-muted hover:text-forge-text disabled:opacity-30 transition-colors"
            aria-label="Increase level"
          >+</button>
          <span className="text-forge-muted text-xs">/ 200</span>
        </div>
      </div>
    </div>
  )
}
