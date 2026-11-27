import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Image, Lock, Mars, Palette, Search, SlidersHorizontal, Sparkles, User, Users, Venus, X } from 'lucide-react'
import { Modal, normalizeSearch } from '@/ui'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { resolveClassName } from '@/features/class-picker/useClassName.ts'
import { AccountAvatar } from '@/features/builds/FollowListModal.tsx'
import { AVATAR_HEAD_SLOTS, CLASS_AVATARS } from './classAvatars.ts'
import { isProfileBannerUrl } from './profileBanners.ts'
import { PROFILE_BANNER_OPTIONS as PROFILE_BANNERS, PROFILE_BANNER_GROUPS } from './profileAppearanceCatalog.ts'
import { EXCLUSIVE_REWARDS, exclusiveRewardOf, type ExclusiveReward } from '@/features/profile/exclusiveRewards.ts'
import type { ExclusiveUnlock } from '@/features/profile/exclusiveUnlocks.ts'
import './profileAppearance.css'

type Tab = 'avatars' | 'banners'
type Avatar = (typeof CLASS_AVATARS)[number]
type Banner = (typeof PROFILE_BANNERS)[number]
type Inspection = { kind: 'avatars'; art: Avatar } | { kind: 'banners'; art: Banner } | { kind: 'exclusive'; tab: Tab; art: ExclusiveReward }
type Appearance = { avatar: string | null; banner: string | null; exclusiveAvatarSlug: string | null; exclusiveBannerSlug: string | null }
type Props = Appearance & {
  username: string
  displayName: string
  bio: string
  disabled: boolean
  /** Per-slug unlock progress (`get_my_exclusive_unlocks`) — empty while signed out or still loading. */
  unlocks: ExclusiveUnlock[]
  onChange: (appearance: Appearance) => void
}

const newestHead = Math.max(...AVATAR_HEAD_SLOTS)

