import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import type { StatBlock } from '@/engine/types.ts'
import { SetBonusesPanel } from '../equipment/SetBonusesPanel.tsx'

const BASE = import.meta.env.BASE_URL

function icon(name: string, size = 16, color?: string) {
  return (
    <img
      src={`${BASE}data/stats/${name}.png`}
      alt=""
      width={size}
      height={size}
      className="object-contain flex-shrink-0"
      style={color ? { filter: `drop-shadow(0 0 3px ${color}66)` } : undefined}
    />
  )
}

// ── Top badges (AP / MP / HP / Range) ───────────────────────────────────────

type BadgeProps = {
  iconName: string
  label:    string
  value:    number
  color:    string
}

function TopBadge({ iconName, label, value, color }: BadgeProps) {
  return (
    <div
      className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg flex-1"
      style={{ background: '#080c14', border: '1px solid #1c2333' }}
    >
      <div className="flex items-center gap-1.5">
        {icon(iconName, 18, color)}
        <span
          className="font-mono font-bold text-xl leading-none tabular-nums"
          style={{ color, textShadow: `0 0 10px ${color}55` }}
        >
          {value}
        </span>
      </div>
      <span className="text-[9px] uppercase tracking-widest" style={{ color: '#3a4268' }}>{label}</span>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: '#080c14', border: '1px solid #1c2333' }}
    >
      <div
        className="px-3 py-1.5"
        style={{ borderBottom: '1px solid #1c2333', background: '#0a0e18' }}
      >
        <h3 className="font-display text-forge-gold text-[10px] uppercase tracking-widest">{title}</h3>
      </div>
      <div className="px-3 py-2">
        {children}
      </div>
    </div>
  )
}

// ── Element table ─────────────────────────────────────────────────────────────

type ElemRow = {
  iconName:  string
  label:     string
  color:     string
  dmg:       number
  resFixed:  number
  resPct:    number
  steal?:    number
}

function fmtNum(v: number, suffix = ''): string {
  if (v === 0) return '—'
  return `${v > 0 ? '+' : ''}${v}${suffix}`
}

function ElemTableRow({ iconName, label, color, dmg, resFixed, resPct, steal }: ElemRow) {
  const allZero = dmg === 0 && resFixed === 0 && resPct === 0 && (steal ?? 0) === 0
  return (
    <tr style={{ opacity: allZero ? 0.35 : 1 }}>
      <td className="py-0.5 pr-2">
        <div className="flex items-center gap-1.5">
          {icon(iconName, 14, color)}
          <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
        </div>
      </td>
      <td className="py-0.5 px-2 text-right font-mono font-bold text-[11px] tabular-nums"
        style={{ color: dmg !== 0 ? color : '#3a4268' }}>
        {fmtNum(dmg)}
      </td>
      <td className="py-0.5 px-2 text-right font-mono font-bold text-[11px] tabular-nums"
        style={{ color: resFixed !== 0 ? color : '#3a4268' }}>
        {fmtNum(resFixed)}
      </td>
      <td className="py-0.5 pl-2 text-right font-mono font-bold text-[11px] tabular-nums"
        style={{ color: resPct !== 0 ? color : '#3a4268' }}>
        {fmtNum(resPct, '%')}
      </td>
      {steal !== undefined && (
        <td className="py-0.5 pl-2 text-right font-mono font-bold text-[11px] tabular-nums"
          style={{ color: steal !== 0 ? color : '#3a4268' }}>
          {fmtNum(steal)}
        </td>
      )}
    </tr>
  )
}

