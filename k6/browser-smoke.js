import { chromium } from 'k6/x/browser'
import { check } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4173/dofus-forge'

export const options = {
  scenarios: {
    browser_smoke: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
  },
}

export default function () {
  const browser = chromium.launch({ headless: true })
  const page = browser.newPage()

  page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })

  check(page, {
    'home page rendered': () => page.locator('body').isVisible(),
    'builder is present': () => page.locator('body').textContent().length > 0,
  })

  page.goto(`${BASE_URL}/explore`, { waitUntil: 'networkidle' })
  check(page, {
    'explore page loads': () => page.locator('body').isVisible(),
  })

  browser.close()
}
