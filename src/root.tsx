import { useContext, useEffect, useState, type ReactNode } from 'react'
import { Links, Outlet, Scripts, isRouteErrorResponse, useLocation, useRouteError, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import stylesheet from './index.css?url'
import { Toaster } from './components/Toaster.tsx'
import { MagicCursor } from './components/MagicCursor.tsx'
import { ParticleField } from './components/ParticleField.tsx'
import { UpdateBanner } from './components/UpdateBanner.tsx'
import { useAuthStore } from './store/authStore.ts'
import { langFromPath, langPathRootSegment } from './i18n/langPath.ts'
import { SeoTagsContext, seoTags, readSeoTags, SITE, DEFAULT_IMAGE } from './seo/useSeoMeta.ts'

export const links = () => [{ rel: 'stylesheet', href: stylesheet }]

const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&display=swap'

// These run before hydration, in this order, so they are plain inline
// scripts rather than effects.
//
// 1. A tab restored from the browser's own cache (session restore after a
//    reboot, a frozen background tab) keeps the previous deploy's HTML,
//    whose hashed /assets/ files that deploy removed: the entry script 404s
//    and the page stays blank, before any app code can recover it. Reload
//    once to fetch the current HTML. Only during the initial load (later
//    chunk failures are entry.client's vite:preloadError job, and may just
//    be offline), and at most once per 30s so it can never loop.
// 2. Legacy build links used HashRouter (/#/?b=<encoded>); the fragment
//    never reaches the server, so it is rewritten into a real query here.
// 3. A returning visitor with a saved non-English language who opens a bare
//    (English) URL is sent to their language before anything renders. The
//    hash is kept: Supabase's auth confirmation links carry the session in
//    it. In-app navigation is handled by LangRoute.
// 4. Theme class before first paint, so there is no flash of the wrong theme.
// 5. The font stylesheet loads as media="print" (never render-blocking) and
//    switches to its data-swap-media once loaded. Load events don't bubble,
//    but a capturing listener on the document still sees them.
const BOOT_SCRIPT = `
(function() {
  var KEY = 'df-stale-asset-reload'
  function onError(e) {
    var el = e.target
    if (!el || (el.tagName !== 'SCRIPT' && el.tagName !== 'LINK')) return
    if ((el.src || el.href || '').indexOf('/assets/') === -1) return
    try {
      if (Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 30000) return
      sessionStorage.setItem(KEY, String(Date.now()))
    } catch (_) { return }
    location.reload()
  }
  window.addEventListener('error', onError, true)
  window.addEventListener('load', function() { window.removeEventListener('error', onError, true) })
})();
(function(l) {
  if (l.hash.indexOf('#/') === 0) {
    var afterHash = l.hash.slice(2)
    var qIndex = afterHash.indexOf('?')
    var query = qIndex === -1 ? '' : afterHash.slice(qIndex)
    history.replaceState(null, '', l.pathname + (query || l.search))
  }
})(location);
(function(l) {
  if (/^\\/(en|es|fr|pt)(\\/|$)/.test(l.pathname)) return
  var stored = null
  try { stored = localStorage.getItem('dofus-forge-lang') } catch (_) {}
  if (stored !== 'es' && stored !== 'fr' && stored !== 'pt') return
  l.replace('/' + stored + l.pathname.replace(/\\/+$/, '') + l.search + l.hash)
})(location);
(function() {
  var t = null
  try { t = localStorage.getItem('dofus-forge-theme') } catch (_) {}
  var prefer = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  var theme = (t === 'light' || t === 'dark') ? t : prefer
  document.documentElement.classList.add(theme === 'light' ? 'light' : 'dark')
})();
document.addEventListener('load', function(e) {
  var el = e.target
  if (el && el.tagName === 'LINK' && el.getAttribute('data-swap-media')) el.media = el.getAttribute('data-swap-media')
}, true);
`

const WEB_APPLICATION_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Dofus Forge',
  alternateName: 'dofus-forge',
  description: 'Build planner for Dofus 3 — item catalog, set bonuses, magesmithy runes, stat optimizer, and shareable build URLs.',
  url: `${SITE}/`,
  image: DEFAULT_IMAGE,
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web Browser',
  inLanguage: ['en', 'es', 'fr', 'pt'],
  isAccessibleForFree: true,
  keywords: 'dofus, dofus 3, dofus forge, dofus build planner, dofus sets, dofus panoplies, dofus equipment, dofus stuff, dofus optimizer, dofus runes, dofus forgemagie, dofus stats calculator, dofus classes',
  featureList: [
    'Full Dofus 3 item catalog',
    'Real-time set bonuses',
    'Magesmithy (Forgemagie) rune simulation',
    'Automatic stat optimizer',
    'Shareable build URLs',
    'Community build explorer',
  ],
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Wembie' },
  about: { '@type': 'VideoGame', name: 'Dofus', gamePlatform: 'PC' },
}

