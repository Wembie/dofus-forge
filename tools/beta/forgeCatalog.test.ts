import { describe, expect, it } from 'vitest'
import type { AppItem } from '../../src/data/loaders.ts'
import type { BuildResult, OptimizerBuildBase } from '../../src/features/optimizer/types.ts'
import type { toWireConfig } from '../../src/features/optimizer/forgeConfig.ts'
import { prepareBetaCatalog, normalizeBetaResult } from './forgeCatalog.ts'
import { useBuildStore, useDracorunes } from './buildStore.ts'

const piece: AppItem = { ankama_id: 100, name: 'Fixture', slot: 'hat', type: 'Hat', level: 1, effects: [{ stat: 'Strength', min: 20, max: 20 }], set_id: null, image_url: null }
const config = (stats = [{ stat: 'agility', goal: 1, weight: 10, max: null, absolute: false }]): ReturnType<typeof toWireConfig> => ({ stats, exo: { ap: false, mp: false, range: false, onlyOnRing: false, maxCount: 0 }, maxLevel: 200, lockedSlots: [], assumeFullyScrolled: false, bannedItems: [], bannedTypes: [], requiredItems: [], passiveEffects: [], transcendence: true, proExoMax: 0, proExoWeight: 30, proExoLines: [], proExoCaps: {}, islands: 1 })
const base: OptimizerBuildBase = { selectedClass: 'iop', level: 1, allocated: { vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0 }, scrolled: { vitality: false, wisdom: false, strength: false, intelligence: false, chance: false, agility: false }, equipped: {}, runes: {} }
const report = (equipped: BuildResult['equipped'], runes: BuildResult['runes'] = {}): BuildResult => ({ equipped, runes, allocated: base.allocated, scrolled: base.scrolled, exo: {}, stats: {} as BuildResult['stats'], score: 0, meetsRequired: true, conditionsOk: true, requirementsMet: 1, requirementsTotal: 1 })

describe('beta forge conversion boundary', () => {
  it('searches a converted candidate and translates its rune back to smithmagic before conversion', () => {
    const prepared = prepareBetaCatalog(config(), [piece], [], base, {}, ['air'])
    const candidate = prepared.items.find(it => it.identity_id === 100)!
    expect(candidate.effects).toContainEqual({ stat: 'Agility', min: 20, max: 20 })
    expect(candidate.forge_runes).toContainEqual({ stat: 'Agility', value: 20 })
    const normalized = normalizeBetaResult(report({ hat: candidate.ankama_id }, { hat: { stat: 'Agility', value: 20 } }), prepared.variants)
    expect(normalized.equipped.hat).toBe(100)
    expect(normalized.runes.hat).toEqual({ stat: 'Strength', value: 20 })
    expect(normalized.dracorunes?.hat.rune).toEqual({ kind: 'element', from: 'earth', to: 'air' })
    useDracorunes.setState({ applied: {} }); useBuildStore.getState().reset()
    useBuildStore.getState().setEquipment([piece]); useBuildStore.getState().setSetsData([]); useBuildStore.getState().setClass('iop')
    useBuildStore.getState().applyForgeResult(normalized, new Set())
    expect(useBuildStore.getState().stats!.agility).toBe(40)
    expect(useBuildStore.getState().stats!.strength).toBe(0)
  })
  it('bakes smithmagic of a preserved converted item once and leaves the official catalog untouched', () => {
    const before = JSON.stringify(piece)
    const cfg = { ...config(), lockedSlots: ['hat'] }
    const prepared = prepareBetaCatalog(cfg, [piece], [], { ...base, equipped: { hat: 100 }, runes: { hat: { Strength: 15 } } }, { hat: { itemId: 100, rune: { kind: 'element', from: 'earth', to: 'air' } } }, [])
    const candidate = prepared.items.find(it => it.ankama_id === prepared.base.equipped.hat)!
    expect(candidate.effects).toContainEqual({ stat: 'Agility', min: 35, max: 35 })
    expect(prepared.base.runes.hat).toEqual({})
    expect(candidate.forge_locked).toBe(true)
    expect(JSON.stringify(piece)).toBe(before)
  })
  it('maps an Ivory pro exo back to its source element and respects the selected lines', () => {
    const p = { ...piece, effects: [{ stat: 'AP', min: 1, max: 1 }, { stat: 'Earth Resistance', min: 10, max: 10 }] }
    const cfg = { ...config([{ stat: 'fireResPercent', goal: 3, weight: 10, max: null, absolute: false }]), proExoMax: 1, proExoLines: ['earthResPercent'], proExoCaps: { earthResPercent: 3 } }
    const prepared = prepareBetaCatalog(cfg, [p], [], base, {}, ['ivory'])
    const candidate = prepared.items.find(it => it.effects.some(e => e.stat === 'Fire Resistance'))!
    expect(candidate.forge_pro_runes).toContainEqual({ stat: '% Fire Resistance', value: 3 })
    const normalized = normalizeBetaResult(report({ hat: candidate.ankama_id }, { hat: { stat: '% Fire Resistance', value: 3, exotic: true } }), prepared.variants)
    expect(normalized.runes.hat).toEqual({ stat: '% Earth Resistance', value: 3, exotic: true })
  })
  it('does not generate forbidden candidates or enable unselected Dracorunes', () => {
    expect(prepareBetaCatalog(config(), [piece], [], base, {}, []).items).toHaveLength(1)
    expect(prepareBetaCatalog({ ...config(), bannedItems: [100] }, [piece], [], base, {}, ['air']).items).toHaveLength(1)
  })
})
