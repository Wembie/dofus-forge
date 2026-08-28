import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import type { StatBlock } from '@/engine/types.ts'
import { statIconUrl } from '../equipment/statDisplay.ts'

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

// ── Section with gold-accent line title ───────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-display uppercase tracking-[0.22em] font-bold flex-shrink-0"
          style={{ color: 'var(--gold)' }}
        >
          {title}
        </span>
        <div
          className="flex-1"
          style={{ height: 1, background: 'linear-gradient(to right, var(--gold-deep), transparent)' }}
        />
      </div>
      {children}
    </div>
  )
}

// ── Top badges (AP / MP / HP / Range) ────────────────────────────────────────

type BadgeProps = {
  iconName: string
  label:    string
  value:    number
  color:    string
}

function TopBadge({ iconName, label, value, color }: BadgeProps) {
  const numClass = value >= 10000
    ? 'text-base'
    : value >= 1000
    ? 'text-xl'
    : value >= 100
    ? 'text-2xl'
    : 'text-3xl'

  return (
    <div
      className="flex flex-col items-center gap-1 px-2 py-3.5 rounded-xl flex-1 relative min-w-0"
      style={{
        background: `linear-gradient(155deg, color-mix(in srgb, ${color} 12%, var(--surface-stone)) 0%, var(--surface-void) 100%)`,
        border:     `1px solid color-mix(in srgb, ${color} 28%, var(--metal-edge))`,
        borderTop:  `2px solid color-mix(in srgb, ${color} 70%, transparent)`,
        boxShadow:  `inset 0 1px 0 color-mix(in srgb, ${color} 18%, transparent), inset 0 0 40px color-mix(in srgb, ${color} 6%, transparent), 0 4px 14px rgba(0,0,0,0.5), 0 0 24px color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{ height: 56, background: `linear-gradient(to bottom, color-mix(in srgb, ${color} 22%, transparent), transparent)` }}
      />
      <div className="relative z-10 opacity-75">
        {icon(iconName, 15)}
      </div>
      <span
        className={`font-mono font-bold leading-none tabular-nums relative z-10 w-full text-center ${numClass}`}
        style={{
          color,
          textShadow: `0 0 20px color-mix(in srgb, ${color} 65%, transparent), 0 0 40px color-mix(in srgb, ${color} 30%, transparent)`,
        }}
      >
        {value.toLocaleString()}
      </span>
      <span
        className="text-[8px] uppercase tracking-[0.18em] relative z-10 font-semibold"
        style={{ color: 'var(--ink-faint)' }}
      >
        {label}
      </span>
    </div>
  )
}

// ── Shared value cell ─────────────────────────────────────────────────────────

function ValCell({ value, color, suffix = '' }: { value: number; color: string; suffix?: string }) {
  return (
    <span
      className="font-mono font-bold text-[13px] tabular-nums leading-none text-right"
      style={{ color: value === 0 ? 'var(--ink-faint)' : color }}
    >
      {value === 0 ? '—' : `${value > 0 ? '+' : ''}${value}${suffix}`}
    </span>
  )
}

// RES% has an in-game cap of 50%. Show overcap in gold with a ▲ badge so the
// player knows that resistance is being wasted and can redistribute it.
const RES_PCT_CAP = 50

function ResPctCell({ value }: { value: number }) {
  const overcap = value - RES_PCT_CAP
  const isOver  = overcap > 0
  return (
    <span className="font-mono font-bold text-[13px] tabular-nums leading-none text-right inline-flex items-baseline gap-1 justify-end">
      <span style={{ color: value === 0 ? 'var(--ink-faint)' : isOver ? 'var(--gold)' : 'var(--positive)' }}>
        {value === 0 ? '—' : `+${value}%`}
      </span>
      {isOver && (
        <span style={{ color: 'var(--ink-faint)', fontSize: 10, fontWeight: 500 }}>▲{overcap}</span>
      )}
    </span>
  )
}

// ── Combined element table (damage + resistance) ──────────────────────────────

type ElemRow = {
  resIcon:       string   // resistance icon — identifies the element AND shows res visually
  color:         string
  dmg:           number
  resFixed:      number
  resPct:        number
  resPercentRune: number  // magesmithy-only RES% contribution
}

const ELEM_COLS = '20px 1fr 1fr 1fr'

function ElemTableRow({ resIcon, color, dmg, resFixed, resPct }: ElemRow) {
  const hasData = dmg !== 0 || resFixed !== 0 || resPct !== 0
  return (
    <div
      className="grid items-center rounded-md"
      style={{
        gridTemplateColumns: ELEM_COLS,
        gap:        8,
        padding:    '6px 10px',
        background: hasData ? `color-mix(in srgb, ${color} 7%, transparent)` : 'transparent',
        borderLeft: `2px solid ${hasData ? color : 'transparent'}`,
        opacity:    hasData ? 1 : 0.28,
      }}
    >
      <div className="flex items-center justify-center">{icon(resIcon, 18)}</div>
      <ValCell value={dmg}           color={color} />
      <ValCell value={resFixed}      color={resFixed > 0 ? 'var(--positive)' : 'var(--negative)'} />
      <ResPctCell value={resPct} />
    </div>
  )
}

function ElementSection({ s }: { s: StatBlock }) {
  const { t } = useTranslation()

  const rows: ElemRow[] = [
    { resIcon: 'neutral_resistance', color: 'var(--neutral)', dmg: s.neutralDamage, resFixed: s.neutralResFixed, resPct: s.neutralResPercent, resPercentRune: s.neutralResPercentRune },
    { resIcon: 'earth_resistance',   color: 'var(--earth)',   dmg: s.earthDamage,   resFixed: s.earthResFixed,   resPct: s.earthResPercent,   resPercentRune: s.earthResPercentRune   },
    { resIcon: 'fire_resistance',    color: 'var(--fire)',    dmg: s.fireDamage,    resFixed: s.fireResFixed,    resPct: s.fireResPercent,    resPercentRune: s.fireResPercentRune    },
    { resIcon: 'water_resistance',   color: 'var(--water)',   dmg: s.waterDamage,   resFixed: s.waterResFixed,   resPct: s.waterResPercent,   resPercentRune: s.waterResPercentRune   },
    { resIcon: 'air_resistance',     color: 'var(--air)',     dmg: s.airDamage,     resFixed: s.airResFixed,     resPct: s.airResPercent,     resPercentRune: s.airResPercentRune     },
  ]

  const extras: ElemRow[] = [
    { resIcon: 'crit_damage', color: 'var(--crit)',  dmg: s.critDamage,     resFixed: s.critResistance, resPct: 0, resPercentRune: 0 },
    { resIcon: 'push_damage', color: 'var(--earth)', dmg: s.pushbackDamage, resFixed: s.pushbackResist, resPct: 0, resPercentRune: 0 },
  ].filter(r => r.dmg !== 0 || r.resFixed !== 0)

  const hdr: React.CSSProperties = {
    color: 'var(--ink-faint)', fontSize: 10, textTransform: 'uppercase',
    letterSpacing: '0.08em', textAlign: 'right', alignSelf: 'center',
  }

  return (
    <Section title={t('section_elements')}>
      <div className="grid mb-1" style={{ gridTemplateColumns: ELEM_COLS, gap: 6 }}>
        <span />
        <span style={hdr}>{t('header_dmg')}</span>
        <span style={hdr}>{t('header_res')}</span>
        <span style={hdr}>{t('header_res_pct')}</span>
      </div>
      <div className="space-y-0.5">
        {rows.map((r, i) => <ElemTableRow key={i} {...r} />)}
        {extras.length > 0 && (
          <>
            <div className="my-1" style={{ borderTop: '1px solid var(--metal-edge)' }} />
            {extras.map((r, i) => <ElemTableRow key={i} {...r} />)}
          </>
        )}
      </div>
    </Section>
  )
}

// ── Combat stats ──────────────────────────────────────────────────────────────

type CombatStat = { iconName: string; label: string; value: number; color: string; suffix?: string; alwaysShow?: boolean }

function CombatStatRow({ iconName, label, value, color, suffix = '' }: CombatStat) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded" style={{
      background:  `color-mix(in srgb, ${color} 5%, var(--surface-stone))`,
      borderLeft:  `2px solid color-mix(in srgb, ${color} 50%, transparent)`,
    }}>
      {icon(iconName, 14)}
      <span className="text-[11px] flex-1" style={{ color: 'var(--ink-muted)' }}>{label}</span>
      <span className="font-mono font-bold text-xs tabular-nums flex-shrink-0" style={{ color }}>
        {value > 0 && suffix !== '%' ? '+' : ''}{value}{suffix}
      </span>
    </div>
  )
}

function CombatGrid({ s }: { s: StatBlock }) {
  const { t } = useTranslation()
  const cells: CombatStat[] = [
    { iconName: 'initiative',   label: t('stat_initiative'),  value: s.initiative,  color: 'var(--gold)',    alwaysShow: true  },
    { iconName: 'dodge',        label: t('stat_dodge'),       value: s.dodge,       color: 'var(--air)'      },
    { iconName: 'lock',         label: t('stat_lock'),        value: s.lock,        color: 'var(--earth)'    },
    { iconName: 'heals',        label: t('stat_heals'),       value: s.heals,       color: 'var(--vitality)' },
    { iconName: 'power',        label: t('stat_power'),       value: s.power,       color: 'var(--gold)'     },
    { iconName: 'crit',         label: t('stat_crit_chance'), value: s.critChance,  color: 'var(--crit)',     suffix: '%' },
    { iconName: 'prospecting',  label: t('stat_prospecting'), value: s.prospecting, color: 'var(--gold)',    alwaysShow: true  },
    { iconName: 'summons',      label: t('stat_summons'),     value: s.summons,     color: 'var(--wisdom)',  alwaysShow: true  },
    { iconName: 'pods',         label: t('stat_pods'),        value: s.pods,        color: 'var(--gold)'     },
    { iconName: 'ap_parry',     label: t('stat_ap_parry'),    value: s.apParry,     color: 'var(--ap)'       },
    { iconName: 'mp_parry',     label: t('stat_mp_parry'),    value: s.mpParry,     color: 'var(--mp)'       },
    { iconName: 'ap_reduction', label: t('stat_ap_removal'),  value: s.apReduction, color: 'var(--wisdom)'   },
    { iconName: 'mp_reduction', label: t('stat_mp_removal'),  value: s.mpReduction, color: 'var(--wisdom)'   },
  ]

  const visible = cells.filter(c => c.alwaysShow || c.value !== 0)
  if (visible.length === 0) return null

  return (
    <Section title={t('stats_combat')}>
      <div className="grid grid-cols-1 gap-1">
        {visible.map(c => (
          <CombatStatRow key={c.iconName} {...c} />
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
    { iconName: 'melee_damage',      label: t('stat_melee_dmg'),  value: s.meleeDamagePercent,  color: 'var(--earth)' },
    { iconName: 'ranged_damage',     label: t('stat_ranged_dmg'), value: s.rangedDamagePercent, color: 'var(--water)' },
    { iconName: 'spell_damage',      label: t('stat_spell_dmg'),  value: s.spellDamagePercent,  color: 'var(--wisdom)' },
    { iconName: 'weapon_damage',     label: t('stat_weapon_dmg'), value: s.weaponDamagePercent, color: 'var(--gold)'  },
    { iconName: 'melee_resistance',  label: t('stat_melee_res'),  value: s.meleeResistPercent,  color: 'var(--earth)' },
    { iconName: 'ranged_resistance', label: t('stat_ranged_res'), value: s.rangedResistPercent, color: 'var(--water)' },
  ]
  const visible = mods.filter(m => m.value !== 0)
  if (visible.length === 0) return null

  return (
    <Section title={t('section_damage_mods')}>
      <div className="space-y-0.5">
        {visible.map(m => (
          <div key={m.label} className="flex items-center gap-1.5 px-2 py-1 rounded" style={{
            background: `color-mix(in srgb, ${m.color} 5%, var(--surface-stone))`,
            borderLeft: `2px solid color-mix(in srgb, ${m.color} 50%, transparent)`,
          }}>
            {icon(m.iconName, 13)}
            <span className="text-[11px] flex-1" style={{ color: 'var(--ink-muted)' }}>{m.label}</span>
            <span className="font-mono font-bold text-xs tabular-nums" style={{ color: m.color }}>
              {m.value > 0 ? '+' : ''}{m.value}%
            </span>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function StatsFromBlock({ s }: { s: StatBlock }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        <TopBadge iconName="ap"       label={t('badge_ap')}    value={s.ap}    color="var(--gold)"     />
        <TopBadge iconName="mp"       label={t('badge_mp')}    value={s.mp}    color="var(--mp)"       />
        <TopBadge iconName="vitality" label={t('badge_hp')}    value={s.maxHp} color="var(--vitality)" />
        {s.range > 0 && (
          <TopBadge iconName="range"  label={t('badge_range')} value={s.range} color="var(--water)"    />
        )}
      </div>

      <ElementSection s={s} />
      <CombatGrid s={s} />
      <DamageMods s={s} />

      {Object.keys(s.unknownStats).length > 0 && (
        <details>
          <summary
            className="text-[10px] cursor-pointer select-none py-1"
            style={{ color: 'var(--ink-faint)' }}
          >
            {t('unmapped_stats', { count: Object.keys(s.unknownStats).length })}
          </summary>
          <div
            className="mt-1 space-y-0.5 rounded p-2"
            style={{ background: 'var(--surface-stone)', border: '1px solid var(--metal-edge)' }}
          >
            {Object.entries(s.unknownStats).map(([k, v]) => (
              <div key={k} className="flex justify-between text-[10px]">
                <span style={{ color: 'var(--ink-faint)' }}>{k}</span>
                <span className="font-mono" style={{ color: 'var(--ink-muted)' }}>{v > 0 ? '+' : ''}{v}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

export function StatsPanel() {
  const { t }         = useTranslation()
  const stats         = useBuildStore(s => s.stats)
  const selectedClass = useBuildStore(s => s.selectedClass)

  if (!selectedClass) {
    return (
      <div
        className="flex flex-col items-center justify-center h-56 gap-4 relative overflow-hidden rounded-xl"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--gold) 8%, transparent) 0%, transparent 70%)' }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <path d="M14 0 L28 14 L14 28 L0 14Z" fill="var(--gold)" opacity="0.18" />
          <path d="M14 4 L24 14 L14 24 L4 14Z" fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.45" />
          <path d="M14 9 L19 14 L14 19 L9 14Z" fill="var(--gold)" opacity="0.55" />
        </svg>
        <div className="flex flex-col items-center gap-1">
          <span className="font-display text-[11px] uppercase tracking-[0.28em]" style={{ color: 'var(--gold)', opacity: 0.7 }}>
            Dofus Forge
          </span>
          <p className="text-[11px] text-center max-w-[140px]" style={{ color: 'var(--ink-faint)' }}>
            {t('select_class')}
          </p>
        </div>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 30% at 50% 100%, color-mix(in srgb, var(--gold) 4%, transparent), transparent)' }} />
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-xs uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
          {t('stats')}
        </h2>
        <div className="flex-1" style={{ height: 1, background: 'linear-gradient(to right, var(--gold-deep), transparent)' }} />
      </div>
      <StatsFromBlock s={stats} />
    </div>
  )
}
