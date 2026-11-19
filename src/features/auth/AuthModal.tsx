import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowLeft, ArrowRight, LoaderCircle, MailCheck } from 'lucide-react'
import { Modal } from '@/ui'
import { useAuthFlow, type AuthMode } from './useAuthFlow.ts'
import { USERNAME_PATTERN, PASSWORD_MIN_LENGTH } from './authRules.ts'
import { Turnstile } from '@/components/Turnstile.tsx'
import { LEGAL_DOCS } from './legal.ts'
import { AccessLayout, AccessLegalChecks, AccessPassword } from './AccessParts.tsx'

/** Sign in, sign up or ask for a reset link, in one window that switches between them. */
export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const flow = useAuthFlow({ onClose })
  const { mode, busy, error } = flow
  const id = useId()
  const titleId = `${id}-title`
  const [changedEmail, setChangedEmail] = useState(false)
  const sent = flow.signedUp || flow.resetSent

  function switchMode(next: AuthMode) {
    setChangedEmail(false)
    flow.switchMode(next)
  }

  return (
    <Modal open={open} onClose={flow.close} size="4xl" labelledBy={titleId} className="auth-dialog">
      <AccessLayout onClose={flow.close}>
        {sent ? (
          <div className="access-result">
            <span className="access-result-icon"><MailCheck size={30} aria-hidden="true" /></span>
            <h2 id={titleId}>{t('auth_check_email_title')}</h2>
            <p role="status">{t(flow.resetSent ? 'auth_reset_sent' : 'auth_signup_email')}</p>
            <p className="access-recipient">{t('auth_sent_to', { email: flow.email })}</p>
            <p>{t('auth_check_spam')}</p>
            <button type="button" className="site-primary" onClick={flow.close}>
              {t('auth_continue')}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <button type="button" className="access-text-button" onClick={() => { switchMode(mode); setChangedEmail(true) }}>
              {t('auth_change_email')}
            </button>
          </div>
        ) : (
          <>
            <p className="access-eyebrow">DOFUS FORGE / {mode === 'signup' ? '02' : '01'}</p>
            <h2 id={titleId}>{t(mode === 'signin' ? 'auth_signin_title' : mode === 'signup' ? 'auth_signup_title' : 'auth_forgot_title')}</h2>
            <p className="access-intro">{t(mode === 'signin' ? 'auth_signin_subtitle' : mode === 'signup' ? 'auth_signup_note' : 'auth_forgot_subtitle')}</p>
            {mode !== 'forgot' && (
              <div className="access-mode" role="group" aria-label={t('auth_eyebrow')}>
                <button type="button" aria-pressed={mode === 'signin'} onClick={() => switchMode('signin')}>{t('auth_signin_title')}</button>
                <button type="button" aria-pressed={mode === 'signup'} onClick={() => switchMode('signup')}>{t('auth_signup_title')}</button>
              </div>
            )}
            <form onSubmit={flow.submit} className="access-form" aria-busy={busy}>
              <div className="access-field">
                <label htmlFor={`${id}-email`}>{t('auth_email')}</label>
                <input id={`${id}-email`} type="email" required autoComplete="email" autoCapitalize="none" spellCheck={false}
                  autoFocus={!changedEmail} value={flow.email} onChange={e => flow.setEmail(e.target.value)}
                  aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} />
              </div>
              {mode === 'signup' && (
                <div className="access-field">
                  <label htmlFor={`${id}-username`}>{t('auth_username')}</label>
                  <input id={`${id}-username`} required minLength={3} maxLength={30} pattern={USERNAME_PATTERN} autoComplete="username"
                    autoCapitalize="none" spellCheck={false} value={flow.username} onChange={e => flow.setUsername(e.target.value)}
                    aria-describedby={`${id}-username-hint`} />
                  <small id={`${id}-username-hint`}>{t('auth_username_hint')}</small>
                </div>
              )}
              {mode !== 'forgot' && (
                <AccessPassword key={mode} id={`${id}-password`} label={t('auth_password')} value={flow.password} onChange={flow.setPassword}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  hint={mode === 'signup' ? t('auth_password_hint', { count: PASSWORD_MIN_LENGTH }) : undefined} />
              )}
              {mode === 'signin' && (
                <button className="access-forgot" type="button" onClick={() => switchMode('forgot')}>{t('auth_forgot_password')}</button>
              )}
              {mode === 'signup' && (
                <AccessLegalChecks docs={LEGAL_DOCS} accepted={flow.accepted} onChange={(doc, value) => flow.setAccepted(a => ({ ...a, [doc]: value }))} />
              )}
              {error && (
                <div className="access-error" role="alert" id={`${id}-error`}>
                  <AlertCircle size={18} aria-hidden="true" />
                  <p>{error}</p>
                </div>
              )}
              <div className="access-turnstile">
                <Turnstile key={flow.turnstileKey} onVerify={flow.setCaptchaToken} onExpire={() => flow.setCaptchaToken(null)} />
              </div>
              <button className="site-primary access-submit" type="submit" disabled={busy || !flow.captchaToken || !flow.legalOk}>
                {busy ? (
                  <><LoaderCircle size={17} aria-hidden="true" />{t('auth_loading')}</>
                ) : (
                  <>
                    {t(mode === 'signin' ? 'auth_signin_btn' : mode === 'signup' ? 'auth_signup_btn' : 'auth_forgot_btn')}
                    <ArrowRight size={17} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
            <div className="access-footer">
              <button type="button" onClick={mode === 'forgot' ? () => switchMode('signin') : flow.close}>
                <ArrowLeft size={15} aria-hidden="true" />
                {t(mode === 'forgot' ? 'auth_back_to_signin' : 'auth_return')}
              </button>
              <span>{t('auth_signin_note')}</span>
            </div>
          </>
        )}
      </AccessLayout>
    </Modal>
  )
}
