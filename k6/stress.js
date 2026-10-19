import { DEFAULT_THRESHOLDS } from './config.js'
import { PUBLIC_ROUTES, visitPage, pause } from './common.js'

export const options = {
  stages: [
    { duration: '1m', target: 30 },
    { duration: '3m', target: 75 },
    { duration: '1m', target: 30 },
  ],
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    'http_req_duration{scenario:stress}': ['p(95)<1500'],
    'checks{scenario:stress}': ['rate>0.95'],
  },
}

export default function () {
  const route = PUBLIC_ROUTES[Math.floor(__ITER % PUBLIC_ROUTES.length)]
  visitPage(route, { tags: { scenario: 'stress' } })
  pause()
}
