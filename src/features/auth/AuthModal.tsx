import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, User, MailCheck, Swords, X } from 'lucide-react'
import { Modal, Button } from '@/ui'
import { useAuthStore } from '@/store/authStore.ts'
import { Turnstile } from '@/components/Turnstile.tsx'

type Mode = 'signin' | 'signup'

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t }      = useTranslation()
  const signIn     = useAuthStore(s => s.signIn)
  const signUp     = useAuthStore(s => s.signUp)

  const [mode, setMode]         = useState<Mode>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [signedUp, setSignedUp] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [turnstileKey, setTurnstileKey] = useState(0)

  function reset() {
    setEmail(''); setPassword(''); setUsername(''); setError(null); setBusy(false); setSignedUp(false); setCaptchaToken(null); setTurnstileKey(k => k + 1)
  }

  function close() {
    reset()
    onClose()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!captchaToken) return
    setError(null)
    setBusy(true)
    const { error: err } = mode === 'signin'
      ? await signIn(email, password, captchaToken)
      : await signUp(email, password, username.trim().toLowerCase(), captchaToken)
    setBusy(false)
    if (err) {
      setError(err === 'invalid_username' ? t('auth_username_invalid') : err === 'username_taken' ? t('auth_username_taken') : err)
      // Turnstile tokens are single-use — force a fresh challenge (remount
      // the widget) before the next attempt instead of silently retrying
      // with a now-spent token.
      setCaptchaToken(null)
      setTurnstileKey(k => k + 1)
      return
    }
    if (mode === 'signup') { setSignedUp(true); return }
    close()
  }

  return (
    <Modal open={open} onClose={close} size="sm">
      {/* Branded header — Modal's own title bar is plain text, this gives it the
          same gold-accent identity used across the rest of the app. */}
      <div
        className="relative flex flex-col items-center gap-2 px-6 pt-7 pb-5"
        style={{ background: 'linear-gradient(180deg, var(--surface-stone), var(--surface-panel))', borderBottom: '1px solid var(--metal-edge)' }}
      >
        <button
          onClick={close}
          aria-label={t('modal_close')}
          className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-sm transition-colors"
          style={{ color: 'var(--ink-faint)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-faint)')}
        >
          <X size={14} />
        </button>
        <div
          className="flex items-center justify-center w-11 h-11 rounded-full"
          style={{ background: 'color-mix(in srgb, var(--gold) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 35%, transparent)' }}
        >
          <Swords size={20} style={{ color: 'var(--gold)' }} />
        </div>
        <h2 className="font-display font-bold text-sm uppercase tracking-[0.15em]" style={{ color: 'var(--gold)' }}>
          {t(signedUp ? 'auth_check_email_title' : mode === 'signin' ? 'auth_signin_title' : 'auth_signup_title')}
        </h2>
        {!signedUp && (
          <p className="text-[11px] text-center" style={{ color: 'var(--ink-faint)' }}>
            {t(mode === 'signin' ? 'auth_signin_subtitle' : 'auth_signup_subtitle')}
          </p>
        )}
      </div>

      <div className="p-6">
        {signedUp ? (
          <div className="text-center space-y-4 py-1">
            <div className="flex justify-center">
              <div
                className="flex items-center justify-center w-14 h-14 rounded-full"
                style={{ background: 'color-mix(in srgb, var(--gold) 12%, transparent)' }}
              >
                <MailCheck size={26} style={{ color: 'var(--gold)' }} />
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--ink)' }}>{t('auth_check_email')}</p>
            <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{t('auth_check_spam')}</p>
            <Button variant="secondary" size="sm" onClick={close} className="w-full justify-center">
              {t('modal_close')}
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>
                  {t('auth_email')}
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full text-sm rounded-lg pl-8 pr-3 py-2 transition-colors focus:outline-none"
                    style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')}
                  />
                </div>
              </div>
              {mode === 'signup' && (
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
                      autoComplete="username"
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
              )}
              <div>
                <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>
                  {t('auth_password')}
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
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

              <div className="flex justify-center">
                <Turnstile key={turnstileKey} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
              </div>

              <Button type="submit" variant="primary" size="md" disabled={busy || !captchaToken} className="w-full justify-center mt-1">
                {busy ? t('auth_loading') : t(mode === 'signin' ? 'auth_signin_btn' : 'auth_signup_btn')}
              </Button>
            </form>

            <div className="flex items-center gap-2 my-4">
              <div className="flex-1 h-px" style={{ background: 'var(--metal-edge)' }} />
            </div>

            <p className="text-[11px] text-center" style={{ color: 'var(--ink-faint)' }}>
              {mode === 'signin' ? t('auth_no_account') : t('auth_has_account')}{' '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
                className="font-semibold underline underline-offset-2"
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
