import { Flame } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { streakFrameTier } from './milestones.ts'
import './streakChip.css'

/** Small badge for the daily login streak, styled like the rank/custom-rank
 * chips instead of plain text — its accent color matches the avatar frame
 * tier the account has earned. Private (own account): current + best.
 * Public profile: best only (the permanent, comparable number). */
export function StreakChip({ current, best }: { current?: number; best: number }) {
  const { t } = useTranslation()
  if (best <= 0) return null
  const tier = streakFrameTier(best)
  return (
    <div className="streak-chip" data-tier={tier ?? undefined}>
      <Flame size={15} aria-hidden="true" />
      {current != null ? (
        <span>
          <strong>{t('streak_chip_current', { count: current })}</strong>
          <small>{t('streak_chip_best', { count: best })}</small>
        </span>
      ) : (
        <strong>{t('streak_chip_best', { count: best })}</strong>
      )}
    </div>
  )
}
