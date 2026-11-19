import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check } from 'lucide-react'
import { Modal } from '@/ui'
import { useAuthStore } from '@/store/authStore.ts'
import { PASSWORD_MIN_LENGTH } from './authRules.ts'
import { AccessLayout, AccessPassword } from './AccessParts.tsx'

/** Opens itself whenever authStore.passwordRecovery is true — i.e. the user
 * followed the "reset your password" email link and Supabase fired a
 * PASSWORD_RECOVERY auth event. Not opened by any button; mounted once,
 * unconditionally, alongside AuthModal. */
export function ResetPasswordModal() {
  const { t }  = useTranslation()
  const open   = useAuthStore(s => s.passwordRecovery)
  const updatePassword = useAuthStore(s => s.updatePassword)
  const clearPasswordRecovery = useAuthStore(s => s.clearPasswordRecovery)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)
  const id = useId()
  const titleId = `${id}-title`

  function close() {
    setPassword(''); setConfirm(''); setError(null); setBusy(false); setDone(false)
    clearPasswordRecovery()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (password !== confirm) { setError(t('auth_password_mismatch')); return }
    setError(null)
    setBusy(true)
    const { error: err } = await updatePassword(password)
    setBusy(false)
    if (err) { setError(err); return }
    setDone(true)
  }

  return (
    <Modal open={open} onClose={close} size="4xl" labelledBy={titleId} className="auth-dialog">
      <AccessLayout onClose={close}>
        <h2 id={titleId}>{t(done ? 'auth_password_updated' : 'auth_reset_password_title')}</h2>
        {done ? (
          <div className="access-result">
            <Check size={32} aria-hidden="true" />
            <p role="status">{t('auth_password_updated_subtitle')}</p>
            <button type="button" className="site-primary" onClick={close}>{t('auth_continue')}</button>
          </div>
        ) : (
          <form className="access-form" onSubmit={submit} aria-busy={busy}>
            <p className="access-intro">{t('auth_reset_password_subtitle')}</p>
            <AccessPassword id={`${id}-new`} label={t('auth_new_password')} value={password} onChange={setPassword} autoFocus
              hint={t('auth_password_hint', { count: PASSWORD_MIN_LENGTH })} />
            <AccessPassword id={`${id}-confirm`} label={t('auth_confirm_password')} value={confirm} onChange={setConfirm} />
            {error && <p className="access-error" role="alert">{error}</p>}
            <button type="submit" className="site-primary access-submit" disabled={busy}>
              {t(busy ? 'auth_loading' : 'auth_reset_btn')}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </form>
        )}
      </AccessLayout>
    </Modal>
  )
}
