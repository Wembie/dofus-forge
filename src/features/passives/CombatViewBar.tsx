import { useTranslation } from 'react-i18next'
import { Shield, Swords, SlidersHorizontal } from 'lucide-react'
import { ITEM_PASSIVES } from '@/engine/passives.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { setCombatView, useCombatView, useHasPassives } from '@/store/useCombatView.ts'
import { scrollBehavior } from '@/lib/motionSettings.ts'
import './passives.css'

/** Equipped items with at least one active passive control. */
function useActivePassiveCount(): number {
  return useBuildStore(s => Object.values(s.equipped).filter(id =>
    id != null && (ITEM_PASSIVES.get(id) ?? []).some(c => (s.passives[c.id] ?? 0) > 0),
  ).length)
}

/** Scrolls to the (visible) combat passives panel, where passives are set. */
function goToPassives() {
  const panel = [...document.querySelectorAll<HTMLElement>('[data-testid="passives-panel"]')].find(el => el.offsetParent !== null)
  panel?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
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

  return (
    <section aria-label={t('combat_view_title')} className={'view-switch' + (combat ? ' is-combat' : '')}>
      <header>
        <span>{t('combat_view_title')}</span>
        {showEdit && (
          <button type="button" className="view-switch-edit" onClick={goToPassives}>
            <SlidersHorizontal size={13} aria-hidden="true" /> {t('combat_view_edit')}
          </button>
        )}
      </header>
      <div role="radiogroup" aria-label={t('combat_view_title')}>
        <button type="button" role="radio" aria-checked={!combat} onClick={() => setCombatView(false)}>
          <Shield size={14} aria-hidden="true" />
          {t('combat_view_gear')}
        </button>
        <button type="button" role="radio" aria-checked={combat} onClick={() => setCombatView(true)}>
          <Swords size={14} aria-hidden="true" />
          {t('combat_view_combat')}
          <span className="view-count">{active}</span>
        </button>
      </div>
      <p>{!combat ? t('combat_view_gear_hint') : active === 0 ? t('combat_view_none') : t('stats_combat_hint')}</p>
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
