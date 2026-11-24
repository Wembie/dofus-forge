import { beforeEach, describe, expect, it } from 'vitest'
import type { AppItem, AppEffect } from '../../src/data/loaders.ts'
import { combinedEffects, transformDracorune } from './dracorunes.ts'
import { applyDracorune, useBuildStore, useDracorunes } from './buildStore.ts'

const effect = (stat: string, min: number, max = min): AppEffect => ({ stat, min, max })
const item = (effects: AppEffect[], extra: Partial<AppItem> = {}): AppItem => ({ ankama_id: 1, name: 'Fixture', slot: 'hat', level: 200, type: 'Hat', effects, set_id: null, image_url: null, ...extra })

describe('local beta Dracorunes', () => {
  it('converts characteristics and damage after ordinary and transcendence smithmagic', () => {
    const piece = item([effect('Strength', 60, 80), effect('Earth Damage', 10), effect('Vitality', 300)])
    const result = transformDracorune(piece, { Strength: 10, 'exo:Strength': 20 }, { kind: 'element', from: 'earth', to: 'air' })!
    expect(result).toContainEqual(effect('Agility', 90, 110))
    expect(result).toContainEqual(effect('Air Damage', 10))
    expect(result).toContainEqual(effect('Vitality', 300))
    expect(piece.effects[0]).toEqual(effect('Strength', 60, 80))
  })
  it('rejects missing source, existing target, same element and non-forgeable items', () => {
    const selection = { kind: 'element', from: 'earth', to: 'air' } as const
    expect(transformDracorune(item([effect('Vitality', 200)]), {}, selection)).toBeNull()
    expect(transformDracorune(item([effect('Strength', 80), effect('Air Damage', -10)]), {}, selection)).toBeNull()
    expect(transformDracorune(item([effect('Strength', 80)]), { Agility: 1 }, selection)).toBeNull()
    expect(transformDracorune(item([effect('Strength', 80)]), {}, { ...selection, to: 'earth' })).toBeNull()
    expect(transformDracorune(item([effect('Strength', 80)], { slot: 'dofus' }), {}, selection)).toBeNull()
  })
  it('moves fixed and percentage resistance together, including penalties', () => {
    const piece = item([effect('Earth Resistance', -10), effect('% Earth Resistance', 8), effect('Critical Resistance', 20)])
    const result = transformDracorune(piece, {}, { kind: 'ivory', from: 'earth', to: 'neutral' })!
    expect(result).toEqual([effect('Neutral Resistance', -10), effect('% Neutral Resistance', 8), effect('Critical Resistance', 20)])
  })
  it('preserves weapon attacks and removes outdated stat metadata', () => {
    const piece = item([{ ...effect('Earth damage', 10, 20), effect_id: 194 }, { ...effect('Strength', 80), effect_id: 11, formatted: '80 Strength' }], { slot: 'weapon' })
    const result = transformDracorune(piece, {}, { kind: 'element', from: 'earth', to: 'fire' })!
    expect(result[0]).toEqual(piece.effects[0])
    expect(result[1]).toEqual(effect('Intelligence', 80))
  })
  it('makes the provisional Ebony rounding and neutral/penalty behavior explicit', () => {
    const piece = item([effect('Strength', 81), effect('Chance', 50), effect('Agility', -10), effect('Earth Damage', 13), effect('Air Damage', 9), effect('Neutral Damage', 12), effect('Power', 20)])
    const result = transformDracorune(piece, {}, { kind: 'ebony' })!
    expect(result).toContainEqual(effect('Power', 76))
    expect(result).toContainEqual(effect('Damage', 9))
    expect(result).toContainEqual(effect('Agility', -10))
    expect(result).toContainEqual(effect('Neutral Damage', 12))
    expect(result.some(e => e.stat === 'Chance')).toBe(false)
  })
  it('handles a fixed line whose API maximum is zero', () => {
    expect(combinedEffects(item([effect('Strength', 80, 0)]), { Strength: 10 })).toEqual([effect('Strength', 90, 90)])
  })
})

describe('beta store isolation and totals', () => {
  beforeEach(() => {
    useDracorunes.setState({ applied: {} })
    useBuildStore.getState().reset()
    useBuildStore.getState().setEquipment([item([effect('Strength', 80), effect('Earth Damage', 10)], { slot: 'ring' })])
    useBuildStore.getState().setSetsData([])
    useBuildStore.getState().setClass('iop')
  })
  it('converts each ring independently and counts each rune once', () => {
    const b = useBuildStore.getState()
    b.equipItem('ring1', 1); b.equipItem('ring2', 1); b.setRune('ring1', 'Strength', 10)
    applyDracorune('ring1', { kind: 'element', from: 'earth', to: 'air' })
    const stats = useBuildStore.getState().stats!
    expect(stats.strength).toBe(80)
    expect(stats.agility).toBe(90)
    expect(stats.earthDamage).toBe(10)
    expect(stats.airDamage).toBe(10)
    b.setRune('ring1', 'Agility', 50)
    expect(useBuildStore.getState().runes.ring1).toEqual({ Strength: 10 })
    applyDracorune('ring1', null)
    expect(useBuildStore.getState().stats!.strength).toBe(170)
    expect(useBuildStore.getState().stats!.agility).toBe(0)
  })
  it('moves a conversion with a swapped ring and removes it on unequip', () => {
    const b = useBuildStore.getState(); b.equipItem('ring1', 1)
    applyDracorune('ring1', { kind: 'element', from: 'earth', to: 'air' })
    b.swapSlots('ring1', 'ring2')
    expect(useDracorunes.getState().applied.ring2?.itemId).toBe(1)
    expect(useBuildStore.getState().stats!.agility).toBe(80)
    b.unequipItem('ring2')
    expect(useBuildStore.getState().stats!.agility).toBe(0)
    expect(useDracorunes.getState().applied).toEqual({})
  })
})
