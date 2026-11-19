import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CLASS_DATA, ELEMENT_HEX } from './classData.ts'
import { useClassName, resolveClassName } from './useClassName.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { DofusClass } from '@/engine/types.ts'
import type { Gender } from '@/store/buildStore.ts'
import { playSelect } from '@/lib/sound.ts'
import './class-picker.css'

export function ClassPicker() {
  const { t, i18n } = useTranslation()
  const selected   = useBuildStore(s => s.selectedClass)
  const setClass   = useBuildStore(s => s.setClass)
  const buildName    = useBuildStore(s => s.buildName)
  const setBuildName = useBuildStore(s => s.setBuildName)
  const gender     = useBuildStore(s => s.gender)
  const setGender  = useBuildStore(s => s.setGender)
  const level      = useBuildStore(s => s.level)
  const setLevel   = useBuildStore(s => s.setLevel)
  const classNames = useDataStore(s => s.classNames)
  const lang       = i18n.language.slice(0, 2)

  const [picking, setPicking] = useState(false)

  // Level input: a plain controlled `value={level}` snaps back to the clamped
  // number on every keystroke (clearing the field to type "20" briefly hits
  // Number('') = 0 -> clamped to 1, so the input re-renders as "1" before you
  // can type the next digit, making "20" impossible to type over "1"). Buffer
  // in local text state while focused instead, only committing (and
  // re-clamping to 1–200) on blur/Enter — same fix as the rune value inputs.
  const [levelDraft, setLevelDraft] = useState(String(level))
  const levelFocused = useRef(false)
  useEffect(() => {
    if (!levelFocused.current) setLevelDraft(String(level))
  }, [level])
  const levelInputProps = {
    type: 'text' as const,
    inputMode: 'numeric' as const,
    value: levelDraft,
    onFocus: () => { levelFocused.current = true },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      if (/^\d{0,3}$/.test(v)) setLevelDraft(v)
    },
    onBlur: () => {
      levelFocused.current = false
      const n = parseInt(levelDraft, 10)
      if (Number.isFinite(n)) {
        setLevel(n)
        setLevelDraft(String(Math.max(1, Math.min(200, n))))
      } else {
        setLevelDraft(String(level))
      }
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') e.currentTarget.blur()
    },
  }

  const classInfo     = selected ? CLASS_DATA.find(c => c.id === selected) : null
  const selectedName  = useClassName(selected)
  const portrait      = classInfo ? (gender === 'female' ? classInfo.imageFUrl : classInfo.imageUrl) : null
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
            <img src={portrait!} alt={selectedName} className="w-full h-full object-cover" draggable={false} />
          </div>

          {/* Name + element */}
          <div className="flex-1 min-w-0 relative z-10">
            <div className="font-display font-bold text-sm tracking-wide truncate" style={{ color: elemColor }}>
              {selectedName}
            </div>
            <div className="text-[10px] uppercase tracking-[0.14em] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              {t(`elem_${classInfo.element}`)}
            </div>
            <input
              type="text"
              value={buildName}
              onChange={e => setBuildName(e.target.value)}
              placeholder={t('build_name_placeholder')}
              maxLength={60}
              aria-label={t('build_name_label')}
              className="w-full bg-transparent text-[12px] mt-1 focus:outline-none border-b truncate"
              style={{ color: 'var(--ink)', borderColor: 'transparent', padding: '1px 0' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}
              onBlur={e =>  (e.currentTarget.style.borderColor = 'transparent')}
            />
          </div>

          {/* Change button */}
          <button
            onClick={() => setPicking(true)}
            className="relative z-10 text-[10px] uppercase tracking-widest font-display px-2.5 py-1 rounded transition-all"
            style={{
              background: 'color-mix(in srgb, var(--gold) 8%, transparent)',
              border: '1px solid var(--gold-deep)',
              color: 'var(--gold-muted)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gold)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold-deep)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gold-deep)' }}
          >
            {t('change')}
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
              {...levelInputProps}
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
    <div className="cp">
      <div className="cp-head">
        <div>
          <p className="cp-eyebrow">{t('class')}</p>
          <h2>{t('class_pick_title')}</h2>
          {!selected && <p>{t('class_pick_intro')}</p>}
        </div>
        {picking && (
          <button type="button" className="cp-cancel" onClick={() => setPicking(false)}>{t('cancel', 'Cancel')}</button>
        )}
      </div>

      <div className="cp-grid" role="radiogroup" aria-label={t('class')}>
        {CLASS_DATA.map(cls => {
          const isSelected = selected === cls.id
          const img = gender === 'female' ? cls.imageFUrl : cls.imageUrl
          return (
            <button
              key={cls.id}
              type="button"
              onClick={() => { setClass(cls.id as DofusClass); setPicking(false); playSelect() }}
              role="radio"
              aria-checked={isSelected}
              className="cp-class"
              style={{ '--cp-element': ELEMENT_HEX[cls.element] } as React.CSSProperties}
            >
              <img src={img} alt="" draggable={false} loading="lazy" />
              <span>{resolveClassName(cls.id, lang, classNames)}</span>
            </button>
          )
        })}
      </div>

      {!selected && (
        <div className="cp-options">
          <div className="cp-option">
            <span>{t('gender')}</span>
            <div className="cp-segment" role="group" aria-label={t('gender')}>
              {(['male', 'female'] as Gender[]).map(g => (
                <button key={g} type="button" onClick={() => setGender(g)} aria-pressed={gender === g}>
                  {g === 'male' ? t('gender_male', 'Male') : t('gender_female', 'Female')}
                </button>
              ))}
            </div>
          </div>
          <div className="cp-option">
            <span>{t('level')}</span>
            <div className="cp-stepper">
              <button type="button" onClick={() => setLevel(level - 1)} disabled={level <= 1} aria-label={t('level_decrease')}>−</button>
              <input {...levelInputProps} aria-label={t('level')} />
              <button type="button" onClick={() => setLevel(level + 1)} disabled={level >= 200} aria-label={t('level_increase')}>+</button>
              <small>{t('level_max')}</small>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
