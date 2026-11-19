import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { StatBlock } from '@/engine/types.ts'
import { damageBreakdown, type DamageMods, type ElemKey } from './spellDamage.ts'
import { fmtRange } from './spellCalc.ts'
import './damage-hover.css'

const CHAR_KEY: Record<ElemKey, string> = {
  neutral: 'char_strength', earth: 'char_strength', fire: 'char_intelligence', water: 'char_chance', air: 'char_agility',
}

const WIDTH = 300

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
  const ref = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState<number | null>(null)
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
    rows.push({ label: t('stat_final_dmg'), factor: mult(100 + lo.finalPct), value: fmtRange(lo.afterFinal, hi.afterFinal) })
  }
  if (lo.vulnerabilityPct !== 0) {
    rows.push({ label: t('stat_target_vulnerability'), factor: mult(100 + lo.vulnerabilityPct), value: fmtRange(lo.total, hi.total) })
  }

  const left = Math.max(8, Math.min(anchor.left + anchor.width / 2 - WIDTH / 2, window.innerWidth - WIDTH - 8))

  // Position against the card's real height (not a guess) so it never runs off
  // either edge of a short mobile viewport — the bug report (ROADMAP #281).
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0
    const below = anchor.bottom + h + 6 <= window.innerHeight - 8
    setTop(below ? Math.min(anchor.bottom + 6, window.innerHeight - h - 8) : Math.max(anchor.top - h - 6, 8))
  }, [anchor])

  return (
    <div
      ref={ref}
      role="tooltip"
      className="dmg-breakdown"
      style={{
        left, width: WIDTH,
        top:         top ?? anchor.bottom + 6,
        visibility:  top === null ? 'hidden' : 'visible',
      }}
    >
      <p className={'dmg-breakdown-title' + (crit ? ' is-crit' : '')}>{t(crit ? 'dmg_bd_crit_title' : 'dmg_bd_title')} · {t(`elem_${elem}`)}</p>
      <div className="dmg-breakdown-rows">
        {rows.map(r => (
          <div key={r.label} className="contents">
            <span className="dmg-breakdown-label">{r.label}</span>
            <span className="dmg-breakdown-factor">{r.factor}</span>
            <span className="dmg-breakdown-value">{r.value}</span>
          </div>
        ))}
        <i className="dmg-breakdown-rule" aria-hidden="true" />
        <span className="dmg-breakdown-total">{t('dmg_bd_total')}</span>
        <span className={'dmg-breakdown-value is-total' + (crit ? ' is-crit' : '')}>{fmtRange(lo.total, hi.total)}</span>
      </div>
      <p className="dmg-breakdown-note">{t('dmg_bd_note')}</p>
    </div>
  )
}
