import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Mars, Venus } from 'lucide-react'
import { CLASS_DATA } from './classData.ts'
import { resolveClassName } from './useClassName.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { DofusClass } from '@/engine/types.ts'
import type { Gender } from '@/store/buildStore.ts'
import { playSelect } from '@/lib/sound.ts'
import './class-picker.css'

/** Every class as a slot-like tile; picking one sets it on the build. */
export function ClassGrid({ onPicked }: { onPicked?: () => void }) {
  const { t, i18n } = useTranslation()
  const selected   = useBuildStore(s => s.selectedClass)
  const setClass   = useBuildStore(s => s.setClass)
  const gender     = useBuildStore(s => s.gender)
  const classNames = useDataStore(s => s.classNames)
  const lang       = i18n.language.slice(0, 2)
  return (
    <div className="cp-grid" role="radiogroup" aria-label={t('class')}>
      {CLASS_DATA.map(cls => (
        <button
          key={cls.id}
          type="button"
          onClick={() => { setClass(cls.id as DofusClass); playSelect(); onPicked?.() }}
          role="radio"
          aria-checked={selected === cls.id}
          className="cp-class"
        >
          <span className="cp-portrait">
            <img src={gender === 'female' ? cls.imageFUrl : cls.imageUrl} alt="" width={48} height={48} draggable={false} loading="lazy" />
          </span>
          <span className="cp-name">{resolveClassName(cls.id, lang, classNames)}</span>
        </button>
      ))}
    </div>
  )
}

const GENDER_ICON = { male: Mars, female: Venus } as const

/** Male / female, each with its symbol. `iconOnly` keeps the word as the label. */
export function GenderToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const { t } = useTranslation()
  const gender    = useBuildStore(s => s.gender)
  const setGender = useBuildStore(s => s.setGender)
  return (
    <div className="cp-segment" role="group" aria-label={t('gender')}>
      {(['male', 'female'] as Gender[]).map(g => {
        const Icon = GENDER_ICON[g]
        const label = t(g === 'male' ? 'gender_male' : 'gender_female')
        return (
          <button key={g} type="button" onClick={() => setGender(g)} aria-pressed={gender === g}
            aria-label={iconOnly ? label : undefined} title={iconOnly ? label : undefined}>
            <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
            {!iconOnly && label}
          </button>
        )
      })}
    </div>
  )
}

/** Level 1–200 with − / + and a typed value. */
export function LevelStepper({ showMax = false }: { showMax?: boolean }) {
  const { t } = useTranslation()
  const level    = useBuildStore(s => s.level)
  const setLevel = useBuildStore(s => s.setLevel)

  // A plain controlled `value={level}` snaps back to the clamped number on
  // every keystroke (clearing the field to type "20" briefly hits 0 -> 1), so
  // the text is buffered while focused and committed on blur/Enter.
  const [draft, setDraft] = useState(String(level))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setDraft(String(level))
  }, [level])

  return (
    <div className="cp-stepper">
      <button type="button" onClick={() => setLevel(level - 1)} disabled={level <= 1} aria-label={t('level_decrease')}>−</button>
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        aria-label={t('level')}
        onFocus={() => { focused.current = true }}
        onChange={e => { if (/^\d{0,3}$/.test(e.target.value)) setDraft(e.target.value) }}
        onBlur={() => {
          focused.current = false
          const n = parseInt(draft, 10)
          if (Number.isFinite(n)) {
            setLevel(n)
            setDraft(String(Math.max(1, Math.min(200, n))))
          } else {
            setDraft(String(level))
          }
        }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
      <button type="button" onClick={() => setLevel(level + 1)} disabled={level >= 200} aria-label={t('level_increase')}>+</button>
      {showMax && <small>{t('level_max')}</small>}
    </div>
  )
}

/** First choice of an empty workshop: class, gender and level. */
export function ClassPicker() {
  const { t } = useTranslation()
  return (
    <div className="cp">
      <div className="cp-head">
        <div>
          <p className="cp-eyebrow">{t('class')}</p>
          <h2>{t('class_pick_title')}</h2>
          <p>{t('class_pick_intro')}</p>
        </div>
      </div>
      <ClassGrid />
      <div className="cp-options">
        <div className="cp-option">
          <span>{t('gender')}</span>
          <GenderToggle />
        </div>
        <div className="cp-option">
          <span>{t('level')}</span>
          <LevelStepper showMax />
        </div>
      </div>
    </div>
  )
}
