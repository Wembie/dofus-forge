import { DEFAULT_THRESHOLDS } from './config.js'
import { PUBLIC_ROUTES, visitPage, pause } from './common.js'

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 10 },
  ],
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    'checks{scenario:normal_load}': ['rate>0.99'],
  },
}

export default function () {
  const route = PUBLIC_ROUTES[Math.floor(__ITER % PUBLIC_ROUTES.length)]
  visitPage(route, { tags: { scenario: 'normal_load' } })
  pause()
}
