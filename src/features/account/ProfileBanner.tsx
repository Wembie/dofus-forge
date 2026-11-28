import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/ui'
import { isProfileBannerUrl } from './profileBanners.ts'
import { isExclusiveBannerUrl } from '@/features/profile/exclusiveAppearance.ts'

// Same shape as authStore's isSafeImageUrl: a plain `!A(url) && !B(url ?? '')`
// guard doesn't narrow `url` for TS (B's predicate target is `url ?? ''`, a
// different expression from `url`), leaving the two <img src={url}> below
// typed `string | null | undefined`. Combining both checks behind one
// function with its own `url is string` annotation narrows correctly.
function isRenderableBannerUrl(url: string | null | undefined): url is string {
  return !!url && (isProfileBannerUrl(url) || isExclusiveBannerUrl(url))
}

export function ProfileBanner({ username, url }: { username: string; url?: string | null }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (!isRenderableBannerUrl(url)) return null

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
