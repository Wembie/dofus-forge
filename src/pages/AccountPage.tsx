import { useEffect, useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { AlertCircle, ArrowRight, ArrowUpRight, Check, Eye, EyeOff, Lock, LogOut } from 'lucide-react'
import { Modal } from '@/ui'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { useAuthStore } from '@/store/authStore.ts'
import { AccountAvatar, FollowListModal } from '@/features/builds/FollowListModal.tsx'
import { requestSignIn } from '@/features/auth/requestSignIn.ts'
import { PASSWORD_MIN_LENGTH, USERNAME_PATTERN, USERNAME_RE } from '@/features/auth/authRules.ts'
import { ProfileAppearancePicker } from '@/features/account/ProfileAppearancePicker.tsx'
import { fetchMyExclusiveUnlocks, type ExclusiveUnlock } from '@/features/profile/exclusiveUnlocks.ts'
import { StreakChip } from '@/features/profile/StreakChip.tsx'
import '@/features/account/account.css'

type Tab = 'profile' | 'security' | 'session'
const TABS: Tab[] = ['profile', 'security', 'session']

function PasswordField({ label, value, onChange, id, disabled }: { label: string; value: string; onChange: (v: string) => void; id: string; disabled?: boolean }) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  return (
    <div className="account-field">
      <label htmlFor={id}>{label}</label>
      <span className="account-password">
        <input id={id} type={visible ? 'text' : 'password'} minLength={PASSWORD_MIN_LENGTH} required disabled={disabled}
          autoComplete="new-password" value={value} onChange={e => onChange(e.target.value)} />
        <button type="button" aria-label={`${t(visible ? 'auth_password_hide' : 'auth_password_show')}: ${label}`} aria-pressed={visible} onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </span>
    </div>
  )
}

