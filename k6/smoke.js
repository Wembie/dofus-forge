import { PUBLIC_ROUTES } from './config.js'
import { ROUTE_LABELS, visitPage } from './common.js'

const routeCoverageThresholds = PUBLIC_ROUTES.reduce((thresholds, route) => {
  thresholds[`http_reqs{route:${ROUTE_LABELS[route]}}`] = ['count==1']
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
