import { DEFAULT_THRESHOLDS } from './config.js'
import { PUBLIC_ROUTES, visitPage, pause } from './common.js'

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '30s', target: 20 },
  ],
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    'http_req_duration{scenario:peak}': ['p(95)<800'],
    'checks{scenario:peak}': ['rate>0.99'],
  },
}

export default function () {
  const route = PUBLIC_ROUTES[Math.floor(__ITER % PUBLIC_ROUTES.length)]
  visitPage(route, { tags: { scenario: 'peak' } })
  pause()
}
