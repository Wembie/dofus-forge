import type { Config } from '@react-router/dev/config'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnv } from 'vite'
import { SENTINEL_BUILD_ID, SENTINEL_USERNAME } from './src/data/prerenderSentinels.ts'

const SITE = 'https://dofusforge.com'
const LANG_PREFIXES = { en: '', es: '/es', fr: '/fr', pt: '/pt' } as const
const PREFIXES = ['', '/en', '/es', '/fr', '/pt']
const CLASS_IDS = Object.keys(JSON.parse(readFileSync('./public/data/class-names.json', 'utf-8')))

// Every page that has to reach crawlers as real HTML. my-builds and account
// are noindex (their body is a sign-in prompt) but are still prerendered so a
// direct load gets that noindex in the HTML itself.
const STATIC_PAGES = [
  '', 'explore', 'about', 'how-to-use', 'forge-guide', 'shortcuts', 'privacy', 'terms',
  ...CLASS_IDS.map(id => `classes/${id}`),
]
const NOINDEX_PAGES = ['my-builds', 'account']

type PublicBuild = { id: string; updated_at: string; profiles: { username: string } | null }

/**
 * Public builds and their authors, read at build time. Without Supabase
 * credentials (CI) or when the request fails, the site still builds with its
 * static pages only: those builds then load in the browser as before.
 */
async function fetchPublicBuilds(): Promise<PublicBuild[]> {
  const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env }
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key || url.endsWith('.invalid')) {
    console.warn('[prerender] No Supabase credentials: community builds and profiles are not prerendered.')
    return []
  }
  const rows: PublicBuild[] = []
  const PAGE = 1000
  try {
    for (let from = 0; ; from += PAGE) {
      const res = await fetch(`${url}/rest/v1/builds?select=id,updated_at,profiles!builds_user_id_fkey(username)&visibility=eq.public&order=id`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + PAGE - 1}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const page = (await res.json()) as PublicBuild[]
      rows.push(...page)
      if (page.length < PAGE) break
    }
  } catch (err) {
    console.warn(`[prerender] Could not list public builds (${(err as Error).message}): community builds and profiles are not prerendered.`)
    return []
  }
  console.log(`[prerender] ${rows.length} public builds by ${new Set(rows.map(r => r.profiles?.username).filter(Boolean)).size} authors.`)
  return rows
}

// Once per build, and only when a build asks (not on `react-router dev`).
let publicBuildsRequest: Promise<PublicBuild[]> | null = null
const publicBuilds = () => (publicBuildsRequest ??= fetchPublicBuilds())

async function dynamicPages() {
  const builds = await publicBuilds()
  const usernames = [...new Set(builds.map(b => b.profiles?.username).filter((u): u is string => !!u))]
  return [...builds.map(b => `build/${b.id}`), ...usernames.map(u => `u/${encodeURIComponent(u)}`)]
}

const withPrefixes = (pages: string[]) => PREFIXES.flatMap(prefix => pages.map(page => (page ? `${prefix}/${page}` : prefix || '/')))

/**
 * sitemap.xml from the same lists, so it can't drift from what is actually
 * prerendered: every indexable page once, at its canonical (unprefixed
 * English) URL, with its hreflang alternates. /en mirrors canonicalize back
 * to the bare URLs, so they are not listed.
 */
async function writeSitemap(clientDir: string) {
  const lastmod = new Map((await publicBuilds()).map(b => [`build/${b.id}`, b.updated_at.slice(0, 10)]))
  const url = (page: string) => {
    const loc = (prefix: string) => `${SITE}${prefix}${page ? `/${page}` : ''}`
    const alternates = Object.entries(LANG_PREFIXES)
      .map(([lang, prefix]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${loc(prefix)}"/>`)
      .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${loc('')}"/>`)
    return Object.values(LANG_PREFIXES).map(prefix => [
      '  <url>',
      `    <loc>${loc(prefix)}</loc>`,
      ...alternates,
      ...(lastmod.has(page) ? [`    <lastmod>${lastmod.get(page)}</lastmod>`] : []),
      '  </url>',
    ].join('\n')).join('\n')
  }
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...[...STATIC_PAGES, ...await dynamicPages()].map(url),
    '</urlset>',
    '',
  ].join('\n')
  writeFileSync(join(clientDir, 'sitemap.xml'), xml)
}

export default {
  appDirectory: 'src',
  buildDirectory: 'dist',
  // Rendered by React at build time, no server runtime: on the Workers Free
  // plan (10 ms CPU per request) rendering per visit is not an option. The
  // Worker serves these files, checks that a prerendered build or profile is
  // still public before serving it, and serves __spa-fallback.html for every
  // route that has no file (new builds, collections, admin).
  ssr: false,
  prerender: async () => withPrefixes([
    ...STATIC_PAGES,
    ...NOINDEX_PAGES,
    ...await dynamicPages(),
    `build/${SENTINEL_BUILD_ID}`,
    `u/${SENTINEL_USERNAME}`,
  ]),
  buildEnd: ({ reactRouterConfig }) => writeSitemap(join(reactRouterConfig.buildDirectory, 'client')),
  // React Router v8's defaults, adopted now so that upgrade is a version bump.
  future: {
    v8_middleware: true,
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: true,
    v8_passThroughRequests: true,
    v8_trailingSlashAwareDataRequests: true,
  },
} satisfies Config
