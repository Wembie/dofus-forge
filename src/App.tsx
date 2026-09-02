import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { BuilderPage } from './pages/BuilderPage.tsx'
import { Toaster } from './components/Toaster.tsx'
import { LangRoute } from './LangRoute.tsx'

const SUPPORTED_REDIRECT = ['es', 'fr', 'pt']

/**
 * Root route: renders English directly (so crawlers and first-time
 * visitors always get real content at /, never a JS redirect).
 * A RETURNING visitor with a saved language preference is bounced to
 * their language's path, preserving any ?b=/?c= query string.
 */
function RootRoute() {
  const location = useLocation()
  let stored: string | null = null
  try { stored = localStorage.getItem('dofus-forge-lang') } catch { /* private mode etc. */ }

  if (stored && SUPPORTED_REDIRECT.includes(stored)) {
    return <Navigate to={`/${stored}/${location.search}`} replace />
  }
  return <LangRoute lang="en"><BuilderPage /></LangRoute>
}

function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/"    element={<RootRoute />} />
        <Route path="es/*" element={<LangRoute lang="es"><BuilderPage /></LangRoute>} />
        <Route path="fr/*" element={<LangRoute lang="fr"><BuilderPage /></LangRoute>} />
        <Route path="pt/*" element={<LangRoute lang="pt"><BuilderPage /></LangRoute>} />
        <Route path="*"    element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
