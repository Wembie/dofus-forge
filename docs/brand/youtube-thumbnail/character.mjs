// The workshop character alone, transparent background, at 3x: node character.mjs <workshop url> <out.png>
import { chromium } from '@playwright/test'

const [url, out] = process.argv.slice(2)
const page = await (await chromium.launch()).newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 3, colorScheme: 'dark' })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(5000)
await page.addStyleTag({ content: '*,*::before,*::after{background:transparent!important;background-image:none!important;border-color:transparent!important;box-shadow:none!important}' })
const canvas = page.locator('canvas[aria-label]:visible').first()
await page.waitForTimeout(500)
await canvas.screenshot({ path: out, omitBackground: true })
process.exit(0)
