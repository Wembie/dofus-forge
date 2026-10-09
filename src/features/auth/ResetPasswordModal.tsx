import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, KeyRound, Check } from 'lucide-react'
import { Modal, Button, PasswordInput } from '@/ui'
import { useAuthStore } from '@/store/authStore.ts'

/** Opens itself whenever authStore.passwordRecovery is true — i.e. the user
 * followed the "reset your password" email link and Supabase fired a
 * PASSWORD_RECOVERY auth event. Not opened by any button; mounted once,
 * unconditionally, alongside AuthModal/ProfileModal. */
export function ResetPasswordModal() {
  const { t }  = useTranslation()
  const open   = useAuthStore(s => s.passwordRecovery)
  const updatePassword = useAuthStore(s => s.updatePassword)
  const clearPasswordRecovery = useAuthStore(s => s.clearPasswordRecovery)

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [busy, setBusy]           = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [done, setDone]           = useState(false)

  function close() {
    setPassword(''); setConfirm(''); setError(null); setBusy(false); setDone(false)
    clearPasswordRecovery()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError(t('auth_password_mismatch')); return }
    setError(null)
    setBusy(true)
    const { error: err } = await updatePassword(password)
    setBusy(false)
    if (err) { setError(err); return }
    setDone(true)
  }

  return (
    <Modal open={open} onClose={close} size="sm">
      <div
        className="relative flex flex-col items-center gap-2 px-6 pt-7 pb-5"
        style={{ background: 'linear-gradient(180deg, var(--surface-stone), var(--surface-panel))', borderBottom: '1px solid var(--metal-edge)' }}
      >
        <div
          className="flex items-center justify-center w-11 h-11 rounded-full"
          style={{ background: 'color-mix(in srgb, var(--gold) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 35%, transparent)' }}
        >
          <KeyRound size={20} style={{ color: 'var(--gold)' }} />
        </div>
        <h2 className="font-display font-bold text-sm uppercase tracking-[0.15em]" style={{ color: 'var(--gold)' }}>
          {t(done ? 'auth_password_updated' : 'auth_reset_password_title')}
        </h2>
        {!done && (
          <p className="text-[11px] text-center" style={{ color: 'var(--ink-faint)' }}>
            {t('auth_reset_password_subtitle')}
          </p>
        )}
      </div>

      <div className="p-6">
        {done ? (
          <div className="text-center space-y-4 py-1">
            <div className="flex justify-center">
              <div
                className="flex items-center justify-center w-14 h-14 rounded-full"
                style={{ background: 'color-mix(in srgb, var(--gold) 12%, transparent)' }}
              >
                <Check size={26} style={{ color: 'var(--gold)' }} />
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--ink)' }}>{t('auth_password_updated_subtitle')}</p>
            <Button variant="secondary" size="sm" onClick={close} className="w-full justify-center">
              {t('modal_close')}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>
                {t('auth_new_password')}
              </label>
              <PasswordInput
                leftIcon={<Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />}
                required
                minLength={6}
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>
                {t('auth_confirm_password')}
              </label>
              <PasswordInput
                leftIcon={<Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </div>

            {error && (
              <p
                className="text-[11px] rounded-md px-2.5 py-1.5"
                style={{ color: 'var(--negative)', background: 'color-mix(in srgb, var(--negative) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--negative) 25%, transparent)' }}
              >
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="md" disabled={busy} className="w-full justify-center mt-1">
              {busy ? t('auth_loading') : t('auth_reset_btn')}
            </Button>
          </form>
        )}
      </div>
    </Modal>
  )
}
