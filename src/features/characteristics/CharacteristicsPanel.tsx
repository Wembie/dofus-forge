import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { pointCost, statBudget, SCROLL_BONUS } from '@/engine/characteristics.ts'
import { CHARACTERISTICS, type Characteristic } from '@/engine/types.ts'
import type { StatBlock } from '@/engine/types.ts'
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
function StatIcon({ name, size = 20 }: { name: string; size?: number }) {
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
  const { t }   = useTranslation()
  const color   = CHAR_COLOR[char]
  const focused = useRef(false)
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

  const btnBase: React.CSSProperties = {
    border: '1px solid var(--metal-edge)', borderRadius: 4,
    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 14, cursor: 'pointer', userSelect: 'none', flexShrink: 0,
    background: 'transparent', transition: 'border-color 0.1s, color 0.1s',
  }

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors bg-surface-void hover:bg-surface-panel"
    >
      <StatIcon name={char} size={22} />

      <span className="text-xs font-medium select-none" style={{ color, minWidth: 74, flexShrink: 0 }}>
        {t(`stat_${char}`)}
      </span>

      <span
        className="font-mono font-bold text-sm tabular-nums flex-1 text-right pr-2"
        style={{ color }}
        title={POWER_ELEMS.has(char) && power > 0 ? `${total} + ${power} Potencia = ${total + power}` : undefined}
      >
        {total.toLocaleString()}
      </span>

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
        className="text-center font-mono font-bold text-xs focus:outline-none border border-transparent hover:border-metal-edge focus:border-metal-edge rounded-sm transition-colors"
        style={{
          width: 44, background: 'transparent',
          color, MozAppearance: 'textfield', padding: '1px 2px',
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
          width: 18, height: 18, borderRadius: 3,
          background: 'var(--gold)', color: 'var(--ink-invert)', border: '1px solid var(--gold)',
        } : {
          width: 18, height: 18, borderRadius: 3,
          background: 'transparent', color: 'var(--ink-faint)', border: '1px solid var(--metal-edge)',
        }}
        aria-pressed={isScrolled}
      >{t('scroll_label')}</button>
    </div>
  )
}

// ── Combat stat pill ──────────────────────────────────────────────────────────
function CombatStat({ icon, label, value, color, fmt }: {
  icon: string; label: string; value: number; color?: string; fmt?: 'num' | 'pct'
}) {
  if (value === 0) return null
  const display = fmt === 'pct' ? `${value}%` : value.toLocaleString()
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-void">
      <StatIcon name={icon} size={14} />
      <span className="text-[9px] flex-1 leading-none" style={{ color: 'var(--ink-muted)' }}>{label}</span>
      <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: color ?? 'var(--ink)' }}>
        {display}
      </span>
    </div>
  )
}

// ── Element value cell ────────────────────────────────────────────────────────
function ValCell({ value, color, suffix = '' }: { value: number; color: string; suffix?: string }) {
  return (
    <span className="font-mono font-bold text-[11px] tabular-nums leading-none text-right"
      style={{ color: value === 0 ? 'var(--ink-faint)' : color }}>
      {value === 0 ? '—' : `${value > 0 ? '+' : ''}${value}${suffix}`}
    </span>
  )
}

// ── Element damage/resistance row ─────────────────────────────────────────────
const ELEM_COLS = '1fr 40px 42px 44px'

