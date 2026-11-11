// Captures the current state of the live site for the UI brief.
// Usage (from the repo root): node docs/brand/ui-brief/capture.mjs [baseUrl]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASE = process.argv[2] ?? 'https://dofusforge.com'
const OUT = fileURLToPath(new URL('./screens/', import.meta.url))
const BUILD = '/es/build/1d057a97-bcc3-403b-93ee-2e3588e6f360'
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = {
  desktop: { viewport: { width: 1920, height: 1080 }, colorScheme: 'dark' },
  mobile: { viewport: { width: 390, height: 844 }, colorScheme: 'dark' },
  'desktop-light': { viewport: { width: 1920, height: 1080 }, colorScheme: 'light' },
}

async function open(page, path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForTimeout(1500)
}

const SHOTS = [
  ['01-planner-empty', async p => open(p, '/es')],
  ['02-planner-filled', async p => {
    await open(p, BUILD)
    await p.getByRole('button', { name: /remix/i }).first().click()
    await p.waitForURL(u => !u.pathname.includes('/build/'), { timeout: 15000 })
    await p.waitForTimeout(2500)
  }],
  ['03-item-catalog', async p => {
    await p.getByRole('button', { name: /^Sombrero/ }).first().click()
    await p.waitForTimeout(1500)
  }],
  ['04-build-detail', async p => open(p, BUILD)],
  ['05-explore', async p => open(p, '/es/explore')],
  ['06-sets', async p => open(p, '/es/sets')],
  ['07-set-detail', async p => open(p, '/es/sets/lwo-set')],
  ['08-class-guide', async p => open(p, '/es/classes/cra')],
]

const browser = await chromium.launch()
for (const [vp, options] of Object.entries(VIEWPORTS)) {
  const page = await browser.newPage(options)
  // The site keeps its own theme setting; the OS preference alone does not switch it.
  await page.addInitScript(theme => localStorage.setItem('dofus-forge-theme', theme), options.colorScheme)
  for (const [name, go] of SHOTS) {
    try {
      await go(page)
      // Hydration currently drops the theme class from <html>; put it back so the light theme renders.
      await page.evaluate(theme => document.documentElement.classList.add(theme), options.colorScheme)
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${OUT}${name}-${vp}.png` })
      console.log('ok  ', name, vp)
    } catch (e) {
      console.log('skip', name, vp, String(e.message).split('\n')[0])
    }
  }
  await page.close()
}
await browser.close()
