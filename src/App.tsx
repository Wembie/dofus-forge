import { useEffect, useRef, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { BuilderPage } from './pages/BuilderPage.tsx'
import { Toaster } from './components/Toaster.tsx'
import { MagicCursor } from './components/MagicCursor.tsx'
import { ParticleField } from './components/ParticleField.tsx'
import { UpdateBanner } from './components/UpdateBanner.tsx'
import { LangRoute } from './LangRoute.tsx'
import { useAuthStore } from './store/authStore.ts'
import { useToastStore } from './store/toastStore.ts'
import type { SeoLang } from './seo/useSeoMeta.ts'
import { langPathRootSegment } from './i18n/langPath.ts'

const ExplorePage     = lazy(() => import('./pages/ExplorePage.tsx').then(m => ({ default: m.ExplorePage })))
const BuildDetailPage = lazy(() => import('./pages/BuildDetailPage.tsx').then(m => ({ default: m.BuildDetailPage })))
const MyBuildsPage    = lazy(() => import('./pages/MyBuildsPage.tsx').then(m => ({ default: m.MyBuildsPage })))
const CollectionPage  = lazy(() => import('./pages/CollectionPage.tsx').then(m => ({ default: m.CollectionPage })))
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage.tsx').then(m => ({ default: m.AdminReportsPage })))
const AboutPage       = lazy(() => import('./pages/AboutPage.tsx').then(m => ({ default: m.AboutPage })))
const HowToUsePage    = lazy(() => import('./pages/HowToUsePage.tsx').then(m => ({ default: m.HowToUsePage })))
const ForgeGuidePage  = lazy(() => import('./pages/ForgeGuidePage.tsx').then(m => ({ default: m.ForgeGuidePage })))
const ShortcutsPage   = lazy(() => import('./pages/ShortcutsPage.tsx').then(m => ({ default: m.ShortcutsPage })))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage.tsx').then(m => ({ default: m.PrivacyPolicyPage })))
const TermsPage       = lazy(() => import('./pages/TermsPage.tsx').then(m => ({ default: m.TermsPage })))
const ClassGuidePage  = lazy(() => import('./pages/ClassGuidePage.tsx').then(m => ({ default: m.ClassGuidePage })))
const UserProfilePage = lazy(() => import('./pages/UserProfilePage.tsx').then(m => ({ default: m.UserProfilePage })))
const AccountPage     = lazy(() => import('./pages/AccountPage.tsx').then(m => ({ default: m.AccountPage })))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.tsx').then(m => ({ default: m.AdminDashboardPage })))
const AdminRanksPage  = lazy(() => import('./pages/AdminRanksPage.tsx').then(m => ({ default: m.AdminRanksPage })))

const SUPPORTED_REDIRECT = ['es', 'fr', 'pt']

/**
 * Root route: renders English directly (so crawlers and first-time
 * visitors always get real content at /, never a JS redirect).
 * A RETURNING visitor with a saved language preference is bounced to
 * their language's path, preserving any ?b=/?c= query string.
 *
 * Skipped when the navigation carries `state.explicit` — set by
 * LanguageSwitcher when the user deliberately picks EN. Without this,
 * clicking EN would loop back to the stored (non-English) preference,
 * since i18next's own language detector keeps re-caching whatever
 * language is currently active into that same localStorage key.
 */
function RootRoute() {
  const location = useLocation()
  const explicit = (location.state as { explicit?: boolean } | null)?.explicit

  if (!explicit) {
    let stored: string | null = null
    try { stored = localStorage.getItem('dofus-forge-lang') } catch { /* private mode etc. */ }
    if (stored && SUPPORTED_REDIRECT.includes(stored)) {
      const path = location.pathname.replace(/\/+$/, '')
      // Preserve the hash too — Supabase's auth confirmation links land here
      // with #access_token=... in it; dropping it (as this did before) meant
      // the session was silently lost on any redirect through this route.
      // Preserve the sub-path and query, but normalize the root so language
      // redirects use /es rather than the redirected /es/ variant.
      return <Navigate to={`/${langPathRootSegment(stored)}${path}${location.search}${location.hash}`} replace />
    }
  }
  return <LangRoute lang="en"><Outlet /></LangRoute>
}

function LangLayout({ lang }: { lang: SeoLang }) {
  return <LangRoute lang={lang}><Outlet /></LangRoute>
}

function AdminRanksRoute() {
  const { t } = useTranslation()
  const location = useLocation()
  const authLoading = useAuthStore(s => s.loading)
  const session = useAuthStore(s => s.session)
  const isAdmin = useAuthStore(s => s.profile?.role === 'admin')
  const addToast = useToastStore(s => s.addToast)
  const pathLanguage = location.pathname.split('/')[1]
  const homePath = ['es', 'fr', 'pt'].includes(pathLanguage) ? `/${pathLanguage}` : '/'
  const denied = !authLoading && (!session || !isAdmin)
  const denialMessage = session ? t('admin_ranks_denied_body') : t('admin_ranks_signin_title')
  const notifiedEntry = useRef<string | null>(null)
  const denialEntryKey = `${location.key}:${denialMessage}`

  useEffect(() => {
    if (!denied) {
      notifiedEntry.current = null
      return
    }
    if (notifiedEntry.current === denialEntryKey) return
    notifiedEntry.current = denialEntryKey
    addToast(denialMessage, '🔒')
  }, [addToast, denied, denialEntryKey, denialMessage])

  if (authLoading) return <AdminRanksLoading label={t('admin_ranks_loading')} />
  if (denied) return <Navigate to={homePath} replace />

  return <Suspense fallback={<AdminRanksLoading label={t('admin_ranks_loading')} />}><AdminRanksPage /></Suspense>
}

function AdminRanksLoading({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-forge-bg px-4 text-forge-text" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-lg border px-4 py-3 text-xs" style={{ color: 'var(--ink-muted)', borderColor: 'var(--metal-edge)', background: 'var(--surface-panel)' }}>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--gold)' }} aria-hidden="true" />
        {label}
      </div>
    </div>
  )
}

