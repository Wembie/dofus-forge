import { describe, it, expect } from 'vitest'
import type { AppItem } from '@/data/loaders.ts'
import type { StatBlock } from '@/engine/types.ts'
import { bestElement, weaponAttackEffects, weaponDamageRows } from '../weaponRows.ts'
import { calcDamage, NO_MODS } from '../spellDamage.ts'
import { simulateWeaponHit } from '../../pvp/simulate.ts'

function stats(over: Partial<StatBlock> = {}): StatBlock {
  return {
    strength: 0, intelligence: 0, chance: 0, agility: 0, power: 0,
    damage: 0, bestElemDamage: 0, critDamage: 0,
    earthDamage: 0, fireDamage: 0, waterDamage: 0, airDamage: 0, neutralDamage: 0,
    weaponDamagePercent: 0, meleeDamagePercent: 0, rangedDamagePercent: 0,
    ...over,
  } as StatBlock
}

function weapon(over: Partial<AppItem>): AppItem {
  return { name: 'w', effects: [], ...over } as AppItem
}

const KAISER = weapon({
  name: 'Kaiser', ap_cost: 4, crit_chance: 30, crit_bonus: 6,
  effects: [
    { stat: 'Damage',         min: 4, max: 6,  effect_id: 30 },
    { stat: 'Neutral damage', min: 9, max: 11, effect_id: 195 },
    { stat: 'Water damage',   min: 9, max: 11, effect_id: 214 },
    { stat: 'Air damage',     min: 9, max: 11, effect_id: 189 },
    { stat: 'AP',             min: -1, max: 0, effect_id: 179 },
  ],
})

const CROCOBUR = weapon({
  name: 'Crocobur', ap_cost: 6, crit_chance: 30, crit_bonus: 14,
  effects: [{ stat: 'best-element damage', min: 41, max: 60, effect_id: 248 }],
})

const HALBAXE = weapon({
  name: 'Halbaxe', crit_chance: 25, crit_bonus: 5,
  effects: [
    { stat: 'best-element damage', min: 37, max: 43, effect_id: 248 },
    { stat: 'Steals MP',           min: 2,  max: 0,  effect_id: 233 },
    { stat: 'best-element steal',  min: 10, max: 13, effect_id: 257 },
    { stat: 'Fire heals',          min: 8,  max: 12, effect_id: 261 },
  ],
})

// Only carries "Neutral steal" (effect_id 223), no plain "Neutral damage"
// line at all — the real shape that exposed the transform bug (Pandamonium
// Wand and 37 other weapons in the live dataset are built this way).
const STEAL_ONLY_WEAPON = weapon({
  name: 'Steal-only wand', ap_cost: 3, crit_chance: 10, crit_bonus: 0,
  effects: [
    { stat: 'Neutral steal', min: 18, max: 21, effect_id: 223 },
    { stat: 'Vitality',      min: 100, max: 150, effect_id: 9 },
  ],
})

const allFinite = (rows: ReturnType<typeof weaponDamageRows>) =>
  rows.every(r => [r.low, r.high, r.critLow, r.critHigh].every(Number.isFinite))

