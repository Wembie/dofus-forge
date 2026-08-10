import { useTranslation } from 'react-i18next'
import { CLASS_DATA, ELEMENT_HEX } from './classData.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import type { DofusClass } from '@/engine/types.ts'
import type { Gender } from '@/store/buildStore.ts'

export function ClassPicker() {
  const { t }    = useTranslation()
  const selected = useBuildStore(s => s.selectedClass)
  const setClass = useBuildStore(s => s.setClass)
  const gender   = useBuildStore(s => s.gender)
  const setGender = useBuildStore(s => s.setGender)
  const level    = useBuildStore(s => s.level)
  const setLevel = useBuildStore(s => s.setLevel)

  return (
    <div className="space-y-4">
      <h2 className="font-display text-forge-gold text-sm uppercase tracking-widest">{t('class')}</h2>

      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t('class')}>
        {CLASS_DATA.map(cls => {
          const isSelected = selected === cls.id
          const elemColor  = ELEMENT_HEX[cls.element]
          const portrait   = gender === 'female' ? cls.imageFUrl : cls.imageUrl
          return (
            <button
              key={cls.id}
              onClick={() => setClass(cls.id as DofusClass)}
              role="radio"
              aria-checked={isSelected}
              className="relative flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-gold overflow-hidden"
              style={isSelected ? {
                borderColor: elemColor,
                background:  `linear-gradient(160deg, ${elemColor}22 0%, ${elemColor}08 100%)`,
                boxShadow:   `0 0 12px ${elemColor}30`,
                transform:   'scale(1.04)',
              } : {
                borderColor: 'var(--metal-edge)',
                background:  'color-mix(in srgb, var(--surface-parchment) 50%, transparent)',
              }}
              onMouseEnter={e => {
                if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = `${elemColor}88`
              }}
              onMouseLeave={e => {
                if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--metal-edge)'
              }}
            >
              {isSelected && (
                <div
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ background: elemColor, boxShadow: `0 0 4px ${elemColor}` }}
                />
              )}

              <div
                className="rounded-lg overflow-hidden flex-shrink-0"
                style={{
                  width:      44,
                  height:     44,
                  background: `radial-gradient(ellipse at 50% 30%, ${elemColor}22, transparent 70%)`,
                  border:     isSelected ? `1px solid ${elemColor}55` : '1px solid var(--metal-edge)',
                }}
              >
                <img
                  src={portrait}
                  alt={cls.name}
                  className="w-full h-full object-cover"
                  draggable={false}
                  loading="lazy"
                />
              </div>

              <span
                className="text-[10px] font-medium leading-tight text-center w-full truncate"
                style={{ color: isSelected ? elemColor : 'var(--ink-muted)' }}
              >
                {cls.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Gender toggle */}
      <div className="flex items-center gap-2">
        <span className="text-forge-muted/60 text-xs font-display uppercase tracking-widest">
          {t('gender', 'Genre')}
        </span>
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--metal-edge)' }}>
          {(['male', 'female'] as Gender[]).map(g => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium transition-colors"
              style={gender === g ? {
                background: 'color-mix(in srgb, var(--gold) 13%, transparent)',
                color:      'var(--gold)',
                borderRight: g === 'male' ? '1px solid var(--metal-edge)' : undefined,
              } : {
                background: 'transparent',
                color:      'var(--ink-faint)',
                borderRight: g === 'male' ? '1px solid var(--metal-edge)' : undefined,
              }}
              aria-pressed={gender === g}
            >
              <span>{g === 'male' ? '♂' : '♀'}</span>
              <span className="capitalize">{g === 'male' ? t('gender_male', 'Male') : t('gender_female', 'Female')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Level */}
      <div className="space-y-1.5">
        <h2 className="font-display text-forge-gold text-sm uppercase tracking-widest">{t('level')}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLevel(level - 1)}
            disabled={level <= 1}
            className="w-7 h-7 rounded bg-forge-card border border-forge-border text-forge-muted hover:text-forge-text disabled:opacity-30 transition-colors text-sm font-bold"
            aria-label="Decrease level"
          >−</button>
          <input
            type="number"
            min={1}
            max={200}
            value={level}
            onChange={e => setLevel(Number(e.target.value))}
            className="w-16 text-center bg-forge-surface border border-forge-border rounded text-forge-text text-sm py-1 focus:outline-none focus:border-forge-gold"
            aria-label={t('level')}
          />
          <button
            onClick={() => setLevel(level + 1)}
            disabled={level >= 200}
            className="w-7 h-7 rounded bg-forge-card border border-forge-border text-forge-muted hover:text-forge-text disabled:opacity-30 transition-colors text-sm font-bold"
            aria-label="Increase level"
          >+</button>
          <span className="text-forge-muted text-xs">{t('level_max')}</span>
        </div>
      </div>
    </div>
  )
}
