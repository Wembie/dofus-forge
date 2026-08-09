import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import type { StatBlock } from '@/engine/types.ts'
import { SetBonusesPanel } from '../equipment/SetBonusesPanel.tsx'
import { statIconUrl } from '../equipment/statDisplay.ts'

function useT() { return useTranslation().t }

function icon(name: string, size = 16, color?: string) {
  return (
    <img
      src={statIconUrl(name)}
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
  iconName:    string
  dmgIconName: string
  resIconName: string
  label:       string
  color:       string
  dmg:         number
  resFixed:    number
  resPct:      number
  steal?:      number
}

// ── Chip: icon + value, styled by empty/active state ─────────────────────────
function ElemChip({ iconName, value, elemColor, isRes = false, suffix = '' }: {
  iconName: string; value: number; elemColor: string; isRes?: boolean; suffix?: string
}) {
  const empty    = value === 0
  const valColor = empty ? '#2a3347' : isRes ? (value > 0 ? '#6ab04c' : '#dc4e22') : elemColor
  return (
    <div className="flex items-center justify-end gap-1 rounded-md" style={{
      padding: '3px 7px',
      background: empty ? 'transparent' : `${elemColor}14`,
      border:     `1px solid ${empty ? 'transparent' : elemColor + '38'}`,
    }}>
      <img
        src={statIconUrl(iconName)} alt=""
        width={12} height={12}
        style={{ objectFit: 'contain', flexShrink: 0, opacity: empty ? 0.18 : 0.80 }}
      />
      <span className="font-mono font-bold text-[11px] tabular-nums" style={{ color: valColor }}>
        {empty ? '—' : `${value > 0 ? '+' : ''}${value}${suffix}`}
      </span>
    </div>
  )
}

function ElemTableRow({ iconName, dmgIconName, resIconName, label, color, dmg, resFixed, resPct, steal, cols, hasSteal }: ElemRow & { cols: string; hasSteal: boolean }) {
  const hasData = dmg !== 0 || resFixed !== 0 || resPct !== 0 || (steal ?? 0) !== 0
  return (
    <div
      className="grid items-center rounded-lg"
      style={{
        gridTemplateColumns: cols, gap: 4, padding: '5px 8px',
        background:  hasData ? `${color}08` : 'transparent',
        borderLeft:  `2px solid ${hasData ? color + '55' : '#1c2333'}`,
        opacity:     hasData ? 1 : 0.35,
      }}
    >
      <div className="flex items-center gap-2">
        {icon(iconName, 15, color)}
        <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
      </div>
      <ElemChip iconName={dmgIconName} value={dmg}     elemColor={color} />
      <ElemChip iconName={resIconName} value={resFixed} elemColor={color} isRes />
      <ElemChip iconName={resIconName} value={resPct}   elemColor={color} isRes suffix="%" />
      {hasSteal && <ElemChip iconName={dmgIconName} value={steal ?? 0} elemColor={color} />}
    </div>
  )
}

function ElementTable({ s }: { s: StatBlock }) {
  const t        = useT()
  const hasSteal = s.earthSteal + s.fireSteal + s.waterSteal + s.airSteal + s.neutralSteal + s.bestElemSteal > 0
  const cols     = hasSteal ? '1fr 66px 66px 66px 66px' : '1fr 66px 66px 66px'

  const rows: ElemRow[] = [
    { iconName: 'strength',     dmgIconName: 'strength_damage',     resIconName: 'earth_resistance',   label: t('elem_earth'),   color: '#c49a2a', dmg: s.earthDamage,   resFixed: s.earthResFixed,   resPct: s.earthResPercent,   steal: s.earthSteal   },
    { iconName: 'intelligence', dmgIconName: 'intelligence_damage',  resIconName: 'fire_resistance',    label: t('elem_fire'),    color: '#dc4e22', dmg: s.fireDamage,    resFixed: s.fireResFixed,    resPct: s.fireResPercent,    steal: s.fireSteal    },
    { iconName: 'chance',       dmgIconName: 'chance_damage',        resIconName: 'water_resistance',   label: t('elem_water'),   color: '#2a8fd4', dmg: s.waterDamage,   resFixed: s.waterResFixed,   resPct: s.waterResPercent,   steal: s.waterSteal   },
    { iconName: 'agility',      dmgIconName: 'agility_damage',       resIconName: 'air_resistance',     label: t('elem_air'),     color: '#6ab04c', dmg: s.airDamage,     resFixed: s.airResFixed,     resPct: s.airResPercent,     steal: s.airSteal     },
    { iconName: 'neutral',      dmgIconName: 'neutral',              resIconName: 'neutral_resistance', label: t('elem_neutral'), color: '#9b9b9b', dmg: s.neutralDamage, resFixed: s.neutralResFixed, resPct: s.neutralResPercent, steal: s.neutralSteal },
  ]

  const headerStyle: React.CSSProperties = { color: '#3a4268', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right', alignSelf: 'center' }

  return (
    <Section title={t('section_elements')}>
      {/* Column headers — same grid as rows */}
      <div className="grid mb-2" style={{ gridTemplateColumns: cols, gap: 4 }}>
        <span />
        <span style={headerStyle}>{t('header_dmg')}</span>
        <span style={headerStyle}>{t('header_res')}</span>
        <span style={headerStyle}>{t('header_res_pct')}</span>
        {hasSteal && <span style={headerStyle}>{t('header_steal')}</span>}
      </div>

      {/* Element rows */}
      <div className="space-y-1">
        {rows.map(r => (
          <ElemTableRow key={r.label} {...r} cols={cols} hasSteal={hasSteal} />
        ))}

        <div className="my-1" style={{ borderTop: '1px solid #1c2333' }} />

        {/* Crit row — no % resistance */}
        <ElemTableRow
          iconName="crit_damage" dmgIconName="crit_damage" resIconName="crit_res"
          label={t('elem_critical')} color="#f5a623"
          dmg={s.critDamage} resFixed={s.critResistance} resPct={0}
          cols={cols} hasSteal={hasSteal}
        />
        {/* Push row — no % resistance */}
        <ElemTableRow
          iconName="push_damage" dmgIconName="push_damage" resIconName="push_resistance"
          label={t('elem_push')} color="#b8860b"
          dmg={s.pushbackDamage} resFixed={s.pushbackResist} resPct={0}
          cols={cols} hasSteal={hasSteal}
        />
      </div>
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
  const t = useT()
  const cells: CombatStat[] = [
    { iconName: 'initiative',   label: t('stat_initiative'),  value: s.initiative,  color: '#c9a84c' },
    { iconName: 'lock',         label: t('stat_lock'),        value: s.lock,        color: '#b8860b' },
    { iconName: 'dodge',        label: t('stat_dodge'),       value: s.dodge,       color: '#6ab04c' },
    { iconName: 'heals',        label: t('stat_heals'),       value: s.heals,       color: '#e05252' },
    { iconName: 'power',        label: t('stat_power'),       value: s.power,       color: '#c9a84c' },
    { iconName: 'crit',         label: t('stat_crit_chance'), value: s.critChance,  color: '#f5a623', suffix: '%' },
    { iconName: 'prospecting',  label: t('stat_prospecting'), value: s.prospecting, color: '#c9a84c' },
    { iconName: 'summons',      label: t('stat_summons'),     value: s.summons,     color: '#9b6dff' },
    { iconName: 'ap_parry',     label: t('stat_ap_parry'),    value: s.apParry,     color: '#2a8fd4' },
    { iconName: 'mp_parry',     label: t('stat_mp_parry'),    value: s.mpParry,     color: '#2a8fd4' },
    { iconName: 'ap_reduction', label: t('stat_ap_removal'),  value: s.apReduction, color: '#9b6dff' },
    { iconName: 'mp_reduction', label: t('stat_mp_removal'),  value: s.mpReduction, color: '#9b6dff' },
  ]

  const visible = cells.filter(c => c.value !== 0)
  if (visible.length === 0) return null

  return (
    <Section title={t('stats_combat')}>
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
  const t = useT()
  type Mod = { iconName: string; label: string; value: number; color: string }
  const mods: Mod[] = [
    { iconName: 'melee_damage',  label: t('stat_melee_dmg'),   value: s.meleeDamagePercent,  color: '#c49a2a' },
    { iconName: 'ranged_damage', label: t('stat_ranged_dmg'),  value: s.rangedDamagePercent, color: '#2a8fd4' },
    { iconName: 'spell_damage',  label: t('stat_spell_dmg'),   value: s.spellDamagePercent,  color: '#9b6dff' },
    { iconName: 'weapon_damage', label: t('stat_weapon_dmg'),  value: s.weaponDamagePercent, color: '#c9a84c' },
    { iconName: 'melee_resistance',  label: t('stat_melee_res'),   value: s.meleeResistPercent,  color: '#c49a2a' },
    { iconName: 'ranged_resistance', label: t('stat_ranged_res'),  value: s.rangedResistPercent, color: '#2a8fd4' },
  ]
  const visible = mods.filter(m => m.value !== 0)
  if (visible.length === 0) return null

  return (
    <Section title={t('section_damage_mods')}>
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
  const t = useT()
  const chars: CharStat[] = [
    { iconName: 'vitality',     label: t('stat_vitality'),     value: s.vitality,     color: '#e05252' },
    { iconName: 'wisdom',       label: t('stat_wisdom'),       value: s.wisdom,       color: '#9b6dff' },
    { iconName: 'strength',     label: t('stat_strength'),     value: s.strength,     color: '#c49a2a' },
    { iconName: 'intelligence', label: t('stat_intelligence'), value: s.intelligence, color: '#dc4e22' },
    { iconName: 'chance',       label: t('stat_chance'),       value: s.chance,       color: '#2a8fd4' },
    { iconName: 'agility',      label: t('stat_agility'),      value: s.agility,      color: '#6ab04c' },
  ]
  return (
    <Section title={t('characteristics')}>
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
        <TopBadge iconName="ap"       label={t('badge_ap')}    value={s.ap}    color="#f5c518" />
        <TopBadge iconName="mp"       label={t('badge_mp')}    value={s.mp}    color="#6ab04c" />
        <TopBadge iconName="vitality" label={t('badge_hp')}    value={s.maxHp} color="#e05252" />
        {s.range > 0 && (
          <TopBadge iconName="range"  label={t('badge_range')} value={s.range} color="#2a8fd4" />
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
