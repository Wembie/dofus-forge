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

const POWER_ELEMS = new Set<Characteristic>(['strength', 'intelligence', 'chance', 'agility'])

function StatIcon({ name, size = 14 }: { name: string; size?: number }) {
  return (
    <img src={statIconUrl(name)} alt="" width={size} height={size}
      style={{ objectFit: 'contain', flexShrink: 0 }} draggable={false} />
  )
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

// ── Compact stat row — only total, no controls ───────────────────────────────
function CompactRow({ char, total, power }: { char: Characteristic; total: number; power: number }) {
  const { t } = useTranslation()
  const color = CHAR_COLOR[char]
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md"
      style={{ borderLeft: `2px solid color-mix(in srgb, ${color} 30%, transparent)` }}
    >
      <StatIcon name={char} size={15} />
      <span className="text-xs font-medium flex-1 select-none truncate" style={{ color }}>
        {t(`stat_${char}`)}
      </span>
      <span
        className="font-mono font-bold text-sm tabular-nums flex-shrink-0"
        style={{ color }}
        title={POWER_ELEMS.has(char) && power > 0 ? `${total} + ${power} Potencia = ${total + power}` : undefined}
      >
        {total.toLocaleString()}
      </span>
    </div>
  )
}

// ── Single allocator control (used inside AllocationGrid) ─────────────────────
function AllocatorControl({
  char, allocated, remaining, onAdd, onRemove,
}: {
  char: Characteristic; allocated: number; remaining: number;
  onAdd: (n: number) => void; onRemove: (n: number) => void;
}) {
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
  }

  const nextCost = pointCost(char, allocated + 1) - pointCost(char, allocated)
  const canAdd   = remaining >= nextCost
  const { addProps, removeProps } = useHoldRepeat(onAdd, onRemove)

  const btn: React.CSSProperties = {
    border: '1px solid var(--metal-edge)', borderRadius: 3,
    width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 12, cursor: 'pointer', userSelect: 'none', flexShrink: 0,
    background: 'transparent',
  }

  return (
    <div className="flex items-center gap-1">
      <StatIcon name={char} size={13} />
      <button
        {...removeProps}
        disabled={allocated <= 0}
        style={{ ...btn, color: 'var(--ink-muted)', opacity: allocated <= 0 ? 0.25 : 1 }}
      >−</button>
      <input
        type="number" min={0} value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onFocus={e => { focused.current = true; e.target.select() }}
        onBlur={e => { focused.current = false; commitInput(e.target.value) }}
        onKeyDown={e => {
          if (e.key === 'Enter')  { commitInput(inputVal); (e.target as HTMLInputElement).blur() }
          if (e.key === 'Escape') { focused.current = false; setInputVal(String(allocated)) }
        }}
        className="text-center font-mono font-bold text-xs focus:outline-none rounded-sm"
        style={{
          width: 36, background: 'var(--surface-void)', color,
          border: '1px solid var(--metal-edge)', padding: '1px 2px',
          MozAppearance: 'textfield',
        }}
      />
      <button
        {...addProps}
        disabled={!canAdd}
        style={{ ...btn, color: 'var(--ink-muted)', opacity: !canAdd ? 0.25 : 1 }}
      >+</button>
    </div>
  )
}

// ── All-in-one allocation grid ────────────────────────────────────────────────
function AllocationGrid({ remaining }: { remaining: number }) {
  const allocated    = useBuildStore(s => s.allocated)
  const addPoints    = useBuildStore(s => s.addPoints)
  const removePoints = useBuildStore(s => s.removePoints)

  return (
    <div
      className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 mt-1"
      style={{ borderTop: '1px solid var(--metal-edge)' }}
    >
      {CHARACTERISTICS.map(char => (
        <AllocatorControl
          key={char}
          char={char}
          allocated={allocated[char]}
          remaining={remaining}
          onAdd={n    => addPoints(char, n)}
          onRemove={n => removePoints(char, n)}
        />
      ))}
    </div>
  )
}

// ── Unified scroll toggles ────────────────────────────────────────────────────
function ScrollToggles() {
  const { t }        = useTranslation()
  const scrolled     = useBuildStore(s => s.scrolled)
  const toggleScroll = useBuildStore(s => s.toggleScroll)

  return (
    <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
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
              <span className="text-[8px] font-mono font-bold leading-none" style={{ color: active ? color : 'var(--ink-faint)' }}>
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
// Hover the entire panel → AllocationGrid appears inline (child of same wrapper).
// onMouseLeave on wrapper fires only when mouse truly leaves the whole section,
// not when moving between compact rows and the grid — they are the same subtree.
export function CharacteristicsPanel() {
  const { t }     = useTranslation()
  const level     = useBuildStore(s => s.level)
  const allocated = useBuildStore(s => s.allocated)
  const stats     = useBuildStore(s => s.stats)
  const [editing, setEditing] = useState(false)

  const budget    = statBudget(level)
  const spent     = CHARACTERISTICS.reduce((acc, c) => acc + pointCost(c, allocated[c]), 0)
  const remaining = budget - spent
  const pct       = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0

  return (
    <div onMouseEnter={() => setEditing(true)} onMouseLeave={() => setEditing(false)}>

      {/* Header + budget */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-sm uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
          {t('characteristics')}
        </h2>
        <span className="text-xs font-mono tabular-nums" style={{ color: remaining <= 0 ? 'var(--ink-faint)' : 'var(--gold)' }}>
          {remaining} <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>/ {budget}</span>
        </span>
      </div>

      <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: 'var(--metal-edge)' }}>
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

      {/* Compact rows — total only, no controls */}
      <div className="space-y-0.5" role="group" aria-label={t('characteristics')}>
        {CHARACTERISTICS.map(char => (
          <CompactRow
            key={char}
            char={char}
            total={stats ? (char === 'vitality' ? stats.maxHp : stats[char]) : allocated[char]}
            power={stats?.power ?? 0}
          />
        ))}
      </div>

      {/* Allocation grid — appears when hovering the panel */}
      {editing && <AllocationGrid remaining={remaining} />}

      {/* Scroll toggles — always visible */}
      <ScrollToggles />

    </div>
  )
}
