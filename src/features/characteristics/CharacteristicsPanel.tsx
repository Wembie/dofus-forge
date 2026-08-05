import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { pointCost, statBudget, SCROLL_BONUS } from '@/engine/characteristics.ts'
import { CHARACTERISTICS, type Characteristic } from '@/engine/types.ts'

const BASE = import.meta.env.BASE_URL

const CHAR_COLOR: Record<Characteristic, string> = {
  vitality:     '#e05252',
  wisdom:       '#9b6dff',
  strength:     '#c49a2a',
  intelligence: '#dc4e22',
  chance:       '#2a8fd4',
  agility:      '#6ab04c',
}

const CHAR_LABEL: Record<Characteristic, string> = {
  vitality:     'Vitality',
  wisdom:       'Wisdom',
  strength:     'Strength',
  intelligence: 'Intelligence',
  chance:       'Chance',
  agility:      'Agility',
}

// ── Hold-to-repeat hook ────────────────────────────────────────────────────────
function useHoldRepeat(onAdd: (n: number) => void, onRemove: (n: number) => void) {
  const timerRef    = useRef<ReturnType<typeof setTimeout>>()
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const countRef    = useRef(0)
  const addRef      = useRef(onAdd)
  const removeRef   = useRef(onRemove)
  addRef.current    = onAdd
  removeRef.current = onRemove

  const stop = useCallback(() => {
    clearTimeout(timerRef.current)
    clearInterval(intervalRef.current)
  }, [])

  useEffect(() => stop, [stop])

  const startAdd = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (e.shiftKey)             { addRef.current(5);  return }
    if (e.ctrlKey || e.metaKey) { addRef.current(20); return }
    addRef.current(1)
    countRef.current = 0
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        countRef.current++
        addRef.current(countRef.current >= 15 ? 5 : 1)
      }, 80)
    }, 350)
  }, [])

  const startRemove = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (e.shiftKey)             { removeRef.current(5);  return }
    if (e.ctrlKey || e.metaKey) { removeRef.current(20); return }
    removeRef.current(1)
    countRef.current = 0
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        countRef.current++
        removeRef.current(countRef.current >= 15 ? 5 : 1)
      }, 80)
    }, 350)
  }, [])

  return {
    addProps:    { onMouseDown: startAdd,    onMouseUp: stop, onMouseLeave: stop },
    removeProps: { onMouseDown: startRemove, onMouseUp: stop, onMouseLeave: stop },
  }
}

// ── Characteristic row ────────────────────────────────────────────────────────
type RowProps = {
  char:           Characteristic
  allocated:      number
  isScrolled:     boolean
  remaining:      number
  onAdd:          (n: number) => void
  onRemove:       (n: number) => void
  onToggleScroll: () => void
}

