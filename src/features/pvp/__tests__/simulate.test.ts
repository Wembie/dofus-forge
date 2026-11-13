import { describe, it, expect } from 'vitest'
import type { StatBlock } from '@/engine/types.ts'
import type { AppSpellLevel } from '@/data/spellLoaders.ts'
import type { PvpElement, PvpResist } from '@/store/pvpStore.ts'
import { simulateSpellHit } from '../simulate.ts'
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

describe('simulateSpellHit — poison excluded from the one-hit number', () => {
  it('Tyrannical Arrow (Cra, id 32448): the poison tick never joins the instant hit', () => {
    const lvl = level([
      { element: 'fire', min: 28, max: 32, kind: 'damage' },
      { element: 'fire', min: 20, max: 22, kind: 'poison', turns: 2 },
      { element: 'fire', min: 28, max: 32, kind: 'damage' }, // duplicate, as shipped
    ])
    const hit = simulateSpellHit(lvl, stats(), NO_MODS, NO_RESIST)
    // Only the instant hit (28-32), never 28+20=48 or 32+22=54.
    expect(hit).toMatchObject({ min: 28, max: 32 })
  })
})

describe('simulateSpellHit — mutually exclusive tiers collapse to one, never sum', () => {
  it('Devouring Arrow (Cra, id 32446): one steal tier + one damage tier, not all three of each', () => {
    const lvl = level([
      { element: 'fire', min: 9, max: 11, kind: 'steal' }, { element: 'fire', min: 9, max: 11, kind: 'steal' },
      { element: 'fire', min: 19, max: 22, kind: 'steal' },
      { element: 'fire', min: 27, max: 31, kind: 'steal' }, { element: 'fire', min: 27, max: 31, kind: 'steal' },
      { element: 'fire', min: 27, max: 31, kind: 'damage' }, { element: 'fire', min: 27, max: 31, kind: 'damage' },
      { element: 'fire', min: 42, max: 46, kind: 'damage' }, { element: 'fire', min: 42, max: 46, kind: 'damage' },
      { element: 'fire', min: 56, max: 60, kind: 'damage' }, { element: 'fire', min: 56, max: 60, kind: 'damage' },
      { element: 'fire', min: 56, max: 60, kind: 'damage' },
    ])
    const hit = simulateSpellHit(lvl, stats(), NO_MODS, NO_RESIST)
    // Base tier only: steal 9-11 + damage 27-31 = 36-42 — never the 3-tier sum (267-294).
    expect(hit).toMatchObject({ min: 36, max: 42 })
  })

  it('Topkaj (Ecaflip, id 12846): one card value, not the sum of all three', () => {
    const lvl = level([
      { element: 'fire', min: 7, max: 0, kind: 'damage' }, { element: 'fire', min: 7, max: 0, kind: 'damage' },
      { element: 'fire', min: 10, max: 0, kind: 'damage' }, { element: 'fire', min: 10, max: 0, kind: 'damage' },
      { element: 'fire', min: 13, max: 0, kind: 'damage' }, { element: 'fire', min: 13, max: 0, kind: 'damage' },
    ])
    const hit = simulateSpellHit(lvl, stats(), NO_MODS, NO_RESIST)
    // Base (lowest) card value only — never 7+10+13=30.
    expect(hit).toMatchObject({ min: 7, max: 7 })
  })
})
