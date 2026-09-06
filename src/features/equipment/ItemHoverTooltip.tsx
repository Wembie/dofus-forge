import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { AppItem, AppCondition } from '@/data/loaders.ts'
import { STAT_META, isIgnored, fmtValue, statIconUrl } from './statDisplay.ts'
import { WEAPON_ATTACK_IDS, IGNORED_EFFECT_IDS } from '@/engine/statMap.ts'

// Full item tooltip — portal, fixed position so it escapes any
// overflow-y:auto ancestor (modals, scrollable card grids, etc).
// Shared by SetDetailModal and SetsCatalog so both show identical,
// complete item info (effects, weapon attack, conditions, lore) on hover.
export function ItemHoverTooltip({ item, anchor }: { item: AppItem; anchor: DOMRect }) {
  const { t } = useTranslation()

  const TW     = 288
  const left   = window.innerWidth - anchor.right - 12 >= TW
    ? anchor.right + 8
    : anchor.left  - TW - 8
  const top    = Math.max(8, Math.min(anchor.top, window.innerHeight - 560))

  const allFx   = item.effects.filter(e =>
    !isIgnored(e.stat) && (e.effect_id == null || !IGNORED_EFFECT_IDS.has(e.effect_id))
  )
  const isWpn   = item.slot === 'weapon' || item.ap_cost != null
  const isAtk   = (e: typeof allFx[0]) => e.effect_id != null && WEAPON_ATTACK_IDS.has(e.effect_id)
  const atkFx   = isWpn ? allFx.filter(isAtk)        : []
  const statFx  = isWpn ? allFx.filter(e => !isAtk(e)) : allFx

  function StatLine({ e, i }: { e: { stat: string; min: number; max: number }; i: number }) {
    const meta = STAT_META[e.stat]
    const clr  = meta?.color ?? 'var(--ink-muted)'
    const val  = fmtValue(e.min, e.max, t('range_sep_neg'))
    return (
      <div key={i} className="flex items-center gap-1.5 min-w-0">
        {meta?.icon
          ? <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain flex-shrink-0" />
          : <span className="w-3 flex-shrink-0" />}
        <span className="text-[11px] font-bold tabular-nums flex-shrink-0" style={{ color: clr }}>
          {val}
        </span>
        <span className="text-[11px] flex-shrink-0" style={{ color: clr }}>
          {meta ? t(meta.tKey) : e.stat}
        </span>
      </div>
    )
  }

  function AtkLine({ e, i }: { e: { stat: string; min: number; max: number }; i: number }) {
    const meta   = STAT_META[e.stat]
    const clr    = meta?.color ?? 'var(--ink-muted)'
    const isPush = e.stat === 'Pushes back cell'
    return (
      <div key={i} className="flex items-center gap-1.5 min-w-0">
        {meta?.icon
          ? <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain flex-shrink-0" />
          : <span className="w-3 flex-shrink-0" />}
        {isPush
          ? <span className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>{t('spell_push', { cells: e.min })}</span>
          : <>
              <span className="text-[11px] font-bold tabular-nums flex-shrink-0" style={{ color: clr }}>
                {e.min === e.max || e.max === 0 ? e.min : `${e.min} ${t('range_sep_neg')} ${e.max}`}
              </span>
              <span className="text-[11px] flex-shrink-0" style={{ color: clr }}>{meta ? t(meta.tKey) : e.stat}</span>
            </>}
      </div>
    )
  }

  return createPortal(
    <div className="fixed z-[9999] pointer-events-none" style={{ left, top, width: TW }}>
      <div className="rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--surface-void)',
          border:     '1px solid var(--metal-edge)',
          boxShadow:  '0 8px 40px rgba(0,0,0,0.85)',
          animation:  'tooltip-in 140ms var(--ease-out) forwards',
          maxHeight:  'min(82vh, 640px)',
          overflowY:  'auto',
        }}
      >
        {/* Header */}
        <div className="px-3 pt-2.5 pb-2"
          style={{ background: 'linear-gradient(180deg, var(--surface-parchment) 0%, var(--surface-panel) 100%)', borderBottom: '1px solid var(--metal-edge)' }}>
          <p className="font-bold text-[13px] leading-tight" style={{ color: 'var(--ink)' }}>{item.name}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {t('level')} {item.level} · {item.type}
          </p>
        </div>

        {/* Ability (Dofus passive, etc.) */}
        {item.ability && (
          <div className="px-3 pt-2 pb-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
            <div style={{ background: 'color-mix(in srgb, var(--gold) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 35%, transparent)', borderRadius: 6, padding: '5px 8px' }}>
              {item.ability.split('\n').filter(Boolean).map((line, i) => (
                <p key={i} className="leading-snug" style={{ fontSize: 11, color: i === 0 ? 'var(--gold)' : 'var(--gold-deep)', margin: i > 0 ? '2px 0 0' : 0 }}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Weapon attacks */}
        {atkFx.length > 0 && (
          <div className="px-3 pt-2 pb-1">
            <p className="text-[9px] tracking-[0.18em] uppercase font-semibold mb-1.5" style={{ color: 'var(--ink-faint)' }}>
              {t('weapon_attack')}
            </p>
            <div className="space-y-0.5">{atkFx.map((e, i) => <AtkLine key={i} e={e} i={i} />)}</div>
          </div>
        )}

        {/* Regular stats */}
        {statFx.length > 0 && (
          <div className="px-3 pt-2 pb-2"
            style={atkFx.length > 0 ? { borderTop: '1px solid var(--metal-edge)' } : undefined}>
            <p className="text-[9px] tracking-[0.18em] uppercase font-semibold mb-1.5" style={{ color: 'var(--ink-faint)' }}>
              {t('effects')}
            </p>
            <div className="space-y-0.5">{statFx.map((e, i) => <StatLine key={i} e={e} i={i} />)}</div>
          </div>
        )}

        {/* Conditions */}
        {item.conditions && item.conditions.length > 0 && (
          <div className="px-3 pt-2 pb-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
            <p className="text-[9px] tracking-[0.18em] uppercase font-semibold mb-1.5" style={{ color: 'var(--ink-faint)' }}>
              {t('conditions')}
            </p>
            <div className="space-y-0.5">
              {item.conditions.map((c: AppCondition, i: number) => {
                const meta = STAT_META[c.stat]
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    {meta?.icon
                      ? <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain flex-shrink-0" />
                      : <span className="w-3 flex-shrink-0" />}
                    <span className="text-[11px]" style={{ color: meta?.color ?? 'var(--ink-muted)' }}>
                      {meta ? t(meta.tKey) : c.stat} {c.operator} {c.value}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Lore */}
        {item.description && (
          <div className="px-3 pb-2.5" style={{ borderTop: '1px solid var(--metal-edge)', paddingTop: 7 }}>
            <p className="text-[10px] italic leading-snug" style={{ color: 'var(--ink-faint)' }}>{item.description}</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
