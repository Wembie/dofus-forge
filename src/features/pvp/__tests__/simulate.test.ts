import { describe, it, expect } from 'vitest'
import type { StatBlock } from '@/engine/types.ts'
import type { AppSpellLevel } from '@/data/spellLoaders.ts'
import type { PvpElement, PvpResist } from '@/store/pvpStore.ts'
import { simulateSpellHits } from '../simulate.ts'
import { NO_MODS } from '../../spells/spellDamage.ts'

const NO_RESIST: Record<PvpElement, PvpResist> = {
  earth: { fixed: 0, percent: 0 }, fire: { fixed: 0, percent: 0 }, water: { fixed: 0, percent: 0 },
  air: { fixed: 0, percent: 0 }, neutral: { fixed: 0, percent: 0 },
}

function stats(over: Partial<StatBlock> = {}): StatBlock {
  return {
    strength: 0, intelligence: 0, chance: 0, agility: 0, power: 0,
    damage: 0, bestElemDamage: 0, critDamage: 0,
    earthDamage: 0, fireDamage: 0, waterDamage: 0, airDamage: 0, neutralDamage: 0,
    spellDamagePercent: 0, weaponDamagePercent: 0, meleeDamagePercent: 0, rangedDamagePercent: 0,
    ...over,
  } as StatBlock
}

function level(effects: AppSpellLevel['effects']): AppSpellLevel {
  return { grade: 1, ap: 1, minRange: 0, maxRange: 1, maxPerTurn: 0, critChance: 0, effects }
}

const hits = (id: number, lvl: AppSpellLevel) => simulateSpellHits(id, lvl, stats(), NO_MODS, NO_RESIST)

describe('simulateSpellHits — poison excluded from the one-hit number', () => {
  it('Tyrannical Arrow (Cra, id 32448): the poison tick never joins the instant hit', () => {
    const lvl = level([
      { element: 'fire', min: 28, max: 32, kind: 'damage' },
      { element: 'fire', min: 20, max: 22, kind: 'poison', turns: 2 },
      { element: 'fire', min: 28, max: 32, kind: 'damage' }, // duplicate, as shipped
    ])
    expect(hits(32448, lvl)).toEqual([{ element: null, hit: expect.objectContaining({ min: 28, max: 32 }) }])
  })
})

describe('simulateSpellHits — alternatives never add up', () => {
  it('Devouring Arrow (Cra, id 32446): a cast is the base steal, not steal + discharge', () => {
    const lvl = level([
      { element: 'fire', min: 9, max: 11, kind: 'steal' }, { element: 'fire', min: 19, max: 22, kind: 'steal' },
      { element: 'fire', min: 27, max: 31, kind: 'steal' },
      { element: 'fire', min: 27, max: 31, kind: 'damage' }, { element: 'fire', min: 42, max: 46, kind: 'damage' },
      { element: 'fire', min: 56, max: 60, kind: 'damage' },
    ])
    expect(hits(32446, lvl)[0].hit).toMatchObject({ min: 9, max: 11 })
  })

  it('Topkaj (Ecaflip, id 12846): one card value, not the sum of all three', () => {
    const lvl = level([
      { element: 'fire', min: 7, max: 0, kind: 'damage' }, { element: 'fire', min: 10, max: 0, kind: 'damage' },
      { element: 'fire', min: 13, max: 0, kind: 'damage' },
    ])
    expect(hits(12846, lvl)[0].hit).toMatchObject({ min: 7, max: 7 })
  })

  it('steals from enemies or heals allies: only the steal counts against the target', () => {
    const lvl = level([
      { element: 'air', min: 13, max: 16, kind: 'steal' }, { element: 'air', min: 13, max: 16, kind: 'damage' },
    ])
    expect(hits(1, lvl)).toEqual([{ element: null, hit: expect.objectContaining({ min: 13, max: 16 }) }])
  })

  it('a lone fixed value before the range is another branch (Feca Stab: 100-0, 29-33)', () => {
    const lvl = level([
      { element: 'earth', min: 100, max: 0, kind: 'damage' }, { element: 'earth', min: 29, max: 33, kind: 'damage' },
    ])
    expect(hits(2, lvl)[0].hit).toMatchObject({ min: 29, max: 33 })
  })

  it('a random element per cast gives one variant per element (Perfidious Boomerang)', () => {
    const lvl = level((['earth', 'fire', 'water', 'air'] as const).map(element => ({ element, min: 26, max: 29, kind: 'steal' as const })))
    const variants = hits(3, lvl)
    expect(variants.map(v => v.element)).toEqual(['earth', 'fire', 'water', 'air'])
    expect(variants[0].hit).toMatchObject({ min: 26, max: 29 })
  })

  it('spells that hit every element at once still add up (Xelor Toll, id 13300)', () => {
    const lvl = level((['fire', 'water', 'air', 'earth'] as const).map(element => ({ element, min: 3, max: 3, kind: 'damage' as const })))
    expect(hits(13300, lvl)).toEqual([{ element: null, hit: expect.objectContaining({ min: 12, max: 12 }) }])
  })
})
