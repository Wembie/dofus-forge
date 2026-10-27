import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// Third-party embeds we don't control (AdSense slots, Turnstile challenge).
const THIRD_PARTY = ['ins.adsbygoogle', 'iframe[src*="googlesyndication"]', 'iframe[src*="challenges.cloudflare.com"]']

async function expectNoBlockingViolations(page: Page, name: string) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS)
  for (const selector of THIRD_PARTY) builder = builder.exclude(selector)
  const { violations } = await builder.analyze()

  if (process.env.A11Y_VERBOSE) {
    for (const v of violations) {
      console.log(`[${name}] ${v.impact} ${v.id} (${v.nodes.length})`)
      for (const n of v.nodes) console.log(`    ${n.target.join(' ')} :: ${n.failureSummary?.split('\n')[1]?.trim()}`)
    }
  }

  const blocking = violations
    .filter(v => v.impact === 'serious' || v.impact === 'critical')
    .map(v => `${v.impact} ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)
  expect(blocking).toEqual([])
}

async function open(page: Page, route: string) {
  // Settled frames only: mid-fade opacity makes axe report bogus contrast.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible()
  await page.waitForLoadState('networkidle').catch(() => {})
}

const ROUTES = [
  ['en/', 'builder'],
  ['en/explore', 'explore'],
  ['en/about', 'about'],
  ['en/how-to-use', 'how-to-use'],
  ['en/forge-guide', 'forge-guide'],
] as const

for (const [route, name] of ROUTES) {
  test(`${name} has no serious or critical axe violations`, async ({ page }) => {
    await open(page, route)
    await expectNoBlockingViolations(page, name)
  })
}

test('builder with a class and its dialogs have no serious or critical axe violations', async ({ page }) => {
  await open(page, 'en/')
  await page.getByRole('radio', { name: 'Iop' }).click()
  await expect(page.getByRole('button', { name: /^Hat/ })).toBeVisible()
  await page.waitForLoadState('networkidle').catch(() => {})
  await expectNoBlockingViolations(page, 'builder-class')

  await page.getByRole('button', { name: /^Hat/ }).click()
  const catalog = page.getByRole('dialog')
  await expect(catalog).toBeVisible()
  await expect(catalog.getByRole('searchbox')).toBeFocused()
  await expectNoBlockingViolations(page, 'item-catalog')
  await page.keyboard.press('Escape')
  await expect(catalog).toBeHidden()

  const settings = page.getByRole('button', { name: 'Settings' })
  await settings.click()
  const settingsDialog = page.getByRole('dialog', { name: 'Settings' })
  await expect(settingsDialog).toBeVisible()
  await expectNoBlockingViolations(page, 'settings')
  await page.keyboard.press('Escape')
  await expect(settingsDialog).toBeHidden()
  await expect(settings).toBeFocused()

  await page.getByRole('button', { name: 'The Forger' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expectNoBlockingViolations(page, 'forger')
  await page.keyboard.press('Escape')

  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expectNoBlockingViolations(page, 'command-palette')
})