// Separate WebSite entry with an explicit name/logo — Google uses this
// (distinct from the WebApplication entry) to resolve the site name and
// icon shown in search results.
const WEBSITE_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Dofus Forge',
  url: `${SITE}/`,
  publisher: {
    '@type': 'Organization',
    name: 'Dofus Forge',
    logo: { '@type': 'ImageObject', url: `${SITE}/favicon-192.png`, width: 192, height: 192 },
  },
}

/**
 * Per-page tags. On the server they come from the page's usePageSeo call
 * (SeoTagsContext, see entry.server.tsx). In the browser this renders the
 * values the prerendered <head> already has (readSeoTags), once, so React
 * adopts those elements instead of adding a second set; usePageSeo's effect
 * owns them from then on.
 */
function SeoHead({ lang }: { lang: ReturnType<typeof langFromPath> }) {
  const serverTags = useContext(SeoTagsContext)
  const [clientTags] = useState(() => (serverTags || typeof document === 'undefined' ? null : readSeoTags(document, lang)))
  const tags = serverTags ?? clientTags ?? seoTags(lang)
  return (
    <>
      <title suppressHydrationWarning>{tags.title}</title>
      <meta name="description" content={tags.description} suppressHydrationWarning />
      <meta name="robots" content={tags.robots} suppressHydrationWarning />
      <link rel="canonical" href={tags.canonical} suppressHydrationWarning />
      {tags.alternates.map(a => (
        <link key={a.hreflang} rel="alternate" hrefLang={a.hreflang} href={a.href} suppressHydrationWarning />
      ))}
      <meta property="og:url" content={tags.canonical} suppressHydrationWarning />
      <meta property="og:title" content={tags.title} suppressHydrationWarning />
      <meta property="og:description" content={tags.description} suppressHydrationWarning />
      <meta property="og:image" content={tags.image} suppressHydrationWarning />
      <meta property="og:locale" content={tags.ogLocale} suppressHydrationWarning />
      <meta name="twitter:title" content={tags.title} suppressHydrationWarning />
      <meta name="twitter:description" content={tags.description} suppressHydrationWarning />
      <meta name="twitter:image" content={tags.image} suppressHydrationWarning />
    </>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const lang = langFromPath(pathname)

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />

        {/* Google AdSense site verification/loader — must stay high in <head> per Google's requirement */}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7408183630551993" crossOrigin="anonymous" />

        <SeoHead lang={lang} />
        {/* Ignored by Google for ranking since ~2009; kept because it costs nothing. */}
        <meta name="keywords" content="dofus forge, dofus build planner, dofus 3, dofus optimizer, dofus sets, dofus equipment, dofus stats, dofus runes, dofus classes, dofus calculator, planificador de builds dofus, panoplias dofus, equipo dofus, optimizador dofus, runas de forjamagia, estadisticas dofus, clases dofus, planificateur de builds dofus, panoplies dofus, equipement dofus, optimiseur dofus, forgemagie, statistiques dofus, classes dofus, planejador de builds dofus, conjuntos dofus, equipamento dofus, otimizador dofus, forjamagia, estatisticas dofus, classes de dofus" />
        <meta name="author" content="Wembie" />
        <meta property="og:type" content="website" />
        <meta property="og:locale:alternate" content="es_ES" />
        <meta property="og:locale:alternate" content="fr_FR" />
        <meta property="og:locale:alternate" content="pt_PT" />
        <meta property="og:site_name" content="Dofus Forge" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEB_APPLICATION_LD) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_LD) }} />

        {/*
          SVG for modern browsers, PNG fallbacks alongside it because Google's
          search-result favicon fetcher (and older browsers/Safari pinned tabs)
          are more reliable with a plain square PNG.
        */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="application-name" content="Dofus Forge" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Dofus Forge" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0d0f14" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Never render-blocking: fetched as print media, switched to all once loaded (BOOT_SCRIPT). */}
        <link rel="preload" as="style" href={FONTS_URL} />
        <link rel="stylesheet" href={FONTS_URL} media="print" data-swap-media="all" suppressHydrationWarning />
        <noscript><link rel="stylesheet" href={FONTS_URL} /></noscript>
        <Links />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  useEffect(() => {
    useAuthStore.getState().init()
    // Prerendered buttons are on screen before React handles their clicks;
    // the end-to-end tests wait for this before interacting.
    document.documentElement.dataset.hydrated = ''
  }, [])

  return (
    <>
      <Outlet />
      <Toaster />
      <ParticleField />
      <MagicCursor />
      <UpdateBanner />
    </>
  )
}

// Every route that is not prerendered (build pages, profiles, admin) starts
// from __spa-fallback.html, which renders this and nothing else.
export function HydrateFallback() {
  return null
}

export function ErrorBoundary() {
  const error = useRouteError()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const home = `/${langPathRootSegment(langFromPath(pathname))}`
  if (!isRouteErrorResponse(error)) console.error(error)

  return (
    <main id="main-content" className="min-h-screen bg-forge-bg flex flex-col items-center justify-center gap-3 px-4 text-sm" style={{ color: 'var(--ink-faint)' }}>
      <h1 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>{t('error_page_title')}</h1>
      <p>{t('error_page_body')}</p>
      <Link to={home} className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>{t('error_page_home')}</Link>
    </main>
  )
}
