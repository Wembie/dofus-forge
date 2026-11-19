import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Link, useLocation } from 'react-router'
import { Flag, EyeOff, Trash2, Check, X, MessageSquare, Layers, RotateCcw } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { Modal } from '@/ui'
import '@/features/admin/admin.css'
import '@/features/moderation/report.css'
import { useAuthStore } from '@/store/authStore.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { fetchReports, setReportStatus, moderateContent, type ReportRow, type ReportStatus } from '@/features/builds/api.ts'
import { targetOf, isRestorable, markRestored } from '@/features/moderation/restore.ts'

const STATUS_TABS: { id: ReportStatus; Icon: typeof Flag }[] = [
  { id: 'pending',   Icon: Flag },
  { id: 'actioned',  Icon: EyeOff },
  { id: 'dismissed', Icon: X },
  { id: 'reviewed',  Icon: Check },
]

/** Moderation queue: build and comment reports, for moderators and admins. */
export function AdminReportsPage() {
  const { t, i18n } = useTranslation()
  const location    = useLocation()
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'admin/reports', { noindex: true })
  const authLoading = useAuthStore(s => s.loading)
  const session     = useAuthStore(s => s.session)
  const role        = useAuthStore(s => s.profile?.role)
  const canModerate = role === 'moderator' || role === 'admin'
  const prefix      = langPathPrefix(i18n.language)

  const [status, setStatus]   = useState<ReportStatus>('pending')
  const [reports, setReports] = useState<ReportRow[] | null>(null)
  const [commentsMissing, setCommentsMissing] = useState(false)
  const [busy, setBusy]       = useState<string | null>(null)
  const [error, setError]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ReportRow | null>(null)

  // Switching tabs quickly must not let a slower, older response fill the
  // current tab (its buttons would then act on the wrong reports).
  useEffect(() => {
    if (!canModerate) return
    let cancelled = false
    setReports(null)
    fetchReports(status).then(({ data, commentsError }) => {
      if (cancelled) return
      setReports(data)
      setCommentsMissing(commentsError != null)
    })
    return () => { cancelled = true }
  }, [canModerate, status])

  if (authLoading) return null
  if (!session || !canModerate) {
    const seg = location.pathname.split('/')[1]
    return <Navigate to={['es', 'fr', 'pt'].includes(seg) ? `/${seg}` : '/'} replace />
  }

  async function act(report: ReportRow, action: 'hide' | 'delete' | 'dismiss' | 'reviewed') {
    if (!session) return
    setBusy(report.id)
    setError(false)
    let failed = false
    if (action === 'hide' || action === 'delete') {
      // No target → nothing was hidden or deleted, so the report can't be
      // marked as actioned (use Dismiss / Reviewed for content that's gone).
      const targetId = report.kind === 'build' ? report.build?.id : report.comment?.id
      failed = !targetId || (await moderateContent(report.kind, targetId, action)).error != null
    }
    if (!failed) {
      const next: ReportStatus = action === 'dismiss' ? 'dismissed' : action === 'reviewed' ? 'reviewed' : 'actioned'
      failed = (await setReportStatus(report, next, session.user.id)).error != null
    }
    setBusy(null)
    if (failed) { setError(true); return }
    setReports(prev => prev?.filter(r => r.id !== report.id) ?? null)
  }

  // Undo a hide. The report keeps its status; every report on the same
  // content shows it restored.
  async function restore(report: ReportRow) {
    const targetId = targetOf(report)
    if (!targetId) return
    setBusy(report.id)
    setError(false)
    const failed = (await moderateContent(report.kind, targetId, 'restore')).error != null
    setBusy(null)
    if (failed) { setError(true); return }
    setReports(prev => (prev ? markRestored(prev, report.kind, targetId) : prev))
  }

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader />
      <main id="main-content" className="admin-page">
        <div className="admin-study">
          <nav aria-label={t('admin_hub_breadcrumb')} className="admin-crumbs">
            <Link to={`/${prefix}admin`}>{t('admin_nav')}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{t('admin_reports_title')}</span>
          </nav>
          <div className="admin-heading">
            <div>
              <p className="admin-eyebrow"><Flag size={12} aria-hidden="true" />{t('admin_hub_private')}</p>
              <h1>{t('admin_reports_title')}</h1>
              <p>{t('admin_hub_reports_description')}</p>
            </div>
          </div>

          <nav className="admin-tabs" aria-label={t('admin_reports_title')}>
            {STATUS_TABS.map(({ id, Icon }) => (
              <button key={id} type="button" aria-current={status === id ? 'page' : undefined} onClick={() => setStatus(id)}>
                <Icon size={14} aria-hidden="true" />
                {t(`admin_reports_status_${id}`)}
              </button>
            ))}
          </nav>

          {commentsMissing && <p className="admin-alert">{t('admin_reports_comments_missing')}</p>}
          {error && <p className="admin-alert is-error" role="alert">{t('admin_reports_error')}</p>}

          {reports == null ? (
            <p className="admin-state" role="status">{t('auth_loading')}</p>
          ) : reports.length === 0 ? (
            <p className="admin-state">{t('admin_reports_empty')}</p>
          ) : (
            <ul className="admin-reports">
              {reports.map(r => {
                const buildId = r.kind === 'build' ? r.build?.id : r.comment?.build_id
                return (
                  <li key={`${r.kind}:${r.id}`} className="admin-report">
                    <p className="admin-report-meta">
                      {r.kind === 'build' ? <Layers size={13} aria-hidden="true" /> : <MessageSquare size={13} aria-hidden="true" />}
                      <b>{t(`report_reason_${r.reason}`)}</b>
                      <span aria-hidden="true">·</span>
                      <span>{t('admin_reports_by', { user: r.reporter?.username ?? '?' })}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    </p>
                    {r.kind === 'build' ? (
                      r.build
                        ? <p className="admin-report-target">{r.build.name} <small>({t(`publish_visibility_${r.build.visibility}`)})</small></p>
                        : <p className="admin-report-detail"><em>{t('admin_reports_target_gone')}</em></p>
                    ) : (
                      r.comment
                        ? <p className={'admin-report-quote' + (r.comment.deleted_at ? ' is-deleted' : '')}>“{r.comment.content}”</p>
                        : <p className="admin-report-detail"><em>{t('admin_reports_target_gone')}</em></p>
                    )}
                    {r.detail && <p className="admin-report-detail">{r.detail}</p>}
                    <div className="admin-report-actions">
                      {buildId && (
                        <Link to={`/${prefix}build/${buildId}`} target="_blank">{t('admin_reports_open')}</Link>
                      )}
                      {status === 'pending' && (
                        <>
                          <button type="button" disabled={busy != null} onClick={() => act(r, 'hide')}>
                            <EyeOff size={14} aria-hidden="true" />{t(r.kind === 'build' ? 'admin_reports_hide_build' : 'admin_reports_hide_comment')}
                          </button>
                          {r.kind === 'build' && (
                            <button type="button" disabled={busy != null} onClick={() => setConfirmDelete(r)}>
                              <Trash2 size={14} aria-hidden="true" />{t('admin_reports_delete_build')}
                            </button>
                          )}
                          <button type="button" disabled={busy != null} onClick={() => act(r, 'reviewed')}>
                            <Check size={14} aria-hidden="true" />{t('admin_reports_mark_reviewed')}
                          </button>
                          <button type="button" disabled={busy != null} onClick={() => act(r, 'dismiss')}>
                            <X size={14} aria-hidden="true" />{t('admin_reports_dismiss')}
                          </button>
                        </>
                      )}
                      {status !== 'pending' && isRestorable(r) && (
                        <button type="button" disabled={busy != null} onClick={() => restore(r)} title={r.kind === 'build' ? t('admin_reports_restore_hint') : undefined}>
                          <RotateCcw size={14} aria-hidden="true" />{t(r.kind === 'build' ? 'admin_reports_restore_build' : 'admin_reports_restore_comment')}
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(null)} title={t('admin_reports_delete_build')} size="sm">
          <div className="report-form">
            <p className="report-muted">{t('admin_reports_delete_confirm')}</p>
            <div className="report-actions">
              <button type="button" onClick={() => setConfirmDelete(null)}>{t('report_cancel')}</button>
              <button type="button" className="site-primary" onClick={() => { const r = confirmDelete; setConfirmDelete(null); void act(r, 'delete') }}>
                {t('admin_reports_delete_build')}
              </button>
            </div>
          </div>
        </Modal>
      )}
      <SiteFooter />
    </div>
  )
}

export default AdminReportsPage
