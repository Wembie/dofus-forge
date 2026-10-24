import { expect, test } from '@playwright/test'

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
  ] as const
  for (const [route, heading] of publicPages) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  }

  await page.goto('en/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'The Forger' })).toBeVisible()

  await page.getByRole('button', { name: 'The Forger' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('radio', { name: 'Iop' }).click()
  await dialog.getByRole('radio', { name: 'Quick' }).click()
  await dialog.getByText('AP', { exact: true }).click()
  // Pin an item: every build must wear it.
  await dialog.getByRole('searchbox').fill('wand')
  await dialog.getByRole('searchbox').press('Enter')
  await expect(dialog.getByText(/goes in Weapon/)).toBeVisible()

  const wasmLoaded = page.waitForResponse(response =>
    response.url().includes('/wasm/dofus_forge_optimizer_bg.wasm') && response.ok(),
  )
  await dialog.getByRole('button', { name: 'Light the forge' }).click()
  await wasmLoaded
  await expect(dialog.getByText(/Build #1/)).toBeVisible({ timeout: 60_000 })
  await expect(dialog.getByLabel('Pinned').first()).toBeVisible()
  expect(pageErrors).toEqual([])
})
