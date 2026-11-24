import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const errors = []
  const modules = []
  page.on('pageerror', e => errors.push(String(e)))
  page.on('request', request => modules.push(new URL(request.url()).pathname))
  await page.goto('http://127.0.0.1:5188/beta')
  await page.locator('.beta-class select').waitFor()
  const result = await page.evaluate(async () => {
    const { createForgeWorker } = await import('/tools/beta/forgeRuntime.tsx')
    const { useBuildStore } = await import('/tools/beta/buildStore.ts')
    const { ALL_SLOTS } = await import('/src/store/buildStore.ts')
    const items = [{ ankama_id: 100, name: 'Source', level: 1, type: 'Hat', slot: 'hat', set_id: null, effects: [{ stat: 'Strength', min: 20, max: 20 }], image_url: null }, { ankama_id: 101, name: 'Native', level: 1, type: 'Hat', slot: 'hat', set_id: null, effects: [{ stat: 'Agility', min: 10, max: 10 }], image_url: null }]
    const config = { stats: [{ stat: 'agility', goal: 1, weight: 1, max: null, absolute: false }], exo: { ap: false, mp: false, range: false, onlyOnRing: false, maxCount: 0 }, maxLevel: 200, lockedSlots: ALL_SLOTS.filter(s => s !== 'hat'), assumeFullyScrolled: false, bannedItems: [], bannedTypes: [], requiredItems: [100], passiveEffects: [], transcendence: true, proExoMax: 0, proExoLines: [], proExoCaps: {}, proExoWeight: 30, islands: 1 }
    const zero = { vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0 }
    const base = { selectedClass: 'iop', level: 1, allocated: zero, scrolled: Object.fromEntries(Object.keys(zero).map(k => [k, false])), equipped: {}, runes: {} }
    const worker = createForgeWorker()
    const report = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { worker.terminate(); reject(new Error('Beta forge timed out')) }, 30000)
      worker.onerror = e => { clearTimeout(timer); reject(new Error(e.message)) }
      worker.onmessage = e => {
        if (e.data.type === 'ready') worker.postMessage({ type: 'run' })
        else if (e.data.type === 'error') { clearTimeout(timer); reject(new Error(e.data.message)) }
        else if (e.data.type === 'report') { clearTimeout(timer); resolve(e.data.report) }
      }
      worker.postMessage({ type: 'init', config, items, sets: [], base, seed: 7 })
    })
    worker.terminate()
    const best = report.results[0]
    const store = useBuildStore.getState()
    store.reset(); store.setEquipment(items); store.setSetsData([]); store.setClass('iop'); store.setLevel(1)
    store.applyForgeResult(best, new Set(config.lockedSlots))
    return { best, loaded: useBuildStore.getState().stats }
  })
  assert.equal(result.best.equipped.hat, 100)
  assert.equal(result.best.stats.agility, 40)
  assert.equal(result.best.dracorunes.hat.rune.to, 'air')
  assert.deepEqual(result.best.runes.hat, { stat: 'Strength', value: 20 })
  assert.equal(result.loaded.agility, result.best.stats.agility)
  const caps = await page.evaluate(async () => {
    const { useBuildStore } = await import('/tools/beta/buildStore.ts')
    const { useDataStore } = await import('/src/store/dataStore.ts')
    const store = useBuildStore.getState()
    store.reset(); store.setClass('iop'); store.setLevel(100)
    store.setEquipment(useDataStore.getState().equipment)
    store.equipItem('amulet', 34725)
    return useBuildStore.getState().stats
  })
  assert.equal(caps.ap, 7)
  assert.equal(caps.apRaw, 8)
  assert.equal(caps.betaCaps.ap, 7)
  await page.locator('.beta-stats .beta-notice').getByText(/7/).waitFor()
  const source = await page.evaluate(async () => {
    const { ITEM_PASSIVES, passiveBonus, withPassives } = await import('/tools/beta/passives.ts')
    const { useBuildStore } = await import('/tools/beta/buildStore.ts')
    const control = ITEM_PASSIVES.get(34577)?.[0]
    if (!control) throw new Error('Missing Source Dofus passive')
    const active = passiveBonus([34577], { [control.id]: 1 })
    const inactive = passiveBonus([34577], {})
    const unequipped = passiveBonus([], { [control.id]: 1 })
    const base = useBuildStore.getState().stats
    const stats = withPassives(base, active)
    return { active, inactive, unequipped, resistance: stats.earthResPercent, baseResistance: base.earthResPercentRaw }
  })
  assert.deepEqual(source.inactive, {})
  assert.deepEqual(source.unequipped, {})
  assert.deepEqual(source.active, { neutralResPercent: 30, earthResPercent: 30, fireResPercent: 30, waterResPercent: 30, airResPercent: 30 })
  assert.equal(source.resistance, Math.min(50, source.baseResistance + 30))
  await page.locator('.beta-actions > button').nth(5).click()
  await page.locator('.fg-dialog').waitFor()
  assert.ok(modules.includes('/tools/beta/forge/OptimizerModal.tsx'))
  assert.ok(modules.includes('/tools/beta/forge/useForge.ts'))
  assert.ok(!modules.includes('/src/features/optimizer/useForge.ts'))
  assert.deepEqual(errors, [])
  console.log('Beta WASM forge passed: pinned canonical item, automatic Dracorune, pre-conversion smithmagic, matching loaded totals, actual equipment caps and optional Source Dofus resistances.')
} finally { await browser.close() }
