import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { BuilderPage } from './pages/BuilderPage.tsx'
import { Toaster } from './components/Toaster.tsx'
import { MagicCursor } from './components/MagicCursor.tsx'
import { ParticleField } from './components/ParticleField.tsx'
import { UpdateBanner } from './components/UpdateBanner.tsx'
import { LangRoute } from './LangRoute.tsx'
import { useAuthStore } from './store/authStore.ts'
import type { SeoLang } from './seo/useSeoMeta.ts'

const ExplorePage     = lazy(() => import('./pages/ExplorePage.tsx').then(m => ({ default: m.ExplorePage })))
const BuildDetailPage = lazy(() => import('./pages/BuildDetailPage.tsx').then(m => ({ default: m.BuildDetailPage })))
const MyBuildsPage    = lazy(() => import('./pages/MyBuildsPage.tsx').then(m => ({ default: m.MyBuildsPage })))
const AboutPage       = lazy(() => import('./pages/AboutPage.tsx').then(m => ({ default: m.AboutPage })))
const HowToUsePage    = lazy(() => import('./pages/HowToUsePage.tsx').then(m => ({ default: m.HowToUsePage })))
const ClassGuidePage  = lazy(() => import('./pages/ClassGuidePage.tsx').then(m => ({ default: m.ClassGuidePage })))
const UserProfilePage = lazy(() => import('./pages/UserProfilePage.tsx').then(m => ({ default: m.UserProfilePage })))
const AccountPage     = lazy(() => import('./pages/AccountPage.tsx').then(m => ({ default: m.AccountPage })))

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
      // Preserve the hash too — Supabase's auth confirmation links land here
      // with #access_token=... in it; dropping it (as this did before) meant
      // the session was silently lost on any redirect through this route.
      // Preserve the sub-path too (location.pathname, e.g. /explore,
      // /how-to-use) — this used to hardcode a trailing "/", silently
      // bouncing any non-index English sub-route back to the bare language
      // root instead of its equivalent page whenever a stored preference
      // existed. Only visible once there were sub-routes worth deep-linking
      // to directly (found while testing /about and /how-to-use).
      return <Navigate to={`/${stored}${location.pathname}${location.search}${location.hash}`} replace />
    }
  }
  return <LangRoute lang="en"><Outlet /></LangRoute>
}

function LangLayout({ lang }: { lang: SeoLang }) {
  return <LangRoute lang={lang}><Outlet /></LangRoute>
}

const LANG_SUB_ROUTES = (
  <>
    <Route index element={<BuilderPage />} />
    <Route path="explore" element={<Suspense fallback={null}><ExplorePage /></Suspense>} />
    <Route path="build/:id" element={<Suspense fallback={null}><BuildDetailPage /></Suspense>} />
    <Route path="my-builds" element={<Suspense fallback={null}><MyBuildsPage /></Suspense>} />
    <Route path="about" element={<Suspense fallback={null}><AboutPage /></Suspense>} />
    <Route path="how-to-use" element={<Suspense fallback={null}><HowToUsePage /></Suspense>} />
    <Route path="classes/:classId" element={<Suspense fallback={null}><ClassGuidePage /></Suspense>} />
    <Route path="u/:username" element={<Suspense fallback={null}><UserProfilePage /></Suspense>} />
    <Route path="account" element={<Suspense fallback={null}><AccountPage /></Suspense>} />
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
