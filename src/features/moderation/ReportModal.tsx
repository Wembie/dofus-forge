import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Button } from '@/ui'
import { submitReport, REPORT_REASONS, type ReportReason, type ReportTarget } from '@/features/builds/api.ts'

/** Report a build or a comment: reason + optional detail, stored for moderators. */
export function ReportModal({ target, reporterId, onClose }: { target: ReportTarget | null; reporterId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState<ReportReason>('spam')
  const [detail, setDetail] = useState('')
  const [busy, setBusy]     = useState(false)
  const [result, setResult] = useState<'sent' | 'duplicate' | 'error' | null>(null)

  useEffect(() => {
    if (!target) return
    setReason('spam')
    setDetail('')
    setResult(null)
  }, [target])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!target) return
    setBusy(true)
    const { error } = await submitReport(reporterId, target, reason, detail)
    setBusy(false)
    setResult(error === 'duplicate' ? 'duplicate' : error ? 'error' : 'sent')
  }

  return (
    <Modal open={target != null} onClose={onClose} title={t(target?.kind === 'comment' ? 'report_comment_title' : 'report_build_title')} size="sm">
      {result === 'sent' || result === 'duplicate' ? (
        <div className="p-5 space-y-3 text-center">
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>{t(result === 'sent' ? 'report_sent' : 'report_duplicate')}</p>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('modal_close')}</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="p-5 space-y-3">
          <fieldset className="space-y-1.5">
            <legend className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>{t('report_reason_label')}</legend>
            {REPORT_REASONS.map(r => (
              <label key={r} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--ink)' }}>
                <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                {t(`report_reason_${r}`)}
              </label>
            ))}
          </fieldset>
          <textarea
            value={detail}
            onChange={e => setDetail(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={t('report_detail_placeholder')}
            className="w-full text-xs rounded-lg px-3 py-2 focus:outline-none resize-none"
            style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
          />
          {result === 'error' && <p className="text-[11px]" style={{ color: 'var(--negative)' }}>{t('report_error')}</p>}
          <Button type="submit" variant="primary" size="md" disabled={busy} className="w-full justify-center">
            {busy ? t('auth_loading') : t('report_submit')}
          </Button>
        </form>
      )}
    </Modal>
  )
}
