import { PUBLIC_ROUTES } from './config.js'
import { ROUTE_LABELS, visitPage } from './common.js'

// count>=1, not count==1: visitPage() passes redirects:5 to http.get(), and
// k6 counts every hop of a followed redirect under the same route tag, so a
// route that happens to 3xx once (observed in CI, not reproducible locally —
// looks like a vite-preview cold-start race under concurrent VU startup, not
// an app bug) would show count==2 and fail a threshold that doesn't actually
// care how many hops it took, just that the route was reachable.
const routeCoverageThresholds = PUBLIC_ROUTES.reduce((thresholds, route) => {
  thresholds[`http_reqs{route:${ROUTE_LABELS[route]}}`] = ['count>=1']
  return thresholds
}, {})

export const options = {
  scenarios: {
    smoke: {
      executor: 'per-vu-iterations',
      vus: PUBLIC_ROUTES.length,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    ...routeCoverageThresholds,
    http_req_failed: ['rate==0'],
    checks: ['rate==1'],
  },
}

export default function () {
  const route = PUBLIC_ROUTES[__VU - 1]
  if (!route) {
    throw new Error(`No smoke-test route configured for VU ${__VU}`)
  }

  visitPage(route)
}
