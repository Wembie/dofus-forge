import { describe, it, expect } from 'vitest'
import type { StatBlock } from '@/engine/types.ts'
import type { AppSpellEffect } from '@/data/spellLoaders.ts'
import { calcDamage, calcEffects, damageBreakdown, NO_MODS } from '../spellDamage.ts'
import { spellMods, weaponMods } from '../spellCalc.ts'
import { computeStats } from '@/engine/stats.ts'

function stats(over: Partial<StatBlock> = {}): StatBlock {
  return {
    strength: 0, intelligence: 0, chance: 0, agility: 0, power: 0,
    damage: 0, bestElemDamage: 0, critDamage: 0,
    earthDamage: 0, fireDamage: 0, waterDamage: 0, airDamage: 0, neutralDamage: 0,
    spellDamagePercent: 0, weaponDamagePercent: 0, meleeDamagePercent: 0, rangedDamagePercent: 0,
    ...over,
  } as StatBlock
}

describe('calcDamage — Dofus formula', () => {
  it('base hit: floor(roll × (100 + characteristic + power) / 100) + fixed damage', () => {
    // Critical Flamiche: 777 Intelligence + 100 Power, roll 12,
    // fixed 9 Damage + 78 Fire Damage + 41 Critical Damage → 117 + 128 = 245.
    // (computeStats folds the 9 generic Damage into fireDamage: 87.)
    const s = stats({ intelligence: 777, power: 100, damage: 9, fireDamage: 87 })
    expect(calcDamage(12, 'fire', s, NO_MODS, 41)).toBe(245)
  })

  it('% bonuses multiply the whole hit, fixed and critical damage included', () => {
    // 35 × 11 = 385, + 104 Fire Damage + 174 Critical Damage = 663, × 1.10 ranged = 729.
    const s = stats({ intelligence: 820, power: 180, fireDamage: 104 })
    expect(calcDamage(35, 'fire', s, { kindPct: 0, rangePct: 10 }, 174)).toBe(729)
  })

  it('spell % and ranged % are separate multipliers (10% + 10% = ×1.21, not ×1.20)', () => {
    const s = stats()
    expect(calcDamage(1000, 'earth', s, { kindPct: 10, rangePct: 10 })).toBe(1210)
  })

  it('+1% Spell Damage adds about 1% of the hit, not 1% of the base roll', () => {
    const s = stats({ strength: 900, damage: 60, earthDamage: 100 })
    const before = calcDamage(50, 'earth', s, { kindPct: 0, rangePct: 0 })
    const after  = calcDamage(50, 'earth', s, { kindPct: 1, rangePct: 0 })
    expect(before).toBe(600)
    expect(after).toBe(606)
  })

  it('weapon mastery adds power, not a % multiplier', () => {
    const s = stats({ strength: 100 })
    expect(calcDamage(10, 'earth', s, { kindPct: 0, rangePct: 0, power: 300 })).toBe(50)
  })

  it('neutral scales with Strength; a zero roll deals nothing', () => {
    expect(calcDamage(10, 'neutral', stats({ strength: 100, neutralDamage: 5 }))).toBe(25)
    expect(calcDamage(0, 'fire', stats({ intelligence: 500, fireDamage: 50 }))).toBe(0)
  })

  it('negative % never turns a hit into healing', () => {
    expect(calcDamage(100, 'air', stats(), { kindPct: -150, rangePct: 0 })).toBe(0)
    expect(calcDamage(100, 'air', stats(), { kindPct: -20, rangePct: 0 })).toBe(80)
  })
})

describe('calcEffects', () => {
  const fx = (over: Partial<AppSpellEffect>): AppSpellEffect => ({ kind: 'damage', element: 'water', min: 20, max: 30, ...over } as AppSpellEffect)

  it('critical damage goes in before the % multipliers', () => {
    const s = stats({ chance: 100, critDamage: 10 })
    const [e] = calcEffects([fx({})], s, { kindPct: 50, rangePct: 0 }, s.critDamage)
    expect([e.calcMin, e.calcMax]).toEqual([(40 + 10) * 1.5, (60 + 10) * 1.5])
  })

  it('a fixed value (max 0) uses min for both ends; non-damage effects stay raw', () => {
    const [dmg, other] = calcEffects([fx({ min: 20, max: 0 }), fx({ kind: 'ap' as AppSpellEffect['kind'], min: 2, max: 0 })], stats({ chance: 100 }))
    expect([dmg.calcMin, dmg.calcMax]).toEqual([40, 40])
    expect([other.calcMin, other.calcMax]).toEqual([2, 0])
  })
})