function ElementTable({ s }: { s: StatBlock }) {
  const hasAnySteal = s.earthSteal + s.fireSteal + s.waterSteal + s.airSteal + s.neutralSteal + s.bestElemSteal > 0

  const rows: ElemRow[] = [
    { iconName: 'strength',      label: 'Earth',   color: '#c49a2a', dmg: s.earthDamage,   resFixed: s.earthResFixed,   resPct: s.earthResPercent,   steal: s.earthSteal   },
    { iconName: 'intelligence',  label: 'Fire',    color: '#dc4e22', dmg: s.fireDamage,    resFixed: s.fireResFixed,    resPct: s.fireResPercent,    steal: s.fireSteal    },
    { iconName: 'chance',        label: 'Water',   color: '#2a8fd4', dmg: s.waterDamage,   resFixed: s.waterResFixed,   resPct: s.waterResPercent,   steal: s.waterSteal   },
    { iconName: 'agility',       label: 'Air',     color: '#6ab04c', dmg: s.airDamage,     resFixed: s.airResFixed,     resPct: s.airResPercent,     steal: s.airSteal     },
    { iconName: 'neutral_damage',label: 'Neutral', color: '#9b9b9b', dmg: s.neutralDamage, resFixed: s.neutralResFixed, resPct: s.neutralResPercent, steal: s.neutralSteal },
  ]

  return (
    <Section title="Elements">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left pb-1.5" />
            <th className="text-right pb-1.5 text-[9px] uppercase tracking-widest font-normal" style={{ color: '#3a4268' }}>DMG</th>
            <th className="text-right pb-1.5 text-[9px] uppercase tracking-widest font-normal" style={{ color: '#3a4268' }}>RES</th>
            <th className="text-right pb-1.5 text-[9px] uppercase tracking-widest font-normal pl-2" style={{ color: '#3a4268' }}>% RES</th>
            {hasAnySteal && (
              <th className="text-right pb-1.5 text-[9px] uppercase tracking-widest font-normal pl-2" style={{ color: '#3a4268' }}>STEAL</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <ElemTableRow key={r.label} {...r} steal={hasAnySteal ? r.steal : undefined} />
          ))}
          {/* Critical row */}
          <tr style={{ opacity: s.critDamage === 0 && s.critResistance === 0 ? 0.35 : 1 }}>
            <td className="pt-1.5 py-0.5 pr-2">
              <div className="flex items-center gap-1.5">
                {icon('crit_damage', 14, '#f5a623')}
                <span className="text-[11px] font-medium" style={{ color: '#f5a623' }}>Critical</span>
              </div>
            </td>
            <td className="pt-1.5 py-0.5 px-2 text-right font-mono font-bold text-[11px] tabular-nums"
              style={{ color: s.critDamage !== 0 ? '#f5a623' : '#3a4268' }}>
              {fmtNum(s.critDamage)}
            </td>
            <td className="pt-1.5 py-0.5 px-2 text-right font-mono font-bold text-[11px] tabular-nums"
              style={{ color: s.critResistance !== 0 ? '#f5a623' : '#3a4268' }}>
              {fmtNum(s.critResistance)}
            </td>
            <td className="pt-1.5 py-0.5 pl-2 text-right text-[11px]" style={{ color: '#3a4268' }}>—</td>
            {hasAnySteal && <td />}
          </tr>
          {/* Push row */}
          <tr style={{ opacity: s.pushbackDamage === 0 && s.pushbackResist === 0 ? 0.35 : 1 }}>
            <td className="py-0.5 pr-2">
              <div className="flex items-center gap-1.5">
                {icon('push_damage', 14, '#b8860b')}
                <span className="text-[11px] font-medium" style={{ color: '#b8860b' }}>Push</span>
              </div>
            </td>
            <td className="py-0.5 px-2 text-right font-mono font-bold text-[11px] tabular-nums"
              style={{ color: s.pushbackDamage !== 0 ? '#b8860b' : '#3a4268' }}>
              {fmtNum(s.pushbackDamage)}
            </td>
            <td className="py-0.5 px-2 text-right font-mono font-bold text-[11px] tabular-nums"
              style={{ color: s.pushbackResist !== 0 ? '#b8860b' : '#3a4268' }}>
              {fmtNum(s.pushbackResist)}
            </td>
            <td className="py-0.5 pl-2 text-right text-[11px]" style={{ color: '#3a4268' }}>—</td>
            {hasAnySteal && <td />}
          </tr>
        </tbody>
      </table>
    </Section>
  )
}

// ── Stat icon row (combat stats grid) ────────────────────────────────────────