describe('weaponDamageRows', () => {
  it('Kaiser: one row per element line, no AP-cost row, no NaN', () => {
    const rows = weaponDamageRows(weaponAttackEffects(KAISER, null), stats({ strength: 100 }), 6, NO_MODS, NO_MODS)
    expect(rows.map(r => r.elem)).toEqual(['neutral', 'water', 'air'])
    expect(allFinite(rows)).toBe(true)
    expect(rows[0].critHigh).toBe(calcDamage(11 + 6, 'neutral', stats({ strength: 100 })))
  })

  it('Crocobur: best-element resolves to the highest characteristic', () => {
    const s = stats({ intelligence: 300, strength: 100 })
    const rows = weaponDamageRows(weaponAttackEffects(CROCOBUR, null), s, 14, NO_MODS, NO_MODS)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ elem: 'fire', best: true, steal: false })
    expect(rows[0].low).toBe(calcDamage(41, 'fire', s))
    expect(rows[0].critHigh).toBe(calcDamage(60 + 14, 'fire', s))
  })

  it('skips Steals MP / heals, keeps best-element steal as a steal row', () => {
    const rows = weaponDamageRows(weaponAttackEffects(HALBAXE, null), stats({ agility: 50 }), 5, NO_MODS, NO_MODS)
    expect(rows.map(r => [r.elem, r.steal])).toEqual([['air', false], ['air', true]])
    expect(allFinite(rows)).toBe(true)
  })

  it('without stats, best-element rows show base values with no element', () => {
    const rows = weaponDamageRows(weaponAttackEffects(CROCOBUR, null), null, 14, NO_MODS, NO_MODS)
    expect(rows).toEqual([{ elem: null, best: true, steal: false, baseLow: 41, baseHigh: 60, low: 41, high: 60, critLow: 41, critHigh: 60 }])
  })

  it('% Weapon Damage and % Melee multiply the hit, critical damage included', () => {
    // Crocobur fire line 41–60, crit +14; 100 Intelligence, 10 Damage, 20 Critical Damage,
    // 20% Weapon Damage and 10% Melee → (82 + 10) × 1.1 × 1.2 = 121, crit (148 + 30) × 1.32 = 234.
    const s = stats({ intelligence: 100, damage: 10, fireDamage: 10, critDamage: 20 })
    const mods = { kindPct: 20, rangePct: 10 }
    const [row] = weaponDamageRows(weaponAttackEffects(CROCOBUR, null), s, 14, mods, mods)
    expect(row.low).toBe(121)
    expect(row.critHigh).toBe(Math.floor((148 + 30) * 1.32))
  })

  it('bestElement breaks ties in earth → fire → water → air order', () => {
    expect(bestElement(stats())).toBe('earth')
    expect(bestElement(stats({ chance: 10, agility: 10 }))).toBe('water')
  })
})

describe('weaponAttackEffects elemental transform', () => {
  it('transforms a plain "Neutral damage" line into "{Element} damage"', () => {
    const fx = weaponAttackEffects(KAISER, { element: 'fire', ratio: 85 })
    const neutral = fx.find(e => e.stat === 'Fire damage')
    expect(neutral).toBeDefined()
    expect(neutral).toMatchObject({ min: Math.floor(9 * 0.85), max: Math.floor(11 * 0.85) })
    // the other weapon lines (Damage, Water damage, Air damage, AP) stay untouched
    expect(fx.find(e => e.stat === 'Neutral damage')).toBeUndefined()
    expect(fx.find(e => e.stat === 'Water damage')).toMatchObject({ min: 9, max: 11 })
  })

  it('transforms a steal-only weapon (Neutral steal, no plain Neutral damage line) — regression for Pandamonium Wand', () => {
    expect(STEAL_ONLY_WEAPON.effects.some(e => e.stat === 'Neutral damage')).toBe(false)

    const fx = weaponAttackEffects(STEAL_ONLY_WEAPON, { element: 'water', ratio: 68 })
    // must still produce a transformed attack line, not silently no-op
    expect(fx.find(e => e.stat === 'Neutral steal')).toBeUndefined()
    const transformed = fx.find(e => e.stat === 'Water steal')
    expect(transformed).toBeDefined()
    expect(transformed).toMatchObject({ min: Math.floor(18 * 0.68), max: Math.floor(21 * 0.68) })
  })

  it('no transform selected leaves attack lines untouched, Neutral steal included', () => {
    const fx = weaponAttackEffects(STEAL_ONLY_WEAPON, null)
    expect(fx.find(e => e.stat === 'Neutral steal')).toMatchObject({ min: 18, max: 21 })
  })
})

describe('simulateWeaponHit', () => {
  const noResist = { earth: { fixed: 0, percent: 0 }, fire: { fixed: 0, percent: 0 }, water: { fixed: 0, percent: 0 }, air: { fixed: 0, percent: 0 }, neutral: { fixed: 0, percent: 0 } }

  it('counts best-element damage', () => {
    const s = stats({ chance: 200 })
    const hit = simulateWeaponHit(CROCOBUR, s, noResist, null)
    expect(hit.min).toBe(calcDamage(41, 'water', s))
    expect(hit.max).toBe(calcDamage(60, 'water', s))
  })

  it('Kaiser: totals stay finite (AP cost ignored)', () => {
    const hit = simulateWeaponHit(KAISER, stats({ strength: 100 }), noResist, null)
    expect([hit.min, hit.max, hit.critMin, hit.critMax].every(Number.isFinite)).toBe(true)
  })
})
