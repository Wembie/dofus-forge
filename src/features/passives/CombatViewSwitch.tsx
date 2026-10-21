import { useTranslation } from 'react-i18next'
import { setCombatView, useCombatView, useHasPassives } from '@/store/useCombatView.ts'

/** "With passives" switch for panel headers; hidden when no equipped item has a passive. */
export function CombatViewSwitch() {
  const { t } = useTranslation()
  const on = useCombatView()
  const hasPassives = useHasPassives()
  if (!hasPassives) return null
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setCombatView(!on)}
      className="flex items-center gap-1.5 text-[10px] font-semibold flex-shrink-0 transition-colors"
      style={{ color: on ? 'var(--gold)' : 'var(--ink-faint)' }}
      title={t('stats_combat_hint')}
    >
      <span
        className="relative w-6 h-3.5 rounded-full flex-shrink-0 transition-colors"
        style={{ background: on ? 'var(--gold)' : 'var(--surface-stone)', border: '1px solid var(--metal-edge)' }}
      >
        <span
          className="absolute top-[1px] w-2.5 h-2.5 rounded-full transition-transform"
          style={{ left: 1, background: on ? 'var(--surface-void)' : 'var(--ink-faint)', transform: on ? 'translateX(10px)' : undefined }}
        />
      </span>
      {t('stats_combat_toggle')}
    </button>
  )
}
