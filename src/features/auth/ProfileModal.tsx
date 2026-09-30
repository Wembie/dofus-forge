import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User, FileText, LogOut, Camera } from 'lucide-react'
import { Modal, Button } from '@/ui'
import { useAuthStore, isSafeImageUrl, isAcceptedAvatarType, AVATAR_ACCEPT, AVATAR_MAX_BYTES } from '@/store/authStore.ts'

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t }           = useTranslation()
  const profile         = useAuthStore(s => s.profile)
  const updateUsername  = useAuthStore(s => s.updateUsername)
  const updateProfile   = useAuthStore(s => s.updateProfile)
  const uploadAvatar    = useAuthStore(s => s.uploadAvatar)
  const signOut         = useAuthStore(s => s.signOut)

  const [username, setUsername]       = useState(profile?.username ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio]                 = useState(profile?.bio ?? '')
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url ?? '')
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar]   = useState(false)
  const [busy, setBusy]               = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // avatarPreview briefly holds a local blob: URL between file pick and
  // upload finishing — revoke it so it doesn't leak once replaced/unmounted.
  useEffect(() => {
    const url = avatarPreview
    return () => { if (url.startsWith('blob:')) URL.revokeObjectURL(url) }
  }, [avatarPreview])

  function close() {
    setError(null)
    onClose()
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    if (!isAcceptedAvatarType(file.type)) { setError(t('auth_avatar_type_invalid')); return }
    if (file.size > AVATAR_MAX_BYTES) { setError(t('auth_avatar_too_large')); return }

    setAvatarPreview(URL.createObjectURL(file))
    setUploadingAvatar(true)
    const { url, error: err } = await uploadAvatar(file)
    setUploadingAvatar(false)
    if (err) { setError(t('auth_username_error')); setAvatarPreview(profile?.avatar_url ?? ''); return }
    setPendingAvatarUrl(url)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    if (username.trim().toLowerCase() !== profile?.username) {
      const { error: err } = await updateUsername(username.trim().toLowerCase())
      if (err) {
        setBusy(false)
        setError(t(err === 'invalid_username' ? 'auth_username_invalid' : err === 'username_taken' ? 'auth_username_taken' : 'auth_username_error'))
        return
      }
    }

    const { error: err } = await updateProfile({
      display_name: displayName.trim() || null,
      bio:          bio.trim() || null,
      ...(pendingAvatarUrl ? { avatar_url: pendingAvatarUrl } : {}),
    })
    setBusy(false)
    if (err) { setError(t('auth_username_error')); return }
    close()
  }

  return (
    <Modal open={open} onClose={close} title={t('auth_profile_title')} size="sm">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative flex-shrink-0 w-12 h-12 rounded-full group"
            title={t('auth_avatar_change')}
          >
            {avatarPreview.startsWith('blob:') || isSafeImageUrl(avatarPreview)
              ? <img src={avatarPreview} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
              : (
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-full"
                  style={{ background: 'color-mix(in srgb, var(--gold) 12%, transparent)' }}
                >
                  <User size={20} style={{ color: 'var(--gold)' }} />
                </div>
              )
            }
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(10,13,19,.6)' }}
            >
              <Camera size={16} color="#fff" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={AVATAR_ACCEPT}
              onChange={onAvatarChange}
              className="hidden"
            />
          </button>
          <div className="flex gap-3 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            <span><strong style={{ color: 'var(--ink)' }}>{profile?.builds_count ?? 0}</strong> {t('auth_stat_builds')}</span>
            <span><strong style={{ color: 'var(--ink)' }}>{profile?.followers_count ?? 0}</strong> {t('auth_stat_followers')}</span>
            <span><strong style={{ color: 'var(--ink)' }}>{profile?.following_count ?? 0}</strong> {t('auth_stat_following')}</span>
          </div>
        </div>
        {uploadingAvatar && <p className="text-[10px] mb-3" style={{ color: 'var(--ink-faint)' }}>{t('auth_loading')}</p>}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>
              {t('auth_username')}
            </label>
            <div className="relative">
              <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />
              <input
                type="text"
                required
                minLength={3}
                maxLength={30}
                autoFocus
                pattern="[a-z0-9_-]{3,30}"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full text-sm rounded-lg pl-8 pr-3 py-2 transition-colors focus:outline-none"
                style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')}
              />
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>{t('auth_username_hint')}</p>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>
              {t('auth_display_name')}
            </label>
            <input
              type="text"
              maxLength={50}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2 transition-colors focus:outline-none"
              style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')}
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>
              {t('auth_bio')}
            </label>
            <div className="relative">
              <FileText size={14} className="absolute left-2.5 top-2.5 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />
              <textarea
                maxLength={300}
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="w-full text-sm rounded-lg pl-8 pr-3 py-2 transition-colors focus:outline-none resize-none"
                style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')}
              />
            </div>
          </div>

          {error && (
            <p
              className="text-[11px] rounded-md px-2.5 py-1.5"
              style={{ color: 'var(--negative)', background: 'color-mix(in srgb, var(--negative) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--negative) 25%, transparent)' }}
            >
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="md" disabled={busy || uploadingAvatar} className="w-full justify-center">
            {busy ? t('auth_loading') : t('save')}
          </Button>
        </form>

        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 h-px" style={{ background: 'var(--metal-edge)' }} />
        </div>

        <button
          onClick={() => { close(); signOut() }}
          className="w-full flex items-center justify-center gap-2 text-[11px] py-2 rounded-lg transition-colors hover:bg-surface-raised"
          style={{ color: 'var(--ink-faint)' }}
        >
          <LogOut size={13} />
          {t('auth_signout')}
        </button>
      </div>
    </Modal>
  )
}
