import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Search } from 'lucide-react'
import { Modal, normalizeSearch } from '@/ui'
import { AccountAvatar } from '@/features/builds/FollowListModal.tsx'
import { ProfileBanner } from './ProfileBanner.tsx'
import { PROFILE_BANNERS, isProfileBannerUrl } from './profileBanners.ts'

type Props = { username: string; avatarUrl: string | null; value: string | null; onChange: (url: string | null) => void; disabled: boolean }
type Banner = (typeof PROFILE_BANNERS)[number]

export function ProfileBannerPicker({ username, avatarUrl, value, onChange, disabled }: Props) {
  const { t } = useTranslation()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState<Banner | null>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const returnTo = useRef({ url: '', scrollTop: 0 })
  const location = (b: Banner) => t(`profile_banner_location_${b.id}`)
  const selected = PROFILE_BANNERS.find(b => b.url === value)
  const banners = PROFILE_BANNERS.filter(b => normalizeSearch(location(b)).includes(normalizeSearch(query.trim())))

  useEffect(() => {
    if (!preview) return
    if (detailRef.current?.parentElement) detailRef.current.parentElement.scrollTop = 0
    backRef.current?.focus({ preventScroll: true })
  }, [preview])

  function inspect(banner: Banner) {
    returnTo.current = { url: banner.url, scrollTop: galleryRef.current?.parentElement?.scrollTop ?? 0 }
    setPreview(banner)
  }

  function back() {
    setPreview(null)
    requestAnimationFrame(() => {
      if (galleryRef.current?.parentElement) galleryRef.current.parentElement.scrollTop = returnTo.current.scrollTop
      buttons.current.get(returnTo.current.url)?.focus({ preventScroll: true })
    })
  }

  return (
    <div className="account-banner-control">
      <div className="account-banner-intro">
        <div><h3>{t('account_banner_title')}</h3><p>{t('account_banner_hint')}</p></div>
        <button type="button" className="account-button" disabled={disabled} onClick={() => { setPreview(null); setQuery(''); setOpen(true) }}>
          {t('account_banner_change')}
        </button>
      </div>
      {isProfileBannerUrl(value) ? <ProfileBanner key={value} username={username} url={value} /> : <div className="account-banner-empty">{t('account_banner_none')}</div>}
      {value && <button type="button" className="account-banner-remove" disabled={disabled} onClick={() => onChange(null)}>{t('account_banner_remove')}</button>}
      <Modal open={open} onClose={() => setOpen(false)} title={preview ? location(preview) : t('account_banner_title')} size="4xl">
        {preview ? (
          <section ref={detailRef} className="account-banner-detail">
            <button ref={backRef} type="button" className="account-button" onClick={back}><ArrowLeft size={17} aria-hidden="true" />{t('account_banner_back')}</button>
            <div className="profile-banner-full-art"><img src={preview.url} alt={location(preview)} width={1920} height={640} /></div>
            <div className="account-banner-detail-actions">
              <figure className="account-banner-profile-preview">
                <img src={preview.url} alt="" width={1920} height={640} />
                <div><AccountAvatar username={username} url={avatarUrl} /><strong>{username}</strong></div>
                <figcaption>{t('account_banner_profile_preview')}</figcaption>
              </figure>
              <button type="button" className="site-primary" disabled={disabled} onClick={() => { onChange(preview.url); setOpen(false) }}>
                <Check size={17} aria-hidden="true" />{t('account_banner_use')}
              </button>
            </div>
          </section>
        ) : (
          <div ref={galleryRef}>
            <fieldset className="account-banner-picker" disabled={disabled} aria-describedby={`${id}-hint`}>
              <legend className="sr-only">{t('account_banner_title')}</legend>
              <p id={`${id}-hint`}>{t('account_banner_inspect_hint')}</p>
              <label className="account-avatar-search">
                <Search size={18} aria-hidden="true" /><span className="sr-only">{t('account_banner_search')}</span>
                <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('account_banner_search')} />
              </label>
              <label className="account-avatar-default"><input type="radio" name={id} checked={value === null} onChange={() => onChange(null)} />{t('account_banner_none')}</label>
              <div className="account-banner-grid">
                {banners.map(b => (
                  <div className="account-banner-option" key={b.id}>
                    <button type="button" className="account-banner-inspect" onClick={() => inspect(b)} aria-label={t('account_banner_view', { location: location(b) })}
                      ref={node => { if (node) buttons.current.set(b.url, node); else buttons.current.delete(b.url) }}>
                      <img src={b.url} alt="" width={480} height={160} loading="lazy" decoding="async" />
                    </button>
                    <label><input type="radio" name={id} value={b.url} checked={value === b.url} onChange={() => onChange(b.url)} />{location(b)}</label>
                  </div>
                ))}
              </div>
              {banners.length === 0 && <p role="status">{t('account_banner_empty')}</p>}
            </fieldset>
            <div className="account-avatar-footer">
              <span>{selected ? t('account_banner_selected', { location: location(selected) }) : t('account_banner_none')}</span>
              <button type="button" className="site-primary" onClick={() => setOpen(false)}>{t('account_avatar_done')}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
