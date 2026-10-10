import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { runOptimizer } from '../optimizer.ts'
import { ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { OptimizerConfig, OptimizerBuildBase, OptimizerStatKey, BuildResult } from '@/features/optimizer/types.ts'
import type { AllocatedCharacteristics, ScrolledCharacteristics } from '@/engine/types.ts'

// ── Helpers ──────────────────────────────────────────────────────────────────

const ZERO_ALLOC: AllocatedCharacteristics = { vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0 }
const NO_SCROLLS: ScrolledCharacteristics = { vitality: false, wisdom: false, strength: false, intelligence: false, chance: false, agility: false }

const ALL_STAT_KEYS: OptimizerStatKey[] = [
  'ap', 'mp', 'range', 'maxHp', 'vitality', 'wisdom', 'strength', 'intelligence', 'chance', 'agility',
  'power', 'damage', 'fireDamage', 'earthDamage', 'waterDamage', 'airDamage', 'neutralDamage', 'bestElemDamage',
  'critChance', 'critDamage',
]

function baseConfig(overrides: Partial<OptimizerConfig> = {}): OptimizerConfig {
  return {
    stats: ALL_STAT_KEYS.map(stat => ({ stat, weight: 0, minVal: 0 })),
    exo: { ap: false, mp: false, range: false },
    maxLevel: 200,
    lockedSlots: new Set<SlotId>(),
    assumeFullyScrolled: false,
    hasSubscription: false,
    ...overrides,
  }
}

function withWeight(config: OptimizerConfig, stat: OptimizerStatKey, weight: number, minVal = 0): OptimizerConfig {
  return { ...config, stats: config.stats.map(s => s.stat === stat ? { ...s, weight, minVal } : s) }
}

function baseBuild(overrides: Partial<OptimizerBuildBase> = {}): OptimizerBuildBase {
  return {
    selectedClass: 'iop',
    level:         200,
    allocated:     ZERO_ALLOC,
    scrolled:      NO_SCROLLS,
    equipped:      {},
    ...overrides,
  }
}

function freshCancel() { return { cancelled: false } }
function noopProgress() { /* ignore */ }

function statsNum(r: BuildResult, key: OptimizerStatKey): number {
  return (r.stats as unknown as Record<string, number>)[key]
}

// ── Deterministic, synthetic fixtures ───────────────────────────────────────
// Three "set" pieces, each individually weak (+50 Vitality), whose set bonus
// at the full 3 pieces is enormous (+1000 Vitality) — overwhelmingly better
// than three "loose" items that are each individually much stronger
// (+200 Vitality) but share no set. Only the item-combination search itself
// can discover this; scoring any single item in isolation cannot. This is a
// direct regression test for the exact flaw the old beam-search algorithm had
// (set bonuses were invisible to the search driving which items got kept).
function makeEffect(stat: string, value: number) {
  return { stat, min: value, max: 0 }
}

const SET_HAT:    AppItem = { ankama_id: 101, name: 'Set Hat',    level: 50, type: 'Hat',    slot: 'hat',    effects: [makeEffect('Vitality', 50)],  set_id: 1, image_url: null }
const SET_CAPE:   AppItem = { ankama_id: 102, name: 'Set Cape',   level: 50, type: 'Cloak',   slot: 'cape',   effects: [makeEffect('Vitality', 50)],  set_id: 1, image_url: null }
const SET_AMULET: AppItem = { ankama_id: 103, name: 'Set Amulet', level: 50, type: 'Amulet',  slot: 'amulet', effects: [makeEffect('Vitality', 50)],  set_id: 1, image_url: null }
const LOOSE_HAT:    AppItem = { ankama_id: 201, name: 'Loose Hat',    level: 50, type: 'Hat',   slot: 'hat',    effects: [makeEffect('Vitality', 200)], set_id: null, image_url: null }
const LOOSE_CAPE:   AppItem = { ankama_id: 202, name: 'Loose Cape',   level: 50, type: 'Cloak',  slot: 'cape',   effects: [makeEffect('Vitality', 200)], set_id: null, image_url: null }
const LOOSE_AMULET: AppItem = { ankama_id: 203, name: 'Loose Amulet', level: 50, type: 'Amulet', slot: 'amulet', effects: [makeEffect('Vitality', 200)], set_id: null, image_url: null }

const SYNTHETIC_ITEMS: AppItem[] = [SET_HAT, SET_CAPE, SET_AMULET, LOOSE_HAT, LOOSE_CAPE, LOOSE_AMULET]
const SYNTHETIC_SETS: AppSet[] = [{
  ankama_id: 1,
  name: 'Synthetic Set',
  items: [101, 102, 103],
  bonuses: { 2: [makeEffect('Vitality', 400)], 3: [makeEffect('Vitality', 1000)] },
}]

function lockedExcept(open: SlotId[]): Set<SlotId> {
  return new Set(ALL_SLOTS.filter(s => !open.includes(s)))
}

describe('runOptimizer — synthetic set-vs-loose-items regression', () => {
  it('assembles the full weaker-individually set over stronger standalone items', () => {
    const config = withWeight(baseConfig({ lockedSlots: lockedExcept(['hat', 'cape', 'amulet']) }), 'vitality', 10)
    const results = runOptimizer(config, SYNTHETIC_ITEMS, SYNTHETIC_SETS, baseBuild(), noopProgress, freshCancel())

    expect(results.length).toBeGreaterThan(0)
    const best = results[0]
    expect(best.equipped.hat).toBe(101)
    expect(best.equipped.cape).toBe(102)
    expect(best.equipped.amulet).toBe(103)
    // 50+50+50 (pieces) + 1000 (3pc set bonus) = 1150, vs. 600 for the loose trio
    expect(statsNum(best, 'vitality')).toBe(1150)
  })

  it('does not apply the set bonus when only 2 of 3 pieces are reachable', () => {
    // Lock amulet to a loose item that ISN'T part of the set — only hat/cape
    // are free, so the set can reach at most 2 pieces (its 2pc tier, not 3pc).
    const config = withWeight(
      baseConfig({ lockedSlots: lockedExcept(['hat', 'cape']) }),
      'vitality', 10,
    )
    const build = baseBuild({ equipped: { amulet: 203 } })
    const results = runOptimizer(config, SYNTHETIC_ITEMS, SYNTHETIC_SETS, build, noopProgress, freshCancel())

    const best = results[0]
    expect(best.equipped.hat).toBe(101)
    expect(best.equipped.cape).toBe(102)
    expect(best.equipped.amulet).toBe(203)  // untouched, locked
    // 50+50 (pieces) + 400 (2pc bonus) + 200 (locked loose amulet) = 700
    expect(statsNum(best, 'vitality')).toBe(700)
  })
})

describe('runOptimizer — correctness invariants (synthetic)', () => {
  it('respects fully-locked slots exactly and returns exactly one result', () => {
    const config = baseConfig({ lockedSlots: new Set(ALL_SLOTS) })
    const build = baseBuild({ equipped: { hat: 101, cape: 202 } })
    const results = runOptimizer(config, SYNTHETIC_ITEMS, SYNTHETIC_SETS, build, noopProgress, freshCancel())

    expect(results).toHaveLength(1)
    expect(results[0].equipped).toEqual({ hat: 101, cape: 202 })
  })

  it('returns immediately with no results when cancelled up front', () => {
    const config = withWeight(baseConfig(), 'vitality', 10)
    const results = runOptimizer(config, SYNTHETIC_ITEMS, SYNTHETIC_SETS, baseBuild(), noopProgress, { cancelled: true })
    expect(results).toEqual([])
  })

  it('does not throw and still returns results with every stat weight at zero', () => {
    const config = baseConfig()
    const results = runOptimizer(config, SYNTHETIC_ITEMS, SYNTHETIC_SETS, baseBuild(), noopProgress, freshCancel())
    expect(results.length).toBeGreaterThan(0)
  })

  it('never produces the same item id in both ring slots', () => {
    const ring1: AppItem = { ankama_id: 301, name: 'Ring A', level: 50, type: 'Ring', slot: 'ring', effects: [makeEffect('Vitality', 500)], set_id: null, image_url: null }
    const ring2: AppItem = { ankama_id: 302, name: 'Ring B', level: 50, type: 'Ring', slot: 'ring', effects: [makeEffect('Vitality', 500)], set_id: null, image_url: null }
    const config = withWeight(baseConfig({ lockedSlots: lockedExcept(['ring1', 'ring2']) }), 'vitality', 10)
    const results = runOptimizer(config, [ring1, ring2], [], baseBuild(), noopProgress, freshCancel())

    for (const r of results) {
      expect(r.equipped.ring1).toBeDefined()
      expect(r.equipped.ring2).toBeDefined()
      expect(r.equipped.ring1).not.toBe(r.equipped.ring2)
    }
  })

  it('never produces duplicate items across the 6 dofus slots', () => {
    const dofuses: AppItem[] = Array.from({ length: 3 }, (_, i) => ({
      ankama_id: 400 + i, name: `Dofus ${i}`, level: 50, type: 'Dofus', slot: 'dofus',
      effects: [makeEffect('Vitality', 100 + i)], set_id: null, image_url: null,
    }))
    const config = withWeight(baseConfig({ lockedSlots: lockedExcept(['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6']) }), 'vitality', 10)
    const results = runOptimizer(config, dofuses, [], baseBuild(), noopProgress, freshCancel())

    for (const r of results) {
      const ids = (['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6'] as SlotId[]).map(s => r.equipped[s]).filter((v): v is number => v != null)
      expect(new Set(ids).size).toBe(ids.length)  // no repeats — only 3 distinct dofuses exist for 6 slots
    }
  })

  it('flags meetsRequired correctly against a hard minimum constraint', () => {
    const achievable: AppItem = { ankama_id: 501, name: 'Big Vit Hat', level: 50, type: 'Hat', slot: 'hat', effects: [makeEffect('Vitality', 500)], set_id: null, image_url: null }
    const config = withWeight(baseConfig({ lockedSlots: lockedExcept(['hat']) }), 'vitality', 10, 400)
    const results = runOptimizer(config, [achievable], [], baseBuild(), noopProgress, freshCancel())

    expect(results[0].meetsRequired).toBe(true)
    expect(statsNum(results[0], 'vitality')).toBeGreaterThanOrEqual(400)
  })

  it('reports meetsRequired=false when the constraint is unreachable given the item pool', () => {
    const tooWeak: AppItem = { ankama_id: 601, name: 'Weak Hat', level: 50, type: 'Hat', slot: 'hat', effects: [makeEffect('Vitality', 10)], set_id: null, image_url: null }
    const config = withWeight(baseConfig({ lockedSlots: lockedExcept(['hat']) }), 'vitality', 10, 9999)
    const results = runOptimizer(config, [tooWeak], [], baseBuild(), noopProgress, freshCancel())

    expect(results.every(r => !r.meetsRequired)).toBe(true)
  })

  it('auto-applies the exo AP/MP/Range floors even with no explicit stat weight set', () => {
    const apItem: AppItem = { ankama_id: 701, name: 'AP Ring', level: 50, type: 'Ring', slot: 'ring', effects: [makeEffect('AP', 6)], set_id: null, image_url: null }
    const config = baseConfig({ lockedSlots: lockedExcept(['ring1']), exo: { ap: true, mp: false, range: false } })
    const results = runOptimizer(config, [apItem], [], baseBuild(), noopProgress, freshCancel())

    expect(results[0].meetsRequired).toBe(true)
    expect(statsNum(results[0], 'ap')).toBeGreaterThanOrEqual(12)
  })
})

// ── Equip conditions ─────────────────────────────────────────────────────────
// Items can carry conditions (e.g. "Strength > 100") that gate whether the
// character can actually wear them. These were never validated anywhere in
// the app — the optimizer could recommend an item the build doesn't qualify
// for. BELT_GATED has a far stronger Strength roll than BELT_PLAIN but its
// own Intelligence condition can never be met by this build (0 allocated
// Intelligence, no other Intelligence source), so a legal build must prefer
// BELT_PLAIN even though it scores lower in isolation.
const BELT_GATED: AppItem = {
  ankama_id: 301, name: 'Gated Belt', level: 50, type: 'Belt', slot: 'belt',
  effects: [makeEffect('Strength', 500)], set_id: null, image_url: null,
  conditions: [{ stat: 'Intelligence', operator: '>', value: 1000 }],
}
const BELT_PLAIN: AppItem = {
  ankama_id: 302, name: 'Plain Belt', level: 50, type: 'Belt', slot: 'belt',
  effects: [makeEffect('Strength', 50)], set_id: null, image_url: null,
}

describe('runOptimizer — equip conditions', () => {
  it('rejects an item whose own equip condition the build cannot meet', () => {
    const config = withWeight(baseConfig({ lockedSlots: lockedExcept(['belt']) }), 'strength', 10)
    const results = runOptimizer(config, [BELT_GATED, BELT_PLAIN], [], baseBuild(), noopProgress, freshCancel())

    expect(results.length).toBeGreaterThan(0)
    const best = results[0]
    expect(best.meetsRequired).toBe(true)
    expect(best.equipped.belt).toBe(BELT_PLAIN.ankama_id)
  })

  // Real data has items whose condition "stat" isn't a characteristic at all:
  // "Be subscribed" (needs an active Dofus subscription this app can't
  // verify), "Be level {0} or higher" (the character's own level, not item
  // level — already covered separately by maxLevel), and "Set bonus" (the
  // condition real Trophy items carry — incompatible with having 2+ pieces
  // of any one set equipped elsewhere in the build).
  const SUB_ITEM: AppItem = {
    ankama_id: 310, name: 'Subscriber Amulet', level: 50, type: 'Amulet', slot: 'amulet',
    effects: [makeEffect('Strength', 999)], set_id: null, image_url: null,
    conditions: [{ stat: 'Be subscribed', operator: '=', value: 1 }],
  }
  const FREE_ITEM: AppItem = {
    ankama_id: 311, name: 'Free Amulet', level: 50, type: 'Amulet', slot: 'amulet',
    effects: [makeEffect('Strength', 10)], set_id: null, image_url: null,
  }

  it('never equips a subscription-gated item unless the user confirms they have one', () => {
    const config = withWeight(baseConfig({ lockedSlots: lockedExcept(['amulet']) }), 'strength', 10)
    const results = runOptimizer(config, [SUB_ITEM, FREE_ITEM], [], baseBuild(), noopProgress, freshCancel())
    expect(results[0].equipped.amulet).toBe(FREE_ITEM.ankama_id)

    const withSub = runOptimizer({ ...config, hasSubscription: true }, [SUB_ITEM, FREE_ITEM], [], baseBuild(), noopProgress, freshCancel())
    expect(withSub[0].equipped.amulet).toBe(SUB_ITEM.ankama_id)
  })

  const LEVEL_GATED_ITEM: AppItem = {
    ankama_id: 312, name: 'Veteran Amulet', level: 1, type: 'Amulet', slot: 'amulet',
    effects: [makeEffect('Strength', 999)], set_id: null, image_url: null,
    conditions: [{ stat: 'Be level {0} or higher', operator: '>=', value: 100 }],
  }
  const BASIC_AMULET: AppItem = {
    ankama_id: 313, name: 'Basic Amulet', level: 1, type: 'Amulet', slot: 'amulet',
    effects: [makeEffect('Strength', 10)], set_id: null, image_url: null,
  }

  it('rejects a character-level-gated item when the build is below that level', () => {
    const config = withWeight(baseConfig({ lockedSlots: lockedExcept(['amulet']) }), 'strength', 10)
    const lowLevel = runOptimizer(config, [LEVEL_GATED_ITEM, BASIC_AMULET], [], baseBuild({ level: 50 }), noopProgress, freshCancel())
    expect(lowLevel[0].equipped.amulet).toBe(BASIC_AMULET.ankama_id)

    const highLevel = runOptimizer(config, [LEVEL_GATED_ITEM, BASIC_AMULET], [], baseBuild({ level: 150 }), noopProgress, freshCancel())
    expect(highLevel[0].equipped.amulet).toBe(LEVEL_GATED_ITEM.ankama_id)
  })

  const TROPHY: AppItem = {
    ankama_id: 320, name: 'Minor Obstructor', level: 50, type: 'Trophy', slot: 'amulet',
    effects: [makeEffect('Strength', 500)], set_id: null, image_url: null,
    conditions: [{ stat: 'Set bonus', operator: '<', value: 2 }],
  }
  const PLAIN_AMULET: AppItem = {
    ankama_id: 321, name: 'Plain Amulet', level: 50, type: 'Amulet', slot: 'amulet',
    effects: [makeEffect('Strength', 10)], set_id: null, image_url: null,
  }
  const TROPHY_SET_HAT:  AppItem = { ankama_id: 322, name: 'TSet Hat',  level: 50, type: 'Hat',  slot: 'hat',  effects: [makeEffect('Strength', 20)], set_id: 9, image_url: null }
  const TROPHY_SET_CAPE: AppItem = { ankama_id: 323, name: 'TSet Cape', level: 50, type: 'Cloak', slot: 'cape', effects: [makeEffect('Strength', 20)], set_id: 9, image_url: null }
  const TROPHY_SETS: AppSet[] = [{ ankama_id: 9, name: 'Trophy-blocking Set', items: [322, 323], bonuses: { 2: [makeEffect('Strength', 1000)] } }]

  it('rejects a Trophy ("Set bonus" condition) once 2+ pieces of any set are equipped elsewhere', () => {
    // Hat/cape locked into the 2pc set (so its bonus is definitely active);
    // amulet left open between the Trophy and a plain alternative. The Trophy
    // scores far higher raw Strength, but is illegal once that 2pc bonus is
    // active, so a legal build must fall back to the plain amulet.
    const config = withWeight(baseConfig({ lockedSlots: lockedExcept(['amulet']) }), 'strength', 10)
    const results = runOptimizer(
      config,
      [TROPHY, PLAIN_AMULET, TROPHY_SET_HAT, TROPHY_SET_CAPE],
      TROPHY_SETS,
      baseBuild({ equipped: { hat: 322, cape: 323 } }),
      noopProgress, freshCancel(),
    )
    expect(results[0].equipped.amulet).toBe(PLAIN_AMULET.ankama_id)
  })
})

// ── Real game data ───────────────────────────────────────────────────────────
// These exercise the actual catalog (public/data/en/*.json) — the same data
// the app ships — so they validate real-world scale and genuinely obtainable
// items, not just the small hand-built fixtures above.

let realEquipment: AppItem[]
let realSets: AppSet[]

beforeAll(() => {
  const dataDir = join(__dirname, '..', '..', '..', 'public', 'data', 'en')
  realEquipment = JSON.parse(readFileSync(join(dataDir, 'equipment.json'), 'utf-8'))
  realSets = JSON.parse(readFileSync(join(dataDir, 'sets.json'), 'utf-8'))
})

describe('runOptimizer — real game data', () => {
  it('loaded the real catalog (sanity check the fixture path is right)', () => {
    expect(realEquipment.length).toBeGreaterThan(1000)
    expect(realSets.length).toBeGreaterThan(100)
  })

  it('never equips a known non-obtainable Game Master / test item', () => {
    // IDs confirmed by name inspection: GM-only pet/ring items and a raw QA
    // test fixture — see NON_OBTAINABLE_NAME_RE in optimizer.ts.
    const bannedIds = new Set([6894, 6895, 7913, 9031, 34569])
    const config = withWeight(withWeight(baseConfig(), 'vitality', 10), 'intelligence', 10)
    const results = runOptimizer(config, realEquipment, realSets, baseBuild(), noopProgress, freshCancel())

    for (const r of results) {
      for (const id of Object.values(r.equipped)) {
        expect(bannedIds.has(id as number)).toBe(false)
      }
    }
  }, 30000)

  it('respects maxLevel — no equipped item ever exceeds it', () => {
    const itemMap = new Map(realEquipment.map(it => [it.ankama_id, it]))
    const config = withWeight(baseConfig({ maxLevel: 60 }), 'vitality', 10)
    const results = runOptimizer(config, realEquipment, realSets, baseBuild({ level: 60 }), noopProgress, freshCancel())

    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      for (const id of Object.values(r.equipped)) {
        const item = itemMap.get(id as number)
        expect(item).toBeDefined()
        expect(item!.level).toBeLessThanOrEqual(60)
      }
    }
  }, 30000)

  it('respects locked slots against the real catalog', () => {
    const anyWeapon = realEquipment.find(it => it.slot === 'weapon' && it.level <= 50)!
    const config = withWeight(baseConfig({ maxLevel: 60, lockedSlots: new Set<SlotId>(['weapon']) }), 'strength', 10)
    const build = baseBuild({ level: 60, equipped: { weapon: anyWeapon.ankama_id } })
    const results = runOptimizer(config, realEquipment, realSets, build, noopProgress, freshCancel())

    for (const r of results) expect(r.equipped.weapon).toBe(anyWeapon.ankama_id)
  }, 30000)

  it('never duplicates an item id across ring1/ring2 or the 6 dofus slots', () => {
    const config = withWeight(baseConfig({ maxLevel: 60 }), 'agility', 10)
    const results = runOptimizer(config, realEquipment, realSets, baseBuild({ level: 60 }), noopProgress, freshCancel())

    const dofusSlots: SlotId[] = ['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6']
    for (const r of results) {
      if (r.equipped.ring1 != null && r.equipped.ring2 != null) {
        expect(r.equipped.ring1).not.toBe(r.equipped.ring2)
      }
      const dofusIds = dofusSlots.map(s => r.equipped[s]).filter((v): v is number => v != null)
      expect(new Set(dofusIds).size).toBe(dofusIds.length)
    }
  }, 30000)

  it('actually assembles multi-piece set bonuses when stats favor it (not just coincidentally strong loose items)', () => {
    const itemMap = new Map(realEquipment.map(it => [it.ankama_id, it]))

    const config = withWeight(withWeight(baseConfig(), 'vitality', 8), 'strength', 6)
    const results = runOptimizer(config, realEquipment, realSets, baseBuild(), noopProgress, freshCancel())

    const anyResultHasASet = results.some(r => {
      const setCounts = new Map<number, number>()
      for (const id of Object.values(r.equipped)) {
        const item = itemMap.get(id as number)
        if (item?.set_id != null) setCounts.set(item.set_id, (setCounts.get(item.set_id) ?? 0) + 1)
      }
      return [...setCounts.values()].some(count => count >= 2)
    })
    expect(anyResultHasASet).toBe(true)
  }, 30000)

  it('completes a full run against the entire real catalog within a reasonable time budget', () => {
    const config = withWeight(baseConfig(), 'intelligence', 10)
    const start = Date.now()
    const results = runOptimizer(config, realEquipment, realSets, baseBuild(), noopProgress, freshCancel())
    const elapsed = Date.now() - start

    expect(results.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(15000)  // engine's own TIME_BUDGET_MS safety cap is 12000ms
  }, 20000)

  it('reports strictly increasing progress percent and finishes at 100', () => {
    const percents: number[] = []
    const config = withWeight(baseConfig({ maxLevel: 60 }), 'chance', 10)
    runOptimizer(config, realEquipment, realSets, baseBuild({ level: 60 }), p => percents.push(p.percent), freshCancel())

    expect(percents.length).toBeGreaterThan(0)
    expect(percents[percents.length - 1]).toBe(100)
    expect(percents.every((p, i) => i === 0 || p >= percents[i - 1])).toBe(true)
  }, 30000)

  it('stops promptly when cancelled mid-run', () => {
    const cancelRef = { cancelled: false }
    const config = withWeight(baseConfig(), 'wisdom', 10)
    let calls = 0
    const results = runOptimizer(config, realEquipment, realSets, baseBuild(), () => {
      calls++
      if (calls === 3) cancelRef.cancelled = true
    }, cancelRef)

    expect(results).toEqual([])
  }, 30000)

  // Regression test for a real reported bug: hill-climbing (phase 3, the
  // only phase that goes beyond "single best item per slot") used to be
  // skipped ENTIRELY whenever phases 1-2 (set/pair search) ran long enough
  // to hit the shared time budget — an all-or-nothing gate, not a gradual
  // cutoff. A cold Worker with no JIT warm-up on a slower machine could hit
  // that easily, silently capping results well below what's achievable
  // (confirmed: ~1370 Strength instead of ~1660+ with the gate re-enabled in
  // testing). Phases 1-2 now get only a fraction of the total time budget,
  // guaranteeing phase 3 always gets to run. This pins the user-reported
  // symptom directly: asking for 1500 Strength should actually be reachable.
  it('reaches a high hard-constraint target that requires hill-climbing polish to satisfy', () => {
    const config = withWeight(baseConfig(), 'strength', 6, 1500)
    const results = runOptimizer(config, realEquipment, realSets, baseBuild(), noopProgress, freshCancel())

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].meetsRequired).toBe(true)
    expect(statsNum(results[0], 'strength')).toBeGreaterThanOrEqual(1500)
  }, 30000)
})
