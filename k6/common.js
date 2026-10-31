import http from 'k6/http'
import { check, sleep } from 'k6'

export const DEFAULT_BASE_URL = __ENV.BASE_URL || 'http://localhost:4173'

export const PUBLIC_ROUTES = [
  '/',
  '/explore',
  '/about',
  '/how-to-use',
  '/classes/iop',
  '/classes/sadida',
  '/classes/enutrof',
  '/sets',
  '/sets/gobball-set',
]

export const ROUTE_LABELS = {
  '/': 'home',
  '/explore': 'explore',
  '/about': 'about',
  '/how-to-use': 'how_to_use',
  '/classes/iop': 'class_iop',
  '/classes/sadida': 'class_sadida',
  '/classes/enutrof': 'class_enutrof',
  '/sets': 'sets',
  '/sets/gobball-set': 'set_page',
}

export function buildUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${DEFAULT_BASE_URL}${normalizedPath}`
}

export function visitPage(route, options = {}) {
  const url = buildUrl(route)
  const res = http.get(url, {
    redirects: 5,
    tags: { route: ROUTE_LABELS[route] || 'custom_route' },
    ...options,
  })

  check(res, {
    'status is 200': (r) => r.status === 200,
    'content type is HTML': (r) => /text\/html/i.test(r.headers['Content-Type'] || ''),
    'body was not empty': (r) => (r.body || '').length > 0,
    // A deferred Suspense boundary paints its fallback first and reveals the
    // page on a timer (src/entry.server.tsx progressiveChunkSize).
    'content is in place, not deferred': (r) => !(r.body || '').includes('<template id="B:'),
  })

  return res
}

export function randomRoute() {
  return PUBLIC_ROUTES[Math.floor(Math.random() * PUBLIC_ROUTES.length)]
}

export function pause() {
  sleep(1)
}
