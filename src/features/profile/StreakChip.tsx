import { Flame } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { streakFrameTier } from './milestones.ts'
import './streakChip.css'

export function StreakChip({ current, best, metric = false }: { current?: number; best: number; metric?: boolean }) {
  const { t } = useTranslation()
  if (best <= 0) return null
  const tier = streakFrameTier(best)
  if (metric) return <div className="streak-chip is-metric" data-tier={tier ?? undefined} aria-label={t('streak_chip_best', { count: best })}><strong><Flame size={19} aria-hidden="true" />{best}</strong><span>{t('streak_public_record')}</span></div>
  return (
    <div className="streak-chip" data-tier={tier ?? undefined}>
      <Flame size={14} aria-hidden="true" />
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
