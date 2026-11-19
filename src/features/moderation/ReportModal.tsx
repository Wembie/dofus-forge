import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Flag } from 'lucide-react'
import { Modal } from '@/ui'
import { submitReport, REPORT_REASONS, type ReportReason, type ReportTarget } from '@/features/builds/api.ts'
import './report.css'

const DETAIL_MAX = 500

/** Report a build or a comment: reason + optional detail, stored for moderators. */
export function ReportModal({ target, reporterId, onClose }: { target: ReportTarget | null; reporterId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const id = useId()
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
        <div className="report-result" role="status">
          <Flag size={26} aria-hidden="true" />
          <p>{t(result === 'sent' ? 'report_sent' : 'report_duplicate')}</p>
          <button type="button" className="site-primary" onClick={onClose}>{t('modal_close')}</button>
        </div>
      ) : (
        <form className="report-form" onSubmit={submit}>
          <p className="report-muted">{t('report_intro')}</p>
          <fieldset className="report-reasons">
            <legend>{t('report_reason_label')}</legend>
            {REPORT_REASONS.map(r => (
              <label key={r} className={reason === r ? 'is-selected' : ''}>
                <input type="radio" name={`${id}-reason`} value={r} checked={reason === r} onChange={() => setReason(r)} />
                <span>{t(`report_reason_${r}`)}</span>
              </label>
            ))}
          </fieldset>
          <label className="report-field" htmlFor={`${id}-detail`}>{t('report_detail_placeholder')}</label>
          <textarea id={`${id}-detail`} value={detail} onChange={e => setDetail(e.target.value)} maxLength={DETAIL_MAX} rows={3}
            aria-describedby={`${id}-count`} />
          <small id={`${id}-count`} className="report-count">{detail.length} / {DETAIL_MAX}</small>
          {result === 'error' && <p role="alert" className="report-error">{t('report_error')}</p>}
          <div className="report-actions">
            <button type="button" onClick={onClose}>{t('report_cancel')}</button>
            <button type="submit" className="site-primary" disabled={busy}>{busy ? t('auth_loading') : t('report_submit')}</button>
          </div>
        </form>
      )}
    </Modal>
  )
}
