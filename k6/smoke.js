import { DEFAULT_THRESHOLDS, PUBLIC_ROUTES } from './config.js'
import { visitPage, pause } from './common.js'

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    'checks{scenario:smoke}': ['rate>0.99'],
  },
}

export default function () {
  const route = PUBLIC_ROUTES[Math.floor(__ITER % PUBLIC_ROUTES.length)]
  visitPage(route)
  pause()
}