describe('spellMods / weaponMods', () => {
  const s = stats({ spellDamagePercent: 12, weaponDamagePercent: 30, meleeDamagePercent: 7, rangedDamagePercent: 9 })

  it('spells use % Spell Damage, weapons % Weapon Damage (never the other one)', () => {
    expect(spellMods(s, 1, 6).kindPct).toBe(12)
    expect(weaponMods(s, 1, 1).kindPct).toBe(30)
  })

  it('range 1 is melee, longer ranges are ranged', () => {
    expect(spellMods(s, 1, 1).rangePct).toBe(7)
    expect(spellMods(s, 1, 6).rangePct).toBe(9)
    expect(weaponMods(s, 1, 1).rangePct).toBe(7)
    expect(weaponMods(s, 2, 8).rangePct).toBe(9)
  })
})

describe('damageBreakdown', () => {
  it('lists the steps of the formula', () => {
    const s = stats({ intelligence: 820, power: 180, fireDamage: 104 })
    expect(damageBreakdown(35, 'fire', s, { kindPct: 0, rangePct: 10 }, 174)).toEqual({
      roll: 35, characteristic: 820, power: 180, extraPower: 0,
      scaled: 385, fixed: 104, critDamage: 174, beforePct: 663, afterRange: 729, afterKind: 729, finalPct: 0, total: 729,
    })
  })

  it('always ends on the same value calcDamage shows', () => {
    const elems = ['earth', 'fire', 'water', 'air', 'neutral'] as const
    for (let i = 0; i < 500; i++) {
      const s = stats({
        strength: (i * 37) % 1200, intelligence: (i * 53) % 1200, chance: (i * 71) % 1200, agility: (i * 89) % 1200,
        power: (i * 13) % 400, damage: (i * 7) % 150 - 20, fireDamage: (i * 11) % 120,
      })
      const mods = { kindPct: (i * 3) % 60 - 10, rangePct: (i * 5) % 50 - 10, power: i % 4 === 0 ? 300 : 0 }
      const elem = elems[i % elems.length]
      const base = (i * 17) % 90
      const crit = i % 3 === 0 ? (i * 19) % 200 : 0
      expect(damageBreakdown(base, elem, s, mods, crit).total).toBe(calcDamage(base, elem, s, mods, crit))
    }
  })
})

describe('generic Damage from gear', () => {
  it('counts once (computeStats already adds it to every element)', () => {
    const s = computeStats({
      class: 'iop', level: 200, sets: [],
      allocated: { vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0 },
      scrolled: { vitality: false, wisdom: false, strength: false, intelligence: false, chance: false, agility: false },
      items: [{ ankama_id: 1, set_id: null, slot: 'hat', effects: [{ stat: 'Damage', min: 10, max: 10 }] }],
    })
    expect(calcDamage(10, 'earth', s)).toBe(20)
    expect(calcDamage(10, 'fire', s)).toBe(20)
  })
})

describe('% final damage (combat passives)', () => {
  it('multiplies the whole hit last, after the % categories', () => {
    // 663 × 1.10 ranged × 1.10 final = 802.23 → 802.
    const s = stats({ intelligence: 820, power: 180, fireDamage: 104, finalDamagePercent: 10 })
    expect(calcDamage(35, 'fire', s, { kindPct: 0, rangePct: 10 }, 174)).toBe(802)
    const b = damageBreakdown(35, 'fire', s, { kindPct: 0, rangePct: 10 }, 174)
    expect([b.afterRange, b.afterKind, b.finalPct, b.total]).toEqual([729, 729, 10, 802])
  })

  it('a negative final damage (Pryssure) lowers the hit, never below 0', () => {
    expect(calcDamage(100, 'earth', stats({ finalDamagePercent: -50 }))).toBe(50)
    expect(calcDamage(100, 'earth', stats({ finalDamagePercent: -150 }))).toBe(0)
  })
})
