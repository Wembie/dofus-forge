import { Navigate, Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Award, BadgeCheck, ChevronRight, Flag, History, LockKeyhole, ShieldCheck, UserPlus } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { Frame } from '@/ui'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { useAuthStore } from '@/store/authStore.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'

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
      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 py-7 sm:py-10 space-y-6 sm:space-y-8">
        {authLoading ? (
          <Frame material="panel" className="py-16 text-center text-xs" style={{ color: 'var(--ink-faint)' }} role="status">
            {t('admin_hub_loading')}
          </Frame>
        ) : (
          <>
            <nav aria-label={t('admin_hub_breadcrumb')} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
              <Link to={appHomePath} className="hover:text-gold transition-colors">{t('app_title')}</Link>
              <ChevronRight size={13} aria-hidden="true" />
              <span aria-current="page" style={{ color: 'var(--gold)' }}>{t('admin_nav')}</span>
            </nav>

            <section className="relative overflow-hidden rounded-2xl p-5 sm:p-8" style={{
              background: 'radial-gradient(ellipse at 88% 10%, color-mix(in srgb, var(--gold) 17%, transparent), transparent 36%), linear-gradient(135deg, var(--surface-panel), var(--surface-void))',
              border: '1px solid var(--metal-edge)',
              borderTop: '2px solid color-mix(in srgb, var(--gold) 70%, transparent)',
              boxShadow: 'var(--shadow-frame), var(--inset-bevel)',
            }}>
              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em]" style={{
                  color: 'var(--gold)',
                  background: 'color-mix(in srgb, var(--gold) 9%, var(--surface-void))',
                  border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
                }}>
                  <LockKeyhole size={11} /> {t('admin_hub_private')}
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-wide mt-4" style={{ color: 'var(--ink)' }}>
                  {t('admin_hub_title')}
                </h1>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed max-w-2xl" style={{ color: 'var(--ink-faint)' }}>
                  {t('admin_hub_subtitle')}
                </p>
              </div>
              <div aria-hidden="true" className="absolute -right-8 -bottom-16 opacity-[0.055] rotate-12 pointer-events-none">
                <ShieldCheck size={240} strokeWidth={0.8} />
              </div>
            </section>

            <section aria-labelledby="admin-tools-heading" className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--gold)' }}>
                    {t('admin_hub_eyebrow')}
                  </p>
                  <h2 id="admin-tools-heading" className="font-display text-lg sm:text-xl font-bold" style={{ color: 'var(--ink)' }}>
                    {t('admin_hub_tools')}
                  </h2>
                </div>
                <span className="hidden sm:inline text-[10px] uppercase tracking-widest" style={{ color: 'var(--ink-faint)' }}>
                  {t('admin_hub_category')}
                </span>
              </div>

              <Link
                to={`/${prefix}admin/ranks`}
                className="group relative block overflow-hidden rounded-xl p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(145deg, color-mix(in srgb, var(--surface-panel) 88%, var(--gold) 4%), var(--surface-void))',
                  border: '1px solid var(--metal-edge)',
                  boxShadow: 'var(--inset-bevel)',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--gold) 52%, transparent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--metal-edge)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                    color: 'var(--gold)',
                    background: 'color-mix(in srgb, var(--gold) 12%, var(--surface-void))',
                    border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
                  }}>
                    <Award size={23} strokeWidth={1.8} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--gold)' }}>
                        {t('admin_hub_category')}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{
                        color: 'var(--positive)',
                        background: 'color-mix(in srgb, var(--positive) 10%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--positive) 28%, transparent)',
                      }}>{t('admin_hub_available')}</span>
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-bold" style={{ color: 'var(--ink)' }}>
                      {t('admin_ranks_title')}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed max-w-2xl" style={{ color: 'var(--ink-faint)' }}>
                      {t('admin_hub_ranks_description')}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {[
                        { key: 'admin_hub_feature_library', Icon: BadgeCheck },
                        { key: 'admin_hub_feature_assignments', Icon: UserPlus },
                        { key: 'admin_hub_feature_history', Icon: History },
                      ].map(({ key, Icon }) => (
                        <span key={key} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px]" style={{
                          color: 'var(--ink-muted)',
                          background: 'var(--surface-void)',
                          border: '1px solid var(--metal-edge)',
                        }}>
                          <Icon size={11} style={{ color: 'var(--gold)' }} /> {t(key)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="inline-flex items-center justify-center gap-2 self-start sm:self-center rounded-lg px-3 py-2 text-[11px] font-semibold flex-shrink-0 transition-colors group-hover:text-gold" style={{
                    color: 'var(--ink-muted)',
                    background: 'var(--surface-void)',
                    border: '1px solid var(--metal-edge)',
                  }}>
                    {t('admin_hub_open')} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>

              <Link
                to={`/${prefix}admin/reports`}
                className="group flex items-center gap-4 rounded-xl p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', boxShadow: 'var(--inset-bevel)', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--gold) 52%, transparent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--metal-edge)' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 12%, var(--surface-void))', border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)' }}>
                  <Flag size={22} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base sm:text-lg font-bold" style={{ color: 'var(--ink)' }}>{t('admin_reports_title')}</h3>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ink-faint)' }}>{t('admin_hub_reports_description')}</p>
                </div>
                <ArrowRight size={16} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--ink-muted)' }} />
              </Link>
            </section>

            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[10px]" style={{
              color: 'var(--ink-faint)',
              background: 'color-mix(in srgb, var(--surface-panel) 70%, transparent)',
              border: '1px solid var(--metal-edge)',
            }}>
              <ShieldCheck size={13} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              {t('admin_hub_access_note')}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
