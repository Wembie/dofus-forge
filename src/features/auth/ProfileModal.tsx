import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Image, FileText, LogOut } from 'lucide-react'
import { Modal, Button } from '@/ui'
import { useAuthStore } from '@/store/authStore.ts'

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t }           = useTranslation()
  const profile         = useAuthStore(s => s.profile)
  const updateUsername  = useAuthStore(s => s.updateUsername)
  const updateProfile   = useAuthStore(s => s.updateProfile)
  const signOut          = useAuthStore(s => s.signOut)

  const [username, setUsername]       = useState(profile?.username ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio]                 = useState(profile?.bio ?? '')
  const [avatarUrl, setAvatarUrl]     = useState(profile?.avatar_url ?? '')
  const [busy, setBusy]               = useState(false)
  const [error, setError]             = useState<string | null>(null)

  function close() {
    setError(null)
    onClose()
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
      avatar_url:   avatarUrl.trim() || null,
    })
    setBusy(false)
    if (err) { setError(t(err === 'invalid_avatar_url' ? 'auth_avatar_url_invalid' : 'auth_username_error')); return }
    close()
  }

  return (
    <Modal open={open} onClose={close} title={t('auth_profile_title')} size="sm">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          {avatarUrl
            ? <img src={avatarUrl} alt="" width={48} height={48} className="rounded-full object-cover flex-shrink-0" />
            : (
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0"
                style={{ background: 'color-mix(in srgb, var(--gold) 12%, transparent)' }}
              >
                <User size={20} style={{ color: 'var(--gold)' }} />
              </div>
            )
          }
          <div className="flex gap-3 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            <span><strong style={{ color: 'var(--ink)' }}>{profile?.builds_count ?? 0}</strong> {t('auth_stat_builds')}</span>
            <span><strong style={{ color: 'var(--ink)' }}>{profile?.followers_count ?? 0}</strong> {t('auth_stat_followers')}</span>
            <span><strong style={{ color: 'var(--ink)' }}>{profile?.following_count ?? 0}</strong> {t('auth_stat_following')}</span>
          </div>
        </div>

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

          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>
              {t('auth_avatar_url')}
            </label>
            <div className="relative">
              <Image size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />
              <input
                type="url"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full text-sm rounded-lg pl-8 pr-3 py-2 transition-colors focus:outline-none"
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

          <Button type="submit" variant="primary" size="md" disabled={busy} className="w-full justify-center">
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
