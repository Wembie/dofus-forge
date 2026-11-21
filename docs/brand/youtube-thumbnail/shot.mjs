// Captures a live page at 2x for the thumbnail: node shot.mjs <url> <out.png> [clickText]
import { chromium } from '@playwright/test'

const [url, out, click] = process.argv.slice(2)
const page = await (await chromium.launch()).newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2, colorScheme: 'dark' })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
if (click) {
  await page.getByRole('button', { name: click }).or(page.getByRole('link', { name: click })).first().click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(4000)
}
console.log(page.url())
await page.screenshot({ path: out })
process.exit(0)
