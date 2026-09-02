import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { toPng } from 'html-to-image'
import i18next from 'i18next'
import type { StatBlock } from '@/engine/types.ts'
import type { SlotId } from '@/store/buildStore.ts'
import { ALL_SLOTS } from '@/store/buildStore.ts'
import { statIconUrl } from '../equipment/statDisplay.ts'

const BASE = import.meta.env.BASE_URL

const C = {
  bg:      '#070b12',
  surface: '#0d1220',
  border:  '#1c2333',
  gold:    '#c9a84c',
  text:    '#e8eaf0',
  muted:   '#4a5268',
  dim:     '#2a3347',
} as const

function slotLabel(id: SlotId): string {
  const t = i18next.t.bind(i18next)
  if (id === 'ring1')  return t('slot_ring1')
  if (id === 'ring2')  return t('slot_ring2')
  if (id.startsWith('dofus')) return t(`slot_${id}` as never)
  return t(`slot_${id}` as never)
}

export type ExportData = {
  classLabel: string
  classSlug:  string
  level:      number
  gender:     'male' | 'female'
  equipped:   Partial<Record<SlotId, string>>
  stats:      StatBlock
}

function StatIcon({ name, size = 14 }: { name: string; size?: number }) {
  return (
    <img
      src={statIconUrl(name)}
      width={size} height={size}
      style={{ objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      alt=""
    />
  )
}

function fmt(v: number, suffix = '') {
  if (v === 0) return '—'
  return `${v > 0 ? '+' : ''}${v}${suffix}`
}

const SECTION_STYLE: React.CSSProperties = {
  color: C.gold, fontSize: 9,
  fontFamily: "'Cinzel', Georgia, serif",
  textTransform: 'uppercase', letterSpacing: '0.2em',
  marginBottom: 8,
}

function ExportCard({ classLabel, classSlug, level, gender, equipped, stats }: ExportData) {
  const t           = i18next.t.bind(i18next)
  const portrait    = `${BASE}data/classes/${classSlug}${gender === 'female' ? '-f' : ''}.png`
  const equippedSlots = ALL_SLOTS.filter(s => equipped[s])

  const chars = [
    { icon: 'vitality',     label: t('char_vitality'),     value: stats.vitality,     color: '#e05252' },
    { icon: 'wisdom',       label: t('char_wisdom'),       value: stats.wisdom,       color: '#9b6dff' },
    { icon: 'strength',     label: t('char_strength'),     value: stats.strength,     color: '#c49a2a' },
    { icon: 'intelligence', label: t('char_intelligence'), value: stats.intelligence, color: '#dc4e22' },
    { icon: 'chance',       label: t('char_chance'),       value: stats.chance,       color: '#2a8fd4' },
    { icon: 'agility',      label: t('char_agility'),      value: stats.agility,      color: '#6ab04c' },
  ].filter(c => c.value !== 0)

  const elems = [
    { icon: 'strength',     label: t('elem_earth_label'), color: '#c49a2a', dmg: stats.earthDamage,   res: stats.earthResFixed,   pct: stats.earthResPercent   },
    { icon: 'intelligence', label: t('elem_fire_label'),  color: '#dc4e22', dmg: stats.fireDamage,    res: stats.fireResFixed,    pct: stats.fireResPercent    },
    { icon: 'chance',       label: t('elem_water_label'), color: '#2a8fd4', dmg: stats.waterDamage,   res: stats.waterResFixed,   pct: stats.waterResPercent   },
    { icon: 'agility',      label: t('elem_air_label'),   color: '#6ab04c', dmg: stats.airDamage,     res: stats.airResFixed,     pct: stats.airResPercent     },
    { icon: 'neutral',      label: t('elem_neutral_label'),color:'#9b9b9b', dmg: stats.neutralDamage, res: stats.neutralResFixed, pct: stats.neutralResPercent },
  ].filter(e => e.dmg !== 0 || e.res !== 0 || e.pct !== 0)

  const combatStats: { icon: string; label: string; value: number; color: string; suffix?: string }[] = [
    { icon: 'initiative',  label: t('combat_initiative'), value: stats.initiative,  color: '#c9a84c'           },
    { icon: 'lock',        label: t('combat_lock'),       value: stats.lock,        color: '#b8860b'           },
    { icon: 'dodge',       label: t('combat_dodge'),      value: stats.dodge,       color: '#6ab04c'           },
    { icon: 'crit',        label: t('combat_crit'),       value: stats.critChance,  color: '#f5a623', suffix: '%' },
    { icon: 'heals',       label: t('combat_heals'),      value: stats.heals,       color: '#e05252'           },
    { icon: 'prospecting', label: t('combat_pp'),         value: stats.prospecting, color: '#c9a84c'           },
    { icon: 'summons',     label: t('combat_summons'),    value: stats.summons,     color: '#9b6dff'           },
  ].filter(c => c.value !== 0)

  const badges = [
    { icon: 'ap',       label: t('badge_ap'),    value: stats.ap,    color: '#f5c518' },
    { icon: 'mp',       label: t('badge_mp'),    value: stats.mp,    color: '#6ab04c' },
    { icon: 'vitality', label: t('badge_hp'),    value: stats.maxHp, color: '#e05252' },
    ...(stats.range > 0 ? [{ icon: 'range', label: t('badge_range'), value: stats.range, color: '#2a8fd4' }] : []),
  ]

  return (
    <div style={{
      width: 720, background: C.bg,
      border: `1px solid ${C.border}`, borderRadius: 12,
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 20px', background: C.surface,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0 }}>
          <img src={portrait} width={60} height={60} style={{ objectFit: 'cover', display: 'block' }} alt="" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.gold, fontSize: 18, fontWeight: 700, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.05em' }}>
            {classLabel}
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
            {gender === 'female' ? '♀' : '♂'} · {t('export_level')} {level}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', fontFamily: "'Cinzel', Georgia, serif" }}>DOFUS FORGE</div>
          <div style={{ color: C.dim, fontSize: 9, marginTop: 3 }}>dofus 3 build planner</div>
        </div>
      </div>

      {/* ── AP / MP / HP ── */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
        {badges.map(b => (
          <div key={b.label} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            flex: 1, padding: '8px 12px',
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
          }}>
            <StatIcon name={b.icon} size={18} />
            <span style={{ color: b.color, fontFamily: 'monospace', fontWeight: 700, fontSize: 20, lineHeight: 1 }}>{b.value}</span>
            <span style={{ color: C.dim, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{b.label}</span>
          </div>
        ))}
      </div>

      {/* ── Body ── */}
      <div style={{ display: 'flex' }}>
        {/* Equipment column */}
        <div style={{ width: 240, padding: '16px', borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={SECTION_STYLE}>{t('export_section_equipment')}</div>
          {equippedSlots.length === 0
            ? <div style={{ color: C.dim, fontSize: 11 }}>{t('export_no_equipment')}</div>
            : equippedSlots.map(slot => (
              <div key={slot} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}>
                <span style={{ color: C.muted, fontSize: 10, width: 52, flexShrink: 0, paddingTop: 1 }}>{slotLabel(slot)}</span>
                <span style={{ color: C.text, fontSize: 11, lineHeight: 1.35 }}>{equipped[slot]}</span>
              </div>
            ))
          }
        </div>

        {/* Stats column */}
        <div style={{ flex: 1, padding: '16px' }}>
          {chars.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={SECTION_STYLE}>{t('export_section_characteristics')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                {chars.map(c => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                    <StatIcon name={c.icon} size={13} />
                    <span style={{ color: C.muted, fontSize: 10, flex: 1 }}>{c.label}</span>
                    <span style={{ color: c.color, fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {elems.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={SECTION_STYLE}>{t('export_section_elements')}</div>
              <div style={{ display: 'flex', marginBottom: 4 }}>
                <div style={{ flex: 1 }} />
                {[t('header_dmg'), t('header_res'), t('header_res_pct')].map(h => (
                  <div key={h} style={{ width: 48, textAlign: 'right', color: C.dim, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                ))}
              </div>
              {elems.map(e => (
                <div key={e.label} style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <StatIcon name={e.icon} size={13} />
                    <span style={{ color: e.color, fontSize: 11, fontWeight: 600 }}>{e.label}</span>
                  </div>
                  <div style={{ width: 48, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: e.dmg !== 0 ? e.color : C.dim }}>{fmt(e.dmg)}</div>
                  <div style={{ width: 48, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: e.res !== 0 ? e.color : C.dim }}>{fmt(e.res)}</div>
                  <div style={{ width: 48, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: e.pct !== 0 ? e.color : C.dim }}>{fmt(e.pct, '%')}</div>
                </div>
              ))}
            </div>
          )}

          {combatStats.length > 0 && (
            <div>
              <div style={SECTION_STYLE}>{t('export_section_combat')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {combatStats.map(c => (
                  <div key={c.label} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 7px',
                    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4,
                  }}>
                    <StatIcon name={c.icon} size={12} />
                    <span style={{ color: c.color, fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{fmt(c.value, c.suffix)}</span>
                    <span style={{ color: C.muted, fontSize: 10 }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '8px 20px', borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
        <span style={{ color: C.dim, fontSize: 9 }}>{t('export_footer')}</span>
      </div>
    </div>
  )
}

export async function triggerExport(data: ExportData): Promise<void> {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;pointer-events:none;z-index:-1'
  document.body.appendChild(container)

  const root = createRoot(container)
  flushSync(() => root.render(<ExportCard {...data} />))

  const card = container.firstElementChild as HTMLElement

  // Wait for all images to load before capturing
  const imgs = Array.from(card.querySelectorAll('img'))
  await Promise.all(imgs.map(img =>
    img.complete ? Promise.resolve() : new Promise<void>(r => { img.onload = img.onerror = () => r() })
  ))

  const png = await toPng(card, { pixelRatio: 2 })

  root.unmount()
  document.body.removeChild(container)

  const link = document.createElement('a')
  link.download = `dofus-${data.classLabel.toLowerCase().replace(/\s+/g, '-')}-lv${data.level}.png`
  link.href = png
  link.click()
}
