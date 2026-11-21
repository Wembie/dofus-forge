// Freezes the game catalog the forge golden tests run against, keeping only
// the fields the Rust engine reads. Frozen on purpose: a game data refresh
// must not move the golden values, only an engine change may.
// Run from the repo root: node rust-optimizer/tests/fixtures/freeze-catalog.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const src = 'public/data/en'
const out = 'rust-optimizer/tests/fixtures/forge-catalog'
const equipment = JSON.parse(readFileSync(`${src}/equipment.json`, 'utf8'))
const sets = JSON.parse(readFileSync(`${src}/sets.json`, 'utf8'))

const items = equipment.map(i => ({
  ankama_id: i.ankama_id,
  name: i.name,
  level: i.level,
  type: i.type,
  slot: i.slot,
  effects: i.effects.map(e => ({ stat: e.stat, min: e.min, max: e.max, ...(e.effect_id == null ? {} : { effect_id: e.effect_id }) })),
  conditions: i.conditions ?? null,
  set_id: i.set_id ?? null,
}))
const frozenSets = sets.map(s => ({ ankama_id: s.ankama_id, items: s.items, bonuses: s.bonuses }))

mkdirSync(out, { recursive: true })
writeFileSync(`${out}/equipment.json`, JSON.stringify(items))
writeFileSync(`${out}/sets.json`, JSON.stringify(frozenSets))
console.log(`froze ${items.length} items and ${frozenSets.length} sets into ${out}`)
