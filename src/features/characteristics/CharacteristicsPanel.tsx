import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { pointCost, statBudget, SCROLL_BONUS } from '@/engine/characteristics.ts'
import { CHARACTERISTICS, type Characteristic } from '@/engine/types.ts'

// ── Colors ────────────────────────────────────────────────────────────────────
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

// ── Characteristic icons (SVG) ────────────────────────────────────────────────
function CharIcon({ char }: { char: Characteristic }) {
  const color = CHAR_COLOR[char]

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        background: `radial-gradient(circle at 35% 35%, ${color}38, ${color}10)`,
        border:     `1.5px solid ${color}55`,
        boxShadow:  `0 0 6px ${color}22`,
      }}
    >
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]">
        {char === 'vitality' && (
          <path fill={color}
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        )}
        {char === 'wisdom' && (
          <path fill={color}
            d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        )}
        {char === 'strength' && (
          <>
            <path fill={color} opacity="0.9"
              d="M12 2L2 22h20L12 2z"/>
            <path fill={color} opacity="0.45"
              d="M17 10L11 22h12L17 10z"/>
          </>
        )}
        {char === 'intelligence' && (
          <path fill={color}
            d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
        )}
        {char === 'chance' && (
          <path fill={color}
            d="M12 2L6.5 10.5C5.05 12.96 5 15 5 16c0 3.86 3.14 7 7 7s7-3.14 7-7c0-1-.05-3.04-1.5-5.5L12 2z"/>
        )}
        {char === 'agility' && (
          <path fill={color}
            d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2-11 2 4-4 6-7 6-7z"/>
        )}
      </svg>
    </div>
  )
}

// ── Hold-to-repeat hook ────────────────────────────────────────────────────────
// - single click: +1 / −1
// - hold (350ms delay): repeats every 80ms; accelerates to ×5 after 15 ticks (~1.5s)
// - shift+click: ×5 once
// - ctrl/cmd+click: ×20 once
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
  const nextCost = pointCost(char, allocated + 1) - pointCost(char, allocated)
  const canAdd   = remaining >= nextCost
  const color    = CHAR_COLOR[char]

  const { addProps, removeProps } = useHoldRepeat(onAdd, onRemove)

  const btnBase: React.CSSProperties = {
    background: '#161b26',
    border:     '1px solid #2a3347',
    color:      '#9aa0b0',
    borderRadius: 6,
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 16,
    cursor: 'pointer',
    userSelect: 'none',
    flexShrink: 0,
    lineHeight: 1,
    transition: 'border-color 0.1s, background 0.1s',
  }

  return (
    <div className="flex items-center gap-2">
      <CharIcon char={char} />

      <span className="text-xs font-medium flex-shrink-0" style={{ color, width: 80 }}>
        {CHAR_LABEL[char]}
      </span>

      {/* Controls */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          {...removeProps}
          disabled={allocated <= 0}
          style={{ ...btnBase, opacity: allocated <= 0 ? 0.25 : 1 }}
          aria-label={`Remove ${CHAR_LABEL[char]} points (shift ×5, ctrl ×20)`}
        >−</button>

        <div className="flex items-baseline justify-center gap-0.5" style={{ width: 52 }}>
          <span className="text-sm font-mono font-bold" style={{ color }}>
            {allocated}
          </span>
          {isScrolled && (
            <span className="text-[10px] font-mono" style={{ color: '#c9a84c' }}>
              +{SCROLL_BONUS}
            </span>
          )}
        </div>

        <button
          {...addProps}
          disabled={!canAdd}
          style={{ ...btnBase, opacity: !canAdd ? 0.25 : 1 }}
          aria-label={`Add ${CHAR_LABEL[char]} points (shift ×5, ctrl ×20)`}
        >+</button>
      </div>

      {/* Scroll toggle */}
      <button
        onClick={onToggleScroll}
        title={t('scroll_title', { bonus: SCROLL_BONUS })}
        className="flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-all"
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-forge-gold text-sm uppercase tracking-widest">
          {t('characteristics')}
        </h2>
        <span className={`text-xs font-mono tabular-nums ${remaining <= 0 ? 'text-forge-muted/40' : 'text-forge-gold/80'}`}>
          {remaining} <span className="text-forge-muted/50 text-[10px]">pts</span>
        </span>
      </div>

      <div className="space-y-2" role="group" aria-label={t('characteristics')}>
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

      <p className="text-[10px] text-forge-muted/35 text-center pt-1">
        Hold · Shift ×5 · Ctrl ×20
      </p>
    </div>
  )
}
