import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Flame, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/ui'
import { EXCLUSIVE_CHAPTERS, EXCLUSIVE_REWARDS, nextExclusiveRewards, type ExclusiveChapter, type ExclusiveReward } from './exclusiveRewards.ts'
import type { ExclusiveUnlock } from './exclusiveUnlocks.ts'
import type { BuildQuota } from './buildQuota.ts'
import { streakFrameTier } from './milestones.ts'
import { StreakFrame } from './StreakFrame.tsx'
import './streakPanel.css'

const SECTIONS = [...EXCLUSIVE_CHAPTERS, { id: 'bakara', nameKey: 'streak_collection_bakara' }] as const
type RewardSection = ExclusiveChapter | 'bakara'
const inSection = (reward: ExclusiveReward, section: RewardSection) => section === 'bakara' ? reward.family === 'bakara' : reward.chapter === section

export function StreakPanel({ current, best, unlocks, unrestricted = false, buildQuota, onCustomize }: {
  current: number
  best: number
  unlocks: ExclusiveUnlock[]
  unrestricted?: boolean
  buildQuota?: BuildQuota | null
  onCustomize: (slug?: string) => void
}) {
  const { t } = useTranslation()
  const location = useLocation()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [inspected, setInspected] = useState<ExclusiveReward | null>(null)
  const nextRewards = unrestricted ? [] : nextExclusiveRewards(best)
  const next = nextRewards[0]
  const [section, setSection] = useState<RewardSection>(next?.chapter ?? 'legends')
  const trigger = useRef<HTMLButtonElement>(null)
  const backButton = useRef<HTMLButtonElement>(null)
  const cards = useRef(new Map<string, HTMLButtonElement>())
  const panel = useRef<HTMLElement>(null)
  const remaining = next ? Math.max(0, next.threshold - current) : 0
  const nextNames = nextRewards.map(r => t(r.nameKey)).join(t('streak_reward_separator'))
  const visibleRewards = EXCLUSIVE_REWARDS.filter(r => inSection(r, section))

  function changeSection(index: number) {
    const selected = SECTIONS[(index + SECTIONS.length) % SECTIONS.length]
    setSection(selected.id)
    requestAnimationFrame(() => document.getElementById(`${id}-tab-${selected.id}`)?.focus())
  }

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
          {next && <span className="streak-next-art">{nextRewards.map(reward => <img key={reward.slug} src={reward.avatarPath} alt="" width={44} height={44} />)}</span>}
          <div><span>{t(unrestricted ? 'streak_admin_access' : next ? nextRewards.length > 1 ? 'streak_next_rewards' : 'streak_next' : 'streak_all_earned')}</span><strong>{next ? nextNames : t(unrestricted ? 'streak_admin_all_art' : 'streak_all_earned_hint')}</strong></div>
        </div>
        <button type="button" ref={trigger} className="account-button streak-open" aria-haspopup="dialog" onClick={() => { setInspected(null); setSection(next?.chapter ?? 'legends'); setOpen(true) }}>{t('streak_view_rewards')}<ArrowUpRight size={16} aria-hidden="true" /></button>
      </div>
      {progress}
      <p className="streak-panel-note">{t(best > current ? 'streak_keep_rewards' : 'streak_start_hint')}</p>
      {buildQuota && <div className="streak-build-quota">
        <div><span>{t('streak_build_capacity_label')}</span><strong>{t(buildQuota.limit === null ? 'streak_build_capacity_unlimited' : 'streak_build_capacity', { used: buildQuota.used, limit: buildQuota.limit })}</strong></div>
        <div><span>{t('streak_build_bonus', { count: buildQuota.streak_bonus })}</span>{buildQuota.limit !== null && <small>{t('streak_build_next', { count: 5 - buildQuota.active_streak % 5 })}</small>}</div>
      </div>}

      {open && <Modal open onClose={() => setOpen(false)} title={t('streak_popup_title')} size="2xl" className="streak-rewards-modal">
        <div className="streak-dialog">
          {inspected ? (
            <>
              <button type="button" ref={backButton} className="streak-back" onClick={back}><ArrowLeft size={16} aria-hidden="true" />{t('streak_back_rewards')}</button>
              <div className="streak-reward-detail">
                <StreakFrame tier={streakFrameTier(inspected.threshold)}><img src={inspected.avatarPath} alt={t(inspected.nameKey)} width={512} height={512} /></StreakFrame>
                <div><p className="account-eyebrow">{t('streak_threshold', { count: inspected.threshold })}</p><h3>{t(inspected.nameKey)}</h3><p>{t('streak_frame_label', { tier: t(`streak_frame_${streakFrameTier(inspected.threshold)}`) })}</p><span>{t(unrestricted ? 'streak_admin_available' : best >= inspected.threshold ? 'streak_unlocked' : 'streak_remaining', { count: Math.max(0, inspected.threshold - current) })}</span></div>
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
              {unrestricted && <p className="streak-dialog-note">{t('streak_admin_all_art')}</p>}
              {next && <p className="streak-dialog-next"><strong>{nextNames}</strong><span>{t('streak_remaining', { count: remaining })}</span></p>}
              {best > current && <p className="streak-dialog-note">{t('streak_keep_rewards')}</p>}
              <div className="streak-sections" role="tablist" aria-label={t('streak_sections')}>
                {SECTIONS.map((item, index) => {
                  const rewards = EXCLUSIVE_REWARDS.filter(r => inSection(r, item.id))
                  const earned = rewards.filter(r => unrestricted || best >= r.threshold).length
                  return <button key={item.id} id={`${id}-tab-${item.id}`} type="button" role="tab" aria-selected={section === item.id} aria-controls={`${id}-collection`} tabIndex={section === item.id ? 0 : -1} onClick={() => setSection(item.id)} onKeyDown={event => {
                    const target = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? SECTIONS.length - 1 : null
                    if (target === null) return
                    event.preventDefault()
                    changeSection(target)
                  }}>{t(item.nameKey)}<small aria-label={t('streak_collection_count', { earned, total: rewards.length })}>{earned}/{rewards.length}</small></button>
                })}
              </div>
              <p className="streak-section-caption">{t(section === 'bakara' ? 'streak_bakara_collection_hint' : 'streak_section_range', { from: visibleRewards[0].threshold, to: visibleRewards[visibleRewards.length - 1].threshold })}</p>
              <div id={`${id}-collection`} role="tabpanel" aria-labelledby={`${id}-tab-${section}`} className="streak-reward-grid">
                {visibleRewards.map(reward => {
                  const earned = unrestricted || best >= reward.threshold
                  const isNext = next?.threshold === reward.threshold
                  const tier = streakFrameTier(reward.threshold)
                  return (
                    <button key={reward.slug} type="button" className={'streak-reward' + (isNext ? ' is-next' : '')} aria-label={t('streak_reward_view', { name: t(reward.nameKey) })} ref={node => { if (node) cards.current.set(reward.slug, node); else cards.current.delete(reward.slug) }} onClick={() => setInspected(reward)}>
                      <img className="streak-reward-banner" src={reward.bannerPath} alt="" width={1920} height={640} loading="lazy" />
                      <div className="streak-reward-body">
                        <StreakFrame tier={tier}><img src={reward.avatarPath} alt="" width={72} height={72} loading="lazy" /></StreakFrame>
                        <div><span className="streak-reward-days">{t('streak_threshold', { count: reward.threshold })}</span><h3>{t(reward.nameKey)}</h3><small>{t(`streak_frame_${tier}`)}</small></div>
                      </div>
                      <span className="streak-reward-state">{earned ? <Check size={14} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}{t(unrestricted ? 'streak_admin_available' : earned ? 'streak_unlocked' : isNext ? 'streak_next_reward' : 'streak_locked')}<ChevronRight size={14} aria-hidden="true" /></span>
                    </button>
                  )
                })}
              </div>
              <details className="streak-how"><summary>{t('streak_how')}</summary><p>{t('streak_how_daily')}</p><p>{t('streak_how_reset')}</p><p>{t('streak_keep_rewards')}</p><p>{t('streak_build_rules')}</p></details>
              <button type="button" className="account-button streak-customize" onClick={() => customize()}>{t('streak_gallery')}<ArrowUpRight size={16} aria-hidden="true" /></button>
            </>
          )}
        </div>
      </Modal>}
    </section>
  )
}
