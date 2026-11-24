import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto('http://127.0.0.1:5188/beta')
  await page.locator('.beta-class select').selectOption('bellaphone')
  await page.locator('.beta-tabs button').nth(2).click()
  await page.locator('.beta-bellaphone .beta-controls select').first().waitFor()
  await page.waitForFunction(async () => (await import('/src/store/dataStore.ts')).useDataStore.getState().spells.get('bellaphone')?.spells.length === 44)
  const result = await page.evaluate(async () => {
    const { projectBellaphone, DEFAULT_SCENARIO, LINEAGES, scenarioBonus } = await import('/tools/beta/bellaphone.ts')
    const { useDataStore } = await import('/src/store/dataStore.ts')
    const rules = await fetch('/data/es/bellaphone-rules.json').then(r => r.json())
    const spells = useDataStore.getState().spells.get('bellaphone').spells
    const effects = (id, patch, grade = 2, critical = false) => {
      const levels = projectBellaphone(spells, rules, { ...DEFAULT_SCENARIO, ...patch }).find(s => s.id === id).levels
      return (levels.find(l => l.grade === grade) ?? levels.at(-1))[critical ? 'critEffects' : 'effects'].filter(e => ['damage', 'steal'].includes(e.kind)).map(e => [e.min, e.max])
    }
    return {
      pyro: [1,2,3].map(radius => effects(33311, { radius })),
      pyroCrit: [1,2,3].map(radius => effects(33311, { radius }, 2, true)),
      pyroRankOne: [1,3].map(radius => effects(33311, { radius }, 1)),
      funeral: [0,1,2].map(enemies => effects(33231, { enemies })),
      fist: effects(33219, {}), barkhan: effects(33314, {}),
      black: [effects(33228, {}, 3), effects(33228, { inside: false }, 3), effects(33228, { timing: 'end_turn', inside: false }, 3)],
      ultimates: LINEAGES.map(lineage => { const result = projectBellaphone(spells, rules, { ...DEFAULT_SCENARIO, lineage, evolution: 5 }); const ultimate = result.at(-1); return [result.length, ultimate.id, ultimate.levels[0].ap] }),
      power: scenarioBonus(rules, { ...DEFAULT_SCENARIO, lineage: 'crimson', aura: true }),
    }
  })
  assert.deepEqual(result.pyro, [[[30,33]], [[25,28]], [[20,23]]])
  assert.deepEqual(result.pyroCrit, [[[36,40]], [[30,34]], [[24,28]]])
  assert.deepEqual(result.pyroRankOne, [[[16,19]], [[24,27]]])
  assert.equal(result.funeral.every(r => r.length === 1), true)
  assert.equal(result.funeral[1][0][0] > result.funeral[2][0][0], true)
  assert.equal(result.fist.length, 1); assert.equal(result.barkhan.length, 1)
  assert.deepEqual(result.black, [[[11,13]], [], [[11,13]]])
  assert.deepEqual(result.ultimates.map(r => r[0]), [45,45,45,45,45,45])
  assert.deepEqual(result.ultimates.map(r => r[1]), [33233,33227,33220,33208,33214,33202])
  assert.equal(result.ultimates.every(r => r[2] === 4), true)
  assert.deepEqual(result.power, { power: 80 })
  const controls = page.locator('.beta-bellaphone .beta-controls select')
  await controls.nth(0).selectOption('crimson')
  await controls.nth(1).selectOption('3')
  await page.getByLabel('Rango del definitivo (prueba manual)').selectOption('5')
  await page.getByRole('heading', { name: 'Crisol Escarlata', exact: true }).waitFor()
  await page.reload()
  await page.locator('.beta-class select').waitFor()
  await page.locator('.beta-tabs button').nth(2).click()
  await page.getByRole('heading', { name: 'Crisol Escarlata', exact: true }).waitFor()
  assert.equal(await controls.nth(1).inputValue(), '3')
  assert.equal(await page.getByLabel('Rango del definitivo (prueba manual)').inputValue(), '5')
  for (const lang of ['en','fr','pt','es']) {
    await page.locator('.beta-header select').selectOption(lang)
    await page.waitForFunction(async lang => (await import('/src/store/dataStore.ts')).useDataStore.getState().lang === lang && !(await import('/src/store/dataStore.ts')).useDataStore.getState().loading, lang)
    await page.locator('.beta-bellaphone .beta-controls select').first().waitFor()
    assert.equal(await page.evaluate(() => document.body.innerText.includes('beta_bella_')), false)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  assert.deepEqual(errors, [])
  console.log('Bellaphone real-data checks passed: exclusive normal/critical branches, poison timing, all six ultimates, aura bonuses, saved scenarios, four locales and mobile.')
} finally { await browser.close() }
