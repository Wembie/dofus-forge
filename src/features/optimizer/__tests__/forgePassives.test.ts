// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { ITEM_PASSIVES, sanitizePassiveState, controlMax, passiveBonus } from '@/engine/passives.ts'
import { maxPassiveState, forgePassiveState, forgePassiveEffects, passiveStateFor } from '../forgePassives.ts'
import { makeDefaultConfig, toWireConfig, loadSavedConfig, persistConfig, loadForgeResult, STORAGE_KEY } from '../forgeConfig.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import type { BuildResult } from '../types.ts'

const JAHASH = 20362   // five % resistance stacks sharing one cap
const ABYSSAL = 18043  // MP with no adjacent enemy, or AP
const TURQUOISE = 739  // final damage only: no order stat

describe('maxPassiveState', () => {
  it('is a valid state: every stack full, every choice on its first case', () => {
    const state = maxPassiveState()
    expect(sanitizePassiveState(state)).toEqual(state)
    for (const controls of ITEM_PASSIVES.values()) {
      for (const c of controls) {
        if (c.kind === 'choice') expect(state[c.id], c.id).toBe(1)
        else if (!c.shared) expect(state[c.id], c.id).toBe(controlMax(c))
      }
    }
  })

  it('spreads shared stacks over every element instead of piling them on the first', () => {
    const state = maxPassiveState()
    const controls = ITEM_PASSIVES.get(JAHASH)!
    const values = controls.map(c => state[c.id] ?? 0)
    const cap = controls[0].kind === 'stacks' ? controls[0].shared! : 0
    expect(values.reduce((a, b) => a + b, 0)).toBe(cap)
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
  })

  it('is computed once', () => {
    expect(maxPassiveState()).toBe(maxPassiveState())
  })
})

describe('forgePassiveEffects', () => {
  it('turns each item bonus into engine effects with the same totals as the planner', () => {
    const state = maxPassiveState()
    const effects = forgePassiveEffects(state)
    const abyssal = effects.find(e => e.id === ABYSSAL)!
    const bonus = passiveBonus([ABYSSAL], state)
    expect(abyssal.effects).toEqual([{ stat: 'MP', min: bonus.mp, max: bonus.mp }])
    const jahash = effects.find(e => e.id === JAHASH)!
    expect(jahash.effects.map(e => e.stat).sort()).toEqual(['% Air Resistance', '% Earth Resistance', '% Fire Resistance', '% Neutral Resistance', '% Water Resistance'])
  })

  it('leaves out items whose passive is no order stat (final damage)', () => {
    expect(forgePassiveEffects(maxPassiveState()).some(e => e.id === TURQUOISE)).toBe(false)
  })

  it('planner mode counts only what the player set; off counts nothing', () => {
    const [mp] = ITEM_PASSIVES.get(ABYSSAL)!
    const planner = { [mp.id]: 2 }
    const effects = forgePassiveEffects(forgePassiveState('planner', planner))
    expect(effects.map(e => e.id)).toEqual([ABYSSAL])
    expect(effects[0].effects[0].stat).toBe('AP')
    expect(forgePassiveState('off', planner)).toEqual({})
    expect(forgePassiveState('planner', { 'nope.0': 3 })).toEqual({})
  })

  it('passiveStateFor keeps only the given items', () => {
    const state = maxPassiveState()
    const kept = passiveStateFor(state, [ABYSSAL, undefined as unknown as number])
    expect(Object.keys(kept).every(k => k.startsWith(`${ABYSSAL}.`))).toBe(true)
    expect(Object.keys(kept).length).toBe(ITEM_PASSIVES.get(ABYSSAL)!.length)
  })
})

describe('passives in the order config', () => {
  beforeEach(() => localStorage.clear())

  it('reach the engine only when switched on', () => {
    const effects = forgePassiveEffects(maxPassiveState())
    expect(toWireConfig(makeDefaultConfig(), 96, 200, undefined, effects).passiveEffects).toEqual([])
    expect(toWireConfig({ ...makeDefaultConfig(), passives: 'max' }, 96, 200, undefined, effects).passiveEffects).toBe(effects)
  })

  it('the mode is saved, and anything unknown reads as off', () => {
    expect(makeDefaultConfig().passives).toBe('off')
    persistConfig({ ...makeDefaultConfig(), passives: 'planner' })
    expect(loadSavedConfig().passives).toBe('planner')
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ passives: 'everything' }))
    expect(loadSavedConfig().passives).toBe('off')
  })

  it('loading a piece carries the counted passives into the planner, merged and sanitized', () => {
    const [mp] = ITEM_PASSIVES.get(ABYSSAL)!
    useBuildStore.setState({ passives: { [`${JAHASH}.0`]: 1 } })
    const result = { equipped: { dofus1: ABYSSAL }, allocated: useBuildStore.getState().allocated, scrolled: useBuildStore.getState().scrolled, exo: {}, runes: {} } as unknown as BuildResult
    loadForgeResult(result, new Set(), passiveStateFor(maxPassiveState(), [ABYSSAL]))
    expect(useBuildStore.getState().passives).toEqual({ [`${JAHASH}.0`]: 1, [mp.id]: 1 })
    loadForgeResult(result, new Set())
    expect(useBuildStore.getState().passives[mp.id]).toBe(1)
  })
})
