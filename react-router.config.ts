import type { Config } from '@react-router/dev/config'
import { readFileSync } from 'node:fs'

const CLASS_IDS = Object.keys(JSON.parse(readFileSync('./public/data/class-names.json', 'utf-8')))

// Every page that has to reach crawlers as real HTML. my-builds and account
// are noindex (their body is a sign-in prompt) but are still prerendered so a
// direct load gets that noindex in the HTML itself.
const PAGES = [
  '', 'explore', 'about', 'how-to-use', 'forge-guide', 'shortcuts', 'privacy', 'terms',
  'my-builds', 'account',
  ...CLASS_IDS.map(id => `classes/${id}`),
]
const PREFIXES = ['', '/en', '/es', '/fr', '/pt']

export default {
  appDirectory: 'src',
  buildDirectory: 'dist',
  // Rendered by React at build time, no server runtime yet: the Worker serves
  // these files and __spa-fallback.html for every other route (build pages,
  // profiles, admin).
  ssr: false,
  prerender: PREFIXES.flatMap(prefix => PAGES.map(page => (page ? `${prefix}/${page}` : prefix || '/'))),
  // React Router v8's defaults, adopted now so that upgrade is a version bump.
  future: {
    v8_middleware: true,
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: true,
    v8_passThroughRequests: true,
    v8_trailingSlashAwareDataRequests: true,
  },
} satisfies Config
