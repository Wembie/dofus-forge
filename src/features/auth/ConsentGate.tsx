import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { Modal } from '@/ui'
import { useAuthStore } from '@/store/authStore.ts'
import { isLegalPage, pendingLegalDocs, type LegalDoc } from './legal.ts'
import { AccessLayout, AccessLegalChecks } from './AccessParts.tsx'

const noop = () => {}

/** Blocks a signed-in account until it has accepted the current Terms and
 * Privacy Policy: accounts created before the sign-up checkboxes existed,
 * and everyone after a document's version changes. Browsing signed out is
 * never blocked. */
export function ConsentGate() {
  const { t } = useTranslation()
  const session          = useAuthStore(s => s.session)
  const recovering       = useAuthStore(s => s.passwordRecovery)
  const acceptLegal      = useAuthStore(s => s.acceptLegal)
  const signOut          = useAuthStore(s => s.signOut)
  const [checked, setChecked] = useState<Partial<Record<LegalDoc, boolean>>>({})
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const titleId = `${useId()}-title`

  const { pathname } = useLocation()
  const pending = pendingLegalDocs(session?.user)
  const open = pending.length > 0 && !recovering && !isLegalPage(pathname)
  const ready = pending.every(doc => checked[doc])

  async function accept(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    const { error: err } = await acceptLegal(pending)
    setBusy(false)
    if (err) { setError(err); return }
    setChecked({})
  }

  return (
    <Modal open={open} onClose={noop} size="4xl" labelledBy={titleId} className="auth-dialog">
      <AccessLayout>
        <h2 id={titleId}>{t('consent_gate_title')}</h2>
        <form className="access-form" onSubmit={accept} aria-busy={busy}>
          <p className="access-intro">{t('consent_gate_body')}</p>
          <AccessLegalChecks docs={pending} accepted={checked} onChange={(doc, value) => setChecked(c => ({ ...c, [doc]: value }))} />
          <p className="access-hint">{t('auth_consent_note')}</p>
          {error && <p className="access-error" role="alert">{error}</p>}
          <button type="submit" className="site-primary access-submit" disabled={busy || !ready}>
            {t(busy ? 'auth_loading' : 'consent_gate_accept')}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <button type="button" className="access-text-button" onClick={() => signOut()}>{t('auth_signout')}</button>
          <p className="access-hint">{t('consent_gate_decline')}</p>
        </form>
      </AccessLayout>
    </Modal>
  )
}