type CombatStat = { iconName: string; label: string; value: number; color: string; suffix?: string }

function CombatStatCell({ iconName, label, value, color, suffix = '' }: CombatStat) {
  if (value === 0) return null
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1.5 rounded"
      style={{ background: '#0d1018' }}
    >
      {icon(iconName, 14, color)}
      <div className="flex flex-col min-w-0">
        <span
          className="font-mono font-bold text-xs tabular-nums leading-none"
          style={{ color, textShadow: `0 0 6px ${color}44` }}
        >
          {value > 0 ? '+' : ''}{value}{suffix}
        </span>
        <span className="text-[8px] uppercase tracking-wide truncate" style={{ color: '#3a4268' }}>{label}</span>
      </div>
    </div>
  )
}

function CombatGrid({ s }: { s: StatBlock }) {
  const cells: CombatStat[] = [
    { iconName: 'initiative',   label: 'Initiative',   value: s.initiative,        color: '#c9a84c' },
    { iconName: 'lock',         label: 'Lock',         value: s.lock,              color: '#b8860b' },
    { iconName: 'dodge',        label: 'Dodge',        value: s.dodge,             color: '#6ab04c' },
    { iconName: 'heals',        label: 'Heals',        value: s.heals,             color: '#e05252' },
    { iconName: 'power',        label: 'Power',        value: s.power,             color: '#c9a84c' },
    { iconName: 'crit',         label: 'Crit %',       value: s.critChance,        color: '#f5a623', suffix: '%' },
    { iconName: 'prospecting',  label: 'Prospecting',  value: s.prospecting,       color: '#c9a84c' },
    { iconName: 'summons',      label: 'Summons',      value: s.summons,           color: '#9b6dff' },
    { iconName: 'ap_parry',     label: 'AP Parry',     value: s.apParry,           color: '#2a8fd4' },
    { iconName: 'mp_parry',     label: 'MP Parry',     value: s.mpParry,           color: '#2a8fd4' },
    { iconName: 'ap_reduction', label: 'AP Remove',    value: s.apReduction,       color: '#9b6dff' },
    { iconName: 'mp_reduction', label: 'MP Remove',    value: s.mpReduction,       color: '#9b6dff' },
  ]

  const visible = cells.filter(c => c.value !== 0)
  if (visible.length === 0) return null

  return (
    <Section title="Combat">
      <div className="grid grid-cols-2 gap-1">
        {visible.map(c => (
          <CombatStatCell key={c.label} {...c} />
        ))}
      </div>
    </Section>
  )
}

// ── % Damage modifiers ────────────────────────────────────────────────────────

