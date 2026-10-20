import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { computeStats } from '../stats.ts'
import { WEAPON_ATTACK_IDS } from '../statMap.ts'
import type { AllocatedCharacteristics, ScrolledCharacteristics } from '../types.ts'
import type { AppItem, AppSet } from '../../data/loaders.ts'

const DATA = join(__dirname, '..', '..', '..', 'public', 'data', 'en')
const items = JSON.parse(readFileSync(join(DATA, 'equipment.json'), 'utf8')) as AppItem[]
const sets  = JSON.parse(readFileSync(join(DATA, 'sets.json'), 'utf8')) as AppSet[]

const ZERO = { vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0 } as AllocatedCharacteristics
const NONE = { vitality: false, wisdom: false, strength: false, intelligence: false, chance: false, agility: false } as ScrolledCharacteristics

const statsOf = (equipped: AppItem[]) => computeStats({
  class: 'iop', level: 200, allocated: ZERO, scrolled: NONE, sets,
  items: equipped.map(it => ({ ankama_id: it.ankama_id, effects: it.effects, set_id: it.set_id, slot: it.slot })),
})

describe('real item data through the engine', () => {
  it('spell-modifier lines (": + cast per turn", ": + cast per target") never land in unknownStats', () => {
    const withModifiers = items.filter(it => it.effects.some(e => e.stat.startsWith(': + cast')))
    expect(withModifiers.length).toBeGreaterThan(10)
    for (const it of withModifiers) {
      const unknown = Object.keys(statsOf([it]).unknownStats).filter(k => k.startsWith(':'))
      expect(unknown, it.name).toEqual([])
    }
  })

  it('every weapon-only heal line (effect 278) is treated as an attack line', () => {
    const heals = items.flatMap(it => it.effects.filter(e => e.effect_id === 278).map(() => it.slot))
    expect(heals.length).toBeGreaterThan(0)
    expect(new Set(heals)).toEqual(new Set(['weapon']))
    expect(WEAPON_ATTACK_IDS.has(278)).toBe(true)
  })
})

describe('set bonuses count distinct pieces', () => {
  const ringSet: AppSet = { ankama_id: 99, name: 'Test set', items: [1, 2], bonuses: { 2: [{ stat: 'Vitality', min: 100, max: 100 }] } }
  const ring = (id: number): AppItem => ({ ankama_id: id, name: `Ring ${id}`, level: 1, type: 'Ring', slot: 'ring', effects: [], set_id: 99, image_url: null })
  const run = (equipped: AppItem[]) => computeStats({
    class: 'iop', level: 200, allocated: ZERO, scrolled: NONE, sets: [ringSet],
    items: equipped.map(it => ({ ankama_id: it.ankama_id, effects: it.effects, set_id: it.set_id, slot: it.slot })),
  })

  it('the same set ring worn twice does not reach the 2-piece tier', () => {
    expect(run([ring(1), ring(1)]).vitality).toBe(0)
  })

  it('two different pieces do', () => {
    expect(run([ring(1), ring(2)]).vitality).toBe(100)
  })
})
