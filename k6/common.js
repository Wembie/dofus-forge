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
  '/classes/enu',
]

export const ROUTE_LABELS = {
  '/': 'home',
  '/explore': 'explore',
  '/about': 'about',
  '/how-to-use': 'how_to_use',
  '/classes/iop': 'class_iop',
  '/classes/sadida': 'class_sadida',
  '/classes/enu': 'class_enu',
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
  })

  return res
}

export function randomRoute() {
  return PUBLIC_ROUTES[Math.floor(Math.random() * PUBLIC_ROUTES.length)]
}

export function pause() {
  sleep(1)
}
