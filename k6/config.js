export const BASE_URL = __ENV.BASE_URL || 'http://localhost:4173/dofus-forge'

export const SCENARIO_STAGES = {
  smoke: {
    vus: 2,
    duration: '30s',
  },
  normal: {
    stages: [
      { duration: '1m', target: 10 },
      { duration: '3m', target: 20 },
      { duration: '1m', target: 10 },
    ],
  },
  peak: {
    stages: [
      { duration: '30s', target: 20 },
      { duration: '2m', target: 50 },
      { duration: '30s', target: 20 },
    ],
  },
  stress: {
    stages: [
      { duration: '1m', target: 30 },
      { duration: '3m', target: 75 },
      { duration: '1m', target: 30 },
    ],
  },
  soak: {
    stages: [
      { duration: '5m', target: 10 },
      { duration: '20m', target: 25 },
      { duration: '5m', target: 10 },
    ],
  },
}

export const DEFAULT_THRESHOLDS = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500', 'p(99)<1500'],
  checks: ['rate>0.99'],
}

export const PUBLIC_ROUTES = [
  '/',
  '/explore',
  '/about',
  '/how-to-use',
  '/classes/iop',
  '/classes/sadida',
  '/classes/enu',
]
