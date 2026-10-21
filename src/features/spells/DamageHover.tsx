import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { StatBlock } from '@/engine/types.ts'
import { damageBreakdown, type DamageMods, type ElemKey } from './spellDamage.ts'
import { fmtRange } from './spellCalc.ts'

const CHAR_KEY: Record<ElemKey, string> = {
  neutral: 'char_strength', earth: 'char_strength', fire: 'char_intelligence', water: 'char_chance', air: 'char_agility',
}

const WIDTH = 270

type Props = {
  /** Roll range before any bonus (a weapon crit roll already includes its crit bonus). */
  roll:       [number, number]
  elem:       ElemKey | null
  stats:      StatBlock | null
  mods:       DamageMods
  /** Critical Damage on a crit, 0 otherwise. */
  extraFlat?: number
  kind:       'spell' | 'weapon'
  crit?:      boolean
  children:   ReactNode
}

/** Hovering a damage value shows how it was computed, step by step. */
export function DamageHover({ roll, elem, stats, mods, extraFlat = 0, kind, crit = false, children }: Props) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  if (!stats || !elem) return <>{children}</>
  return (
    <span
      className="cursor-help"
      data-testid="damage-hover"
      onMouseEnter={e => setAnchor(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchor(null)}
    >
      {children}
      {anchor && createPortal(
        <BreakdownCard anchor={anchor} roll={roll} elem={elem} stats={stats} mods={mods} extraFlat={extraFlat} kind={kind} crit={crit} />,
        document.body,
      )}
    </span>
  )
}

type Row = { label: string; factor: string; value: string }

function BreakdownCard({ anchor, roll, elem, stats, mods, extraFlat, kind, crit }: {
  anchor: DOMRect; roll: [number, number]; elem: ElemKey; stats: StatBlock; mods: DamageMods
  extraFlat: number; kind: 'spell' | 'weapon'; crit: boolean
}) {
  const { t, i18n } = useTranslation()
  const lo = damageBreakdown(roll[0], elem, stats, mods, extraFlat)
  const hi = damageBreakdown(roll[1], elem, stats, mods, extraFlat)
  const mult   = (pct: number) => `×${(pct / 100).toLocaleString(i18n.language, { maximumFractionDigits: 2 })}`
  const signed = (n: number) => (n < 0 ? `${n}` : `+${n}`)

  const scaleParts = [`${t(CHAR_KEY[elem])} ${lo.characteristic}`, `${t('stat_power')} ${lo.power}`]
  if (lo.extraPower) scaleParts.push(`${t('weapon_mastery')} ${lo.extraPower}`)

  const rows: Row[] = [
    { label: t('dmg_bd_base'), factor: '', value: fmtRange(lo.roll, hi.roll) },
    { label: scaleParts.join(' + '), factor: mult(100 + lo.characteristic + lo.power + lo.extraPower), value: fmtRange(lo.scaled, hi.scaled) },
  ]
  if (lo.fixed !== 0) {
    rows.push({ label: t('dmg_bd_fixed'), factor: signed(lo.fixed), value: fmtRange(lo.scaled + lo.fixed, hi.scaled + hi.fixed) })
  }
  if (lo.critDamage !== 0) {
    rows.push({ label: t('stat_crit_damage'), factor: signed(lo.critDamage), value: fmtRange(lo.beforePct, hi.beforePct) })
  }
  if (mods.rangePct !== 0 && mods.range) {
    rows.push({ label: t(mods.range === 'melee' ? 'stat_melee_dmg' : 'stat_ranged_dmg'), factor: mult(100 + mods.rangePct), value: fmtRange(lo.afterRange, hi.afterRange) })
  }
  if (mods.kindPct !== 0) {
    rows.push({ label: t(kind === 'spell' ? 'stat_spell_dmg' : 'stat_weapon_dmg'), factor: mult(100 + mods.kindPct), value: fmtRange(lo.afterKind, hi.afterKind) })
  }
  if (lo.finalPct !== 0) {
    rows.push({ label: t('stat_final_dmg'), factor: mult(100 + lo.finalPct), value: fmtRange(lo.total, hi.total) })
  }

  const left  = Math.max(8, Math.min(anchor.left + anchor.width / 2 - WIDTH / 2, window.innerWidth - WIDTH - 8))
  const below = anchor.bottom + 240 < window.innerHeight

  return (
    <div
      role="tooltip"
      className="fixed z-[200] pointer-events-none rounded-md border p-2 text-[11px]"
      style={{
        left, width: WIDTH,
        top:         below ? anchor.bottom + 6 : anchor.top - 6,
        transform:   below ? undefined : 'translateY(-100%)',
        background:  'var(--surface-parchment)',
        borderColor: 'var(--metal-edge)',
        color:       'var(--ink)',
        boxShadow:   'var(--shadow-frame), var(--inset-bevel)',
      }}
    >
      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: crit ? 'var(--crit)' : 'var(--ink-faint)' }}>
        {t(crit ? 'dmg_bd_crit_title' : 'dmg_bd_title')}
      </div>
      <div className="grid gap-x-2 gap-y-0.5 items-baseline" style={{ gridTemplateColumns: '1fr auto auto' }}>
        {rows.map(r => (
          <div key={r.label} className="contents">
            <span className="truncate" style={{ color: 'var(--ink-muted)' }}>{r.label}</span>
            <span className="font-mono tabular-nums text-right" style={{ color: 'var(--gold-deep)' }}>{r.factor}</span>
            <span className="font-mono tabular-nums text-right">{r.value}</span>
          </div>
        ))}
        <span className="font-bold pt-1 mt-0.5" style={{ borderTop: '1px solid var(--metal-edge)' }}>{t('dmg_bd_total')}</span>
        <span className="pt-1 mt-0.5" style={{ borderTop: '1px solid var(--metal-edge)' }} />
        <span className="font-mono tabular-nums font-bold text-right pt-1 mt-0.5" style={{ borderTop: '1px solid var(--metal-edge)', color: crit ? 'var(--crit)' : 'var(--ink)' }}>
          {fmtRange(lo.total, hi.total)}
        </span>
      </div>
      <div className="mt-1.5 text-[9px]" style={{ color: 'var(--ink-faint)' }}>{t('dmg_bd_note')}</div>
    </div>
  )
}
