import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { useCombatStats } from '@/store/useCombatStats.ts'
import { useCombatView, useHasPassives } from '@/store/useCombatView.ts'
import { CombatViewTag } from '@/features/passives/CombatViewBar.tsx'
import { StatsOverview } from './StatsOverview.tsx'
import { openCharacteristics } from '@/features/characteristics/openCharacteristics.ts'

export function StatsPanel() {
  const { t }         = useTranslation()
  const stats         = useBuildStore(s => s.stats)
  const selectedClass = useBuildStore(s => s.selectedClass)
  const runes         = useBuildStore(s => s.runes)
  const combatStats   = useCombatStats()
  const combatView    = useCombatView()
  const hasPassives   = useHasPassives()
  const combat        = combatView && hasPassives && combatStats != null

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
    <section className="stats-panel" aria-label={t('stats')}>
      <header className="workshop-panel-head">
        <h2>{t('stats')}</h2>
        <CombatViewTag />
      </header>
      <StatsOverview s={combat ? combatStats! : stats} base={combat ? stats : undefined} runes={runes} inCombat={combat} onAllocate={openCharacteristics} />
    </section>
  )
}
