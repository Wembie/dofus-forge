// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useBuildStore } from '@/store/buildStore.ts'
import { useHistoryStore, trackBuildChange } from '@/store/historyStore.ts'
import { makeDefaultConfig, toWireConfig, migrateReq, isActive, normalizeCap, clampLevel, loadForgeResult, emptyReq, loadSavedConfig, persistConfig, STORAGE_KEY, withLegendaryBans } from '../forgeConfig.ts'
import type { AppItem } from '@/data/loaders.ts'
import { leyPreset } from '../statList.ts'
import type { BuildResult, ForgeRequirement, OptimizerConfig } from '../types.ts'

const withReq = (req: ForgeRequirement): OptimizerConfig => {
  const config = makeDefaultConfig()
  return { ...config, stats: config.stats.map(s => s.stat === req.stat ? req : s) }
}
const wireStat = (config: OptimizerConfig, stat: string) => toWireConfig(config, 96, 200).stats.find(s => s.stat === stat)

describe('toWireConfig', () => {
  it('never asks for gear above the character level', () => {
    const config = { ...makeDefaultConfig(), maxLevel: 200 }
    expect(toWireConfig(config, 96, 90).maxLevel).toBe(90)
    expect(toWireConfig({ ...config, maxLevel: 60 }, 96, 90).maxLevel).toBe(60)
  })

  it('sends a cap of 0 as no cap, the way the empty field shows it', () => {
    const wire = wireStat(withReq({ stat: 'ap', minimum: 11, weight: 50, cap: 0, strictCap: true }), 'ap')
    expect(wire).toMatchObject({ max: null, absolute: false })
    expect(normalizeCap(0)).toBeNull()
    expect(normalizeCap(12)).toBe(12)
  })

  it('keeps a strict cap with no minimum and no ley', () => {
    const req: ForgeRequirement = { stat: 'ap', minimum: 0, weight: 0, cap: 11, strictCap: true }
    expect(isActive(req)).toBe(true)
    expect(wireStat(withReq(req), 'ap')).toEqual({ stat: 'ap', goal: 0, weight: 0, max: 11, absolute: true })
    expect(isActive({ ...req, strictCap: false })).toBe(false)
    expect(isActive(emptyReq('ap'))).toBe(false)
  })
})

describe('Dofus slot kinds', () => {
  beforeEach(() => localStorage.clear())

  it('lets the Forge use every kind by default', () => {
    expect(toWireConfig(makeDefaultConfig(), 96, 200).bannedTypes).toEqual([])
  })

  it('sends the unchecked kinds to the engine as banned item types', () => {
    const config = { ...makeDefaultConfig(), excludedKinds: ['Trophy' as const, 'Prysmaradite' as const] }
    expect(toWireConfig(config, 96, 200).bannedTypes).toEqual(['Trophy', 'Prysmaradite'])
  })

  it('remembers the unchecked kinds and drops anything unknown', () => {
    persistConfig({ ...makeDefaultConfig(), excludedKinds: ['Dofus'] })
    expect(loadSavedConfig().excludedKinds).toEqual(['Dofus'])
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ excludedKinds: ['Hat', 'Trophy', 7] }))
    expect(loadSavedConfig().excludedKinds).toEqual(['Trophy'])
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ excludedKinds: 'Trophy' }))
    expect(loadSavedConfig().excludedKinds).toEqual([])
  })
})

describe('legendary items', () => {
  const items = [
    { ankama_id: 1, legendary: true },
    { ankama_id: 2, legendary: true },
    { ankama_id: 3, legendary: true },
    { ankama_id: 4 },
  ] as AppItem[]
  beforeEach(() => localStorage.clear())

  it('are allowed by default and change nothing', () => {
    const picks = { required: [], banned: [9] }
    expect(makeDefaultConfig().legendary).toBe(true)
    expect(withLegendaryBans(makeDefaultConfig(), picks, items)).toBe(picks)
  })

  it('switched off, bans every legendary but the pinned ones, once each', () => {
    const config = { ...makeDefaultConfig(), legendary: false }
    expect(withLegendaryBans(config, { required: [2], banned: [3, 9] }, items)).toEqual({ required: [2], banned: [3, 9, 1] })
  })

  it('remember the choice, and an old save keeps them on', () => {
    persistConfig({ ...makeDefaultConfig(), legendary: false })
    expect(loadSavedConfig().legendary).toBe(false)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ maxLevel: 150 }))
    expect(loadSavedConfig().legendary).toBe(true)
  })
})

describe('migrateReq', () => {
  it('gives an old minimum saved with importance 0 the default ley', () => {
    expect(migrateReq('ap', { minimum: 11, importance: 0 }).weight).toBe(leyPreset('ap', 2))
    expect(migrateReq('ap', { minimum: 0, importance: 0 }).weight).toBe(0)
    expect(migrateReq('ap', { minimum: 11, importance: 4 }).weight).toBe(leyPreset('ap', 3))
  })

  it('reads a saved cap of 0 as no cap', () => {
    expect(migrateReq('ap', { minimum: 11, weight: 50, cap: 0, strictCap: true }).cap).toBeNull()
  })
})

describe('clampLevel', () => {
  it('clamps to 1–200 and falls back to 200 when empty', () => {
    expect(clampLevel(150)).toBe(150)
    expect(clampLevel(0)).toBe(1)
    expect(clampLevel(200150)).toBe(200)
    expect(clampLevel(null)).toBe(200)
  })
})

describe('loadForgeResult', () => {
  useBuildStore.subscribe(trackBuildChange)
  const build = () => useBuildStore.getState()
  const history = () => useHistoryStore.getState()

  beforeEach(() => {
    build().reset()
    history().clear()
    build().setClass('iop')
    build().equipItem('weapon', 1)
    build().setWeaponTransform('weapon', { element: 'fire', ratio: 85 })
    build().setForjamagoName('weapon', 'Smith')
    build().equipItem('hat', 10)
    build().setRune('hat', 'Vitality', 50)
  })

  it('loads a piece as one undo step and drops the old weapon forgemagie', () => {
    const before = history().past.length
    const result = {
      equipped:  { weapon: 2, hat: 10, ring1: 3 },
      allocated: { ...build().allocated, vitality: 10 },
      scrolled:  build().scrolled,
      exo:       { ring1: 'ap' },
      runes:     { hat: { stat: 'Vitality', value: 100 } },
    } as unknown as BuildResult
    loadForgeResult(result, new Set())

    const s = build()
    expect(history().past.length).toBe(before + 1)
    expect(s.equipped).toEqual({ weapon: 2, hat: 10, ring1: 3 })
    expect(s.allocated.vitality).toBe(10)
    expect(s.weaponTransforms.weapon).toBeNull()
    expect(s.forjamagoNames.weapon).toBe('')
    expect(s.runes.ring1).toEqual({ AP: 1 })
    expect(Object.values(s.runes.hat ?? {})).toEqual([100])
  })

  it('leaves locked slots untouched', () => {
    const hatRunes = build().runes.hat
    const result = {
      equipped: { weapon: 2, hat: 10 }, allocated: build().allocated, scrolled: build().scrolled, exo: {}, runes: {},
    } as unknown as BuildResult
    loadForgeResult(result, new Set(['hat']))
    expect(build().runes.hat).toEqual(hatRunes)
  })
})
