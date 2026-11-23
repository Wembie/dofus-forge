import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Search } from 'lucide-react'
import { Modal, normalizeSearch } from '@/ui'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { resolveClassName } from '@/features/class-picker/useClassName.ts'
import { AccountAvatar } from '@/features/builds/FollowListModal.tsx'
import { CLASS_AVATARS } from './classAvatars.ts'

type Props = { username: string; value: string | null; onChange: (url: string | null) => void; disabled: boolean }
type Avatar = (typeof CLASS_AVATARS)[number]

export function ClassAvatarPicker({ username, value, onChange, disabled }: Props) {
  const { t, i18n } = useTranslation()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState<Avatar | null>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const previewButtons = useRef(new Map<string, HTMLButtonElement>())
  const returnTo = useRef({ url: '', scrollTop: 0 })
  const className = (classId: string) => resolveClassName(classId, i18n.language.slice(0, 2), null)
  const genderAndLook = (a: Avatar) => t('account_avatar_gender_look', { gender: t(`gender_${a.gender}`), number: a.headSlot })
  const avatarLabel = (a: Avatar) => t('account_avatar_option', { class: className(a.classId), gender: genderAndLook(a) })
  const selected = CLASS_AVATARS.find(a => a.url === value)
  const classes = CLASS_DATA.filter(c => normalizeSearch(className(c.id)).includes(normalizeSearch(query.trim())))

  useEffect(() => {
    if (!preview) return
    if (detailRef.current?.parentElement) detailRef.current.parentElement.scrollTop = 0
    backRef.current?.focus({ preventScroll: true })
  }, [preview])

  function inspect(avatar: Avatar) {
    returnTo.current = { url: avatar.url, scrollTop: galleryRef.current?.parentElement?.scrollTop ?? 0 }
    setPreview(avatar)
  }

  function backToGallery() {
    setPreview(null)
    requestAnimationFrame(() => {
      if (galleryRef.current?.parentElement) galleryRef.current.parentElement.scrollTop = returnTo.current.scrollTop
      previewButtons.current.get(returnTo.current.url)?.focus({ preventScroll: true })
    })
  }

  function openPicker() {
    setPreview(null)
    setQuery('')
    setOpen(true)
  }

  return (
    <div className="account-avatar-control">
      <AccountAvatar username={username} url={value} />
      <div>
        <button type="button" className="account-button" disabled={disabled} onClick={openPicker}>{t('auth_avatar_change')}</button>
        <p>{t('account_avatar_hint')}</p>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={preview ? avatarLabel(preview) : t('account_avatar_title')} size="4xl">
        {preview ? (
          <section ref={detailRef} className="account-avatar-detail">
            <button ref={backRef} type="button" className="account-button" onClick={backToGallery}>
              <ArrowLeft size={17} aria-hidden="true" />{t('account_avatar_back')}
            </button>
            <div className="account-avatar-art-layout">
              <figure className="account-avatar-art">
                <img src={preview.url} alt={avatarLabel(preview)} width={512} height={512} />
                <figcaption>{t('account_avatar_full')}</figcaption>
              </figure>
              <aside className="account-avatar-crop">
                <AccountAvatar username={username} url={preview.url} />
                <div>
                  <h3>{t('account_avatar_crop')}</h3>
                  <p>{t('account_avatar_hint')}</p>
                </div>
                <button type="button" className="site-primary" disabled={disabled} onClick={() => { onChange(preview.url); setOpen(false) }}>
                  <Check size={17} aria-hidden="true" />{t('account_avatar_use')}
                </button>
              </aside>
            </div>
          </section>
        ) : (
          <div ref={galleryRef}>
            <fieldset className="account-avatar-picker" disabled={disabled} aria-describedby={`${id}-hint`}>
              <legend>{t('account_avatar_title')}</legend>
              <p id={`${id}-hint`}>{t('account_avatar_inspect_hint')}</p>
              <label className="account-avatar-search">
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">{t('account_avatar_search')}</span>
                <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('account_avatar_search')} />
              </label>
              <label className="account-avatar-default">
                <input type="radio" name={id} checked={value === null} onChange={() => onChange(null)} />
                {t('account_avatar_default')}
              </label>
              <div className="account-avatar-grid">
                {classes.map(c => (
                  <div className="account-avatar-class" key={c.id}>
                    <h3>{className(c.id)}</h3>
                    <div>
                      {CLASS_AVATARS.filter(a => a.classId === c.id).map(a => (
                        <div className="account-avatar-option" key={a.url}>
                          <button type="button" className="account-avatar-inspect" onClick={() => inspect(a)}
                            ref={node => { if (node) previewButtons.current.set(a.url, node); else previewButtons.current.delete(a.url) }}
                            aria-label={t('account_avatar_view', { class: className(c.id), gender: genderAndLook(a) })}>
                            <img src={a.url} alt="" width={128} height={128} loading="lazy" decoding="async" />
                          </button>
                          <label>
                            <input type="radio" name={id} value={a.url} checked={value === a.url} onChange={() => onChange(a.url)}
                              aria-label={avatarLabel(a)} />
                            <span>{t(`gender_${a.gender}`)}<small>{t('account_avatar_head_slot', { number: a.headSlot })}</small></span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {classes.length === 0 && <p role="status">{t('account_avatar_empty')}</p>}
            </fieldset>
            <div className="account-avatar-footer">
              <div className="account-avatar-selection">
                <AccountAvatar username={username} url={value} />
                <div>
                  <strong>{t('account_avatar_crop')}</strong>
                  <span>{selected ? avatarLabel(selected) : t(value ? 'account_avatar_current' : 'account_avatar_default')}</span>
                </div>
              </div>
              <button type="button" className="site-primary" onClick={() => setOpen(false)}>{t('account_avatar_done')}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
