import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Image, Mars, Palette, Search, SlidersHorizontal, Sparkles, User, Users, Venus, X } from 'lucide-react'
import { Modal, normalizeSearch } from '@/ui'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { resolveClassName } from '@/features/class-picker/useClassName.ts'
import { AccountAvatar } from '@/features/builds/FollowListModal.tsx'
import { AVATAR_HEAD_SLOTS, CLASS_AVATARS } from './classAvatars.ts'
import { isProfileBannerUrl } from './profileBanners.ts'
import { PROFILE_BANNER_OPTIONS as PROFILE_BANNERS, PROFILE_BANNER_GROUPS } from './profileAppearanceCatalog.ts'
import './profileAppearance.css'

type Tab = 'avatars' | 'banners'
type Avatar = (typeof CLASS_AVATARS)[number]
type Banner = (typeof PROFILE_BANNERS)[number]
type Inspection = { kind: 'avatars'; art: Avatar } | { kind: 'banners'; art: Banner }
type Appearance = { avatar: string | null; banner: string | null }
type Props = Appearance & {
  username: string
  displayName: string
  bio: string
  disabled: boolean
  onChange: (appearance: Appearance) => void
}

const newestHead = Math.max(...AVATAR_HEAD_SLOTS)

export function ProfileAppearancePicker({ username, displayName, bio, avatar, banner, disabled, onChange }: Props) {
  const { t, i18n } = useTranslation()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('avatars')
  const [draft, setDraft] = useState<Appearance>({ avatar, banner })
  const [queries, setQueries] = useState({ avatars: '', banners: '' })
  const [classId, setClassId] = useState('all')
  const [gender, setGender] = useState('all')
  const [head, setHead] = useState('all')
  const [category, setCategory] = useState('all')
  const [onlyNew, setOnlyNew] = useState(false)
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
  const visibleAvatars = CLASS_AVATARS.filter(a => (classId === 'all' || a.classId === classId)
    && (gender === 'all' || a.gender === gender) && (head === 'all' || String(a.headSlot) === head)
    && (!onlyNew || a.headSlot === newestHead) && normalizeSearch(className(a.classId)).includes(query))
  const visibleBanners = PROFILE_BANNERS.filter(b => (category === 'all' || b.category === category)
    && (!onlyNew || b.isNew) && normalizeSearch(bannerLabel(b)).includes(query))
  const count = tab === 'avatars' ? visibleAvatars.length : visibleBanners.length
  const selectedAvatar = CLASS_AVATARS.find(a => a.url === draft.avatar)
  const selectedBanner = PROFILE_BANNERS.find(b => b.url === draft.banner)
  const changed = draft.avatar !== avatar || draft.banner !== banner
  const hasFilters = !!queries[tab] || onlyNew || (tab === 'avatars' ? classId !== 'all' || gender !== 'all' || head !== 'all' : category !== 'all')

  useEffect(() => {
    if (inspection) backRef.current?.focus({ preventScroll: true })
  }, [inspection])

  function openGallery(next: Tab) {
    setDraft({ avatar, banner })
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
    returnTo.current = { url: next.art.url, scrollTop: galleryRef.current?.scrollTop ?? 0 }
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
    if (tab === 'avatars') { setClassId('all'); setGender('all'); setHead('all') } else setCategory('all')
  }

  function chooseInspected() {
    if (!inspection) return
    setDraft(d => ({ ...d, [inspection.kind === 'avatars' ? 'avatar' : 'banner']: inspection.art.url }))
    back()
  }

  const profilePreview = (
    <div className="appearance-profile-card">
      <div className={'appearance-cover' + (!isProfileBannerUrl(draft.banner) ? ' is-empty' : '')}>
        {isProfileBannerUrl(draft.banner) && <img src={draft.banner} alt="" width={1920} height={640} />}
      </div>
      <div className="appearance-profile-body">
        <AccountAvatar username={username} url={draft.avatar} />
        <h3>{displayName || username}</h3>
        <p className="appearance-handle">@{username}</p>
        <p className="appearance-bio">{bio || t('appearance_preview_bio')}</p>
      </div>
    </div>
  )

  return (
    <section className="profile-appearance-summary" aria-label={t('appearance_title')}>
      <div className={'appearance-summary-cover' + (!isProfileBannerUrl(banner) ? ' is-empty' : '')}>
        {isProfileBannerUrl(banner) && <img src={banner} alt="" width={1920} height={640} />}
        <button type="button" disabled={disabled} onClick={() => openGallery('banners')}><Image size={16} aria-hidden="true" />{t('account_banner_change')}</button>
      </div>
      <div className="appearance-summary-body">
        <button type="button" className="appearance-avatar-trigger" disabled={disabled} aria-label={t('auth_avatar_change')} onClick={() => openGallery('avatars')}>
          <AccountAvatar username={username} url={avatar} />
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
                  <button ref={backRef} type="button" className="appearance-back" onClick={back}><ArrowLeft size={16} aria-hidden="true" />{t(inspection.kind === 'avatars' ? 'account_avatar_back' : 'account_banner_back')}</button>
                  <figure className={inspection.kind === 'banners' ? 'is-banner' : undefined}>
                    <img src={inspection.art.url} alt={inspection.kind === 'avatars' ? avatarLabel(inspection.art) : bannerLabel(inspection.art)} width={inspection.kind === 'avatars' ? 512 : 1920} height={inspection.kind === 'avatars' ? 512 : 640} />
                    <figcaption>{inspection.kind === 'avatars' ? avatarLabel(inspection.art) : bannerLabel(inspection.art)}</figcaption>
                  </figure>
                  <button type="button" className="site-primary" disabled={disabled} onClick={chooseInspected}><Check size={16} aria-hidden="true" />{t(inspection.kind === 'avatars' ? 'account_avatar_use' : 'account_banner_use')}</button>
                </section>
              ) : (
                <>
                  <div className="appearance-toolbar">
                    <label className="appearance-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{t(tab === 'avatars' ? 'account_avatar_search' : 'account_banner_search')}</span><input type="search" value={queries[tab]} onChange={e => setQueries(q => ({ ...q, [tab]: e.target.value }))} placeholder={t(tab === 'avatars' ? 'account_avatar_search' : 'account_banner_search')} /></label>
                    <label className="appearance-new-filter"><input type="checkbox" checked={onlyNew} onChange={e => setOnlyNew(e.target.checked)} /><Sparkles size={14} aria-hidden="true" />{t('appearance_new')}</label>
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
                    {count === 0 && <div className="appearance-empty"><SlidersHorizontal size={25} aria-hidden="true" /><h3>{t('appearance_empty_title')}</h3><p>{t('appearance_empty_hint')}</p><button type="button" onClick={clearFilters}>{t('appearance_clear')}</button></div>}
                  </div>
                </>
              )}
            </div>
            <aside id={`${id}-preview`} className={'appearance-preview' + (mobilePreview ? ' is-open' : '')} aria-label={t('appearance_preview')}>
              <div className="appearance-preview-heading"><span className="appearance-eyebrow">{t('appearance_preview')}</span><button type="button" className="appearance-mobile-preview" onClick={() => setMobilePreview(false)} aria-label={t('appearance_close_preview')}><X size={17} aria-hidden="true" /></button></div>
              {profilePreview}
              <div className="appearance-selection-info"><span>{t('appearance_tab_avatars')}</span><strong>{selectedAvatar ? avatarLabel(selectedAvatar) : t(draft.avatar ? 'account_avatar_current' : 'account_avatar_default')}</strong></div>
              <div className="appearance-selection-info"><span>{t('appearance_tab_banners')}</span><strong>{selectedBanner ? bannerLabel(selectedBanner) : t('account_banner_none')}</strong></div>
              <p className="appearance-preview-note">{t('appearance_save_hint')}</p>
            </aside>
          </div>
          <footer className="appearance-footer"><p><span className="appearance-mobile-avatar"><AccountAvatar username={username} url={draft.avatar} /></span>{t(changed ? 'appearance_pending' : 'appearance_footer_hint')}</p><div><button type="button" className="appearance-cancel" onClick={() => setOpen(false)}>{t('report_cancel')}</button><button type="button" className="site-primary" disabled={disabled || !changed} onClick={() => { onChange(draft); setOpen(false) }}><Check size={16} aria-hidden="true" />{t('appearance_apply')}</button></div></footer>
        </div>
      </Modal>
    </section>
  )
}
