import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Link, useLocation } from 'react-router'
import { Flag, EyeOff, Trash2, Check, X, MessageSquare, Layers, RotateCcw } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { Button, Frame, Tabs } from '@/ui'
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
    if (action === 'delete' && !window.confirm(t('admin_reports_delete_confirm'))) return
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
      <main id="main-content" className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-4">
        <h1 className="flex items-center gap-2 font-display font-bold tracking-[0.15em] uppercase text-xs" style={{ color: 'var(--gold)' }}>
          <Flag size={14} /> {t('admin_reports_title')}
        </h1>

        <Tabs
          items={STATUS_TABS.map(({ id, Icon }) => ({ id, Icon, label: t(`admin_reports_status_${id}`) }))}
          active={status}
          onChange={id => setStatus(id as ReportStatus)}
          variant="segment"
        />

        {commentsMissing && (
          <p className="text-[11px] rounded-md px-2.5 py-1.5" style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 25%, transparent)' }}>
            {t('admin_reports_comments_missing')}
          </p>
        )}
        {error && <p className="text-[11px]" style={{ color: 'var(--negative)' }}>{t('admin_reports_error')}</p>}

        {reports == null ? (
          <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>{t('auth_loading')}</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>{t('admin_reports_empty')}</p>
        ) : (
          <ul className="space-y-2">
            {reports.map(r => {
              const buildId = r.kind === 'build' ? r.build?.id : r.comment?.build_id
              return (
                <li key={`${r.kind}:${r.id}`}>
                  <Frame padding="md" className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                      {r.kind === 'build' ? <Layers size={12} /> : <MessageSquare size={12} />}
                      <span className="font-semibold" style={{ color: 'var(--gold)' }}>{t(`report_reason_${r.reason}`)}</span>
                      <span>·</span>
                      <span>{t('admin_reports_by', { user: r.reporter?.username ?? '?' })}</span>
                      <span>·</span>
                      <span>{new Date(r.created_at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    {r.kind === 'build' ? (
                      r.build
                        ? <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{r.build.name} <span className="text-[10px] font-normal" style={{ color: 'var(--ink-faint)' }}>({t(`publish_visibility_${r.build.visibility}`)})</span></p>
                        : <p className="text-xs italic" style={{ color: 'var(--ink-faint)' }}>{t('admin_reports_target_gone')}</p>
                    ) : (
                      r.comment
                        ? <p className="text-xs break-words" style={{ color: r.comment.deleted_at ? 'var(--ink-faint)' : 'var(--ink-muted)', textDecoration: r.comment.deleted_at ? 'line-through' : 'none' }}>“{r.comment.content}”</p>
                        : <p className="text-xs italic" style={{ color: 'var(--ink-faint)' }}>{t('admin_reports_target_gone')}</p>
                    )}
                    {r.detail && <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{r.detail}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {buildId && (
                        <Link to={`/${prefix}build/${buildId}`} target="_blank" className="text-[11px] px-2 py-1 rounded-md hover:text-gold" style={{ color: 'var(--ink-muted)', border: '1px solid var(--metal-edge)' }}>
                          {t('admin_reports_open')}
                        </Link>
                      )}
                      {status === 'pending' && (
                        <>
                          <Button variant="secondary" size="sm" disabled={busy != null} onClick={() => act(r, 'hide')}>
                            <EyeOff size={12} /> {t(r.kind === 'build' ? 'admin_reports_hide_build' : 'admin_reports_hide_comment')}
                          </Button>
                          {r.kind === 'build' && (
                            <Button variant="secondary" size="sm" disabled={busy != null} onClick={() => act(r, 'delete')}>
                              <Trash2 size={12} /> {t('admin_reports_delete_build')}
                            </Button>
                          )}
                          <Button variant="secondary" size="sm" disabled={busy != null} onClick={() => act(r, 'reviewed')}>
                            <Check size={12} /> {t('admin_reports_mark_reviewed')}
                          </Button>
                          <Button variant="secondary" size="sm" disabled={busy != null} onClick={() => act(r, 'dismiss')}>
                            <X size={12} /> {t('admin_reports_dismiss')}
                          </Button>
                        </>
                      )}
                      {status !== 'pending' && isRestorable(r) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busy != null}
                          onClick={() => restore(r)}
                          title={r.kind === 'build' ? t('admin_reports_restore_hint') : undefined}
                        >
                          <RotateCcw size={12} /> {t(r.kind === 'build' ? 'admin_reports_restore_build' : 'admin_reports_restore_comment')}
                        </Button>
                      )}
                    </div>
                  </Frame>
                </li>
              )
            })}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

export default AdminReportsPage
