import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CLASS_DATA, ELEMENT_HEX } from './classData.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import type { DofusClass } from '@/engine/types.ts'
import type { Gender } from '@/store/buildStore.ts'

export function ClassPicker() {
  const { t }      = useTranslation()
  const selected   = useBuildStore(s => s.selectedClass)
  const setClass   = useBuildStore(s => s.setClass)
  const gender     = useBuildStore(s => s.gender)
  const setGender  = useBuildStore(s => s.setGender)
  const level      = useBuildStore(s => s.level)
  const setLevel   = useBuildStore(s => s.setLevel)

  const [picking, setPicking] = useState(false)

  const classInfo  = selected ? CLASS_DATA.find(c => c.id === selected) : null
  const portrait   = classInfo ? (gender === 'female' ? classInfo.imageFUrl : classInfo.imageUrl) : null
  const elemColor  = classInfo ? ELEMENT_HEX[classInfo.element] : 'var(--gold)'

  const btnStyle: React.CSSProperties = {
    background: 'var(--surface-stone)',
    border: '1px solid var(--metal-edge)',
    color: 'var(--ink-muted)',
    borderRadius: 4,
    width: 26, height: 26,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 14, cursor: 'pointer', flexShrink: 0,
    transition: 'border-color 0.1s',
  }

  // ── Selected class compact header ─────────────────────────────────────────
  if (classInfo && !picking) {
    return (
      <div className="space-y-3">
        {/* Selected class card */}
        <div
          className="flex items-center gap-3 p-2 rounded-xl relative overflow-hidden"
          style={{
            background:  `linear-gradient(135deg, color-mix(in srgb, ${elemColor} 10%, var(--surface-panel)), var(--surface-void))`,
            borderTop:   `2px solid color-mix(in srgb, ${elemColor} 55%, transparent)`,
            borderRight: '1px solid var(--metal-edge)',
            borderBottom:'1px solid var(--metal-edge)',
            borderLeft:  '1px solid var(--metal-edge)',
            boxShadow:   `0 0 20px color-mix(in srgb, ${elemColor} 12%, transparent), var(--inset-bevel)`,
          }}
        >
          {/* Element bloom */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `radial-gradient(ellipse at 30% 50%, color-mix(in srgb, ${elemColor} 8%, transparent) 0%, transparent 65%)`,
          }} />

          {/* Portrait */}
          <div
            className="rounded-lg overflow-hidden flex-shrink-0 relative z-10"
            style={{
              width: 52, height: 52,
              border: `1.5px solid color-mix(in srgb, ${elemColor} 50%, transparent)`,
              boxShadow: `0 0 14px color-mix(in srgb, ${elemColor} 30%, transparent)`,
              background: 'var(--surface-panel)',
            }}
          >
            <img src={portrait!} alt={classInfo.name} className="w-full h-full object-cover" draggable={false} />
          </div>

          {/* Name + element */}
          <div className="flex-1 min-w-0 relative z-10">
            <div className="font-display font-bold text-sm tracking-wide truncate" style={{ color: elemColor }}>
              {classInfo.name}
            </div>
            <div className="text-[10px] uppercase tracking-[0.14em] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              {classInfo.element}
            </div>
          </div>

          {/* Change button */}
          <button
            onClick={() => setPicking(true)}
            className="relative z-10 text-[10px] uppercase tracking-widest font-display px-2.5 py-1 rounded transition-all"
            style={{
              background: 'color-mix(in srgb, var(--gold) 8%, transparent)',
              border: '1px solid var(--gold-deep)',
              color: 'var(--gold-deep)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gold)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold-deep)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gold-deep)' }}
          >
            {t('change', 'Change')}
          </button>
        </div>

        {/* Gender + Level inline */}
        <div className="flex items-center gap-3">
          {/* Gender */}
          <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--metal-edge)', flexShrink: 0 }}>
            {(['male', 'female'] as Gender[]).map(g => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className="px-2 py-1 text-[11px] font-medium transition-colors"
                style={gender === g ? {
                  background: 'color-mix(in srgb, var(--gold) 14%, transparent)',
                  color:      'var(--gold)',
                  borderRight: g === 'male' ? '1px solid var(--metal-edge)' : undefined,
                } : {
                  background: 'transparent',
                  color:      'var(--ink-faint)',
                  borderRight: g === 'male' ? '1px solid var(--metal-edge)' : undefined,
                }}
                aria-pressed={gender === g}
              >
                {g === 'male' ? '♂' : '♀'}
              </button>
            ))}
          </div>

          {/* Level */}
          <div className="flex items-center gap-1.5 flex-1">
            <button
              onClick={() => setLevel(level - 1)}
              disabled={level <= 1}
              style={btnStyle}
              className="disabled:opacity-30"
              aria-label={t('level_decrease')}
            >−</button>
            <input
              type="number"
              min={1} max={200}
              value={level}
              onChange={e => setLevel(Number(e.target.value))}
              className="text-center text-sm focus:outline-none transition-colors flex-1 min-w-0"
              style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)', borderRadius: 4, padding: '3px 4px' }}
              aria-label={t('level')}
            />
            <button
              onClick={() => setLevel(level + 1)}
              disabled={level >= 200}
              style={btnStyle}
              className="disabled:opacity-30"
              aria-label={t('level_increase')}
            >+</button>
            <span className="text-[9px] font-display uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>
              {t('level')}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ── Class grid (no selection OR picking=true) ──────────────────────────────
  return (
    <div className="space-y-3">
      {picking && (
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
            {t('class')}
          </h2>
          <button
            onClick={() => setPicking(false)}
            className="text-[10px] uppercase tracking-widest font-display px-2 py-0.5 rounded transition-colors"
            style={{ color: 'var(--ink-faint)', border: '1px solid var(--metal-edge)' }}
          >
            {t('cancel', 'Cancel')}
          </button>
        </div>
      )}

      {!picking && (
        <h2 className="font-display text-sm uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
          {t('class')}
        </h2>
      )}

      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t('class')}>
        {CLASS_DATA.map(cls => {
          const isSelected = selected === cls.id
          const color      = ELEMENT_HEX[cls.element]
          const img        = gender === 'female' ? cls.imageFUrl : cls.imageUrl
          return (
            <button
              key={cls.id}
              onClick={() => { setClass(cls.id as DofusClass); setPicking(false) }}
              role="radio"
              aria-checked={isSelected}
              className="relative flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-gold overflow-hidden"
              style={isSelected ? {
                borderColor: color,
                background:  `linear-gradient(160deg, ${color}22 0%, ${color}08 100%)`,
                boxShadow:   `0 0 12px ${color}30`,
                transform:   'scale(1.04)',
              } : {
                borderColor: 'var(--metal-edge)',
                background:  'color-mix(in srgb, var(--surface-parchment) 50%, transparent)',
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.borderColor = `${color}99`
                  el.style.boxShadow   = `0 0 14px ${color}28, inset 0 0 12px ${color}0a`
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.borderColor = 'var(--metal-edge)'
                  el.style.boxShadow   = ''
                }
              }}
            >
              {isSelected && (
                <div
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ background: color, boxShadow: `0 0 4px ${color}` }}
                />
              )}

              <div
                className="rounded-lg overflow-hidden flex-shrink-0"
                style={{
                  width:      44,
                  height:     44,
                  background: `radial-gradient(ellipse at 50% 30%, ${color}22, transparent 70%)`,
                  border:     isSelected ? `1px solid ${color}55` : '1px solid var(--metal-edge)',
                }}
              >
                <img src={img} alt={cls.name} className="w-full h-full object-cover" draggable={false} loading="lazy" />
              </div>

              <span
                className="text-[10px] font-medium leading-tight text-center w-full truncate"
                style={{ color: isSelected ? color : 'var(--ink-muted)' }}
              >
                {cls.name}
              </span>
            </button>
          )
        })}
      </div>

      {!selected && (
        <div className="space-y-3">
          {/* Gender toggle (shown in no-class state) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-display uppercase tracking-widest" style={{ color: 'var(--ink-faint)' }}>
              {t('gender', 'Genre')}
            </span>
            <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--metal-edge)' }}>
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
            <h2 className="font-display text-sm uppercase tracking-widest" style={{ color: 'var(--gold)' }}>{t('level')}</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setLevel(level - 1)} disabled={level <= 1} style={btnStyle} className="disabled:opacity-30" aria-label="Decrease level">−</button>
              <input
                type="number" min={1} max={200} value={level}
                onChange={e => setLevel(Number(e.target.value))}
                className="flex-1 text-center rounded text-sm py-1 focus:outline-none transition-colors"
                style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
                aria-label={t('level')}
              />
              <button onClick={() => setLevel(level + 1)} disabled={level >= 200} style={btnStyle} className="disabled:opacity-30" aria-label="Increase level">+</button>
              <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>{t('level_max')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
