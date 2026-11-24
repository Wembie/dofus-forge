import { describe, expect, it } from 'vitest'
import { bellaphoneRules } from '../../scripts/lib/bellaphone.ts'
import { DEFAULT_SCENARIO, ULTIMATES, attackEffect, matchesScenario, projectBellaphone, scenarioBonus, type BellaphoneRules, type BetaEffect } from './bellaphone.ts'
import { sanitizeScenario } from './bellaphoneStore.ts'
import type { AppSpell } from '../../src/data/spellLoaders.ts'

const effect = (mask: string, extra: Partial<BetaEffect> = {}): BetaEffect => ({ action: 99, element: 2, min: 20, max: 23, value: 0, trigger: 'I', turns: 0, delay: 0, mask, ...extra })
const spell = (id: number): AppSpell => ({ id, name: String(id), image_url: null, element: 'fire', is_variant: false, levels: [{ grade: 1, ap: 3, minRange: 0, maxRange: 0, maxPerTurn: 1, critChance: 20, effects: [{ element: 'fire', kind: 'damage', min: 60, max: 69 }] }] })

describe('Bellaphone scenarios', () => {
  it('uses actual counter and state criteria instead of summing alternatives', () => {
    expect(matchesScenario(effect('A,*Ct33276=2,*e7300'), DEFAULT_SCENARIO)).toBe(true)
    expect(matchesScenario(effect('A,*Ct33276>2'), DEFAULT_SCENARIO)).toBe(false)
    expect(matchesScenario(effect('A,*Ct33278=1'), DEFAULT_SCENARIO)).toBe(true)
    expect(matchesScenario(effect('A,*Ct33278>1'), DEFAULT_SCENARIO)).toBe(false)
    expect(matchesScenario(effect('A,*E7300'), { ...DEFAULT_SCENARIO, states: [7300] })).toBe(true)
    expect(matchesScenario(effect('A,*Ct999=1'), DEFAULT_SCENARIO)).toBe(false)
  })
  it('keeps inside, outside, instant and end-turn steals separate', () => {
    const raw = effect('A,ICH{11,12,13,14,15,16}', { action: 2828, element: -1 })
    expect(attackEffect(raw, DEFAULT_SCENARIO)).toMatchObject({ kind: 'steal', element: 'air' })
    expect(attackEffect(raw, { ...DEFAULT_SCENARIO, inside: false })).toBeNull()
    expect(attackEffect({ ...raw, mask: 'A', trigger: 'TE', turns: 2 }, DEFAULT_SCENARIO)).toBeNull()
    expect(attackEffect({ ...raw, mask: 'A', trigger: 'TE', turns: 2 }, { ...DEFAULT_SCENARIO, timing: 'end_turn', inside: false })).toMatchObject({ kind: 'steal' })
    expect(attackEffect({ ...raw, delay: 1 }, DEFAULT_SCENARIO)).toBeNull()
    expect(attackEffect({ ...raw, action: 3002 }, DEFAULT_SCENARIO)).toBeNull()
  })
  it('projects one normal/critical branch and adds only the selected ultimate', () => {
    const pyro = spell(33311)
    const ultimate = spell(33220)
    ultimate.levels.push({ ...ultimate.levels[0], grade: 5, ap: 4 })
    const raw = { grade: 1, effects: [effect('*Ct33276=1'), effect('*Ct33276=2', { min: 25, max: 28 }), effect('*Ct33276>2', { min: 30, max: 33 })], critEffects: [effect('*Ct33276=2', { min: 30, max: 34 })], handledBuffs: [] }
    const rules: BellaphoneRules = { schema: 1, gameVersion: '3.8.test', auras: [], states: [], ultimates: [ultimate], levels: { 33311: [raw] } }
    const result = projectBellaphone([pyro], rules, { ...DEFAULT_SCENARIO, lineage: 'crimson', evolution: 5 })
    expect(result[0].levels[0].effects).toEqual([{ kind: 'damage', element: 'fire', min: 25, max: 28 }])
    expect(result[0].levels[0].critEffects).toEqual([{ kind: 'damage', element: 'fire', min: 30, max: 34 }])
    expect(result[1].levels).toHaveLength(1)
    expect(result[1].levels[0]).toMatchObject({ grade: 1, ap: 4 })
    expect(pyro.levels[0].effects[0].min).toBe(60)
  })
  it('does not turn reactive ultimate lines into an immediate extra hit', () => {
    const rules: BellaphoneRules = { schema: 1, gameVersion: 'test', auras: [], states: [], ultimates: [spell(33220), spell(33227)], levels: Object.fromEntries([33220, 33227].map(id => [id, [{ grade: 1, effects: [effect('A', { action: 2822 }), effect('A', { action: 2822, min: 8, max: 0 })], critEffects: [], handledBuffs: [] }]])) }
    expect(projectBellaphone([], rules, { ...DEFAULT_SCENARIO, lineage: 'crimson' })[0].levels[0].effects).toHaveLength(1)
    expect(projectBellaphone([], rules, { ...DEFAULT_SCENARIO, lineage: 'ivory' })[0].levels[0].effects).toHaveLength(0)
    expect(scenarioBonus(rules, { ...DEFAULT_SCENARIO, aura: true })).toEqual({})
  })
  it('serializes restored and default scenarios identically so undo retains redo', () => {
    const initial = sanitizeScenario(DEFAULT_SCENARIO)
    expect(JSON.stringify(sanitizeScenario(JSON.parse(JSON.stringify(initial))))).toBe(JSON.stringify(initial))
    expect(sanitizeScenario({ radius: 99, evolution: -1, states: [7, 7, 999], aura: 'yes' })).toMatchObject({ radius: 2, evolution: 1, states: [7], aura: false })
  })
  it('extracts real trigger branches, official aura bonuses and localized names', () => {
    const spells = new Map(Array.from({ length: 6 }, (_, i) => [33270 + i, { nameId: i, descriptionId: 10 + i }]))
    const levels = new Map([[1, { spellId: 33311, grade: 1, effects: { Array: [{ actionId: 99, diceNum: 99 }] } }], [2, { spellId: 33319, grade: 1, effects: { Array: [{ actionId: 99, diceNum: 20, diceSide: 23, targetMask: '*Ct33276=2', triggers: 'I' }] } }], [3, { spellId: 33272, grade: 1, effects: { Array: [{ actionId: 138, diceNum: 80, targetMask: 'c', triggers: 'I' }, { actionId: 138, diceNum: 80, targetMask: 'g,b21', triggers: 'I' }] } }]])
    spells.set(33311, {})
    const rules = bellaphoneRules('3.8.test', spells, levels, new Map(), { 2: 'Belaura Púrpura' }, ULTIMATES.map(spell), () => null)
    expect(rules.levels[33311][0].effects[0]).toMatchObject({ min: 20, mask: '*Ct33276=2' })
    expect(rules.auras[2]).toMatchObject({ name: 'Belaura Púrpura', bonus: { power: 80 } })
    expect(scenarioBonus(rules, { ...DEFAULT_SCENARIO, lineage: 'crimson' })).toEqual({})
    expect(scenarioBonus(rules, { ...DEFAULT_SCENARIO, lineage: 'crimson', aura: true })).toEqual({ power: 80 })
  })
})
