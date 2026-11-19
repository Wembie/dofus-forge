import { useState, useRef, useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { LogIn, LogOut, Settings, User } from 'lucide-react'
import { useAuthStore, isSafeImageUrl } from '@/store/authStore.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { AuthModal } from './AuthModal.tsx'
import { ResetPasswordModal } from './ResetPasswordModal.tsx'
import { SIGN_IN_EVENT } from './requestSignIn.ts'

/** Sign-in button, or the player's menu: public profile, account, sign out. */
export function AuthButton() {
  const { t, i18n } = useTranslation()
  const navigate   = useNavigate()
  const session    = useAuthStore(s => s.session)
  const profile    = useAuthStore(s => s.profile)
  const loading    = useAuthStore(s => s.loading)
  const signOut    = useAuthStore(s => s.signOut)
  const prefix     = langPathPrefix(i18n.language)
  const menuId     = useId()

  const [showAuth, setShowAuth] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setShowMenu(false) }
    const onKey  = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowMenu(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [showMenu])

  // Actions that need an account (like, rate, comment) ask for it here.
  useEffect(() => {
    const open = () => setShowAuth(true)
    window.addEventListener(SIGN_IN_EVENT, open)
    return () => window.removeEventListener(SIGN_IN_EVENT, open)
  }, [])

  if (loading) return null

  if (!session) {
    return (
      <>
        <button type="button" className="site-signin" onClick={() => setShowAuth(true)} title={t('auth_signin_title')}>
          <LogIn size={16} aria-hidden="true" />
          <span>{t('auth_signin_btn')}</span>
        </button>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
        <ResetPasswordModal />
      </>
    )
  }

  // Always the username, never display_name — same rule as build/comment
  // attribution (BuildCard.tsx): the nickname is the identity shown
  // everywhere, display_name is just optional flavor text, never primary.
  const label    = profile?.username || session.user.email || ''
  const realName = profile?.display_name
  const avatar   = isSafeImageUrl(profile?.avatar_url) ? profile.avatar_url : null

  return (
    <div className="site-account" ref={menuRef}>
      <button
        type="button"
        className="site-avatar"
        onClick={() => setShowMenu(v => !v)}
        aria-label={t('account_menu_label', { name: label })}
        aria-expanded={showMenu}
        aria-controls={menuId}
        title={realName ? `${label} (${realName})` : label}
      >
        {avatar ? <img src={avatar} alt="" width={36} height={36} /> : label.slice(0, 1).toUpperCase()}
      </button>

      {showMenu && (
        <div id={menuId} className="site-popover site-account-menu">
          <p>
            <b>{label}</b>
            {realName && <span>{realName}</span>}
            <small>{t('account_signed_in')}</small>
          </p>
          {profile?.username && (
            <Link to={`/${prefix}u/${profile.username}`} onClick={() => setShowMenu(false)}>
              <User size={16} aria-hidden="true" />
              {t('account_public_profile')}
            </Link>
          )}
          <button type="button" onClick={() => { setShowMenu(false); navigate(`/${prefix}account`) }}>
            <Settings size={16} aria-hidden="true" />
            {t('auth_profile_title')}
          </button>
          <button type="button" className="is-quiet" onClick={() => { setShowMenu(false); signOut() }}>
            <LogOut size={16} aria-hidden="true" />
            {t('auth_signout')}
          </button>
        </div>
      )}

      <ResetPasswordModal />
    </div>
  )
}
