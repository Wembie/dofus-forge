import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/ui'
import { isSafeImageUrl } from '@/store/authStore.ts'
import { AccountAvatar } from '@/features/builds/FollowListModal.tsx'
import type { StreakFrameTier } from '@/features/profile/milestones.ts'
import { StreakFrameOrnament } from '@/features/profile/StreakFrame.tsx'

export function PublicProfileAvatar({ username, url, streakTier = null }: { username: string; url: string | null; streakTier?: StreakFrameTier | null }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  if (!isSafeImageUrl(url)) {
    return (
      <span className="streak-frame" data-tier={streakTier ?? undefined}>
        <AccountAvatar username={username} url={url} />
        <StreakFrameOrnament tier={streakTier} />
      </span>
    )
  }

  return (
    <>
      <button type="button" className="public-profile-avatar streak-frame" data-tier={streakTier ?? undefined} onClick={() => setOpen(true)}
        aria-haspopup="dialog" aria-label={t('profile_avatar_view', { username })}
        title={t('profile_avatar_view', { username })}>
        <AccountAvatar username={username} url={url} />
        <StreakFrameOrnament tier={streakTier} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t('profile_avatar_title', { username })} size="xl">
        <div className="public-profile-avatar-art">
          <img src={url} alt={t('profile_avatar_title', { username })} width={512} height={512} />
        </div>
      </Modal>
    </>
  )
}
