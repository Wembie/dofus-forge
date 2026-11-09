import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { ScrollText } from 'lucide-react'
import { Modal, Button } from '@/ui'
import { useAuthStore } from '@/store/authStore.ts'
import { LegalConsentChecks } from './LegalConsentChecks.tsx'
import { isLegalPage, pendingLegalDocs, type LegalDoc } from './legal.ts'

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

  const { pathname } = useLocation()
  const pending = pendingLegalDocs(session?.user)
  const open = pending.length > 0 && !recovering && !isLegalPage(pathname)
  const ready = pending.every(doc => checked[doc])

  async function accept(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    setError(null)
    const { error: err } = await acceptLegal(pending)
    setBusy(false)
    if (err) { setError(err); return }
    setChecked({})
  }

  return (
    <Modal open={open} onClose={noop} size="sm" ariaLabel={t('consent_gate_title')}>
      <form onSubmit={accept} className="p-6 space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <ScrollText size={22} style={{ color: 'var(--gold)' }} />
          <h2 className="font-display font-bold text-sm uppercase tracking-[0.15em]" style={{ color: 'var(--gold)' }}>
            {t('consent_gate_title')}
          </h2>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{t('consent_gate_body')}</p>
        </div>

        <LegalConsentChecks docs={pending} checked={checked} onChange={(doc, value) => setChecked(c => ({ ...c, [doc]: value }))} />

        {error && (
          <p role="alert" className="text-[11px]" style={{ color: 'var(--negative)' }}>{error}</p>
        )}

        <Button type="submit" variant="primary" size="md" disabled={busy || !ready} className="w-full justify-center">
          {busy ? t('auth_loading') : t('consent_gate_accept')}
        </Button>
        <div className="text-center space-y-1.5">
          <button type="button" onClick={() => signOut()} className="text-[11px] underline underline-offset-2" style={{ color: 'var(--ink-faint)' }}>
            {t('auth_signout')}
          </button>
          <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('consent_gate_decline')}</p>
        </div>
      </form>
    </Modal>
  )
}