function ElementRow({ icon, label, color, damage, resFixed, resPercent, showPercent = true }: {
  icon: string; label: string; color: string
  damage: number; resFixed: number; resPercent?: number; showPercent?: boolean
}) {
  const hasData = damage !== 0 || resFixed !== 0 || (resPercent ?? 0) !== 0
  return (
    <div
      className="grid items-center rounded-md"
      style={{
        gridTemplateColumns: ELEM_COLS, gap: 6, padding: '5px 8px',
        background:  hasData ? `color-mix(in srgb, ${color} 6%, transparent)` : 'transparent',
        borderLeft:  `2px solid ${hasData ? `color-mix(in srgb, ${color} 25%, transparent)` : 'transparent'}`,
        opacity:     hasData ? 1 : 0.40,
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <StatIcon name={icon} size={13} />
        <span className="text-[10px] font-semibold truncate" style={{ color: hasData ? color : 'var(--ink-faint)' }}>{label}</span>
      </div>
      <ValCell value={damage}         color={color} />
      <ValCell value={resFixed}       color={resFixed  > 0 ? 'var(--positive)' : 'var(--negative)'} />
      {showPercent
        ? <ValCell value={resPercent ?? 0} color={(resPercent ?? 0) > 0 ? 'var(--positive)' : 'var(--negative)'} suffix="%" />
        : <span />
      }
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

  const [showCombat, setShowCombat] = useState(true)

  const budget    = statBudget(level)
  const spent     = CHARACTERISTICS.reduce((acc, c) => acc + pointCost(c, allocated[c]), 0)
  const remaining = budget - spent
  const pct       = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0

  const s: StatBlock = stats ?? {
    ap: 6, mp: 3, range: 0, vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0,
    maxHp: 0, power: 0, damage: 0,
    neutralDamage: 0, earthDamage: 0, fireDamage: 0, waterDamage: 0, airDamage: 0,
    neutralSteal: 0, earthSteal: 0, fireSteal: 0, waterSteal: 0, airSteal: 0,
    bestElemSteal: 0, bestElemDamage: 0,
    neutralResFixed: 0, earthResFixed: 0, fireResFixed: 0, waterResFixed: 0, airResFixed: 0,
    neutralResPercent: 0, earthResPercent: 0, fireResPercent: 0, waterResPercent: 0, airResPercent: 0,
    critChance: 0, critDamage: 0, critResistance: 0,
    meleeDamagePercent: 0, rangedDamagePercent: 0, spellDamagePercent: 0, weaponDamagePercent: 0,
    meleeResistPercent: 0, rangedResistPercent: 0,
    trapDamage: 0, trapPower: 0, pushbackDamage: 0, pushbackResist: 0, reflectedDamage: 0,
    heals: 0, initiative: 0, lock: 0, dodge: 0, prospecting: 0, summons: 0, pods: 0,
    apReduction: 0, mpReduction: 0, apParry: 0, mpParry: 0, mpSteal: 0,
    unknownStats: {}, pointsBudget: budget, pointsSpent: spent,
  }

  return (
    <div className="space-y-2">

      {/* ── Header + budget ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-forge-gold text-sm uppercase tracking-widest">
          {t('characteristics')}
        </h2>
        <span className={`text-xs font-mono tabular-nums ${remaining <= 0 ? 'text-forge-muted/40' : 'text-forge-gold/80'}`}>
          {remaining} <span className="text-forge-muted/40 text-[10px]">/ {budget}</span>
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

      {/* ── 6 main characteristics ───────────────────────────────────────── */}
      <div className="space-y-0.5" role="group" aria-label={t('characteristics')}>
        {CHARACTERISTICS.map(char => (
          <CharacteristicRow
            key={char}
            char={char}
            allocated={allocated[char]}
            total={s[char]}
            isScrolled={scrolled[char]}
            remaining={remaining}
            power={s.power}
            onAdd={n    => addPoints(char, n)}
            onRemove={n => removePoints(char, n)}
            onToggleScroll={() => toggleScroll(char)}
          />
        ))}
      </div>

      <p className="text-[9px] text-forge-muted/30 text-center">
        {t('click_hint')}
      </p>

      {/* ── Combat stats toggle ──────────────────────────────────────────── */}
      <button
        onClick={() => setShowCombat(o => !o)}
        className="w-full flex items-center justify-between px-2 py-1 rounded-lg transition-colors"
        style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
      >
        <span className="font-display text-forge-gold text-xs uppercase tracking-widest">{t('combat_stats')}</span>
        <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{showCombat ? '▲' : '▼'}</span>
      </button>

      {showCombat && (
        <div className="space-y-2">

          {/* HP + AP/MP/Range row */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: `color-mix(in srgb, var(--vitality) 8%, var(--surface-void))`,
              border: `1px solid color-mix(in srgb, var(--vitality) 20%, var(--metal-edge))`,
            }}
          >
            <StatIcon name="vitality" size={28} />
            <div>
              <div className="font-mono font-bold text-lg leading-none" style={{ color: 'var(--vitality)' }}>
                {s.maxHp.toLocaleString()}
              </div>
              <div className="text-[9px] leading-none mt-0.5" style={{ color: 'var(--ink-faint)' }}>{t('badge_hp')}</div>
            </div>
            <div className="ml-auto flex gap-3">
              {[
                { icon: 'ap',    label: t('badge_ap'),    value: s.ap,    color: 'var(--gold)'  },
                { icon: 'mp',    label: t('badge_mp'),    value: s.mp,    color: 'var(--mp)'    },
                { icon: 'range', label: t('badge_range'), value: s.range, color: 'var(--water)' },
              ].map(({ icon, label, value, color }) => (
                <div key={icon} className="flex flex-col items-center">
                  <StatIcon name={icon} size={18} />
                  <span className="font-mono font-bold text-[11px] tabular-nums leading-none mt-0.5" style={{ color }}>
                    {value}
                  </span>
                  <span className="text-[8px] leading-none" style={{ color: 'var(--ink-faint)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary stats grid */}
          <div className="grid grid-cols-2 gap-0.5">
            <CombatStat icon="initiative"  label={t('stat_initiative')}  value={s.initiative}  color="var(--gold)"    />
            <CombatStat icon="lock"        label={t('stat_lock')}        value={s.lock}        color="var(--earth)"   />
            <CombatStat icon="dodge"       label={t('stat_dodge')}       value={s.dodge}       color="var(--air)"     />
            <CombatStat icon="prospecting" label={t('stat_prospecting')} value={s.prospecting} color="var(--gold)"    />
            <CombatStat icon="summons"     label={t('stat_summons')}     value={s.summons}     color="var(--wisdom)"  />
            <CombatStat icon="heals"       label={t('stat_heals')}       value={s.heals}       color="var(--vitality)" />
            <CombatStat icon="power"       label={t('stat_power')}       value={s.power}       color="var(--gold)"    />
            <CombatStat icon="crit"        label={t('stat_crit_chance')} value={s.critChance}  color="var(--crit)"    fmt="pct" />
            <CombatStat icon="ap_reduction" label={t('stat_ap_removal')} value={s.apReduction} color="var(--wisdom)"  />
            <CombatStat icon="mp_reduction" label={t('stat_mp_removal')} value={s.mpReduction} color="var(--wisdom)"  />
            <CombatStat icon="ap_parry"    label={t('stat_ap_parry')}    value={s.apParry}     color="var(--ap)"      />
            <CombatStat icon="mp_parry"    label={t('stat_mp_parry')}    value={s.mpParry}     color="var(--ap)"      />
          </div>

          {/* Elemental damage / resistance */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--metal-edge)' }}>
            <div className="grid px-3 py-1.5" style={{ gridTemplateColumns: ELEM_COLS, gap: 6, background: 'var(--surface-void)', borderBottom: '1px solid var(--metal-edge)' }}>
              <span className="text-[9px] font-display uppercase tracking-wider self-center" style={{ color: 'var(--ink-faint)' }}>{t('element_header')}</span>
              <span className="text-[9px] font-display uppercase tracking-wider text-right self-center" style={{ color: 'var(--ink-faint)' }}>{t('header_dmg')}</span>
              <span className="text-[9px] font-display uppercase tracking-wider text-right self-center" style={{ color: 'var(--ink-faint)' }}>{t('header_res')}</span>
              <span className="text-[9px] font-display uppercase tracking-wider text-right self-center" style={{ color: 'var(--ink-faint)' }}>{t('header_res_pct')}</span>
            </div>
            <div className="p-2 space-y-1 bg-surface-void">
              <ElementRow icon="strength"     label={t('elem_earth')}    color="var(--earth)"   damage={s.earthDamage}    resFixed={s.earthResFixed}   resPercent={s.earthResPercent} />
              <ElementRow icon="intelligence" label={t('elem_fire')}     color="var(--fire)"    damage={s.fireDamage}     resFixed={s.fireResFixed}    resPercent={s.fireResPercent} />
              <ElementRow icon="chance"       label={t('elem_water')}    color="var(--water)"   damage={s.waterDamage}    resFixed={s.waterResFixed}   resPercent={s.waterResPercent} />
              <ElementRow icon="agility"      label={t('elem_air')}      color="var(--air)"     damage={s.airDamage}      resFixed={s.airResFixed}     resPercent={s.airResPercent} />
              <ElementRow icon="neutral"      label={t('elem_neutral')}  color="var(--neutral)" damage={s.neutralDamage}  resFixed={s.neutralResFixed} resPercent={s.neutralResPercent} />
              <div className="my-0.5" style={{ borderTop: '1px solid var(--metal-edge)' }} />
              <ElementRow icon="crit_damage"  label={t('elem_critical')} color="var(--crit)"    damage={s.critDamage}     resFixed={s.critResistance}  showPercent={false} />
              <ElementRow icon="push_damage"  label={t('elem_push')}     color="var(--earth)"   damage={s.pushbackDamage} resFixed={s.pushbackResist}  showPercent={false} />
            </div>
          </div>

          {/* % damage / resistance modifiers */}
          {(s.meleeDamagePercent || s.rangedDamagePercent || s.spellDamagePercent || s.weaponDamagePercent || s.meleeResistPercent || s.rangedResistPercent) > 0 && (
            <div className="grid grid-cols-2 gap-0.5">
              <CombatStat icon="melee_damage"      label={t('stat_melee_dmg')}  value={s.meleeDamagePercent}  fmt="pct" />
              <CombatStat icon="ranged_damage"     label={t('stat_ranged_dmg')} value={s.rangedDamagePercent} fmt="pct" />
              <CombatStat icon="spell_damage"      label={t('stat_spell_dmg')}  value={s.spellDamagePercent}  fmt="pct" />
              <CombatStat icon="weapon_damage"     label={t('stat_weapon_dmg')} value={s.weaponDamagePercent} fmt="pct" />
              <CombatStat icon="melee_resistance"  label={t('stat_melee_res')}  value={s.meleeResistPercent}  fmt="pct" />
              <CombatStat icon="ranged_resistance" label={t('stat_ranged_res')} value={s.rangedResistPercent} fmt="pct" />
            </div>
          )}

        </div>
      )}
    </div>
  )
}
