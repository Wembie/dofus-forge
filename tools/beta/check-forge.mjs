import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
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
  assert.deepEqual(errors, [])
  console.log('Beta WASM forge passed: pinned canonical item, automatic Dracorune, pre-conversion smithmagic and loading reproduce the reported totals.')
} finally { await browser.close() }