export function ProfileAppearancePicker({ username, displayName, bio, avatar, banner, exclusiveAvatarSlug, exclusiveBannerSlug, unlocks, disabled, onChange }: Props) {
  const { t, i18n } = useTranslation()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('avatars')
  const [draft, setDraft] = useState<Appearance>({ avatar, banner, exclusiveAvatarSlug, exclusiveBannerSlug })
  const [queries, setQueries] = useState({ avatars: '', banners: '' })
  const [classId, setClassId] = useState('all')
  const [gender, setGender] = useState('all')
  const [head, setHead] = useState('all')
  const [category, setCategory] = useState('all')
  const [onlyNew, setOnlyNew] = useState(false)
  const [onlyExclusive, setOnlyExclusive] = useState(false)
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [mobilePreview, setMobilePreview] = useState(false)
  const galleryRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const returnTo = useRef({ url: '', scrollTop: 0 })
  const className = (value: string) => resolveClassName(value, i18n.language.slice(0, 2), null)
  const avatarLabel = (a: Avatar) => t('account_avatar_option', { class: className(a.classId), gender: t('account_avatar_gender_look', { gender: t(`gender_${a.gender}`), number: a.headSlot }) })
  const bannerLabel = (b: Banner) => t(`profile_banner_location_${b.id}`)
  const query = normalizeSearch(queries[tab].trim())
  const visibleAvatars = onlyExclusive ? [] : CLASS_AVATARS.filter(a => (classId === 'all' || a.classId === classId)
    && (gender === 'all' || a.gender === gender) && (head === 'all' || String(a.headSlot) === head)
    && (!onlyNew || a.headSlot === newestHead) && normalizeSearch(className(a.classId)).includes(query))
  const visibleBanners = onlyExclusive ? [] : PROFILE_BANNERS.filter(b => (category === 'all' || b.category === category)
    && (!onlyNew || b.isNew) && normalizeSearch(bannerLabel(b)).includes(query))
  const count = tab === 'avatars' ? visibleAvatars.length : visibleBanners.length
  const selectedAvatar = CLASS_AVATARS.find(a => a.url === draft.avatar)
  const selectedBanner = PROFILE_BANNERS.find(b => b.url === draft.banner)
  const selectedExclusiveAvatar = EXCLUSIVE_REWARDS.find(r => r.slug === draft.exclusiveAvatarSlug)
  const selectedExclusiveBanner = EXCLUSIVE_REWARDS.find(r => r.slug === draft.exclusiveBannerSlug)
  const changed = draft.avatar !== avatar || draft.banner !== banner
    || draft.exclusiveAvatarSlug !== exclusiveAvatarSlug || draft.exclusiveBannerSlug !== exclusiveBannerSlug
  const unlockFor = (slug: string) => unlocks.find(u => u.slug === slug)
  const exclusiveLabel = (r: ExclusiveReward) => t(r.nameKey)
  const inspectionUrl = (i: Inspection) => i.kind === 'exclusive' ? (i.tab === 'avatars' ? i.art.avatarPath : i.art.bannerPath) : i.art.url
  const inspectionLabel = (i: Inspection) => i.kind === 'avatars' ? avatarLabel(i.art) : i.kind === 'banners' ? bannerLabel(i.art) : exclusiveLabel(i.art)
  const hasFilters = !!queries[tab] || onlyNew || onlyExclusive || (tab === 'avatars' ? classId !== 'all' || gender !== 'all' || head !== 'all' : category !== 'all')

  useEffect(() => {
    if (inspection) backRef.current?.focus({ preventScroll: true })
  }, [inspection])

  function openGallery(next: Tab) {
    setDraft({ avatar, banner, exclusiveAvatarSlug, exclusiveBannerSlug })
    setTab(next)
    setInspection(null)
    setMobilePreview(false)
    setOpen(true)
  }

  function switchTab(next: Tab) {
    setTab(next)
    setInspection(null)
    if (galleryRef.current) galleryRef.current.scrollTop = 0
  }

  function navigateTabs(e: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const next = e.key === 'Home' ? 'avatars' : e.key === 'End' ? 'banners' : tab === 'avatars' ? 'banners' : 'avatars'
    switchTab(next)
    document.getElementById(`${id}-${next}-tab`)?.focus()
  }

  function inspect(next: Inspection) {
    returnTo.current = { url: inspectionUrl(next), scrollTop: galleryRef.current?.scrollTop ?? 0 }
    setInspection(next)
  }

  function back() {
    setInspection(null)
    requestAnimationFrame(() => {
      if (galleryRef.current) galleryRef.current.scrollTop = returnTo.current.scrollTop
      buttons.current.get(returnTo.current.url)?.focus({ preventScroll: true })
    })
  }

  function clearFilters() {
    setQueries(q => ({ ...q, [tab]: '' }))
    setOnlyNew(false)
    setOnlyExclusive(false)
    if (tab === 'avatars') { setClassId('all'); setGender('all'); setHead('all') } else setCategory('all')
  }

  function chooseInspected() {
    if (!inspection) return
    if (inspection.kind === 'exclusive') {
      if (unlockFor(inspection.art.slug)?.eligible !== true) return
      setDraft(d => inspection.tab === 'avatars'
        ? { ...d, avatar: null, exclusiveAvatarSlug: inspection.art.slug }
        : { ...d, banner: null, exclusiveBannerSlug: inspection.art.slug })
    } else {
      setDraft(d => ({ ...d, [inspection.kind === 'avatars' ? 'avatar' : 'banner']: inspection.art.url }))
    }
    back()
  }

  const draftAvatarUrl = selectedExclusiveAvatar?.avatarPath ?? draft.avatar
  const draftBannerUrl = selectedExclusiveBanner?.bannerPath ?? draft.banner
  const profilePreview = (
    <div className="appearance-profile-card">
      <div className={'appearance-cover' + (!isProfileBannerUrl(draft.banner) && !draft.exclusiveBannerSlug ? ' is-empty' : '')}>
        {(isProfileBannerUrl(draft.banner) || draft.exclusiveBannerSlug) && <img src={draftBannerUrl!} alt="" width={1920} height={640} />}
      </div>
      <div className="appearance-profile-body">
        <AccountAvatar username={username} url={draftAvatarUrl} />
        <h3>{displayName || username}</h3>
        <p className="appearance-handle">@{username}</p>
        <p className="appearance-bio">{bio || t('appearance_preview_bio')}</p>
      </div>
    </div>
  )

  return (
    <section className="profile-appearance-summary" aria-label={t('appearance_title')}>
      <div className={'appearance-summary-cover' + (!isProfileBannerUrl(banner) && !exclusiveBannerSlug ? ' is-empty' : '')}>
        {(isProfileBannerUrl(banner) || exclusiveBannerSlug) && <img src={exclusiveRewardOf(exclusiveBannerSlug)?.bannerPath ?? banner!} alt="" width={1920} height={640} />}
        <button type="button" disabled={disabled} onClick={() => openGallery('banners')}><Image size={16} aria-hidden="true" />{t('account_banner_change')}</button>
      </div>
      <div className="appearance-summary-body">
        <button type="button" className="appearance-avatar-trigger" disabled={disabled} aria-label={t('auth_avatar_change')} onClick={() => openGallery('avatars')}>
          <AccountAvatar username={username} url={exclusiveRewardOf(exclusiveAvatarSlug)?.avatarPath ?? avatar} />
        </button>
        <div><h3>{t('appearance_title')}</h3><p>{t('appearance_intro')}</p></div>
        <button type="button" className="site-primary" disabled={disabled} onClick={() => openGallery('avatars')}><Palette size={17} aria-hidden="true" />{t('appearance_open')}</button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={t('appearance_title')} size="full" className="profile-customizer-modal">
        <div className="appearance-workspace">
          <header className="appearance-header">
            <div><span className="appearance-eyebrow">{t('appearance_collection')}</span><h3>{t('appearance_heading')}</h3><p>{t('appearance_intro')}</p></div>
            <button type="button" className="appearance-mobile-preview" aria-expanded={mobilePreview} aria-controls={`${id}-preview`} onClick={() => setMobilePreview(v => !v)}><User size={16} aria-hidden="true" />{t('appearance_preview')}</button>
          </header>
          <div className="appearance-body">
            <div className="appearance-library">
              <div className="appearance-tabs" role="tablist" aria-label={t('appearance_collection')}>
                {(['avatars', 'banners'] as const).map(v => (
                  <button key={v} id={`${id}-${v}-tab`} type="button" role="tab" aria-selected={tab === v} aria-controls={`${id}-gallery`} tabIndex={tab === v ? 0 : -1} onClick={() => switchTab(v)} onKeyDown={navigateTabs}>
                    {v === 'avatars' ? <User size={17} aria-hidden="true" /> : <Image size={17} aria-hidden="true" />}{t(`appearance_tab_${v}`)}<span>{v === 'avatars' ? CLASS_AVATARS.length : PROFILE_BANNERS.length}</span>
                  </button>
                ))}
              </div>
              {inspection ? (
                <section className="appearance-inspection" id={`${id}-gallery`} role="tabpanel" aria-labelledby={`${id}-${tab}-tab`}>
                  <button ref={backRef} type="button" className="appearance-back" onClick={back}><ArrowLeft size={16} aria-hidden="true" />{t(inspection.kind === 'banners' ? 'account_banner_back' : 'account_avatar_back')}</button>
                  {(() => {
                    const unlock = inspection.kind === 'exclusive' ? unlockFor(inspection.art.slug) : undefined
                    const locked = inspection.kind === 'exclusive' && unlock?.eligible !== true
                    const isBannerKind = inspection.kind === 'banners' || (inspection.kind === 'exclusive' && inspection.tab === 'banners')
                    return (
                      <>
                        <figure className={isBannerKind ? 'is-banner' : undefined}>
                          <img src={inspectionUrl(inspection)} alt={inspectionLabel(inspection)} width={isBannerKind ? 1920 : 512} height={isBannerKind ? 640 : 512} className={locked ? 'is-locked' : undefined} />
                          <figcaption>{inspectionLabel(inspection)}</figcaption>
                        </figure>
                        {locked ? (
                          <p className="appearance-exclusive-progress"><Lock size={14} aria-hidden="true" />{t('appearance_exclusive_locked_hint', { progress: unlock?.progress ?? 0, threshold: inspection.kind === 'exclusive' ? inspection.art.threshold : 0 })}</p>
                        ) : (
                          <button type="button" className="site-primary" disabled={disabled} onClick={chooseInspected}><Check size={16} aria-hidden="true" />{t(isBannerKind ? 'account_banner_use' : 'account_avatar_use')}</button>
                        )}
                      </>
                    )
                  })()}
                </section>
              ) : (
                <>
                  <div className="appearance-toolbar">
                    <label className="appearance-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{t(tab === 'avatars' ? 'account_avatar_search' : 'account_banner_search')}</span><input type="search" value={queries[tab]} onChange={e => setQueries(q => ({ ...q, [tab]: e.target.value }))} placeholder={t(tab === 'avatars' ? 'account_avatar_search' : 'account_banner_search')} /></label>
                    <div className="appearance-toggle-group">
                      <label className="appearance-new-filter"><input type="checkbox" checked={onlyNew} onChange={e => setOnlyNew(e.target.checked)} /><Sparkles size={14} aria-hidden="true" />{t('appearance_new')}</label>
                      <label className="appearance-new-filter appearance-exclusive-filter"><input type="checkbox" checked={onlyExclusive} onChange={e => setOnlyExclusive(e.target.checked)} /><Lock size={14} aria-hidden="true" />{t('appearance_exclusive_heading')}</label>
                    </div>
                    {tab === 'avatars' ? (
                      <div className="appearance-filters">
                        <label><span>{t('appearance_class')}</span><select aria-label={t('appearance_class')} value={classId} onChange={e => setClassId(e.target.value)}><option value="all">{t('appearance_all_classes')}</option>{CLASS_DATA.map(c => <option key={c.id} value={c.id}>{className(c.id)}</option>)}</select></label>
                        <div className="appearance-gender-field"><span>{t('appearance_gender')}</span><div className="appearance-gender-options" role="group" aria-label={t('appearance_gender')}>
                          {([{ value: 'all', label: 'appearance_all_genders', icon: Users }, { value: 'male', label: 'gender_male', icon: Mars }, { value: 'female', label: 'gender_female', icon: Venus }] as const).map(({ value, label, icon: Icon }) => (
                            <button type="button" key={value} aria-label={t(label)} aria-pressed={gender === value} onClick={() => setGender(value)}><Icon size={18} aria-hidden="true" /></button>
                          ))}
                        </div></div>
                        <label><span>{t('appearance_face')}</span><select aria-label={t('appearance_face')} value={head} onChange={e => setHead(e.target.value)}><option value="all">{t('appearance_all_faces')}</option>{AVATAR_HEAD_SLOTS.map(slot => <option key={slot} value={slot}>{t('account_avatar_head_slot', { number: slot })}</option>)}</select></label>
                      </div>
                    ) : (
                      <div className="appearance-categories" role="group" aria-label={t('appearance_categories')}>
                        {['all', ...PROFILE_BANNER_GROUPS.map(g => g.id)].map(v => <button type="button" key={v} aria-pressed={category === v} onClick={() => setCategory(v)}>{t(`appearance_category_${v}`)}</button>)}
                      </div>
                    )}
                    <div className="appearance-results"><span role="status" aria-live="polite">{t(tab === 'avatars' ? 'appearance_avatar_count' : 'appearance_banner_count', { count })}</span><button type="button" onClick={() => setDraft(d => ({ ...d, [tab === 'avatars' ? 'avatar' : 'banner']: null }))} disabled={tab === 'avatars' ? draft.avatar === null : draft.banner === null}>{t(tab === 'avatars' ? 'account_avatar_default' : 'account_banner_remove')}</button>{hasFilters && <button type="button" onClick={clearFilters}><X size={13} aria-hidden="true" />{t('appearance_clear')}</button>}</div>
                  </div>
                  <div ref={galleryRef} id={`${id}-gallery`} className="appearance-gallery" role="tabpanel" aria-labelledby={`${id}-${tab}-tab`} tabIndex={0}>
                    <div className={'appearance-art-grid ' + (tab === 'banners' ? 'is-banners' : '')}>
                      {tab === 'avatars' ? visibleAvatars.map(a => (
                        <article className={'appearance-art-card' + (draft.avatar === a.url ? ' is-selected' : '')} key={a.url}>
                          <button type="button" className="appearance-art-inspect" onClick={() => inspect({ kind: 'avatars', art: a })} aria-label={t('account_avatar_view', { class: className(a.classId), gender: t('account_avatar_gender_look', { gender: t(`gender_${a.gender}`), number: a.headSlot }) })} ref={node => { if (node) buttons.current.set(a.url, node); else buttons.current.delete(a.url) }}>
                            <img src={a.url} alt="" width={512} height={512} loading="lazy" decoding="async" />
                            {a.headSlot === newestHead && <span className="appearance-new-badge">{t('appearance_new_badge')}</span>}
                          </button>
                          <label className="appearance-art-choice"><input type="radio" name={`${id}-avatar`} value={a.url} checked={draft.avatar === a.url} onChange={() => setDraft(d => ({ ...d, avatar: a.url }))} aria-label={avatarLabel(a)} /><span><strong>{className(a.classId)}</strong><small>{t('account_avatar_gender_look', { gender: t(`gender_${a.gender}`), number: a.headSlot })}</small></span></label>
                        </article>
                      )) : visibleBanners.map(b => (
                        <article className={'appearance-art-card' + (draft.banner === b.url ? ' is-selected' : '')} key={b.id}>
                          <button type="button" className="appearance-art-inspect" onClick={() => inspect({ kind: 'banners', art: b })} aria-label={t('account_banner_view', { location: bannerLabel(b) })} ref={node => { if (node) buttons.current.set(b.url, node); else buttons.current.delete(b.url) }}>
                            <img src={b.url} alt="" width={1920} height={640} loading="lazy" decoding="async" />{b.isNew && <span className="appearance-new-badge">{t('appearance_new_badge')}</span>}
                          </button>
                          <label className="appearance-art-choice"><input type="radio" name={`${id}-banner`} value={b.url} checked={draft.banner === b.url} onChange={() => setDraft(d => ({ ...d, banner: b.url }))} /><span><strong>{bannerLabel(b)}</strong><small>{t(`appearance_category_${b.category}`)}</small></span></label>
                        </article>
                      ))}
                    </div>
                    {count === 0 && !onlyExclusive && <div className="appearance-empty"><SlidersHorizontal size={25} aria-hidden="true" /><h3>{t('appearance_empty_title')}</h3><p>{t('appearance_empty_hint')}</p><button type="button" onClick={clearFilters}>{t('appearance_clear')}</button></div>}
                    {(onlyExclusive || !queries[tab]) && (
                      <div className="appearance-exclusive-section">
                        <h4><Lock size={14} aria-hidden="true" />{t('appearance_exclusive_heading')}</h4>
                        <div className={'appearance-art-grid ' + (tab === 'banners' ? 'is-banners' : '')}>
                          {EXCLUSIVE_REWARDS.map(r => {
                            const unlock = unlockFor(r.slug)
                            const eligible = unlock?.eligible === true
                            const picked = tab === 'avatars' ? draft.exclusiveAvatarSlug === r.slug : draft.exclusiveBannerSlug === r.slug
                            const url = tab === 'avatars' ? r.avatarPath : r.bannerPath
                            return (
                              <article className={'appearance-art-card is-exclusive' + (picked ? ' is-selected' : '') + (eligible ? '' : ' is-locked')} key={r.slug}>
                                <button type="button" className="appearance-art-inspect" onClick={() => inspect({ kind: 'exclusive', tab, art: r })} aria-label={exclusiveLabel(r)} ref={node => { if (node) buttons.current.set(url, node); else buttons.current.delete(url) }}>
                                  <img src={url} alt="" width={tab === 'avatars' ? 512 : 1920} height={tab === 'avatars' ? 512 : 640} loading="lazy" decoding="async" />
                                  {!eligible && <span className="appearance-lock-badge"><Lock size={14} aria-hidden="true" /></span>}
                                </button>
                                <label className="appearance-art-choice">
                                  <input type="radio" name={`${id}-${tab}`} value={r.slug} checked={picked} disabled={!eligible}
                                    onChange={() => setDraft(d => tab === 'avatars' ? { ...d, avatar: null, exclusiveAvatarSlug: r.slug } : { ...d, banner: null, exclusiveBannerSlug: r.slug })} />
                                  <span><strong>{exclusiveLabel(r)}</strong>
                                    <small>{eligible ? t('appearance_exclusive_unlocked') : t('appearance_exclusive_progress', { progress: unlock?.progress ?? 0, threshold: r.threshold })}</small>
                                  </span>
                                </label>
                              </article>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <aside id={`${id}-preview`} className={'appearance-preview' + (mobilePreview ? ' is-open' : '')} aria-label={t('appearance_preview')}>
              <div className="appearance-preview-heading"><span className="appearance-eyebrow">{t('appearance_preview')}</span><button type="button" className="appearance-mobile-preview" onClick={() => setMobilePreview(false)} aria-label={t('appearance_close_preview')}><X size={17} aria-hidden="true" /></button></div>
              {profilePreview}
              <div className="appearance-selection-info"><span>{t('appearance_tab_avatars')}</span><strong>{selectedExclusiveAvatar ? exclusiveLabel(selectedExclusiveAvatar) : selectedAvatar ? avatarLabel(selectedAvatar) : t(draft.avatar ? 'account_avatar_current' : 'account_avatar_default')}</strong></div>
              <div className="appearance-selection-info"><span>{t('appearance_tab_banners')}</span><strong>{selectedExclusiveBanner ? exclusiveLabel(selectedExclusiveBanner) : selectedBanner ? bannerLabel(selectedBanner) : t('account_banner_none')}</strong></div>
              <p className="appearance-preview-note">{t('appearance_save_hint')}</p>
            </aside>
          </div>
          <footer className="appearance-footer"><p><span className="appearance-mobile-avatar"><AccountAvatar username={username} url={draftAvatarUrl} /></span>{t(changed ? 'appearance_pending' : 'appearance_footer_hint')}</p><div><button type="button" className="appearance-cancel" onClick={() => setOpen(false)}>{t('report_cancel')}</button><button type="button" className="site-primary" disabled={disabled || !changed} onClick={() => { onChange(draft); setOpen(false) }}><Check size={16} aria-hidden="true" />{t('appearance_apply')}</button></div></footer>
        </div>
      </Modal>
    </section>
  )
}