function Message({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <div className={'account-message' + (error ? ' is-error' : '')} role={error ? 'alert' : 'status'}>
      {error ? <AlertCircle size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
      <span>{children}</span>
    </div>
  )
}

/** Your account: the public identity others see, the password, and the session. */
export function AccountPage() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'account', { noindex: true })
  const id = useId()

  const session        = useAuthStore(s => s.session)
  const authLoading    = useAuthStore(s => s.loading)
  const profile        = useAuthStore(s => s.profile)
  const updateUsername = useAuthStore(s => s.updateUsername)
  const updateProfile  = useAuthStore(s => s.updateProfile)
  const updatePassword = useAuthStore(s => s.updatePassword)
  const signOut        = useAuthStore(s => s.signOut)

  const [tab, setTab]                 = useState<Tab>('profile')
  const [people, setPeople]           = useState<'followers' | 'following' | null>(null)
  const [username, setUsername]       = useState(profile?.username ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio]                 = useState(profile?.bio ?? '')
  const [avatar, setAvatar]           = useState(profile?.avatar_url ?? null)
  const [banner, setBanner]           = useState(profile?.banner_url ?? null)
  const [exclusiveAvatarSlug, setExclusiveAvatarSlug] = useState(profile?.exclusive_avatar_slug ?? null)
  const [exclusiveBannerSlug, setExclusiveBannerSlug] = useState(profile?.exclusive_banner_slug ?? null)
  const [unlocks, setUnlocks] = useState<ExclusiveUnlock[]>([])
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [saved, setSaved]     = useState(false)
  const [partial, setPartial] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [passwordBusy, setPasswordBusy]   = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordDone, setPasswordDone]   = useState(false)
  const [signout, setSignout] = useState(false)

  // The profile loads after the page mounts: pick up the real values when it does.
  useEffect(() => {
    setUsername(profile?.username ?? '')
    setDisplayName(profile?.display_name ?? '')
    setBio(profile?.bio ?? '')
  }, [profile])

  useEffect(() => {
    setAvatar(profile?.avatar_url ?? null)
  }, [profile?.id, profile?.avatar_url])

  useEffect(() => {
    setBanner(profile?.banner_url ?? null)
  }, [profile?.id, profile?.banner_url])

  useEffect(() => {
    setExclusiveAvatarSlug(profile?.exclusive_avatar_slug ?? null)
  }, [profile?.id, profile?.exclusive_avatar_slug])

  useEffect(() => {
    setExclusiveBannerSlug(profile?.exclusive_banner_slug ?? null)
  }, [profile?.id, profile?.exclusive_banner_slug])

  useEffect(() => {
    if (!profile?.id) return
    let cancelled = false
    fetchMyExclusiveUnlocks().then(list => { if (!cancelled) setUnlocks(list) })
    return () => { cancelled = true }
  }, [profile?.id])

  const profileDirty = !!profile && (
    username.trim().toLowerCase() !== profile.username ||
    (displayName.trim() || null) !== (profile.display_name ?? null) ||
    (bio.trim() || null) !== (profile.bio ?? null) ||
    avatar !== (profile.avatar_url ?? null) ||
    banner !== (profile.banner_url ?? null) ||
    exclusiveAvatarSlug !== (profile.exclusive_avatar_slug ?? null) ||
    exclusiveBannerSlug !== (profile.exclusive_banner_slug ?? null))
  const dirty = profileDirty || !!password || !!confirm

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return
    const guard = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    addEventListener('beforeunload', guard)
    return () => removeEventListener('beforeunload', guard)
  }, [dirty])

  function edit(fn: () => void) {
    fn()
    setSaved(false)
    setError(null)
  }
  function restore() {
    setUsername(profile?.username ?? '')
    setDisplayName(profile?.display_name ?? '')
    setBio(profile?.bio ?? '')
    setAvatar(profile?.avatar_url ?? null)
    setError(null)
    setBanner(profile?.banner_url ?? null)
    setExclusiveAvatarSlug(profile?.exclusive_avatar_slug ?? null)
    setExclusiveBannerSlug(profile?.exclusive_banner_slug ?? null)
    setPartial(false)
    setSaved(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !profileDirty || !profile) return
    const name = username.trim().toLowerCase()
    if (!USERNAME_RE.test(name)) { setError(t('auth_username_invalid')); return }
    setBusy(true)
    setError(null)
    setSaved(false)
    setPartial(false)
    let renamed = false
    if (name !== profile.username) {
      const { error: err } = await updateUsername(name)
      if (err) {
        setBusy(false)
        setError(t(err === 'invalid_username' ? 'auth_username_invalid' : err === 'username_taken' ? 'auth_username_taken' : 'auth_username_error'))
        return
      }
      renamed = true
    }
    let err: string | null
    try {
      const result = await updateProfile({ display_name: displayName.trim() || null, bio: bio.trim() || null,
        ...(avatar !== (profile.avatar_url ?? null) ? { avatar_url: avatar } : {}),
        ...(banner !== (profile.banner_url ?? null) ? { banner_url: banner } : {}),
        ...(exclusiveAvatarSlug !== (profile.exclusive_avatar_slug ?? null) ? { exclusive_avatar_slug: exclusiveAvatarSlug } : {}),
        ...(exclusiveBannerSlug !== (profile.exclusive_banner_slug ?? null) ? { exclusive_banner_slug: exclusiveBannerSlug } : {}) })
      err = result.error
    } catch {
      err = 'network_error'
    }
    setBusy(false)
    if (err) {
      setPartial(renamed)
      setError(t(err.includes('EXCLUSIVE_REWARD_LOCKED') ? 'appearance_exclusive_locked_error' : renamed ? 'account_partial' : 'account_save_error'))
      return
    }
    setSaved(true)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwordBusy) return
    setPasswordDone(false)
    if (password !== confirm) { setPasswordError(t('auth_password_mismatch')); return }
    setPasswordBusy(true)
    setPasswordError(null)
    const { error: err } = await updatePassword(password)
    setPasswordBusy(false)
    if (err) { setPasswordError(err); return }
    setPassword('')
    setConfirm('')
    setPasswordDone(true)
  }

  const email = session?.user.email ?? ''
  const joined = session ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(session.user.created_at)) : ''
  const publicPath = profile ? `/${prefix}u/${profile.username}` : `/${prefix}`

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader />
      <main id="main-content" className="account-page">
        <div className="account-study">
          <div className="account-heading">
            <div>
              <p className="account-eyebrow">{t('account_private')}</p>
              <h1>{t('auth_profile_title')}</h1>
              <p>{t('account_intro')}</p>
            </div>
            {session && profile && (
              <Link className="account-button" to={publicPath}>
                {t('account_public_preview')}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            )}
          </div>

          {!session ? (
            authLoading ? <p role="status" className="account-list-state">{t('auth_loading')}</p> : (
              <section className="account-empty">
                <Lock size={30} aria-hidden="true" />
                <h2>{t('auth_signin_title')}</h2>
                <p>{t('account_sign_in')}</p>
                <button type="button" className="site-primary" onClick={requestSignIn}>
                  {t('auth_signin_btn')}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
                <Link to={`/${prefix}`}>{t('app_title')}</Link>
              </section>
            )
          ) : (
            <>
              <div className="account-identity">
                <AccountAvatar username={profile?.username ?? email} url={profile?.avatar_url} />
                <div>
                  <h2>{profile?.username}</h2>
                  {profile?.display_name && <p>{profile.display_name}</p>}
                  <small>{t('profile_joined', { date: joined })}</small>
                </div>
                <nav aria-label={t('account_counts')}>
                  <Link className="account-count" to={`/${prefix}my-builds`}>
                    <b>{profile?.builds_count ?? 0}</b>
                    {t('auth_stat_builds')}
                  </Link>
                  <button type="button" onClick={() => setPeople('followers')}>
                    <b>{profile?.followers_count ?? 0}</b>
                    {t('auth_stat_followers')}
                  </button>
                  <button type="button" onClick={() => setPeople('following')}>
                    <b>{profile?.following_count ?? 0}</b>
                    {t('auth_stat_following')}
                  </button>
                </nav>
              </div>

              <nav className="account-tabs" aria-label={t('auth_profile_title')}>
                {TABS.map(v => (
                  <button key={v} type="button" aria-current={tab === v ? 'page' : undefined} onClick={() => setTab(v)}>
                    {t(`account_tab_${v}`)}
                    {v === 'profile' && profileDirty && <span className="account-dirty-dot" role="img" aria-label={t('account_unsaved')} />}
                  </button>
                ))}
              </nav>

              <div className="account-editor-layout">
                <div className="account-editor">
                  <section className="account-section" hidden={tab !== 'profile'} aria-labelledby={`${id}-profile`}>
                    <h2 id={`${id}-profile`}>{t('account_public_identity')}</h2>
                    <p>{t('account_profile_hint')}</p>
                    <form onSubmit={save} aria-busy={busy} className="account-form">
                      <ProfileAppearancePicker username={username || profile?.username || email} displayName={displayName} bio={bio}
                        avatar={avatar} banner={banner} exclusiveAvatarSlug={exclusiveAvatarSlug} exclusiveBannerSlug={exclusiveBannerSlug}
                        unlocks={unlocks} disabled={busy || !profile}
                        onChange={appearance => edit(() => {
                          setAvatar(appearance.avatar); setBanner(appearance.banner)
                          setExclusiveAvatarSlug(appearance.exclusiveAvatarSlug); setExclusiveBannerSlug(appearance.exclusiveBannerSlug)
                        })} />
                      {profile && <StreakChip current={profile.login_streak_current} best={profile.login_streak_best} />}
                      <div className="account-field">
                        <label htmlFor={`${id}-username`}>{t('auth_username')}</label>
                        <input id={`${id}-username`} value={username} disabled={busy} onChange={e => edit(() => setUsername(e.target.value))}
                          required minLength={3} maxLength={30} pattern={USERNAME_PATTERN} autoComplete="username" spellCheck={false}
                          autoCapitalize="none" aria-describedby={`${id}-username-hint`} />
                        <small id={`${id}-username-hint`}>{t('auth_username_hint')}</small>
                      </div>
                      <div className="account-field">
                        <label htmlFor={`${id}-display`}>{t('auth_display_name')}</label>
                        <input id={`${id}-display`} value={displayName} disabled={busy} onChange={e => edit(() => setDisplayName(e.target.value))}
                          maxLength={50} autoComplete="nickname" aria-describedby={`${id}-display-hint`} />
                        <small id={`${id}-display-hint`}>{t('auth_display_name_hint')}</small>
                      </div>
                      <div className="account-field">
                        <label htmlFor={`${id}-bio`}>{t('auth_bio')}</label>
                        <textarea id={`${id}-bio`} rows={4} maxLength={300} value={bio} disabled={busy} onChange={e => edit(() => setBio(e.target.value))}
                          aria-describedby={`${id}-bio-count`} />
                        <small id={`${id}-bio-count`} className="account-counter">{bio.length} / 300</small>
                      </div>
                      {error && <Message error>{error}</Message>}
                      {saved && <Message>{t('account_saved')}</Message>}
                      <div className={'account-savebar' + (profileDirty ? ' is-dirty' : '')}>
                        <span>{partial ? t('account_username_partial') : profileDirty ? t('account_unsaved') : t('account_profile_hint')}</span>
                        <div>
                          <button type="button" disabled={busy || !profileDirty} onClick={restore}>{t('account_discard')}</button>
                          <button type="submit" className="site-primary" disabled={busy || !profileDirty}>
                            {t(busy ? 'account_saving' : 'account_save')}
                            {!busy && <Check size={16} aria-hidden="true" />}
                          </button>
                        </div>
                      </div>
                    </form>
                  </section>

                  <section className="account-section" hidden={tab !== 'security'} aria-labelledby={`${id}-security`}>
                    <h2 id={`${id}-security`}>{t('auth_change_password')}</h2>
                    <p>{t('account_password_intro')}</p>
                    <div className="account-private-email">
                      <Lock size={16} aria-hidden="true" />
                      <span>{t('account_private_email')}<b>{email}</b></span>
                    </div>
                    <form className="account-form" onSubmit={changePassword} aria-busy={passwordBusy}>
                      <PasswordField label={t('auth_new_password')} id={`${id}-password`} value={password} disabled={passwordBusy}
                        onChange={v => { setPassword(v); setPasswordError(null); setPasswordDone(false) }} />
                      <small>{t('auth_password_hint', { count: PASSWORD_MIN_LENGTH })}</small>
                      <PasswordField label={t('auth_confirm_password')} id={`${id}-confirm`} value={confirm} disabled={passwordBusy}
                        onChange={v => { setConfirm(v); setPasswordError(null); setPasswordDone(false) }} />
                      {passwordError && <Message error>{passwordError}</Message>}
                      {passwordDone && <Message>{t('account_password_saved')}</Message>}
                      <button type="submit" className="site-primary account-password-submit" disabled={passwordBusy}>
                        {t(passwordBusy ? 'account_saving' : 'auth_change_password')}
                        <Lock size={16} aria-hidden="true" />
                      </button>
                    </form>
                  </section>

                  <section className="account-section" hidden={tab !== 'session'} aria-labelledby={`${id}-session`}>
                    <h2 id={`${id}-session`}>{t('account_tab_session')}</h2>
                    <p>{t('account_session_intro')}</p>
                    <div className="account-session-row">
                      <span>
                        <b>{profile?.username}</b>
                        <small>{email}</small>
                      </span>
                      <button type="button" onClick={() => setSignout(true)}>
                        {t('auth_signout')}
                        <LogOut size={16} aria-hidden="true" />
                      </button>
                    </div>
                    {dirty && <p className="account-pending-note">{t('account_unsaved')}</p>}
                  </section>
                </div>

                <aside className="account-side-note" aria-label={t('account_public_identity')}>
                  <span className="account-eyebrow">{t('account_public_identity')}</span>
                  <AccountAvatar username={profile?.username ?? email} url={profile?.avatar_url} />
                  <h3>{profile?.username}</h3>
                  {profile?.display_name && <p>{profile.display_name}</p>}
                  <p>{profile?.bio || t('account_no_bio')}</p>
                  <Link className="account-button" to={publicPath}>
                    {t('account_public_preview')}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      {people && session && <FollowListModal userId={session.user.id} type={people} onClose={() => setPeople(null)} />}
      {signout && (
        <Modal open onClose={() => setSignout(false)} title={t('account_signout_title')} size="md">
          <div className="account-dialog-body">
            <LogOut size={28} aria-hidden="true" />
            <p>{t('account_session_intro')}</p>
            {dirty && <p>{t('account_leave_body')}</p>}
            <div className="account-dialog-actions">
              <button type="button" onClick={() => setSignout(false)}>{t('report_cancel')}</button>
              <button type="button" className="site-primary" onClick={() => { setSignout(false); void signOut() }}>{t('auth_signout')}</button>
            </div>
          </div>
        </Modal>
      )}
      <SiteFooter />
    </div>
  )
}

export default AccountPage
