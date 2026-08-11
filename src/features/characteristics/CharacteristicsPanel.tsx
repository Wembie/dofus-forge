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

// ── Characteristic row ────────────────────────────────────────────────────────
type RowProps = {
  char:      Characteristic
  allocated: number
  total:     number
  isScrolled: boolean
  remaining: number
  power:     number
  onAdd:     (n: number) => void
  onRemove:  (n: number) => void
}

const POWER_ELEMS = new Set<Characteristic>(['strength', 'intelligence', 'chance', 'agility'])

function CharacteristicRow({ char, allocated, total, isScrolled, remaining, power, onAdd, onRemove }: RowProps) {
  const { t }    = useTranslation()
  const color    = CHAR_COLOR[char]
  const focused  = useRef(false)
  const rowRef   = useRef<HTMLDivElement>(null)
  const popRef   = useRef<HTMLDivElement>(null)
  const [inputVal, setInputVal] = useState(String(allocated))
  const [open, setOpen]         = useState(false)

  useEffect(() => {
    if (!focused.current) setInputVal(String(allocated))
  }, [allocated])

  // Instant close via mousemove: no timer, checks both row and popover rects.
  // RAF ensures popover has rendered before we start checking.
  useEffect(() => {
    if (!open) return
    let ready = false
    const raf = requestAnimationFrame(() => { ready = true })

    function check({ clientX: x, clientY: y }: MouseEvent) {
      if (!ready) return
      function inside(el: HTMLDivElement | null) {
        if (!el) return false
        const r = el.getBoundingClientRect()
        return x >= r.left - 3 && x <= r.right + 3 && y >= r.top - 3 && y <= r.bottom + 3
      }
      if (!inside(rowRef.current) && !inside(popRef.current)) setOpen(false)
    }

    document.addEventListener('mousemove', check)
    return () => { cancelAnimationFrame(raf); document.removeEventListener('mousemove', check) }
  }, [open])

  function commitInput(raw: string) {
    const target = Math.max(0, parseInt(raw, 10) || 0)
    if (target > allocated) onAdd(target - allocated)
    else if (target < allocated) onRemove(allocated - target)
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
      ref={rowRef}
      className="relative px-2 py-1.5 rounded-lg transition-colors bg-surface-void hover:bg-surface-panel"
      style={{ borderLeft: `2px solid color-mix(in srgb, ${color} 35%, transparent)` }}
      onMouseEnter={() => setOpen(true)}
    >
      {/* Compact display row */}
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

      {/* Hover popover — allocation controls only */}
      {open && (
        <div
          ref={popRef}
          className="absolute left-0 right-0 z-50 rounded-lg px-2 py-2 shadow-xl"
          style={{
            top: 'calc(100% + 2px)',
            background: 'var(--surface-panel)',
            border: '1px solid var(--metal-edge)',
            borderTop: `2px solid color-mix(in srgb, ${color} 70%, transparent)`,
          }}
        >
          <div className="flex items-center gap-1.5">
            <button
              {...removeProps}
              disabled={allocated <= 0}
              style={{ ...btnBase, color: 'var(--ink-muted)', opacity: allocated <= 0 ? 0.25 : 1 }}
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
              style={{ background: 'transparent', minWidth: 0, color, MozAppearance: 'textfield', padding: '2px 4px' }}
            />

            <button
              {...addProps}
              disabled={!canAdd}
              style={{ ...btnBase, color: 'var(--ink-muted)', opacity: !canAdd ? 0.25 : 1 }}
            >+</button>
          </div>

          {/* Breakdown */}
          <div className="flex gap-2 text-[10px] mt-1.5 flex-wrap" style={{ color: 'var(--ink-faint)' }}>
            <span>
              Pts: <span className="font-mono" style={{ color }}>{allocated}</span>
            </span>
            {equipBonus > 0 && (
              <span>
                Equipo: <span className="font-mono" style={{ color: 'var(--ink-muted)' }}>+{equipBonus}</span>
              </span>
            )}
            {isScrolled && (
              <span>
                Pergamino: <span className="font-mono" style={{ color: 'var(--gold)' }}>+{SCROLL_BONUS}</span>
              </span>
            )}
            <span style={{ marginLeft: 'auto' }}>
              Costo: <span className="font-mono" style={{ color: 'var(--ink-muted)' }}>{nextCost}pt</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Unified scroll toggles ────────────────────────────────────────────────────
function ScrollToggles() {
  const { t }        = useTranslation()
  const scrolled     = useBuildStore(s => s.scrolled)
  const toggleScroll = useBuildStore(s => s.toggleScroll)

  return (
    <div className="pt-1.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--ink-faint)' }}>
          Pergaminos
        </span>
        <span className="text-[9px] font-mono" style={{ color: 'var(--ink-faint)' }}>+{SCROLL_BONUS} c/u</span>
      </div>
      <div className="flex gap-1">
        {CHARACTERISTICS.map(char => {
          const active = scrolled[char]
          const color  = CHAR_COLOR[char]
          return (
            <button
              key={char}
              onClick={() => toggleScroll(char)}
              title={`${t(`stat_${char}`)} +${SCROLL_BONUS}`}
              className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-md transition-all"
              style={active ? {
                background: `color-mix(in srgb, ${color} 18%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 55%, transparent)`,
              } : {
                background: 'transparent',
                border: '1px solid var(--metal-edge)',
              }}
              aria-pressed={active}
            >
              <StatIcon name={char} size={13} />
              <span
                className="text-[8px] font-mono font-bold leading-none"
                style={{ color: active ? color : 'var(--ink-faint)' }}
              >
                {active ? `+${SCROLL_BONUS}` : 'P'}
              </span>
            </button>
          )
        })}
      </div>
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

      {/* 6 characteristic rows */}
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
          />
        ))}
      </div>

      {/* Unified scroll toggles */}
      <ScrollToggles />

    </div>
  )
}
