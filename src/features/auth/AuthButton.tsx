import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, Pencil } from 'lucide-react'
import { useAuthStore, isSafeImageUrl } from '@/store/authStore.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { AuthModal } from './AuthModal.tsx'
import { ResetPasswordModal } from './ResetPasswordModal.tsx'

export function AuthButton() {
  const { t, i18n } = useTranslation()
  const navigate   = useNavigate()
  const session    = useAuthStore(s => s.session)
  const profile    = useAuthStore(s => s.profile)
  const loading    = useAuthStore(s => s.loading)
  const signOut    = useAuthStore(s => s.signOut)

  const [showAuth, setShowAuth]       = useState(false)
  const [showMenu, setShowMenu]       = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  if (loading) return null

  if (!session) {
    return (
      <>
        <button
          onClick={() => setShowAuth(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border"
          style={{ background: 'transparent', borderColor: 'var(--metal-edge)', color: 'var(--ink-faint)' }}
          title={t('auth_signin_title')}
        >
          <User size={13} />
          <span className="hidden lg:inline">{t('auth_signin_btn')}</span>
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border"
        style={{ background: 'transparent', borderColor: 'var(--metal-edge)', color: 'var(--ink-muted)' }}
        title={realName ? `${label} (${realName})` : label}
      >
        {isSafeImageUrl(profile?.avatar_url)
          ? <img src={profile.avatar_url} alt="" width={16} height={16} className="rounded-full object-cover" />
          : <User size={13} />
        }
        <span className="hidden lg:inline max-w-[100px] truncate">{label}</span>
      </button>

      {showMenu && (
        <div
          className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-50 min-w-[160px]"
          style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge-strong)', boxShadow: 'var(--shadow-frame)' }}
        >
          <button
            onClick={() => { setShowMenu(false); navigate(`/${langPathPrefix(i18n.language)}account`) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-left transition-colors hover:bg-surface-raised"
            style={{ color: 'var(--ink-muted)' }}
          >
            <Pencil size={13} />
            {t('auth_profile_title')}
          </button>
          <button
            onClick={() => { setShowMenu(false); signOut() }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-left transition-colors hover:bg-surface-raised"
            style={{ color: 'var(--ink-muted)', borderTop: '1px solid var(--metal-edge)' }}
          >
            <LogOut size={13} />
            {t('auth_signout')}
          </button>
        </div>
      )}

      <ResetPasswordModal />
    </div>
  )
}
