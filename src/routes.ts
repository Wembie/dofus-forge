import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

const PAGES: [path: string, file: string][] = [
  ['explore', 'pages/ExplorePage.tsx'],
  ['build/:id', 'pages/BuildDetailPage.tsx'],
  ['my-builds', 'pages/MyBuildsPage.tsx'],
  ['c/:id', 'pages/CollectionPage.tsx'],
  ['about', 'pages/AboutPage.tsx'],
  ['how-to-use', 'pages/HowToUsePage.tsx'],
  ['forge-guide', 'pages/ForgeGuidePage.tsx'],
  ['shortcuts', 'pages/ShortcutsPage.tsx'],
  ['privacy', 'pages/PrivacyPolicyPage.tsx'],
  ['terms', 'pages/TermsPage.tsx'],
  ['classes/:classId', 'pages/ClassGuidePage.tsx'],
  ['sets', 'pages/SetsPage.tsx'],
  ['sets/:slug', 'pages/SetPage.tsx'],
  ['u/:username', 'pages/UserProfilePage.tsx'],
  ['account', 'pages/AccountPage.tsx'],
  ['admin', 'pages/AdminDashboardPage.tsx'],
  ['admin/ranks', 'pages/AdminRanksPage.tsx'],
  ['admin/reports', 'pages/AdminReportsPage.tsx'],
]

// The same page tree under each language; a module mounted more than once
// needs a distinct route id per mount.
function pages(lang: string) {
  return [
    index('pages/BuilderPage.tsx', { id: `${lang}/home` }),
    ...PAGES.map(([path, file]) => route(path, file, { id: `${lang}/${path}` })),
  ]
}

export default [
  // / is canonical English, so it has no prefix. /en is kept reachable too
  // (direct links, hreflang); its pages canonicalize back to the bare URLs.
  layout('LangRoute.tsx', { id: 'lang-root' }, pages('root')),
  ...['en', 'es', 'fr', 'pt'].map(lang =>
    route(lang, 'LangRoute.tsx', { id: `lang-${lang}` }, [
      ...pages(lang),
      route('*', 'pages/BuilderPage.tsx', { id: `${lang}/fallback` }),
    ]),
  ),
  route('*', 'CatchAllRoute.tsx'),
] satisfies RouteConfig
