import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { User, LogOut, Pencil } from 'lucide-react'
import { useAuthStore } from '@/store/authStore.ts'
import { AuthModal } from './AuthModal.tsx'
import { EditUsernameModal } from './EditUsernameModal.tsx'

export function AuthButton() {
  const { t }      = useTranslation()
  const session    = useAuthStore(s => s.session)
  const profile    = useAuthStore(s => s.profile)
  const loading    = useAuthStore(s => s.loading)
  const signOut    = useAuthStore(s => s.signOut)

  const [showAuth, setShowAuth]     = useState(false)
  const [showMenu, setShowMenu]     = useState(false)
  const [showEditName, setShowEditName] = useState(false)
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
      </>
    )
  }

  // display_name/username are never the raw email — the profile row is
  // auto-created on signup (handle_new_user trigger, schema.sql) with a
  // sanitized username, so a build shared publicly later never leaks it.
  const label = profile?.display_name || profile?.username || session.user.email || ''

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border"
        style={{ background: 'transparent', borderColor: 'var(--metal-edge)', color: 'var(--ink-muted)' }}
        title={label}
      >
        {profile?.avatar_url
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
            onClick={() => { setShowMenu(false); setShowEditName(true) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-left transition-colors hover:bg-surface-raised"
            style={{ color: 'var(--ink-muted)' }}
          >
            <Pencil size={13} />
            {t('auth_edit_username')}
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

      <EditUsernameModal open={showEditName} onClose={() => setShowEditName(false)} />
    </div>
  )
}
