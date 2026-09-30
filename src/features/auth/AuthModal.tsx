import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Button } from '@/ui'
import { useAuthStore } from '@/store/authStore.ts'

type Mode = 'signin' | 'signup'

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t }      = useTranslation()
  const signIn     = useAuthStore(s => s.signIn)
  const signUp     = useAuthStore(s => s.signUp)

  const [mode, setMode]         = useState<Mode>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [signedUp, setSignedUp] = useState(false)

  function reset() {
    setEmail(''); setPassword(''); setError(null); setBusy(false); setSignedUp(false)
  }

  function close() {
    reset()
    onClose()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: err } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password)
    setBusy(false)
    if (err) { setError(err); return }
    if (mode === 'signup') { setSignedUp(true); return }
    close()
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface-panel)',
    border:     '1px solid var(--metal-edge)',
    color:      'var(--ink)',
  }

  return (
    <Modal open={open} onClose={close} title={t(mode === 'signin' ? 'auth_signin_title' : 'auth_signup_title')} size="sm">
      <div className="p-4">
        {signedUp ? (
          <div className="text-center space-y-3 py-2">
            <p className="text-sm" style={{ color: 'var(--ink)' }}>{t('auth_check_email')}</p>
            <Button variant="secondary" size="sm" onClick={close}>{t('modal_close')}</Button>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--ink-faint)' }}>
                  {t('auth_email')}
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full text-sm rounded px-2.5 py-1.5 focus:outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--ink-faint)' }}>
                  {t('auth_password')}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full text-sm rounded px-2.5 py-1.5 focus:outline-none"
                  style={inputStyle}
                />
              </div>

              {error && (
                <p className="text-[11px]" style={{ color: 'var(--negative)' }}>{error}</p>
              )}

              <Button type="submit" variant="primary" size="md" disabled={busy} className="w-full justify-center">
                {busy ? t('auth_loading') : t(mode === 'signin' ? 'auth_signin_btn' : 'auth_signup_btn')}
              </Button>
            </form>

            <p className="text-[11px] text-center mt-3" style={{ color: 'var(--ink-faint)' }}>
              {mode === 'signin' ? t('auth_no_account') : t('auth_has_account')}{' '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
                className="underline"
                style={{ color: 'var(--gold)' }}
              >
                {t(mode === 'signin' ? 'auth_signup_btn' : 'auth_signin_btn')}
              </button>
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
