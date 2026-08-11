import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { pointCost, statBudget, SCROLL_BONUS } from '@/engine/characteristics.ts'
import { CHARACTERISTICS, type Characteristic } from '@/engine/types.ts'
import { statIconUrl } from '../equipment/statDisplay.ts'

const CHAR_COLOR: Record<Characteristic, string> = {
  vitality:     'var(--vitality)',
  wisdom:       'var(--wisdom)',
  strength:     'var(--earth)',
  intelligence: 'var(--fire)',
  chance:       'var(--water)',
  agility:      'var(--air)',
}

// ── Hold-to-repeat ────────────────────────────────────────────────────────────
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

// ── Stat icon ─────────────────────────────────────────────────────────────────
function StatIcon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <img
      src={statIconUrl(name)}
      alt=""
      width={size}
      height={size}
      style={{ objectFit: 'contain', flexShrink: 0 }}
      draggable={false}
    />
  )
}

// ── Characteristic allocation row ─────────────────────────────────────────────
type RowProps = {
  char:           Characteristic
  allocated:      number
  total:          number
  isScrolled:     boolean
  remaining:      number
  power:          number
  onAdd:          (n: number) => void
  onRemove:       (n: number) => void
  onToggleScroll: () => void
}

const POWER_ELEMS = new Set<Characteristic>(['strength', 'intelligence', 'chance', 'agility'])

