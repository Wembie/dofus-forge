import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User, FileText, LogOut, Camera, Lock } from 'lucide-react'
import { Frame, SectionHeader, Button, PasswordInput } from '@/ui'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { useAuthStore, isSafeImageUrl, isAcceptedAvatarType, AVATAR_ACCEPT, AVATAR_MAX_BYTES } from '@/store/authStore.ts'

// Flip once the `avatars` Storage bucket + RLS policies (schema.sql) are
// actually created in the Supabase project — until then upload would just
// fail against a bucket that doesn't exist yet.
const AVATAR_UPLOAD_ENABLED = false

/** Account settings — its own page (not a modal) so editing a profile feels
 * like a real destination instead of a cramped popup, matching the rest of
 * the site's "premium" treatment (SectionHeader's gold rule, Frame panels). */
export function AccountPage() {
  const { t, i18n } = useTranslation()
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'account', { noindex: true })

  const session         = useAuthStore(s => s.session)
  const profile         = useAuthStore(s => s.profile)
  const updateUsername  = useAuthStore(s => s.updateUsername)
  const updateProfile   = useAuthStore(s => s.updateProfile)
  const uploadAvatar    = useAuthStore(s => s.uploadAvatar)
  const updatePassword  = useAuthStore(s => s.updatePassword)
  const signOut         = useAuthStore(s => s.signOut)

  const [username, setUsername]       = useState(profile?.username ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio]                 = useState(profile?.bio ?? '')
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url ?? '')
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar]   = useState(false)
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [saved, setSaved]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy]       = useState(false)
  const [passwordError, setPasswordError]     = useState<string | null>(null)
  const [passwordDone, setPasswordDone]       = useState(false)

  // Profile loads async after this page already mounted — pick up the real
  // values once it resolves instead of staying seeded with null/empty.
  useEffect(() => {
    setUsername(profile?.username ?? '')
    setDisplayName(profile?.display_name ?? '')
    setBio(profile?.bio ?? '')
    // Sanitize where the value enters state, not just at the <img src> render
    // site — isSafeImageUrl() already guarded the render, but a static
    // analyzer can't see that a boolean check on the same variable guards
    // the sink; storing only the already-safe value closes that gap too.
    const safeProfileAvatar = profile?.avatar_url ?? ''
    setAvatarPreview(isSafeImageUrl(safeProfileAvatar) ? safeProfileAvatar : '')
  }, [profile])

  useEffect(() => {
    const url = avatarPreview
    return () => { if (url.startsWith('blob:')) URL.revokeObjectURL(url) }
  }, [avatarPreview])

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    if (!isAcceptedAvatarType(file.type)) { setError(t('auth_avatar_type_invalid')); return }
    if (file.size > AVATAR_MAX_BYTES) { setError(t('auth_avatar_too_large')); return }

    const blobUrl = URL.createObjectURL(file)
    if (!blobUrl.startsWith('blob:')) { setError(t('auth_username_error')); return }
    setAvatarPreview(blobUrl)
    setUploadingAvatar(true)
    const { url, error: err } = await uploadAvatar(file)
    setUploadingAvatar(false)
    if (err) { setError(t('auth_username_error')); setAvatarPreview(profile?.avatar_url ?? ''); return }
    setPendingAvatarUrl(url)
  }

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)

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
    setSaved(true)
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setPasswordError(t('auth_password_mismatch')); return }
    setPasswordError(null)
    setPasswordBusy(true)
    const { error: err } = await updatePassword(newPassword)
    setPasswordBusy(false)
    if (err) { setPasswordError(err); return }
    setNewPassword(''); setConfirmPassword('')
    setPasswordDone(true)
  }

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader />

      <main className="px-4 sm:px-6 py-8 max-w-2xl mx-auto space-y-6">
        {!session ? (
          <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>{t('my_builds_signin_required')}</p>
        ) : (
          <>
            {/* Hero: avatar + identity + stats */}
            <Frame padding="lg" gold className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => AVATAR_UPLOAD_ENABLED && fileInputRef.current?.click()}
                disabled={!AVATAR_UPLOAD_ENABLED}
                className="relative flex-shrink-0 w-20 h-20 rounded-full group"
                title={AVATAR_UPLOAD_ENABLED ? t('auth_avatar_change') : undefined}
                style={{ boxShadow: '0 0 0 2px color-mix(in srgb, var(--gold) 35%, transparent), 0 0 24px color-mix(in srgb, var(--gold) 18%, transparent)' }}
              >
                {avatarPreview.startsWith('blob:') || isSafeImageUrl(avatarPreview)
                  // codeql[js/xss-through-dom] -- avatarPreview is restricted to http(s)/blob: before this branch (see the profile-sync effect and onAvatarChange above); <img src> sets a DOM attribute/URL fetch, it never parses the value as HTML.
                  ? <img src={avatarPreview} alt="" width={80} height={80} className="w-20 h-20 rounded-full object-cover" />
                  : (
                    <div
                      className="flex items-center justify-center w-20 h-20 rounded-full"
                      style={{ background: 'color-mix(in srgb, var(--gold) 12%, transparent)' }}
                    >
                      <User size={32} style={{ color: 'var(--gold)' }} />
                    </div>
                  )
                }
                {AVATAR_UPLOAD_ENABLED && (
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(10,13,19,.6)' }}
                  >
                    <Camera size={20} color="#fff" />
                  </div>
                )}
                {AVATAR_UPLOAD_ENABLED && (
                  <input ref={fileInputRef} type="file" accept={AVATAR_ACCEPT} onChange={onAvatarChange} className="hidden" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="font-display font-bold text-lg truncate" style={{ color: 'var(--gold)' }}>
                  {profile?.display_name || profile?.username || ''}
                </h1>
                {profile?.display_name && (
                  <p className="text-[11px] truncate" style={{ color: 'var(--ink-faint)' }}>@{profile.username}</p>
                )}
                <div className="flex gap-4 text-[11px] mt-2" style={{ color: 'var(--ink-faint)' }}>
                  <span><strong style={{ color: 'var(--ink)' }}>{profile?.builds_count ?? 0}</strong> {t('auth_stat_builds')}</span>
                  <span><strong style={{ color: 'var(--ink)' }}>{profile?.followers_count ?? 0}</strong> {t('auth_stat_followers')}</span>
                  <span><strong style={{ color: 'var(--ink)' }}>{profile?.following_count ?? 0}</strong> {t('auth_stat_following')}</span>
                </div>
                {uploadingAvatar && <p className="text-[10px] mt-1.5" style={{ color: 'var(--ink-faint)' }}>{t('auth_loading')}</p>}
              </div>
            </Frame>

            {/* Profile */}
            <section className="space-y-3">
              <SectionHeader label={t('account_section_profile')} />
              <Frame padding="lg">
                <form onSubmit={submitProfile} className="space-y-3.5">
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
                    <p className="text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>{t('auth_display_name_hint')}</p>
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
                  {saved && !error && (
                    <p className="text-[11px]" style={{ color: 'var(--gold)' }}>{t('save')} ✓</p>
                  )}

                  <Button type="submit" variant="primary" size="md" disabled={busy || uploadingAvatar}>
                    {busy ? t('auth_loading') : t('save')}
                  </Button>
                </form>
              </Frame>
            </section>

            {/* Security */}
            <section className="space-y-3">
              <SectionHeader label={t('account_section_security')} />
              <Frame padding="lg">
                {passwordDone ? (
                  <p className="text-[12px] flex items-center gap-2" style={{ color: 'var(--gold)' }}>
                    <Lock size={13} />{t('auth_password_updated')}
                  </p>
                ) : (
                  <form onSubmit={submitPassword} className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>
                        {t('auth_new_password')}
                      </label>
                      <PasswordInput
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>
                        {t('auth_confirm_password')}
                      </label>
                      <PasswordInput
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    {passwordError && (
                      <p
                        className="text-[11px] rounded-md px-2.5 py-1.5"
                        style={{ color: 'var(--negative)', background: 'color-mix(in srgb, var(--negative) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--negative) 25%, transparent)' }}
                      >
                        {passwordError}
                      </p>
                    )}
                    <Button type="submit" variant="secondary" size="md" disabled={passwordBusy}>
                      {passwordBusy ? t('auth_loading') : t('auth_reset_btn')}
                    </Button>
                  </form>
                )}
              </Frame>
            </section>

            {/* Sign out */}
            <Frame padding="md" className="flex items-center justify-between gap-3">
              <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{t('auth_signout')}</span>
              <Button variant="danger" size="sm" onClick={() => signOut()}>
                <LogOut size={13} />
                {t('auth_signout')}
              </Button>
            </Frame>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
