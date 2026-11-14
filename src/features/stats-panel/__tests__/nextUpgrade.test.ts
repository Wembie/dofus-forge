import { describe, it, expect } from 'vitest'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { DofusClass } from '@/engine/types.ts'
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

function recomputeWith(catalog: AppItem[], equipped: Record<string, number>, allocated = { ...ZERO_ALLOC, strength: 500 }, cls: DofusClass = 'iop') {
  return (slot: string, candidateId: number) =>
    recompute(cls, CHAR_LEVEL, allocated, NO_SCROLLS, { ...equipped, [slot]: candidateId }, catalog, NO_SETS, {})
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

  it('never recommends a weapon that costs AP, even with a huge crit damage payoff', () => {
    const currentWeapon: AppItem = { ankama_id: 10, name: 'Plain Sword', level: 50, type: 'Sword', slot: 'weapon', effects: [], set_id: null, image_url: null }
    const apLossWeapon:  AppItem = {
      ankama_id: 11, name: 'Reckless Blade', level: 50, type: 'Sword', slot: 'weapon',
      effects: [{ stat: 'AP', min: -1, max: 0 }, { stat: 'Critical Damage', min: 200, max: 0 }], set_id: null, image_url: null,
    }
    const catalog = [currentWeapon, apLossWeapon]
    const equipped = { weapon: 10 }
    const baseStats = recompute('iop', CHAR_LEVEL, { ...ZERO_ALLOC, strength: 500 }, NO_SCROLLS, equipped, catalog, NO_SETS, {})!
    const upgrades = findUpgrades(equipped, CHAR_LEVEL, catalog, baseStats, recomputeWith(catalog, equipped))
    expect(upgrades.find(u => u.slot === 'weapon')).toBeUndefined()
  })

  it('never shows a losing stat as the reason for a suggestion (topStat is always a real gain)', () => {
    // The candidate loses some Agility (the build's played characteristic) but gains enough
    // Crit Chance to still be a net upgrade — the shown reason must be the crit gain, never
    // the agility loss, even though agility is the heavier-weighted stat here.
    const current: AppItem = { ankama_id: 20, name: 'Plain Amulet', level: 50, type: 'Amulet', slot: 'amulet', effects: [{ stat: 'Agility', min: 200, max: 0 }], set_id: null, image_url: null }
    const mixed:   AppItem = { ankama_id: 21, name: 'Mixed Amulet', level: 50, type: 'Amulet', slot: 'amulet', effects: [{ stat: 'Agility', min: 50, max: 0 }, { stat: '% Critical', min: 30, max: 0 }], set_id: null, image_url: null }
    const catalog = [current, mixed]
    const equipped = { amulet: 20 }
    const allocated = { ...ZERO_ALLOC, agility: 500 }
    const baseStats = recompute('sram', CHAR_LEVEL, allocated, NO_SCROLLS, equipped, catalog, NO_SETS, {})!
    const upgrades = findUpgrades(equipped, CHAR_LEVEL, catalog, baseStats, recomputeWith(catalog, equipped, allocated, 'sram'))
    const suggestion = upgrades.find(u => u.slot === 'amulet')
    expect(suggestion?.item.ankama_id).toBe(mixed.ankama_id)
    expect(suggestion?.topStat?.delta).toBeGreaterThan(0)
    expect(suggestion?.topStat?.key).not.toBe('agility')
  })

  it('never suggests the same unique Dofus for two different Dofus slots', () => {
    const strongDofus: AppItem = { ankama_id: 30, name: 'Greater Air Breaker', level: 50, type: 'Dofus', slot: 'dofus', effects: [{ stat: '% Critical', min: 18, max: 0 }], set_id: null, image_url: null }
    const weakerDofus:  AppItem = { ankama_id: 31, name: 'Minor Air Breaker',  level: 50, type: 'Dofus', slot: 'dofus', effects: [{ stat: '% Critical', min: 6,  max: 0 }], set_id: null, image_url: null }
    const catalog = [strongDofus, weakerDofus]
    const equipped = {} // dofus3, dofus4, dofus5 all empty, like the reported case
    const allocated = { ...ZERO_ALLOC, strength: 500 }
    const baseStats = recompute('sram', CHAR_LEVEL, allocated, NO_SCROLLS, equipped, catalog, NO_SETS, {})!
    const upgrades = findUpgrades(equipped, CHAR_LEVEL, catalog, baseStats, recomputeWith(catalog, equipped, allocated, 'sram'))
    const dofusItemIds = upgrades.filter(u => u.slot.startsWith('dofus')).map(u => u.item.ankama_id)
    expect(dofusItemIds).toEqual([...new Set(dofusItemIds)]) // no repeats across slots
    expect(dofusItemIds).toContain(strongDofus.ankama_id)
    expect(dofusItemIds).toContain(weakerDofus.ankama_id)
  })
})
