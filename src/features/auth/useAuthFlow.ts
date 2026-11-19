import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore.ts'
import { LEGAL_DOCS, type LegalDoc } from './legal.ts'
import { USERNAME_RE, PASSWORD_MIN_LENGTH } from './authRules.ts'

export type AuthMode = 'signin' | 'signup' | 'forgot'
export type AuthServices = Pick<ReturnType<typeof useAuthStore.getState>, 'signIn' | 'signUp' | 'requestPasswordReset'>

/** Shared access flow. A preview can inject local services without replacing the account store. */
export function useAuthFlow({ onClose, initialMode = 'signin', services }: {
  onClose: () => void
  initialMode?: AuthMode
  services?: AuthServices
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const [signedUp, setSignedUp] = useState(false), [resetSent, setResetSent] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null), [turnstileKey, setTurnstileKey] = useState(0)
  const [accepted, setAccepted] = useState<Partial<Record<LegalDoc, boolean>>>({})
  const request = useRef(0), submitting = useRef(false)
  useEffect(() => () => { request.current++; submitting.current = false }, [])
  const legalOk = mode !== 'signup' || LEGAL_DOCS.every(doc => accepted[doc])

  function refreshChallenge() { setCaptchaToken(null); setTurnstileKey(k => k + 1) }
  function switchMode(next: AuthMode) {
    request.current++; submitting.current = false
    setMode(next); setBusy(false); setError(null); setPassword(''); setSignedUp(false); setResetSent(false)
    refreshChallenge()
  }
  function close() {
    switchMode(initialMode); setEmail(''); setUsername(''); setAccepted({}); onClose()
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (submitting.current || !captchaToken || !legalOk) return
    const normalizedUsername = username.trim().toLowerCase()
    if (mode === 'signup' && !USERNAME_RE.test(normalizedUsername)) { setError(t('auth_username_invalid')); return }
    if (mode !== 'forgot' && password.length < PASSWORD_MIN_LENGTH) { setError(t('auth_password_hint', { count: PASSWORD_MIN_LENGTH })); return }
    const mine = ++request.current
    submitting.current = true; setBusy(true); setError(null)
    try {
      const api = services ?? useAuthStore.getState()
      const result = mode === 'forgot' ? await api.requestPasswordReset(email.trim(), captchaToken)
        : mode === 'signup' ? await api.signUp(email.trim(), password, normalizedUsername, captchaToken)
        : await api.signIn(email.trim(), password, captchaToken)
      if (mine !== request.current) return
      if (result.error) {
        setError(result.error === 'invalid_username' ? t('auth_username_invalid') : result.error === 'username_taken' ? t('auth_username_taken') : result.error)
        refreshChallenge(); return
      }
      setPassword('')
      if (mode === 'signup') { setSignedUp(true); return }
      if (mode === 'forgot') { setResetSent(true); return }
      close()
    } catch {
      if (mine === request.current) { setError(t('auth_connection_error')); refreshChallenge() }
    } finally {
      if (mine === request.current) { submitting.current = false; setBusy(false) }
    }
  }
  return { mode, email, setEmail, password, setPassword, username, setUsername, busy, error, signedUp, resetSent, captchaToken, setCaptchaToken, turnstileKey, accepted, setAccepted, legalOk, switchMode, close, submit }
}
