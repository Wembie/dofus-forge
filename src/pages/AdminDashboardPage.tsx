import { Navigate, Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Award, BadgeCheck, Flag, History, LockKeyhole, ShieldCheck, UserPlus } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { useAuthStore } from '@/store/authStore.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import '@/features/admin/admin.css'

const RANK_FEATURES = [
  { key: 'admin_hub_feature_library', Icon: BadgeCheck },
  { key: 'admin_hub_feature_assignments', Icon: UserPlus },
  { key: 'admin_hub_feature_history', Icon: History },
] as const

/** The admins' entry point: each tool with what it does. */
export function AdminDashboardPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const authLoading = useAuthStore(s => s.loading)
  const isAdmin = useAuthStore(s => s.profile?.role === 'admin')
  const prefix = langPathPrefix(i18n.language)
  const pathLanguage = location.pathname.split('/')[1]
  const homePath = ['es', 'fr', 'pt'].includes(pathLanguage) ? `/${pathLanguage}` : '/'
  const appHomePath = `/${langPathRootSegment(i18n.language)}`

  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'admin', {
    title: `${t('admin_hub_title')} · Dofus Forge`,
    description: t('admin_hub_subtitle'),
    noindex: true,
  })

  if (!authLoading && !isAdmin) return <Navigate to={homePath} replace />

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />
      <main id="main-content" className="admin-page flex-1">
        <div className="admin-study">
          {authLoading ? (
            <p className="admin-state" role="status">{t('admin_hub_loading')}</p>
          ) : (
            <>
              <nav aria-label={t('admin_hub_breadcrumb')} className="admin-crumbs">
                <Link to={appHomePath}>{t('app_title')}</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{t('admin_nav')}</span>
              </nav>
              <div className="admin-heading">
                <div>
                  <p className="admin-eyebrow"><LockKeyhole size={12} aria-hidden="true" />{t('admin_hub_private')}</p>
                  <h1>{t('admin_hub_title')}</h1>
                  <p>{t('admin_hub_subtitle')}</p>
                </div>
              </div>

              <section aria-labelledby="admin-tools-heading">
                <h2 id="admin-tools-heading" className="sr-only">{t('admin_hub_tools')}</h2>
                <div className="admin-tools">
                  <Link className="admin-tool" to={`/${prefix}admin/ranks`}>
                    <span className="admin-tool-icon"><Award size={22} aria-hidden="true" /></span>
                    <span>
                      <h2>{t('admin_ranks_title')}</h2>
                      <p>{t('admin_hub_ranks_description')}</p>
                      <ul>
                        {RANK_FEATURES.map(({ key, Icon }) => <li key={key}><Icon size={12} aria-hidden="true" />{t(key)}</li>)}
                      </ul>
                    </span>
                    <span className="admin-tool-open">{t('admin_hub_open')}<ArrowRight size={15} aria-hidden="true" /></span>
                  </Link>
                  <Link className="admin-tool" to={`/${prefix}admin/reports`}>
                    <span className="admin-tool-icon"><Flag size={21} aria-hidden="true" /></span>
                    <span>
                      <h2>{t('admin_reports_title')}</h2>
                      <p>{t('admin_hub_reports_description')}</p>
                    </span>
                    <span className="admin-tool-open">{t('admin_hub_open')}<ArrowRight size={15} aria-hidden="true" /></span>
                  </Link>
                </div>
              </section>

              <p className="admin-note">
                <ShieldCheck size={14} aria-hidden="true" />
                {t('admin_hub_access_note')}
              </p>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default AdminDashboardPage
