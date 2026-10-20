import { describe, it, expect } from 'vitest'
import type { AppItem } from '@/data/loaders.ts'
import { matchesStatFilter, changeLevelRange, levelCap, catalogBlock, NO_LEVEL_CAP } from '../catalogFilters.ts'

const item = (over: Partial<AppItem>) => ({ ankama_id: 1, name: 'x', slot: 'hat', type: 'Hat', level: 100, effects: [], ...over }) as AppItem

describe('matchesStatFilter', () => {
  const attackOnly = item({ slot: 'weapon', effects: [{ stat: 'Neutral damage', min: 9, max: 11, effect_id: 195 }] })
  const bonus      = item({ slot: 'weapon', effects: [{ stat: 'Neutral Damage', min: 5, max: 8, effect_id: 95 }] })

  it('ignores weapon attack lines that share a stat with a real bonus', () => {
    expect(matchesStatFilter(attackOnly, ['Neutral Damage'])).toBe(false)
    expect(matchesStatFilter(bonus, ['Neutral Damage'])).toBe(true)
  })

  it('still rejects maluses and accepts an empty filter', () => {
    expect(matchesStatFilter(item({ effects: [{ stat: 'Range', min: -1, max: 0, effect_id: 116 }] }), ['Range'])).toBe(false)
    expect(matchesStatFilter(attackOnly, [])).toBe(true)
  })
})

describe('level range', () => {
  it('"—" max means no cap instead of level <= 0', () => {
    expect(levelCap(NO_LEVEL_CAP)).toBe(Infinity)
    expect(levelCap(120)).toBe(120)
  })

  it('raising min above max pulls max up; lowering max under min pulls min down', () => {
    expect(changeLevelRange({ min: 0, max: 100 }, 'min', 160)).toEqual({ min: 160, max: 160 })
    expect(changeLevelRange({ min: 160, max: 200 }, 'max', 60)).toEqual({ min: 60, max: 60 })
    expect(changeLevelRange({ min: 160, max: 200 }, 'max', NO_LEVEL_CAP)).toEqual({ min: 160, max: NO_LEVEL_CAP })
    expect(changeLevelRange({ min: 0, max: NO_LEVEL_CAP }, 'min', 180)).toEqual({ min: 180, max: NO_LEVEL_CAP })
  })
})

describe('catalogBlock', () => {
  const setRing  = item({ ankama_id: 10, slot: 'ring', set_id: 5 })
  const plainRing = item({ ankama_id: 11, slot: 'ring' })
  const prysA = item({ ankama_id: 20, slot: 'dofus', type: 'Prysmaradite' })
  const prysB = item({ ankama_id: 21, slot: 'dofus', type: 'Prysmaradite' })
  const dofus = item({ ankama_id: 30, slot: 'dofus', type: 'Dofus' })
  const byId  = new Map([setRing, plainRing, prysA, prysB, dofus].map(i => [i.ankama_id, i]))

  it('blocks a set ring already worn in the other ring slot', () => {
    expect(catalogBlock(setRing, 'ring2', { ring1: 10 }, byId)).toEqual({ kind: 'ring', slot: 'ring1' })
    expect(catalogBlock(setRing, 'ring1', { ring1: 10 }, byId)).toBeNull()
    expect(catalogBlock(plainRing, 'ring2', { ring1: 11 }, byId)).toBeNull()
  })

  it('blocks a second Prysmaradite, but not swapping the one in this slot', () => {
    expect(catalogBlock(prysB, 'dofus2', { dofus1: 20 }, byId)).toEqual({ kind: 'prysma', slot: 'dofus1' })
    expect(catalogBlock(prysB, 'dofus1', { dofus1: 20 }, byId)).toBeNull()
    expect(catalogBlock(dofus, 'dofus2', { dofus1: 20 }, byId)).toBeNull()
  })

  it('keeps the existing "same Dofus already equipped" rule', () => {
    expect(catalogBlock(dofus, 'dofus2', { dofus4: 30 }, byId)).toEqual({ kind: 'dofus', slot: 'dofus4' })
  })
})
