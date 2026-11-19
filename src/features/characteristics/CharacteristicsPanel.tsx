import { startTransition, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { useCombatStats } from '@/store/useCombatStats.ts'
import { useCombatView, useHasPassives } from '@/store/useCombatView.ts'
import { maxPointsForBudget, pointCost, statBudget, SCROLL_BONUS } from '@/engine/characteristics.ts'
import { CHARACTERISTICS, type Characteristic } from '@/engine/types.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { CombatViewTag } from '@/features/passives/CombatViewBar.tsx'
import { DeltaChip } from '@/features/passives/DeltaChip.tsx'
import './characteristics.css'

const ELEMENTAL = new Set<Characteristic>(['strength', 'intelligence', 'chance', 'agility'])

/** Thousands are always grouped (the "es" locale skips four-digit numbers by default). */
const formatNumber = (n: number, lang: string) =>
  new Intl.NumberFormat(lang, { useGrouping: 'always' as unknown as boolean, maximumFractionDigits: 0 }).format(Math.round(n))

/** Step size: Shift = 5, Ctrl/⌘ = 20, otherwise 1. */
const step = (e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => (e.shiftKey ? 5 : e.ctrlKey || e.metaKey ? 20 : 1)

/** Press and hold: one step on press, then after 350 ms a repeat every 80 ms
 * that speeds up to 5 per tick after 15 ticks. Pointer events cover mouse and
 * touch; a keyboard click still does a single step. */
function useHold(apply: (n: number) => void) {
  const fn = useRef(apply)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const tick = useRef<ReturnType<typeof setInterval>>(undefined)
  const pressed = useRef(false)
  fn.current = apply
  const stop = useCallback(() => { clearTimeout(timer.current); clearInterval(tick.current) }, [])
  useEffect(() => stop, [stop])
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return
      pressed.current = true
      fn.current(step(e))
      if (e.shiftKey || e.ctrlKey || e.metaKey) return
      let count = 0
      timer.current = setTimeout(() => {
        tick.current = setInterval(() => { count++; fn.current(count >= 15 ? 5 : 1) }, 80)
      }, 350)
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: (e: React.MouseEvent) => {
      if (pressed.current) { pressed.current = false; return }
      fn.current(step(e))
    },
  }
}

function Step({ label, disabled, apply, children }: { label: string; disabled: boolean; apply: (n: number) => void; children: ReactNode }) {
  const { t } = useTranslation()
  const hold = useHold(apply)
  return (
    <button type="button" aria-label={label} title={t('chars_step_title', { label })} disabled={disabled} {...hold}>
      {children}
    </button>
  )
}

/** Typed points, buffered while editing and committed on blur or Enter. */
function Points({ id, name, value, onCommit }: { id: string; name: string; value: number; onCommit: (target: number) => void }) {
  const { t } = useTranslation()
  const [text, setText] = useState(String(value))
  const editing = useRef(false)
  useEffect(() => { if (!editing.current) setText(String(value)) }, [value])
  return (
    <input
      id={id}
      inputMode="numeric"
      aria-label={t('chars_points_in', { name })}
      value={text}
      onFocus={e => { editing.current = true; e.currentTarget.select() }}
      onChange={e => setText(e.target.value.replace(/\D/g, '').slice(0, 4))}
      onBlur={() => { editing.current = false; onCommit(Number(text) || 0) }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
    />
  )
}

/** One row per characteristic — scroll, points and the resulting total, read
 * left to right — under the points left of the level's budget. */
export function CharacteristicsPanel({ focus }: { focus?: Characteristic } = {}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const fmt = (n: number) => formatNumber(n, lang)
  const name = (char: Characteristic) => t(`stat_${char}`)
  const level        = useBuildStore(s => s.level)
  const allocated    = useBuildStore(s => s.allocated)
  const scrolled     = useBuildStore(s => s.scrolled)
  const gear         = useBuildStore(s => s.stats)
  const addPoints    = useBuildStore(s => s.addPoints)
  const removePoints = useBuildStore(s => s.removePoints)
  const toggleScroll = useBuildStore(s => s.toggleScroll)
  const setAllScrolls = useBuildStore(s => s.setAllScrolls)
  const combatStats  = useCombatStats()
  const combatView   = useCombatView()
  const hasPassives  = useHasPassives()
  const combat = combatView && hasPassives && combatStats != null
  const stats = combat ? combatStats : gear

  // After the window's own focus handling, so closing still returns to the opener.
  useEffect(() => {
    if (!focus) return
    const raf = requestAnimationFrame(() => document.getElementById(`chars-points-${focus}`)?.focus())
    return () => cancelAnimationFrame(raf)
  }, [focus])

  const budget = statBudget(level)
  const spent = CHARACTERISTICS.reduce((sum, c) => sum + pointCost(c, allocated[c]), 0)
  const left = budget - spent
  const everyScroll = CHARACTERISTICS.every(c => scrolled[c])
  const power = stats?.power ?? 0
  const powerFromPassives = combat && gear ? power - gear.power : 0
  // As a transition: each change recomputes the build and every panel.
  const add = (char: Characteristic, n: number) => startTransition(() => addPoints(char, n))
  const remove = (char: Characteristic, n: number) => startTransition(() => removePoints(char, n))
  function commit(char: Characteristic, target: number) {
    const now = allocated[char]
    if (target > now) add(char, target - now)
    else if (target < now) remove(char, now - target)
  }

  return (
    <div className="chars">
      <div className="chars-budget">
        <p>
          <strong>{fmt(left)}</strong>
          {' ' + t('chars_left', { count: left })}
          <span>{t('chars_used', { spent: fmt(spent), budget: fmt(budget), level })}</span>
        </p>
        <CombatViewTag />
        <div className="chars-meter" role="img" aria-label={t('chars_meter', { spent, budget })}>
          <i style={{ width: `${budget ? Math.min(100, (spent / budget) * 100) : 0}%` }} />
        </div>
      </div>
      {combat && <p className="chars-note">{t('chars_combat_note')}</p>}
      <div className="chars-head" aria-hidden="true">
        <span>{t('chars_col_characteristic')}</span>
        <span>{t('chars_col_scroll')}</span>
        <span>{t('chars_col_points')}</span>
        <span>{t('weapon_total')}</span>
      </div>
      {CHARACTERISTICS.map(char => {
        const points = allocated[char]
        const next = pointCost(char, points + 1) - pointCost(char, points)
        const most = maxPointsForBudget(char, left + pointCost(char, points))
        const total = stats ? (char === 'vitality' ? stats.maxHp : stats[char]) : points
        const gearTotal = gear ? (char === 'vitality' ? gear.maxHp : gear[char]) : total
        return (
          <div className={'chars-row' + (char === 'strength' ? ' starts-group' : '')} role="group" aria-label={name(char)} key={char}>
            <div className="chars-name">
              <img src={statIconUrl(char)} alt="" />
              <span>
                <b>{name(char)}</b>
                <small>{t('chars_per_unit', { count: next })}</small>
              </span>
            </div>
            <button type="button" className="chars-scroll" aria-pressed={scrolled[char]}
              aria-label={t('chars_scroll_label', { name: name(char), bonus: SCROLL_BONUS })}
              onClick={() => startTransition(() => toggleScroll(char))}>
              +{SCROLL_BONUS}
            </button>
            <div className="chars-points">
              <Step label={t('chars_remove', { name: name(char) })} disabled={points <= 0} apply={n => remove(char, n)}>−</Step>
              <Points id={`chars-points-${char}`} name={name(char)} value={points} onCommit={target => commit(char, target)} />
              <Step label={t('chars_add', { name: name(char) })} disabled={left < next} apply={n => add(char, n)}>+</Step>
              <button type="button" className="chars-max" aria-label={t('chars_max_label', { name: name(char) })}
                disabled={most <= points} onClick={() => commit(char, most)}>
                {t('chars_max')}
              </button>
            </div>
            <div className="chars-total">
              <strong>
                {fmt(total)}
                {combat && total !== gearTotal && <em title={t('chars_passive_delta')}>{total > gearTotal ? '+' : '−'}{fmt(Math.abs(total - gearTotal))}</em>}
              </strong>
              <small>
                {char === 'vitality' ? t('badge_hp')
                  : ELEMENTAL.has(char) && power > 0 ? <>{fmt(total + power)} {t('chars_with_power')}</>
                  : ' '}
              </small>
            </div>
          </div>
        )
      })}
      <div className="chars-foot">
        <p>
          <span className="chars-power"><img src={statIconUrl('power')} alt="" />{t('stat_power')}</span>{' '}
          <b>{fmt(power)}</b> <DeltaChip delta={powerFromPassives} />
          {' · '}
          {t('chars_hint')}
        </p>
        <button type="button" onClick={() => startTransition(() => setAllScrolls(!everyScroll))}>
          {everyScroll ? t('chars_scrolls_off') : t('chars_scrolls_on')}
        </button>
      </div>
    </div>
  )
}
