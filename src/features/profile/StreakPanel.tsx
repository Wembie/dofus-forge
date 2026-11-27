import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Flame, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/ui'
import { EXCLUSIVE_REWARDS, type ExclusiveReward } from './exclusiveRewards.ts'
import type { ExclusiveUnlock } from './exclusiveUnlocks.ts'
import { streakFrameTier } from './milestones.ts'
import { StreakFrame } from './StreakFrame.tsx'
import './streakPanel.css'

export function StreakPanel({ current, best, unlocks, onCustomize }: {
  current: number
  best: number
  unlocks: ExclusiveUnlock[]
  onCustomize: (slug?: string) => void
}) {
  const { t } = useTranslation()
  const location = useLocation()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [inspected, setInspected] = useState<ExclusiveReward | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const backButton = useRef<HTMLButtonElement>(null)
  const cards = useRef(new Map<string, HTMLButtonElement>())
  const panel = useRef<HTMLElement>(null)
  const next = EXCLUSIVE_REWARDS.find(r => r.threshold > best)
  const remaining = next ? Math.max(0, next.threshold - current) : 0

  useEffect(() => {
    if (location.hash !== '#streak' && location.hash !== '#streak-rewards') return
    panel.current?.scrollIntoView?.({ block: 'start' })
    trigger.current?.focus({ preventScroll: true })
    if (location.hash === '#streak-rewards') setOpen(true)
  }, [location.hash, location.key])

  useEffect(() => {
    if (inspected) backButton.current?.focus({ preventScroll: true })
  }, [inspected])

  function back() {
    const slug = inspected?.slug
    setInspected(null)
    requestAnimationFrame(() => { if (slug) cards.current.get(slug)?.focus({ preventScroll: true }) })
  }

  function customize(slug?: string) {
    setOpen(false)
    setInspected(null)
    requestAnimationFrame(() => onCustomize(slug))
  }

  const progress = next && (
    <div className="streak-progress">
      <progress max={next.threshold} value={Math.min(current, next.threshold)} aria-label={t('streak_progress_label', { current, threshold: next.threshold })} />
      <span>{t('streak_remaining', { count: remaining })}</span>
    </div>
  )

  return (
    <section id="streak" className="streak-panel" ref={panel} aria-labelledby={`${id}-title`}>
      <div className="streak-panel-heading">
        <div className="streak-active">
          <Flame size={24} aria-hidden="true" />
          <div><h2 id={`${id}-title`}>{t('streak_title')}</h2><p><strong>{current}</strong> {t('streak_consecutive')}</p></div>
        </div>
        <div className="streak-record"><span>{t('streak_record_label')}</span><strong>{t('streak_day_count', { count: best })}</strong></div>
        <div className="streak-next">
          {next && <img src={next.avatarPath} alt="" width={44} height={44} />}
          <div><span>{t(next ? 'streak_next' : 'streak_all_earned')}</span><strong>{next ? t(next.nameKey) : t('streak_all_earned_hint')}</strong></div>
        </div>
        <button type="button" ref={trigger} className="account-button streak-open" aria-haspopup="dialog" onClick={() => { setInspected(null); setOpen(true) }}>{t('streak_view_rewards')}<ArrowUpRight size={16} aria-hidden="true" /></button>
      </div>
      {progress}
      <p className="streak-panel-note">{t(best > current ? 'streak_keep_rewards' : 'streak_start_hint')}</p>

      {open && <Modal open onClose={() => setOpen(false)} title={t('streak_popup_title')} size="2xl" className="streak-rewards-modal">
        <div className="streak-dialog">
          {inspected ? (
            <>
              <button type="button" ref={backButton} className="streak-back" onClick={back}><ArrowLeft size={16} aria-hidden="true" />{t('streak_back_rewards')}</button>
              <div className="streak-reward-detail">
                <StreakFrame tier={streakFrameTier(inspected.threshold)}><img src={inspected.avatarPath} alt={t(inspected.nameKey)} width={512} height={512} /></StreakFrame>
                <div><p className="account-eyebrow">{t('streak_threshold', { count: inspected.threshold })}</p><h3>{t(inspected.nameKey)}</h3><p>{t('streak_frame_label', { tier: t(`streak_frame_${streakFrameTier(inspected.threshold)}`) })}</p><span>{t(best >= inspected.threshold ? 'streak_unlocked' : 'streak_remaining', { count: Math.max(0, inspected.threshold - current) })}</span></div>
              </div>
              <img className="streak-detail-banner" src={inspected.bannerPath} alt={t('streak_banner_alt', { name: t(inspected.nameKey) })} width={1920} height={640} />
              {unlocks.some(u => u.slug === inspected.slug && u.eligible) && <button type="button" className="site-primary streak-customize" onClick={() => customize(inspected.slug)}>{t('streak_customize')}<ChevronRight size={16} aria-hidden="true" /></button>}
            </>
          ) : (
            <>
              <div className="streak-dialog-summary">
                <div><Flame size={23} aria-hidden="true" /><strong>{current}</strong><span>{t('streak_active_label')}</span></div>
                <div><strong>{best}</strong><span>{t('streak_record_label')}</span></div>
              </div>
              <p className="streak-dialog-intro">{t('streak_popup_intro')}</p>
              {next && <p className="streak-dialog-next"><strong>{t(next.nameKey)}</strong><span>{t('streak_remaining', { count: remaining })}</span></p>}
              {best > current && <p className="streak-dialog-note">{t('streak_keep_rewards')}</p>}
              <div className="streak-reward-grid">
                {EXCLUSIVE_REWARDS.map(reward => {
                  const earned = best >= reward.threshold
                  const isNext = next?.slug === reward.slug
                  const tier = streakFrameTier(reward.threshold)
                  return (
                    <button key={reward.slug} type="button" className={'streak-reward' + (isNext ? ' is-next' : '')} aria-label={t('streak_reward_view', { name: t(reward.nameKey) })} ref={node => { if (node) cards.current.set(reward.slug, node); else cards.current.delete(reward.slug) }} onClick={() => setInspected(reward)}>
                      <img className="streak-reward-banner" src={reward.bannerPath} alt="" width={1920} height={640} loading="lazy" />
                      <div className="streak-reward-body">
                        <StreakFrame tier={tier}><img src={reward.avatarPath} alt="" width={72} height={72} loading="lazy" /></StreakFrame>
                        <div><span className="streak-reward-days">{t('streak_threshold', { count: reward.threshold })}</span><h3>{t(reward.nameKey)}</h3><small>{t(`streak_frame_${tier}`)}</small></div>
                      </div>
                      <span className="streak-reward-state">{earned ? <Check size={14} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}{t(earned ? 'streak_unlocked' : isNext ? 'streak_next_reward' : 'streak_locked')}<ChevronRight size={14} aria-hidden="true" /></span>
                    </button>
                  )
                })}
              </div>
              <details className="streak-how"><summary>{t('streak_how')}</summary><p>{t('streak_how_daily')}</p><p>{t('streak_how_reset')}</p><p>{t('streak_keep_rewards')}</p></details>
              <button type="button" className="account-button streak-customize" onClick={() => customize()}>{t('streak_gallery')}<ArrowUpRight size={16} aria-hidden="true" /></button>
            </>
          )}
        </div>
      </Modal>}
    </section>
  )
}