function DamageMods({ s }: { s: StatBlock }) {
  type Mod = { iconName: string; label: string; value: number; color: string }
  const mods: Mod[] = [
    { iconName: 'melee_damage',  label: '% Melee DMG',  value: s.meleeDamagePercent,  color: '#c49a2a' },
    { iconName: 'ranged_damage', label: '% Ranged DMG', value: s.rangedDamagePercent, color: '#2a8fd4' },
    { iconName: 'spell_damage',  label: '% Spell DMG',  value: s.spellDamagePercent,  color: '#9b6dff' },
    { iconName: 'weapon_damage', label: '% Weapon DMG', value: s.weaponDamagePercent, color: '#c9a84c' },
    { iconName: 'melee_damage',  label: '% Melee RES',  value: s.meleeResistPercent,  color: '#c49a2a' },
    { iconName: 'ranged_damage', label: '% Ranged RES', value: s.rangedResistPercent, color: '#2a8fd4' },
  ]
  const visible = mods.filter(m => m.value !== 0)
  if (visible.length === 0) return null

  return (
    <Section title="Damage Modifiers">
      <div className="space-y-0.5">
        {visible.map(m => (
          <div key={m.label} className="flex items-center gap-1.5 py-0.5">
            {icon(m.iconName, 13, m.color)}
            <span className="text-[11px] flex-1" style={{ color: '#5a6480' }}>{m.label}</span>
            <span className="font-mono font-bold text-[11px] tabular-nums" style={{ color: m.color }}>
              {m.value > 0 ? '+' : ''}{m.value}%
            </span>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── Characteristics section ───────────────────────────────────────────────────

type CharStat = { iconName: string; label: string; value: number; color: string }

function CharRow({ iconName, label, value, color }: CharStat) {
  const dimmed = value === 0
  return (
    <div className="flex items-center gap-2 py-0.5" style={{ opacity: dimmed ? 0.4 : 1 }}>
      {icon(iconName, 14, dimmed ? undefined : color)}
      <span className="text-[11px] flex-1" style={{ color: dimmed ? '#3a4268' : '#5a6480' }}>{label}</span>
      <span
        className="font-mono font-bold text-xs tabular-nums"
        style={{ color: dimmed ? '#3a4268' : color }}
      >
        {value > 0 ? '+' : ''}{value}
      </span>
    </div>
  )
}

function CharacteristicsSection({ s }: { s: StatBlock }) {
  const chars: CharStat[] = [
    { iconName: 'vitality',     label: 'Vitality',      value: s.vitality,     color: '#e05252' },
    { iconName: 'wisdom',       label: 'Wisdom',         value: s.wisdom,       color: '#9b6dff' },
    { iconName: 'strength',     label: 'Strength',       value: s.strength,     color: '#c49a2a' },
    { iconName: 'intelligence', label: 'Intelligence',   value: s.intelligence, color: '#dc4e22' },
    { iconName: 'chance',       label: 'Chance',         value: s.chance,       color: '#2a8fd4' },
    { iconName: 'agility',      label: 'Agility',        value: s.agility,      color: '#6ab04c' },
  ]
  return (
    <Section title="Characteristics">
      {chars.map(c => <CharRow key={c.label} {...c} />)}
    </Section>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

function StatsFromBlock({ s }: { s: StatBlock }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      {/* Top badges: AP / MP / HP / Range */}
      <div className="flex gap-1.5">
        <TopBadge iconName="ap"  label="AP"    value={s.ap}    color="#f5c518" />
        <TopBadge iconName="mp"  label="MP"    value={s.mp}    color="#6ab04c" />
        <TopBadge iconName="vitality" label="HP" value={s.maxHp} color="#e05252" />
        {s.range > 0 && (
          <TopBadge iconName="range" label="Range" value={s.range} color="#2a8fd4" />
        )}
      </div>

      {/* Characteristics */}
      <CharacteristicsSection s={s} />

      {/* Element damage/resistance table */}
      <ElementTable s={s} />

      {/* Combat stats grid */}
      <CombatGrid s={s} />

      {/* % damage modifiers */}
      <DamageMods s={s} />

      {/* Unmapped stats */}
      {Object.keys(s.unknownStats).length > 0 && (
        <details>
          <summary
            className="text-[10px] cursor-pointer select-none py-1"
            style={{ color: '#3a4268' }}
          >
            {t('unmapped_stats', { count: Object.keys(s.unknownStats).length })}
          </summary>
          <div
            className="mt-1 rounded-lg px-3 py-2 space-y-0.5"
            style={{ background: '#080c14', border: '1px solid #1c2333' }}
          >
            {Object.entries(s.unknownStats).map(([k, v]) => (
              <div key={k} className="flex justify-between text-[10px]">
                <span style={{ color: '#3a4268' }}>{k}</span>
                <span className="font-mono" style={{ color: '#4a5268' }}>{v > 0 ? '+' : ''}{v}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Set bonuses */}
      <SetBonusesPanel />
    </div>
  )
}

export function StatsPanel() {
  const { t }         = useTranslation()
  const stats         = useBuildStore(s => s.stats)
  const selectedClass = useBuildStore(s => s.selectedClass)

  if (!selectedClass) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-forge-muted text-sm text-center space-y-2">
        <span className="text-3xl" aria-hidden="true">⚒</span>
        <p>{t('select_class')}</p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-2">
      <h2 className="font-display text-forge-gold text-xs uppercase tracking-widest">{t('stats')}</h2>
      <StatsFromBlock s={stats} />
    </div>
  )
}
