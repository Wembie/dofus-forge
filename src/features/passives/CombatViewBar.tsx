import { useTranslation } from 'react-i18next'
import { Shield, Swords, SlidersHorizontal } from 'lucide-react'
import { ITEM_PASSIVES } from '@/engine/passives.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { setCombatView, useCombatView, useHasPassives } from '@/store/useCombatView.ts'

/** Equipped items with at least one active passive control. */
function useActivePassiveCount(): number {
  return useBuildStore(s => Object.values(s.equipped).filter(id =>
    id != null && (ITEM_PASSIVES.get(id) ?? []).some(c => (s.passives[c.id] ?? 0) > 0),
  ).length)
}

/** Scrolls to the (visible) combat passives panel, where passives are set. */
function goToPassives() {
  const panel = [...document.querySelectorAll<HTMLElement>('[data-testid="passives-panel"]')].find(el => el.offsetParent !== null)
  panel?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * How the characteristics and stats below are shown: gear only, or in
 * combat (gear + the active passives). Shown only when an equipped item has
 * a passive. `showEdit` adds a shortcut to the passives panel when it is on
 * the same screen (desktop).
 */
export function CombatViewBar({ showEdit = false }: { showEdit?: boolean }) {
  const { t } = useTranslation()
  const combat = useCombatView()
  const hasPassives = useHasPassives()
  const active = useActivePassiveCount()
  if (!hasPassives) return null

  const option = (on: boolean, label: React.ReactNode, Icon: typeof Shield, onClick: () => void) => (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className="flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors"
      style={{
        background: on ? 'color-mix(in srgb, var(--gold) 16%, var(--surface-void))' : 'transparent',
        color:      on ? 'var(--gold)' : 'var(--ink-muted)',
        boxShadow:  on ? 'inset 0 0 0 1px color-mix(in srgb, var(--gold) 55%, transparent)' : undefined,
      }}
    >
      <Icon size={13} className="flex-shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )

  return (
    <section
      aria-label={t('combat_view_title')}
      className="rounded-xl px-3 py-2.5 space-y-2"
      style={{
        background: combat
          ? 'linear-gradient(155deg, color-mix(in srgb, var(--gold) 9%, var(--surface-stone)) 0%, var(--surface-void) 100%)'
          : 'var(--surface-stone)',
        border: `1px solid ${combat ? 'color-mix(in srgb, var(--gold) 40%, var(--metal-edge))' : 'var(--metal-edge)'}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-display uppercase tracking-[0.2em] font-bold flex-1" style={{ color: 'var(--gold)' }}>
          {t('combat_view_title')}
        </span>
        {showEdit && (
          <button
            type="button"
            onClick={goToPassives}
            className="flex items-center gap-1 text-[10px] transition-colors hover:text-gold"
            style={{ color: 'var(--ink-faint)' }}
          >
            <SlidersHorizontal size={11} /> {t('combat_view_edit')}
          </button>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label={t('combat_view_title')}
        className="flex gap-1 rounded-lg p-0.5"
        style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
      >
        {option(!combat, t('combat_view_gear'), Shield, () => setCombatView(false))}
        {option(combat, (
          <>
            {t('combat_view_combat')}
            <span
              className="ml-1 font-mono text-[9px] rounded px-1 py-px"
              style={{ background: 'color-mix(in srgb, var(--gold) 14%, transparent)', color: 'var(--gold)' }}
            >
              {active}
            </span>
          </>
        ), Swords, () => setCombatView(true))}
      </div>

      <p className="text-[10px] leading-snug" style={{ color: 'var(--ink-faint)' }}>
        {!combat ? t('combat_view_gear_hint') : active === 0 ? t('combat_view_none') : t('stats_combat_hint')}
      </p>
    </section>
  )
}

/** Small marker for a panel header while the combat view is on (no control). */
export function CombatViewTag() {
  const { t } = useTranslation()
  const combat = useCombatView()
  const hasPassives = useHasPassives()
  if (!combat || !hasPassives) return null
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold rounded px-1.5 py-0.5 flex-shrink-0"
      style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 12%, transparent)' }}
      title={t('stats_combat_hint')}
    >
      <Swords size={10} /> {t('combat_view_combat')}
    </span>
  )
}
