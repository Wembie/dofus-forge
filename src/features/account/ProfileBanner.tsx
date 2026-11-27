import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/ui'
import { isProfileBannerUrl } from './profileBanners.ts'
import { isExclusiveBannerUrl } from '@/features/profile/exclusiveAppearance.ts'

export function ProfileBanner({ username, url }: { username: string; url?: string | null }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (!isProfileBannerUrl(url) && !isExclusiveBannerUrl(url ?? '')) return null

  return (
    <>
      <button type="button" className="profile-banner" onClick={() => setOpen(true)}
        aria-haspopup="dialog" aria-label={t('profile_banner_view', { username })}
        title={t('profile_banner_view', { username })}>
        <img src={url} alt="" width={1920} height={640} decoding="async" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t('profile_banner_title', { username })} size="4xl">
        <div className="profile-banner-full-art">
          <img src={url} alt={t('profile_banner_title', { username })} width={1920} height={640} />
        </div>
      </Modal>
    </>
  )
}
