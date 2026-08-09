import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { pointCost, statBudget, SCROLL_BONUS } from '@/engine/characteristics.ts'
import { CHARACTERISTICS, type Characteristic } from '@/engine/types.ts'
import type { StatBlock } from '@/engine/types.ts'
import { statIconUrl } from '../equipment/statDisplay.ts'

const CHAR_COLOR: Record<Characteristic, string> = {
  vitality:     '#e05252',
  wisdom:       '#9b6dff',
  strength:     '#c49a2a',
  intelligence: '#dc4e22',
  chance:       '#2a8fd4',
  agility:      '#6ab04c',
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
function StatIcon({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  return (
    <img
      src={statIconUrl(name)}
      alt=""
      width={size}
      height={size}
      style={{ objectFit: 'contain', flexShrink: 0, filter: color ? `drop-shadow(0 0 3px ${color}88)` : undefined }}
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
  onAdd:          (n: number) => void
  onRemove:       (n: number) => void
  onToggleScroll: () => void
}

function CharacteristicRow({ char, allocated, total, isScrolled, remaining, onAdd, onRemove, onToggleScroll }: RowProps) {
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
    border: '1px solid #2a3347', borderRadius: 4,
    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 14, cursor: 'pointer', userSelect: 'none', flexShrink: 0,
    background: 'transparent', transition: 'border-color 0.1s, color 0.1s',
  }

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
      style={{ background: '#0d1018' }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#111620'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#0d1018'}
    >
      {/* Icon */}
      <StatIcon name={char} size={22} color={color} />

      {/* Name */}
      <span className="text-xs font-medium select-none" style={{ color, minWidth: 74, flexShrink: 0 }}>
        {t(`stat_${char}`)}
      </span>

      {/* Total value */}
      <span
        className="font-mono font-bold text-sm tabular-nums flex-1 text-right pr-2"
        style={{ color }}
      >
        {total.toLocaleString()}
      </span>

      {/* Controls */}
      <button
        {...removeProps}
        disabled={allocated <= 0}
        style={{ ...btnBase, color: '#7a8499', opacity: allocated <= 0 ? 0.25 : 1 }}
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
        className="text-center font-mono font-bold text-xs focus:outline-none"
        style={{
          width: 44, background: 'transparent',
          border: '1px solid transparent', borderRadius: 3,
          color, MozAppearance: 'textfield', padding: '1px 2px',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#2a3347')}
        onMouseLeave={e => { if (!focused.current) e.currentTarget.style.borderColor = 'transparent' }}
        aria-label={`${t(`stat_${char}`)} points`}
      />

      <button
        {...addProps}
        disabled={!canAdd}
        style={{ ...btnBase, color: '#7a8499', opacity: !canAdd ? 0.25 : 1 }}
        aria-label={`Add ${t(`stat_${char}`)}`}
      >+</button>

      {/* Scroll badge */}
      <button
        onClick={onToggleScroll}
        title={t('scroll_title', { bonus: SCROLL_BONUS })}
        className="flex-shrink-0 flex items-center justify-center text-[9px] font-bold transition-all"
        style={isScrolled ? {
          width: 18, height: 18, borderRadius: 3,
          background: '#c9a84c', color: '#0d0f14', border: '1px solid #c9a84c',
        } : {
          width: 18, height: 18, borderRadius: 3,
          background: 'transparent', color: '#3a4060', border: '1px solid #2a3347',
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
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: '#0a0d14' }}>
      <StatIcon name={icon} size={14} />
      <span className="text-[9px] text-forge-muted/60 flex-1 leading-none">{label}</span>
      <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: color ?? '#c8cad4' }}>
        {display}
      </span>
    </div>
  )
}

// ── Element chip (icon + value, styled by state) ──────────────────────────────
function ElemChip({ iconName, value, elemColor, isRes = false, suffix = '' }: {
  iconName: string; value: number; elemColor: string; isRes?: boolean; suffix?: string
}) {
  const empty    = value === 0
  const valColor = empty ? '#2a3347' : isRes ? (value > 0 ? '#6ab04c' : '#dc4e22') : elemColor
  return (
    <div className="flex items-center justify-end gap-1 rounded-md" style={{
      padding: '3px 6px',
      background: empty ? 'transparent' : `${elemColor}14`,
      border:     `1px solid ${empty ? 'transparent' : elemColor + '38'}`,
    }}>
      <img
        src={statIconUrl(iconName)} alt=""
        width={11} height={11}
        style={{ objectFit: 'contain', flexShrink: 0, opacity: empty ? 0.18 : 0.80 }}
      />
      <span className="font-mono font-bold text-[11px] tabular-nums" style={{ color: valColor }}>
        {empty ? '—' : `${value > 0 ? '+' : ''}${value}${suffix}`}
      </span>
    </div>
  )
}

// ── Element damage/resistance row ─────────────────────────────────────────────
const ELEM_COLS = '1fr 62px 62px 62px'

function ElementRow({ icon, dmgIcon, resIcon, label, color, damage, resFixed, resPercent, showPercent = true }: {
  icon: string; dmgIcon: string; resIcon: string
  label: string; color: string
  damage: number; resFixed: number; resPercent?: number; showPercent?: boolean
}) {
  const hasData = damage !== 0 || resFixed !== 0 || (resPercent ?? 0) !== 0
  return (
    <div
      className="grid items-center rounded-lg"
      style={{
        gridTemplateColumns: ELEM_COLS, gap: 4, padding: '5px 8px',
        background:   hasData ? `${color}08` : 'transparent',
        borderLeft:   `2px solid ${hasData ? color + '55' : '#1c2333'}`,
        opacity:      hasData ? 1 : 0.38,
      }}
    >
      <div className="flex items-center gap-1.5">
        <StatIcon name={icon} size={14} />
        <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
      </div>
      <ElemChip iconName={dmgIcon} value={damage}         elemColor={color} />
      <ElemChip iconName={resIcon} value={resFixed}       elemColor={color} isRes />
      {showPercent
        ? <ElemChip iconName={resIcon} value={resPercent ?? 0} elemColor={color} isRes suffix="%" />
        : <div />
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
        style={{ background: '#0d1018', border: '1px solid #1c2333' }}
      >
        <span className="font-display text-forge-gold text-xs uppercase tracking-widest">{t('combat_stats')}</span>
        <span className="text-[9px]" style={{ color: '#3a4268' }}>{showCombat ? '▲' : '▼'}</span>
      </button>

      {showCombat && (
        <div className="space-y-2">

          {/* HP + AP/MP/Range row */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #1a0808 0%, #0d1018 100%)', border: '1px solid #2a1515' }}
          >
            <StatIcon name="vitality" size={28} color="#e05252" />
            <div>
              <div className="font-mono font-bold text-lg leading-none" style={{ color: '#e05252' }}>
                {s.maxHp.toLocaleString()}
              </div>
              <div className="text-[9px] text-forge-muted/50 leading-none mt-0.5">{t('badge_hp')}</div>
            </div>
            <div className="ml-auto flex gap-3">
              {[
                { icon: 'ap',    label: t('badge_ap'),    value: s.ap,    color: '#f5c518' },
                { icon: 'mp',    label: t('badge_mp'),    value: s.mp,    color: '#6ab04c' },
                { icon: 'range', label: t('badge_range'), value: s.range, color: '#2a8fd4' },
              ].map(({ icon, label, value, color }) => (
                <div key={icon} className="flex flex-col items-center">
                  <StatIcon name={icon} size={18} color={color} />
                  <span className="font-mono font-bold text-[11px] tabular-nums leading-none mt-0.5" style={{ color }}>
                    {value}
                  </span>
                  <span className="text-[8px] text-forge-muted/40 leading-none">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary stats grid */}
          <div className="grid grid-cols-2 gap-0.5">
            <CombatStat icon="initiative"  label={t('stat_initiative')}  value={s.initiative}  color="#c9a84c" />
            <CombatStat icon="lock"        label={t('stat_lock')}        value={s.lock}        color="#b8860b" />
            <CombatStat icon="dodge"       label={t('stat_dodge')}       value={s.dodge}       color="#6ab04c" />
            <CombatStat icon="prospecting" label={t('stat_prospecting')} value={s.prospecting} color="#c9a84c" />
            <CombatStat icon="summons"     label={t('stat_summons')}     value={s.summons}     color="#9b6dff" />
            <CombatStat icon="heals"       label={t('stat_heals')}       value={s.heals}       color="#e05252" />
            <CombatStat icon="power"       label={t('stat_power')}       value={s.power}       color="#c9a84c" />
            <CombatStat icon="crit"        label={t('stat_crit_chance')} value={s.critChance}  color="#dc4e22" fmt="pct" />
            <CombatStat icon="ap_reduction" label={t('stat_ap_removal')} value={s.apReduction} color="#9b6dff" />
            <CombatStat icon="mp_reduction" label={t('stat_mp_removal')} value={s.mpReduction} color="#9b6dff" />
            <CombatStat icon="ap_parry"    label={t('stat_ap_parry')}    value={s.apParry}     color="#2a8fd4" />
            <CombatStat icon="mp_parry"    label={t('stat_mp_parry')}    value={s.mpParry}     color="#2a8fd4" />
          </div>

          {/* Elemental damage / resistance */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1c2333' }}>
            {/* Column headers — same grid as ElementRow */}
            <div className="grid px-3 py-1.5" style={{ gridTemplateColumns: ELEM_COLS, gap: 4, background: '#0d1018', borderBottom: '1px solid #1c2333' }}>
              <span className="text-[9px] font-display uppercase tracking-wider self-center" style={{ color: '#3a4268' }}>{t('element_header')}</span>
              <span className="text-[9px] font-display uppercase tracking-wider text-right self-center" style={{ color: '#3a4268' }}>{t('header_dmg')}</span>
              <span className="text-[9px] font-display uppercase tracking-wider text-right self-center" style={{ color: '#3a4268' }}>{t('header_res')}</span>
              <span className="text-[9px] font-display uppercase tracking-wider text-right self-center" style={{ color: '#3a4268' }}>{t('header_res_pct')}</span>
            </div>
            <div className="p-2 space-y-1" style={{ background: '#080c14' }}>
              <ElementRow icon="strength"     dmgIcon="strength_damage"     resIcon="earth_resistance"   label={t('elem_earth')}    color="#c49a2a" damage={s.earthDamage}    resFixed={s.earthResFixed}   resPercent={s.earthResPercent} />
              <ElementRow icon="intelligence" dmgIcon="intelligence_damage"  resIcon="fire_resistance"    label={t('elem_fire')}     color="#dc4e22" damage={s.fireDamage}     resFixed={s.fireResFixed}    resPercent={s.fireResPercent} />
              <ElementRow icon="chance"       dmgIcon="chance_damage"        resIcon="water_resistance"   label={t('elem_water')}    color="#2a8fd4" damage={s.waterDamage}    resFixed={s.waterResFixed}   resPercent={s.waterResPercent} />
              <ElementRow icon="agility"      dmgIcon="agility_damage"       resIcon="air_resistance"     label={t('elem_air')}      color="#6ab04c" damage={s.airDamage}      resFixed={s.airResFixed}     resPercent={s.airResPercent} />
              <ElementRow icon="neutral"      dmgIcon="neutral"              resIcon="neutral_resistance" label={t('elem_neutral')}  color="#9b9b9b" damage={s.neutralDamage}   resFixed={s.neutralResFixed} resPercent={s.neutralResPercent} />
              <div className="my-0.5" style={{ borderTop: '1px solid #1c2333' }} />
              <ElementRow icon="crit_damage"  dmgIcon="crit_damage"          resIcon="crit_res"           label={t('elem_critical')} color="#f5a623" damage={s.critDamage}     resFixed={s.critResistance}  showPercent={false} />
              <ElementRow icon="push_damage"  dmgIcon="push_damage"          resIcon="push_resistance"    label={t('elem_push')}     color="#b8860b" damage={s.pushbackDamage} resFixed={s.pushbackResist}  showPercent={false} />
            </div>
          </div>

          {/* % damage / resistance modifiers (only show if non-zero) */}
          {(s.meleeDamagePercent || s.rangedDamagePercent || s.spellDamagePercent || s.weaponDamagePercent || s.meleeResistPercent || s.rangedResistPercent) > 0 && (
            <div className="grid grid-cols-2 gap-0.5">
              <CombatStat icon="melee_damage"      label={t('stat_melee_dmg')}   value={s.meleeDamagePercent}  fmt="pct" />
              <CombatStat icon="ranged_damage"     label={t('stat_ranged_dmg')}  value={s.rangedDamagePercent} fmt="pct" />
              <CombatStat icon="spell_damage"      label={t('stat_spell_dmg')}   value={s.spellDamagePercent}  fmt="pct" />
              <CombatStat icon="weapon_damage"     label={t('stat_weapon_dmg')}  value={s.weaponDamagePercent} fmt="pct" />
              <CombatStat icon="melee_resistance"  label={t('stat_melee_res')}   value={s.meleeResistPercent}  fmt="pct" />
              <CombatStat icon="ranged_resistance" label={t('stat_ranged_res')}  value={s.rangedResistPercent} fmt="pct" />
            </div>
          )}

        </div>
      )}
    </div>
  )
}
