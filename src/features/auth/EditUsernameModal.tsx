import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User } from 'lucide-react'
import { Modal, Button } from '@/ui'
import { useAuthStore } from '@/store/authStore.ts'

export function EditUsernameModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t }        = useTranslation()
  const profile      = useAuthStore(s => s.profile)
  const updateUsername = useAuthStore(s => s.updateUsername)

  const [value, setValue] = useState(profile?.username ?? '')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setError(null)
    onClose()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await updateUsername(value.trim().toLowerCase())
    setBusy(false)
    if (err) { setError(t(err === 'invalid_username' ? 'auth_username_invalid' : err === 'username_taken' ? 'auth_username_taken' : 'auth_username_error')); return }
    close()
  }

  return (
    <Modal open={open} onClose={close} title={t('auth_edit_username_title')} size="sm">
      <div className="p-5">
        <p className="text-[11px] mb-3" style={{ color: 'var(--ink-faint)' }}>
          {t('auth_username_hint')}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />
            <input
              type="text"
              required
              minLength={3}
              maxLength={30}
              autoFocus
              pattern="[a-z0-9_-]{3,30}"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full text-sm rounded-lg pl-8 pr-3 py-2 transition-colors focus:outline-none"
              style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')}
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

          <Button type="submit" variant="primary" size="md" disabled={busy} className="w-full justify-center">
            {busy ? t('auth_loading') : t('save')}
          </Button>
        </form>
      </div>
    </Modal>
  )
}
