import { expect, test, type Page } from '@playwright/test'

// The prerendered page is visible before React hydrates it (root.tsx sets the flag).
const hydrated = (page: Page) => page.locator('html[data-hydrated]').waitFor({ state: 'attached' })

test('public routes render and the optimizer runs in the browser with WASM', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))

  const equipmentLoaded = page.waitForResponse(response =>
    response.url().includes('/data/en/equipment.json') && response.ok(),
  )
  await page.goto('en/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'The Forger' })).toBeVisible()
  await equipmentLoaded

  const publicPages = [
    ['en/explore', 'Explore builds'],
    ['en/about', 'About Dofus Forge'],
    ['en/how-to-use', 'How to Use Dofus Forge'],
    ['en/forge-guide', 'The Forger'],
  ] as const
  for (const [route, heading] of publicPages) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  }

  await page.goto('en/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'The Forger' })).toBeVisible()
  await hydrated(page)

  await page.getByRole('button', { name: 'The Forger' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('radio', { name: 'Iop' }).click()
  await dialog.getByRole('radio', { name: 'Quick' }).click()
  // A new order already asks for 12 AP and 6 MP.
  await expect(dialog.getByRole('group', { name: 'AP purity levels' })).toBeVisible()
  // Pin an item: every build must wear it. The search is a combobox (its
  // matches drop down as you type), named by its label.
  const itemSearch = dialog.getByRole('combobox', { name: 'Search an item or set…' })
  await itemSearch.fill('wand')
  await itemSearch.press('Enter')
  await expect(dialog.getByText(/goes in Weapon/)).toBeVisible()

  const wasmLoaded = page.waitForResponse(response =>
    response.url().includes('/wasm/dofus_forge_optimizer_bg.wasm') && response.ok(),
  )
  await dialog.getByRole('button', { name: 'Light the forge' }).click()
  await wasmLoaded
  await expect(dialog.getByText(/Build #1/)).toBeVisible({ timeout: 60_000 })
  // The best build's pieces are folded; open them to find the pinned one.
  await dialog.getByRole('button', { name: /^Show the \d+ pieces?$/ }).first().click()
  await expect(dialog.getByText(/· pinned/).first()).toBeVisible()
  expect(pageErrors).toEqual([])
})