const LANG_SUB_ROUTES = (
  <>
    <Route index element={<BuilderPage />} />
    <Route path="explore" element={<Suspense fallback={null}><ExplorePage /></Suspense>} />
    <Route path="build/:id" element={<Suspense fallback={null}><BuildDetailPage /></Suspense>} />
    <Route path="my-builds" element={<Suspense fallback={null}><MyBuildsPage /></Suspense>} />
    <Route path="c/:id" element={<Suspense fallback={null}><CollectionPage /></Suspense>} />
    <Route path="about" element={<Suspense fallback={null}><AboutPage /></Suspense>} />
    <Route path="how-to-use" element={<Suspense fallback={null}><HowToUsePage /></Suspense>} />
    <Route path="forge-guide" element={<Suspense fallback={null}><ForgeGuidePage /></Suspense>} />
    <Route path="shortcuts" element={<Suspense fallback={null}><ShortcutsPage /></Suspense>} />
    <Route path="privacy" element={<Suspense fallback={null}><PrivacyPolicyPage /></Suspense>} />
    <Route path="terms" element={<Suspense fallback={null}><TermsPage /></Suspense>} />
    <Route path="classes/:classId" element={<Suspense fallback={null}><ClassGuidePage /></Suspense>} />
    <Route path="u/:username" element={<Suspense fallback={null}><UserProfilePage /></Suspense>} />
    <Route path="account" element={<Suspense fallback={null}><AccountPage /></Suspense>} />
    <Route path="admin" element={<Suspense fallback={null}><AdminDashboardPage /></Suspense>} />
    <Route path="admin/ranks" element={<AdminRanksRoute />} />
    <Route path="admin/reports" element={<Suspense fallback={null}><AdminReportsPage /></Suspense>} />
  </>
)

function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

  useEffect(() => {
    useAuthStore.getState().init()
  }, [])

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<RootRoute />}>
          {LANG_SUB_ROUTES}
        </Route>
        {/* /en is kept reachable too (symmetry with /es /fr /pt, direct links,
            hreflang) even though the root `/` is the canonical English URL —
            every page under it resolves its own SEO canonical to the no-prefix
            equivalent (useSeoMeta's PATH['en'] is already ''), so this never
            creates duplicate-content signals. Internal nav/LanguageSwitcher
            still point at `/`, unchanged. */}
        <Route path="en" element={<LangLayout lang="en" />}>
          {LANG_SUB_ROUTES}
          <Route path="*" element={<BuilderPage />} />
        </Route>
        <Route path="es" element={<LangLayout lang="es" />}>
          {LANG_SUB_ROUTES}
          <Route path="*" element={<BuilderPage />} />
        </Route>
        <Route path="fr" element={<LangLayout lang="fr" />}>
          {LANG_SUB_ROUTES}
          <Route path="*" element={<BuilderPage />} />
        </Route>
        <Route path="pt" element={<LangLayout lang="pt" />}>
          {LANG_SUB_ROUTES}
          <Route path="*" element={<BuilderPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <ParticleField />
      <MagicCursor />
      <UpdateBanner />
    </BrowserRouter>
  )
}

export default App
