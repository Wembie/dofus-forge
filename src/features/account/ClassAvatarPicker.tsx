import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/ui'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { resolveClassName } from '@/features/class-picker/useClassName.ts'
import { AccountAvatar } from '@/features/builds/FollowListModal.tsx'
import { CLASS_AVATARS } from './classAvatars.ts'

type Props = { username: string; value: string | null; onChange: (url: string | null) => void; disabled: boolean }

export function ClassAvatarPicker({ username, value, onChange, disabled }: Props) {
  const { t, i18n } = useTranslation()
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <div className="account-avatar-control">
      <AccountAvatar username={username} url={value} />
      <div>
        <button type="button" className="account-button" disabled={disabled} onClick={() => setOpen(true)}>{t('auth_avatar_change')}</button>
        <p>{t('account_avatar_hint')}</p>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={t('account_avatar_title')} size="2xl">
        <fieldset className="account-avatar-picker" disabled={disabled} aria-describedby={`${id}-hint`}>
          <legend>{t('account_avatar_title')}</legend>
          <p id={`${id}-hint`}>{t('account_avatar_hint')}</p>
          <label className="account-avatar-default">
            <input type="radio" name={id} checked={value === null} onChange={() => onChange(null)} />
            {t('account_avatar_default')}
          </label>
          <div className="account-avatar-grid">
            {CLASS_DATA.map(c => {
              const name = resolveClassName(c.id, i18n.language.slice(0, 2), null)
              return (
                <div className="account-avatar-class" key={c.id}>
                  <span>{name}</span>
                  <div>
                    {CLASS_AVATARS.filter(a => a.classId === c.id).map(a => (
                      <label className="account-avatar-option" key={a.url}>
                        <input type="radio" name={id} value={a.url} checked={value === a.url} onChange={() => onChange(a.url)}
                          aria-label={t('account_avatar_option', { class: name, gender: t(`gender_${a.gender}`) })} />
                        <img src={a.url} alt="" width={64} height={64} loading="lazy" decoding="async" />
                        <span>{t(`gender_${a.gender}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </fieldset>
        <div className="account-avatar-footer">
          <AccountAvatar username={username} url={value} />
          <button type="button" className="site-primary" onClick={() => setOpen(false)}>{t('account_avatar_done')}</button>
        </div>
      </Modal>
    </div>
  )
}
