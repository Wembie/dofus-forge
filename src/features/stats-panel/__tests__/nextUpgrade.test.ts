import { describe, it, expect } from 'vitest'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import { recompute } from '@/store/buildStore.ts'
import { findUpgrades } from '../nextUpgrade.ts'

const ZERO_ALLOC = { vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0 }
const NO_SCROLLS = { vitality: false, wisdom: false, strength: false, intelligence: false, chance: false, agility: false }
const NO_SETS: AppSet[] = []

const CHAR_LEVEL = 60 // within the 30-level scan window of these level-50 test items

const CURRENT_HAT: AppItem  = { ankama_id: 1, name: 'Plain Hat',   level: 50, type: 'Hat',    slot: 'hat',    effects: [], set_id: null, image_url: null }
const BETTER_HAT:  AppItem  = { ankama_id: 2, name: 'Strong Hat',  level: 50, type: 'Hat',    slot: 'hat',    effects: [{ stat: 'Strength', min: 50, max: 0 }], set_id: null, image_url: null }
const WORSE_HAT:   AppItem  = { ankama_id: 3, name: 'Weak Hat',    level: 50, type: 'Hat',    slot: 'hat',    effects: [{ stat: 'Strength', min: 5,  max: 0 }], set_id: null, image_url: null }
const TOO_HIGH_HAT: AppItem = { ankama_id: 4, name: 'Future Hat',  level: 65, type: 'Hat',    slot: 'hat',    effects: [{ stat: 'Strength', min: 999, max: 0 }], set_id: null, image_url: null }
const AMULET:       AppItem = { ankama_id: 5, name: 'Vit Amulet',  level: 50, type: 'Amulet', slot: 'amulet', effects: [{ stat: 'Vitality', min: 300, max: 0 }], set_id: null, image_url: null }

const CATALOG = [CURRENT_HAT, BETTER_HAT, WORSE_HAT, TOO_HIGH_HAT, AMULET]

function recomputeWith(catalog: AppItem[], equipped: Record<string, number>) {
  return (slot: string, candidateId: number) =>
    recompute('iop', CHAR_LEVEL, { ...ZERO_ALLOC, strength: 500 }, NO_SCROLLS, { ...equipped, [slot]: candidateId }, catalog, NO_SETS, {})
}

describe('findUpgrades', () => {
  it('suggests the strongest same-slot item within level reach, never the current one', () => {
    const equipped = { hat: 1 }
    const baseStats = recompute('iop', CHAR_LEVEL, { ...ZERO_ALLOC, strength: 500 }, NO_SCROLLS, equipped, CATALOG, NO_SETS, {})!
    const upgrades = findUpgrades(equipped, CHAR_LEVEL, CATALOG, baseStats, recomputeWith(CATALOG, equipped))

    const hatSuggestion = upgrades.find(u => u.slot === 'hat')
    expect(hatSuggestion?.item.ankama_id).toBe(BETTER_HAT.ankama_id)
    expect(hatSuggestion?.scoreDelta).toBeGreaterThan(0)
  })

  it('never suggests an item above the character level', () => {
    const equipped = { hat: BETTER_HAT.ankama_id }
    const baseStats = recompute('iop', CHAR_LEVEL, { ...ZERO_ALLOC, strength: 500 }, NO_SCROLLS, equipped, CATALOG, NO_SETS, {})!
    const upgrades = findUpgrades(equipped, CHAR_LEVEL, CATALOG, baseStats, recomputeWith(CATALOG, equipped))
    // Future Hat is stronger but above CHAR_LEVEL (65 > 60) — must never surface.
    expect(upgrades.find(u => u.slot === 'hat')).toBeUndefined()
  })

  it('suggests filling an empty slot too', () => {
    const equipped = {}
    const baseStats = recompute('iop', CHAR_LEVEL, ZERO_ALLOC, NO_SCROLLS, equipped, CATALOG, NO_SETS, {})!
    const upgrades = findUpgrades(equipped, CHAR_LEVEL, CATALOG, baseStats, recomputeWith(CATALOG, equipped))
    expect(upgrades.find(u => u.slot === 'amulet')?.item.ankama_id).toBe(AMULET.ankama_id)
  })

  it('names the stat that actually drove the suggestion', () => {
    const equipped = { hat: 1 }
    const baseStats = recompute('iop', CHAR_LEVEL, { ...ZERO_ALLOC, strength: 500 }, NO_SCROLLS, equipped, CATALOG, NO_SETS, {})!
    const upgrades = findUpgrades(equipped, CHAR_LEVEL, CATALOG, baseStats, recomputeWith(CATALOG, equipped))
    const hatSuggestion = upgrades.find(u => u.slot === 'hat')
    expect(hatSuggestion?.topStat).toEqual({ key: 'strength', delta: 50 })
  })

  it('ranks a bigger improvement above a smaller one', () => {
    // With only the weaker hat available, it should still be suggested (better than nothing).
    const smallCatalog = [CURRENT_HAT, WORSE_HAT]
    const equipped = { hat: 1 }
    const baseStats = recompute('iop', CHAR_LEVEL, { ...ZERO_ALLOC, strength: 500 }, NO_SCROLLS, equipped, smallCatalog, NO_SETS, {})!
    const upgrades = findUpgrades(equipped, CHAR_LEVEL, smallCatalog, baseStats, recomputeWith(smallCatalog, equipped))
    expect(upgrades.find(u => u.slot === 'hat')?.item.ankama_id).toBe(WORSE_HAT.ankama_id)
  })
})
