import { useTranslation } from 'react-i18next'
import { Hammer } from 'lucide-react'
import { useBuildStore } from '@/store/buildStore.ts'
import type { StatBlock } from '@/engine/types.ts'
import { SetBonusesPanel } from '../equipment/SetBonusesPanel.tsx'
import { statIconUrl } from '../equipment/statDisplay.ts'
import { Frame, SectionHeader } from '@/ui'

function icon(name: string, size = 16) {
  return (
    <img
      src={statIconUrl(name)}
      alt=""
      width={size}
      height={size}
      className="object-contain flex-shrink-0"
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
      className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg flex-1 relative overflow-hidden"
      style={{
        background:   'var(--surface-void)',
        borderTop:    `2px solid ${color}`,
        borderRight:  '1px solid var(--metal-edge)',
        borderBottom: '1px solid var(--metal-edge)',
        borderLeft:   '1px solid var(--metal-edge)',
        boxShadow:    `inset 0 0 20px color-mix(in srgb, ${color} 8%, transparent), 0 2px 8px rgba(0,0,0,0.45)`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{ height: 40, background: `linear-gradient(to bottom, color-mix(in srgb, ${color} 12%, transparent), transparent)` }}
      />
      <div className="flex items-center gap-1 relative z-10">
        {icon(iconName, 15)}
        <span
          className="font-display font-bold text-2xl leading-none tabular-nums"
          style={{ color, textShadow: `0 0 14px color-mix(in srgb, ${color} 45%, transparent)` }}
        >
          {value}
        </span>
      </div>
      <span className="text-[8px] uppercase tracking-[0.14em] relative z-10" style={{ color: 'var(--ink-faint)' }}>{label}</span>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Frame material="panel" padding="none">
      <div className="px-3 py-1.5" style={{ borderBottom: '1px solid var(--metal-edge)', background: 'var(--surface-void)' }}>
        <SectionHeader label={title} size="sm" />
      </div>
      <div className="px-3 py-2">{children}</div>
    </Frame>
  )
}

// ── Element table ─────────────────────────────────────────────────────────────

type ElemRow = {
  iconName: string
  label:    string
  color:    string
  dmg:      number
  resFixed: number
  resPct:   number
  steal?:   number
}

function ValCell({ value, color, suffix = '' }: { value: number; color: string; suffix?: string }) {
  return (
    <span className="font-mono font-bold text-[11px] tabular-nums leading-none text-right"
      style={{ color: value === 0 ? 'var(--ink-faint)' : color }}>
      {value === 0 ? '—' : `${value > 0 ? '+' : ''}${value}${suffix}`}
    </span>
  )
}

function ElemTableRow({ iconName, label, color, dmg, resFixed, resPct, steal, cols, hasSteal }: ElemRow & { cols: string; hasSteal: boolean }) {
  const hasData = dmg !== 0 || resFixed !== 0 || resPct !== 0 || (steal ?? 0) !== 0
  return (
    <div
      className="grid items-center rounded-md"
      style={{
        gridTemplateColumns: cols, gap: 6, padding: '5px 8px',
        background:  hasData ? `color-mix(in srgb, ${color} 6%, transparent)` : 'transparent',
        borderLeft:  `2px solid ${hasData ? `color-mix(in srgb, ${color} 25%, transparent)` : 'transparent'}`,
        opacity:     hasData ? 1 : 0.40,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon(iconName, 14)}
        <span className="text-[11px] font-semibold truncate" style={{ color: hasData ? color : 'var(--ink-faint)' }}>{label}</span>
      </div>
      <ValCell value={dmg}     color={color} />
      <ValCell value={resFixed} color={resFixed  > 0 ? 'var(--positive)' : 'var(--negative)'} />
      <ValCell value={resPct}   color={resPct    > 0 ? 'var(--positive)' : 'var(--negative)'} suffix="%" />
      {hasSteal && <ValCell value={steal ?? 0} color={color} />}
    </div>
  )
}

function ElementTable({ s }: { s: StatBlock }) {
  const { t }    = useTranslation()
  const hasSteal = s.earthSteal + s.fireSteal + s.waterSteal + s.airSteal + s.neutralSteal + s.bestElemSteal > 0
  const cols     = hasSteal ? '1fr 44px 44px 48px 44px' : '1fr 44px 44px 48px'

  const rows: ElemRow[] = [
    { iconName: 'strength',     label: t('elem_earth'),   color: 'var(--earth)',   dmg: s.earthDamage,   resFixed: s.earthResFixed,   resPct: s.earthResPercent,   steal: s.earthSteal   },
    { iconName: 'intelligence', label: t('elem_fire'),    color: 'var(--fire)',    dmg: s.fireDamage,    resFixed: s.fireResFixed,    resPct: s.fireResPercent,    steal: s.fireSteal    },
    { iconName: 'chance',       label: t('elem_water'),   color: 'var(--water)',   dmg: s.waterDamage,   resFixed: s.waterResFixed,   resPct: s.waterResPercent,   steal: s.waterSteal   },
    { iconName: 'agility',      label: t('elem_air'),     color: 'var(--air)',     dmg: s.airDamage,     resFixed: s.airResFixed,     resPct: s.airResPercent,     steal: s.airSteal     },
    { iconName: 'neutral',      label: t('elem_neutral'), color: 'var(--neutral)', dmg: s.neutralDamage, resFixed: s.neutralResFixed, resPct: s.neutralResPercent, steal: s.neutralSteal },
  ]

  const headerStyle: React.CSSProperties = { color: 'var(--ink-faint)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right', alignSelf: 'center' }

  return (
    <Section title={t('section_elements')}>
      <div className="grid mb-2" style={{ gridTemplateColumns: cols, gap: 6 }}>
        <span />
        <span style={headerStyle}>{t('header_dmg')}</span>
        <span style={headerStyle}>{t('header_res')}</span>
        <span style={headerStyle}>{t('header_res_pct')}</span>
        {hasSteal && <span style={headerStyle}>{t('header_steal')}</span>}
      </div>

      <div className="space-y-1">
        {rows.map(r => (
          <ElemTableRow key={r.label} {...r} cols={cols} hasSteal={hasSteal} />
        ))}

        <div className="my-1" style={{ borderTop: '1px solid var(--metal-edge)' }} />

        <ElemTableRow
          iconName="crit_damage"
          label={t('elem_critical')} color="var(--crit)"
          dmg={s.critDamage} resFixed={s.critResistance} resPct={0}
          cols={cols} hasSteal={hasSteal}
        />
        <ElemTableRow
          iconName="push_damage"
          label={t('elem_push')} color="var(--earth)"
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
      style={{ background: 'var(--surface-void)' }}
    >
      {icon(iconName, 14)}
      <div className="flex flex-col min-w-0">
        <span className="font-mono font-bold text-xs tabular-nums leading-none" style={{ color }}>
          {value > 0 ? '+' : ''}{value}{suffix}
        </span>
        <span className="text-[8px] uppercase tracking-wide truncate" style={{ color: 'var(--ink-faint)' }}>{label}</span>
      </div>
    </div>
  )
}

function CombatGrid({ s }: { s: StatBlock }) {
  const { t } = useTranslation()
  const cells: CombatStat[] = [
    { iconName: 'initiative',   label: t('stat_initiative'),  value: s.initiative,  color: 'var(--gold)'   },
    { iconName: 'lock',         label: t('stat_lock'),        value: s.lock,        color: 'var(--earth)'  },
    { iconName: 'dodge',        label: t('stat_dodge'),       value: s.dodge,       color: 'var(--air)'    },
    { iconName: 'heals',        label: t('stat_heals'),       value: s.heals,       color: 'var(--vitality)' },
    { iconName: 'power',        label: t('stat_power'),       value: s.power,       color: 'var(--gold)'   },
    { iconName: 'crit',         label: t('stat_crit_chance'), value: s.critChance,  color: 'var(--crit)',   suffix: '%' },
    { iconName: 'prospecting',  label: t('stat_prospecting'), value: s.prospecting, color: 'var(--gold)'   },
    { iconName: 'summons',      label: t('stat_summons'),     value: s.summons,     color: 'var(--wisdom)'  },
    { iconName: 'ap_parry',     label: t('stat_ap_parry'),    value: s.apParry,     color: 'var(--ap)'     },
    { iconName: 'mp_parry',     label: t('stat_mp_parry'),    value: s.mpParry,     color: 'var(--ap)'     },
    { iconName: 'ap_reduction', label: t('stat_ap_removal'),  value: s.apReduction, color: 'var(--wisdom)'  },
    { iconName: 'mp_reduction', label: t('stat_mp_removal'),  value: s.mpReduction, color: 'var(--wisdom)'  },
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
  const { t } = useTranslation()
  type Mod = { iconName: string; label: string; value: number; color: string }
  const mods: Mod[] = [
    { iconName: 'melee_damage',       label: t('stat_melee_dmg'),  value: s.meleeDamagePercent,  color: 'var(--earth)' },
    { iconName: 'ranged_damage',      label: t('stat_ranged_dmg'), value: s.rangedDamagePercent, color: 'var(--water)' },
    { iconName: 'spell_damage',       label: t('stat_spell_dmg'),  value: s.spellDamagePercent,  color: 'var(--wisdom)' },
    { iconName: 'weapon_damage',      label: t('stat_weapon_dmg'), value: s.weaponDamagePercent, color: 'var(--gold)'  },
    { iconName: 'melee_resistance',   label: t('stat_melee_res'),  value: s.meleeResistPercent,  color: 'var(--earth)' },
    { iconName: 'ranged_resistance',  label: t('stat_ranged_res'), value: s.rangedResistPercent, color: 'var(--water)' },
  ]
  const visible = mods.filter(m => m.value !== 0)
  if (visible.length === 0) return null

  return (
    <Section title={t('section_damage_mods')}>
      <div className="space-y-0.5">
        {visible.map(m => (
          <div key={m.label} className="flex items-center gap-1.5 py-0.5">
            {icon(m.iconName, 13)}
            <span className="text-[11px] flex-1" style={{ color: 'var(--ink-muted)' }}>{m.label}</span>
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
      {icon(iconName, 14)}
      <span className="text-[11px] flex-1" style={{ color: dimmed ? 'var(--ink-faint)' : 'var(--ink-muted)' }}>{label}</span>
      <span className="font-mono font-bold text-xs tabular-nums" style={{ color: dimmed ? 'var(--ink-faint)' : color }}>
        {value > 0 ? '+' : ''}{value}
      </span>
    </div>
  )
}

function CharacteristicsSection({ s }: { s: StatBlock }) {
  const { t } = useTranslation()
  const chars: CharStat[] = [
    { iconName: 'vitality',     label: t('stat_vitality'),     value: s.vitality,     color: 'var(--vitality)' },
    { iconName: 'wisdom',       label: t('stat_wisdom'),       value: s.wisdom,       color: 'var(--wisdom)'   },
    { iconName: 'strength',     label: t('stat_strength'),     value: s.strength,     color: 'var(--earth)'    },
    { iconName: 'intelligence', label: t('stat_intelligence'), value: s.intelligence, color: 'var(--fire)'     },
    { iconName: 'chance',       label: t('stat_chance'),       value: s.chance,       color: 'var(--water)'    },
    { iconName: 'agility',      label: t('stat_agility'),      value: s.agility,      color: 'var(--air)'      },
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
        <TopBadge iconName="ap"       label={t('badge_ap')}    value={s.ap}    color="var(--gold)"     />
        <TopBadge iconName="mp"       label={t('badge_mp')}    value={s.mp}    color="var(--mp)"       />
        <TopBadge iconName="vitality" label={t('badge_hp')}    value={s.maxHp} color="var(--vitality)" />
        {s.range > 0 && (
          <TopBadge iconName="range"  label={t('badge_range')} value={s.range} color="var(--water)"    />
        )}
      </div>

      <CharacteristicsSection s={s} />
      <ElementTable s={s} />
      <CombatGrid s={s} />
      <DamageMods s={s} />

      {Object.keys(s.unknownStats).length > 0 && (
        <details>
          <summary className="text-[10px] cursor-pointer select-none py-1" style={{ color: 'var(--ink-faint)' }}>
            {t('unmapped_stats', { count: Object.keys(s.unknownStats).length })}
          </summary>
          <Frame material="panel" padding="xs" className="mt-1 space-y-0.5">
            {Object.entries(s.unknownStats).map(([k, v]) => (
              <div key={k} className="flex justify-between text-[10px]">
                <span style={{ color: 'var(--ink-faint)' }}>{k}</span>
                <span className="font-mono" style={{ color: 'var(--ink-muted)' }}>{v > 0 ? '+' : ''}{v}</span>
              </div>
            ))}
          </Frame>
        </details>
      )}

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
        <Hammer size={28} aria-hidden="true" />
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