function CharacteristicRow({ char, allocated, total, isScrolled, remaining, power, onAdd, onRemove, onToggleScroll }: RowProps) {
  const { t }      = useTranslation()
  const color      = CHAR_COLOR[char]
  const focused    = useRef(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>()
  const [inputVal, setInputVal] = useState(String(allocated))
  const [open, setOpen]         = useState(false)

  useEffect(() => {
    if (!focused.current) setInputVal(String(allocated))
  }, [allocated])

  function commitInput(raw: string) {
    const target = Math.max(0, parseInt(raw, 10) || 0)
    if (target > allocated) onAdd(target - allocated)
    else if (target < allocated) onRemove(allocated - target)
  }

  function hover(on: boolean) {
    clearTimeout(closeTimer.current)
    if (on) setOpen(true)
    else closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  const nextCost   = pointCost(char, allocated + 1) - pointCost(char, allocated)
  const canAdd     = remaining >= nextCost
  const equipBonus = total - allocated - (isScrolled ? SCROLL_BONUS : 0)

  const { addProps, removeProps } = useHoldRepeat(onAdd, onRemove)

  const btnBase: React.CSSProperties = {
    border: '1px solid var(--metal-edge)', borderRadius: 3,
    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 14, cursor: 'pointer', userSelect: 'none', flexShrink: 0,
    background: 'transparent', transition: 'border-color 0.1s, color 0.1s',
  }

  return (
    <div
      className="relative px-2 py-1.5 rounded-lg transition-colors bg-surface-void hover:bg-surface-panel"
      style={{ borderLeft: `2px solid color-mix(in srgb, ${color} 35%, transparent)` }}
      onMouseEnter={() => hover(true)}
      onMouseLeave={() => hover(false)}
    >
      {/* Compact row: icon + name + total */}
      <div className="flex items-center gap-1.5 min-w-0">
        <StatIcon name={char} size={16} />
        <span
          className="text-xs font-medium truncate flex-1 min-w-0 select-none"
          style={{ color }}
        >
          {t(`stat_${char}`)}
        </span>
        <span
          className="font-mono font-bold text-sm tabular-nums leading-none flex-shrink-0"
          style={{ color }}
          title={POWER_ELEMS.has(char) && power > 0 ? `${total} + ${power} Potencia = ${total + power}` : undefined}
        >
          {total.toLocaleString()}
          {equipBonus > 0 && (
            <span className="text-[9px] font-normal ml-1" style={{ color: 'var(--ink-faint)' }}>
              +{equipBonus}
            </span>
          )}
        </span>
      </div>

      {/* Hover popover with allocation controls */}
      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-0.5 rounded-lg px-2 py-2 shadow-xl"
          style={{
            top: '100%',
            background: 'var(--surface-panel)',
            border: '1px solid var(--metal-edge)',
            borderTop: `2px solid color-mix(in srgb, ${color} 70%, transparent)`,
          }}
          onMouseEnter={() => hover(true)}
          onMouseLeave={() => hover(false)}
        >
          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <button
              {...removeProps}
              disabled={allocated <= 0}
              style={{ ...btnBase, color: 'var(--ink-muted)', opacity: allocated <= 0 ? 0.25 : 1 }}
              aria-label={`Remove ${t(`stat_${char}`)}`}
            >−</button>

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
              className="text-center font-mono font-bold text-sm focus:outline-none border border-transparent hover:border-metal-edge focus:border-metal-edge rounded-sm transition-colors flex-1"
              style={{
                background: 'transparent', minWidth: 0,
                color, MozAppearance: 'textfield', padding: '2px 4px',
              }}
              aria-label={`${t(`stat_${char}`)} points`}
            />

            <button
              {...addProps}
              disabled={!canAdd}
              style={{ ...btnBase, color: 'var(--ink-muted)', opacity: !canAdd ? 0.25 : 1 }}
              aria-label={`Add ${t(`stat_${char}`)}`}
            >+</button>

            <button
              onClick={onToggleScroll}
              title={t('scroll_title', { bonus: SCROLL_BONUS })}
              className="flex-shrink-0 flex items-center justify-center text-[9px] font-bold transition-all"
              style={isScrolled ? {
                width: 20, height: 20, borderRadius: 2,
                background: 'var(--gold)', color: 'var(--ink-invert)', border: '1px solid var(--gold)',
              } : {
                width: 20, height: 20, borderRadius: 2,
                background: 'transparent', color: 'var(--ink-faint)', border: '1px solid var(--metal-edge)',
              }}
              aria-pressed={isScrolled}
            >{t('scroll_label')}</button>
          </div>

          {/* Breakdown */}
          <div className="flex gap-2 text-[10px] mt-1.5 flex-wrap" style={{ color: 'var(--ink-faint)' }}>
            <span>
              Pts:{' '}
              <span className="font-mono" style={{ color }}>{allocated}</span>
            </span>
            {equipBonus > 0 && (
              <span>
                Equipo:{' '}
                <span className="font-mono" style={{ color: 'var(--ink-muted)' }}>+{equipBonus}</span>
              </span>
            )}
            {isScrolled && (
              <span>
                Pergamino:{' '}
                <span className="font-mono" style={{ color: 'var(--gold)' }}>+{SCROLL_BONUS}</span>
              </span>
            )}
            <span style={{ marginLeft: 'auto' }}>
              Costo:{' '}
              <span className="font-mono" style={{ color: 'var(--ink-muted)' }}>{nextCost}pt</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CharacteristicsPanel ──────────────────────────────────────────────────────
export function CharacteristicsPanel() {
  const { t }        = useTranslation()
  const level        = useBuildStore(s => s.level)
  const allocated    = useBuildStore(s => s.allocated)
  const scrolled     = useBuildStore(s => s.scrolled)
  const stats        = useBuildStore(s => s.stats)
  const addPoints    = useBuildStore(s => s.addPoints)
  const removePoints = useBuildStore(s => s.removePoints)
  const toggleScroll = useBuildStore(s => s.toggleScroll)

  const budget    = statBudget(level)
  const spent     = CHARACTERISTICS.reduce((acc, c) => acc + pointCost(c, allocated[c]), 0)
  const remaining = budget - spent
  const pct       = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0

  return (
    <div className="space-y-2">

      {/* Header + budget */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
          {t('characteristics')}
        </h2>
        <span className="text-xs font-mono tabular-nums" style={{ color: remaining <= 0 ? 'var(--ink-faint)' : 'var(--gold)' }}>
          {remaining} <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>/ {budget}</span>
        </span>
      </div>

      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--metal-edge)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: remaining === 0
              ? 'linear-gradient(to right, var(--gold), var(--gold-bright))'
              : 'linear-gradient(to right, color-mix(in srgb, var(--gold) 55%, transparent), var(--gold))',
          }}
        />
      </div>

      {/* 6 main characteristics */}
      <div className="space-y-0.5" role="group" aria-label={t('characteristics')}>
        {CHARACTERISTICS.map(char => (
          <CharacteristicRow
            key={char}
            char={char}
            allocated={allocated[char]}
            total={stats ? stats[char] : allocated[char]}
            isScrolled={scrolled[char]}
            remaining={remaining}
            power={stats?.power ?? 0}
            onAdd={n    => addPoints(char, n)}
            onRemove={n => removePoints(char, n)}
            onToggleScroll={() => toggleScroll(char)}
          />
        ))}
      </div>

    </div>
  )
}
