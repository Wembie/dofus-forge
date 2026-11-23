import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  const externalConnections = []
  page.on('pageerror', error => errors.push(String(error)))
  page.on('request', req => {
    if (!new URL(req.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/) && ['fetch', 'xhr'].includes(req.resourceType())) externalConnections.push(req.url())
  })
  await page.goto('http://127.0.0.1:5188/beta')
  await page.locator('.beta-class select').waitFor()
  assert.equal(await page.locator('.beta-class option').count(), 21)
  await page.locator('.beta-class select').selectOption('iop')
  const initial = await page.evaluate(async () => {
    const { useBuildStore } = await import('/tools/beta/buildStore.ts')
    const b = useBuildStore.getState()
    const hat = b._equipment.find(it => it.slot === 'hat' && it.effects.some(e => e.stat === 'Strength' && e.min > 0) && !it.effects.some(e => e.stat === 'Agility' || e.stat === 'Air Damage'))
    if (!hat) throw new Error('No conversion fixture in beta catalog')
    b.equipItem('hat', hat.ankama_id)
    b.setRune('hat', 'Strength', 10)
    return { id: hat.ankama_id, strength: useBuildStore.getState().stats.strength }
  })
  await page.locator('.beta-tabs button').nth(1).click()
  await page.locator('.beta-dracos .beta-controls select').nth(1).selectOption('air')
  await page.locator('.beta-dracos .beta-controls select').nth(2).selectOption('earth')
  await page.locator('.beta-dracos .beta-actions button').first().click()
  const after = await page.evaluate(async () => {
    const { useBuildStore, useDracorunes } = await import('/tools/beta/buildStore.ts')
    return { stats: useBuildStore.getState().stats, applied: useDracorunes.getState().applied }
  })
  assert.equal(after.stats.strength, 0)
  assert.equal(after.stats.agility, initial.strength)
  assert.equal(after.applied.hat.itemId, initial.id)
  assert.equal(await page.locator('.beta-actions > button').nth(5).isDisabled(), true)
  await page.locator('.beta-actions > button').first().click()
  assert.equal(await page.evaluate(async () => (await import('/tools/beta/buildStore.ts')).useBuildStore.getState().stats.strength), initial.strength)
  await page.locator('.beta-actions > button').nth(1).click()
  await page.reload()
  await page.locator('.beta-class select').waitFor()
  assert.equal(await page.evaluate(async () => (await import('/tools/beta/buildStore.ts')).useBuildStore.getState().stats.agility), initial.strength)
  const downloadEvent = page.waitForEvent('download')
  await page.locator('.beta-actions > button').nth(2).click()
  assert.match((await downloadEvent).suggestedFilename(), /^dofus-forge-beta-/)
  await page.locator('.beta-class select').selectOption('bellaphone')
  await page.locator('.beta-tabs button').nth(2).click()
  await page.waitForFunction(async () => (await import('/src/store/dataStore.ts')).useDataStore.getState().spells.get('bellaphone')?.spells.length === 44)
  for (const lang of ['en', 'fr', 'pt', 'es']) {
    await page.locator('.beta-header select').selectOption(lang)
    await page.locator('.beta-class select').waitFor()
    await page.waitForFunction(async lang => (await import('/src/store/dataStore.ts')).useDataStore.getState().lang === lang && !(await import('/src/store/dataStore.ts')).useDataStore.getState().loading, lang)
    assert.equal(await page.locator('.beta-class select').inputValue(), 'bellaphone')
    assert.equal(await page.evaluate(() => document.body.innerText.includes('beta_')), false)
  }
  await page.locator('.beta-tabs button').nth(4).click()
  assert.ok(await page.locator('.beta-change-list li').count() > 50)
  await page.setViewportSize({ width: 390, height: 844 })
  for (let tab = 0; tab < 5; tab++) {
    await page.locator('.beta-tabs button').nth(tab).click()
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    if (overflow) console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].map(e => ({ tag: e.tagName, class: e.className, right: e.getBoundingClientRect().right })).filter(e => e.right > innerWidth + 1).slice(0, 15)))
    assert.equal(overflow, false, `Mobile overflow in tab ${tab}`)
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(externalConnections, [])
  console.log('Beta browser checks passed: conversions, undo/redo, reload, export, Bellaphone spells, 4 locales, mobile and cloud isolation.')
} finally {
  await browser.close()
}