function CharacteristicRow({ char, allocated, isScrolled, remaining, onAdd, onRemove, onToggleScroll }: RowProps) {
  const { t }    = useTranslation()
  const color    = CHAR_COLOR[char]
  const focused  = useRef(false)

  const [inputVal, setInputVal] = useState(String(allocated))

  useEffect(() => {
    if (!focused.current) setInputVal(String(allocated))
  }, [allocated])

  function commitInput(raw: string) {
    const target = Math.max(0, parseInt(raw, 10) || 0)
    if (target > allocated) onAdd(target - allocated)
    else if (target < allocated) onRemove(allocated - target)
    // inputVal will sync via useEffect once allocated updates
  }

  const nextCost = pointCost(char, allocated + 1) - pointCost(char, allocated)
  const canAdd   = remaining >= nextCost

  const { addProps, removeProps } = useHoldRepeat(onAdd, onRemove)

  const btnStyle: React.CSSProperties = {
    background:   '#12172200',
    border:       '1px solid #2a3347',
    color:        '#7a8499',
    borderRadius: 5,
    width:        24,
    height:       24,
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    fontWeight:   700,
    fontSize:     15,
    cursor:       'pointer',
    userSelect:   'none',
    flexShrink:   0,
    lineHeight:   1,
    transition:   'border-color 0.1s, color 0.1s',
  }

  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {/* Real game stat icon */}
      <img
        src={`${BASE}data/stats/${char}.png`}
        alt={CHAR_LABEL[char]}
        className="w-6 h-6 object-contain flex-shrink-0"
        style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
        draggable={false}
      />

      {/* Label */}
      <span
        className="text-xs font-medium flex-shrink-0 select-none"
        style={{ color, minWidth: 74 }}
      >
        {CHAR_LABEL[char]}
      </span>

      {/* ─ Controls ─ */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          {...removeProps}
          disabled={allocated <= 0}
          style={{ ...btnStyle, opacity: allocated <= 0 ? 0.25 : 1 }}
          aria-label={`Remove ${CHAR_LABEL[char]} (shift ×5, ctrl ×20)`}
        >−</button>

        {/* Direct number input */}
        <input
          type="number"
          min={0}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onFocus={e => { focused.current = true; e.target.select() }}
          onBlur={e => { focused.current = false; commitInput(e.target.value) }}
          onKeyDown={e => {
            if (e.key === 'Enter')  { commitInput(inputVal); (e.target as HTMLInputElement).blur() }
            if (e.key === 'Escape') { focused.current = false; setInputVal(String(allocated)) }
          }}
          className="text-center font-mono font-bold text-sm focus:outline-none"
          style={{
            width:      52,
            background: 'transparent',
            border:     '1px solid transparent',
            borderRadius: 4,
            color,
            MozAppearance: 'textfield',
            padding:    '1px 2px',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#2a3347')}
          onMouseLeave={e => { if (!focused.current) e.currentTarget.style.borderColor = 'transparent' }}
          aria-label={`${CHAR_LABEL[char]} points`}
        />

        {isScrolled && (
          <span className="font-mono text-[10px] flex-shrink-0" style={{ color: '#c9a84c', minWidth: 16 }}>
            +{SCROLL_BONUS}
          </span>
        )}

        <button
          {...addProps}
          disabled={!canAdd}
          style={{ ...btnStyle, opacity: !canAdd ? 0.25 : 1 }}
          aria-label={`Add ${CHAR_LABEL[char]} (shift ×5, ctrl ×20)`}
        >+</button>
      </div>

      {/* Scroll toggle */}
      <button
        onClick={onToggleScroll}
        title={t('scroll_title', { bonus: SCROLL_BONUS })}
        className="flex-shrink-0 flex items-center justify-center text-[9px] font-bold transition-all"
        style={isScrolled ? {
          width: 20, height: 20, borderRadius: 4,
          background: '#c9a84c', color: '#0d0f14', border: '1px solid #c9a84c',
        } : {
          width: 20, height: 20, borderRadius: 4,
          background: 'transparent', color: '#3a4060', border: '1px solid #2a3347',
        }}
        aria-pressed={isScrolled}
        aria-label={`${isScrolled ? 'Remove' : 'Apply'} scroll for ${CHAR_LABEL[char]}`}
      >{t('scroll_label')}</button>
    </div>
  )
}

// ── CharacteristicsPanel ──────────────────────────────────────────────────────
export function CharacteristicsPanel() {
  const { t }        = useTranslation()
  const level        = useBuildStore(s => s.level)
  const allocated    = useBuildStore(s => s.allocated)
  const scrolled     = useBuildStore(s => s.scrolled)
  const addPoints    = useBuildStore(s => s.addPoints)
  const removePoints = useBuildStore(s => s.removePoints)
  const toggleScroll = useBuildStore(s => s.toggleScroll)

  const budget    = statBudget(level)
  const spent     = CHARACTERISTICS.reduce((acc, c) => acc + pointCost(c, allocated[c]), 0)
  const remaining = budget - spent
  const pct       = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0

  return (
    <div className="space-y-2.5">
      {/* Header + remaining */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-forge-gold text-sm uppercase tracking-widest">
          {t('characteristics')}
        </h2>
        <span className={`text-xs font-mono tabular-nums ${remaining <= 0 ? 'text-forge-muted/40' : 'text-forge-gold/80'}`}>
          {remaining} <span className="text-forge-muted/50 text-[10px]">/ {budget}</span>
        </span>
      </div>

      {/* Budget progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1c2333' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: remaining === 0
              ? 'linear-gradient(to right, #c9a84c, #e8c87a)'
              : 'linear-gradient(to right, #c9a84c88, #c9a84c)',
          }}
        />
      </div>

      {/* Rows */}
      <div className="space-y-0.5" role="group" aria-label={t('characteristics')}>
        {CHARACTERISTICS.map(char => (
          <CharacteristicRow
            key={char}
            char={char}
            allocated={allocated[char]}
            isScrolled={scrolled[char]}
            remaining={remaining}
            onAdd={n    => addPoints(char, n)}
            onRemove={n => removePoints(char, n)}
            onToggleScroll={() => toggleScroll(char)}
          />
        ))}
      </div>

      <p className="text-[9px] text-forge-muted/30 text-center pt-0.5">
        Click to type · Hold · Shift ×5 · Ctrl ×20
      </p>
    </div>
  )
}
