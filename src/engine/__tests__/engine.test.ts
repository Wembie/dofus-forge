import { describe, it, expect } from 'vitest'
import { computeStats } from '../stats.ts'
import { pointCost, maxPointsForBudget, statBudget, SCROLL_BONUS } from '../characteristics.ts'
import type { BuildInput, AllocatedCharacteristics, ScrolledCharacteristics } from '../types.ts'

// ── Helpers ──────────────────────────────────────────────────────────────────

const ZERO_ALLOC: AllocatedCharacteristics = {
  vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0,
}
const NO_SCROLLS: ScrolledCharacteristics = {
  vitality: false, wisdom: false, strength: false, intelligence: false, chance: false, agility: false,
}
const ALL_SCROLLS: ScrolledCharacteristics = {
  vitality: true, wisdom: true, strength: true, intelligence: true, chance: true, agility: true,
}

function emptyBuild(overrides: Partial<BuildInput> = {}): BuildInput {
  return {
    class:     'iop',
    level:     1,
    allocated: ZERO_ALLOC,
    scrolled:  NO_SCROLLS,
    items:     [],
    sets:      [],
    ...overrides,
  }
}

// ── Characteristic cost brackets ─────────────────────────────────────────────

describe('pointCost', () => {
  it('vitality: 1pt per point', () => {
    expect(pointCost('vitality', 0)).toBe(0)
    expect(pointCost('vitality', 1)).toBe(1)
    expect(pointCost('vitality', 100)).toBe(100)
    expect(pointCost('vitality', 999)).toBe(999)
  })

  it('wisdom: 3pt per point', () => {
    expect(pointCost('wisdom', 0)).toBe(0)
    expect(pointCost('wisdom', 1)).toBe(3)
    expect(pointCost('wisdom', 100)).toBe(300)
  })

  it('strength: bracket boundaries', () => {
    // First 100 @ 1pt each = 100pts
    expect(pointCost('strength', 100)).toBe(100)
    // 101st point costs 2pts → total 102
    expect(pointCost('strength', 101)).toBe(102)
    // First 200 = 100 + 200 = 300pts
    expect(pointCost('strength', 200)).toBe(300)
    // 201st point costs 3pts → total 303
    expect(pointCost('strength', 201)).toBe(303)
    // First 300 = 100 + 200 + 300 = 600pts
    expect(pointCost('strength', 300)).toBe(600)
    // 301st point costs 4pts → total 604
    expect(pointCost('strength', 301)).toBe(604)
  })

  it('same brackets for all elemental stats', () => {
    expect(pointCost('intelligence', 200)).toBe(pointCost('strength', 200))
    expect(pointCost('chance',       200)).toBe(pointCost('strength', 200))
    expect(pointCost('agility',      200)).toBe(pointCost('strength', 200))
  })

  it('throws on negative input', () => {
    expect(() => pointCost('vitality', -1)).toThrow()
  })
})

describe('maxPointsForBudget', () => {
  it('vitality: 1:1', () => {
    expect(maxPointsForBudget('vitality', 100)).toBe(100)
  })

  it('wisdom: floor(budget/3)', () => {
    expect(maxPointsForBudget('wisdom', 9)).toBe(3)
    expect(maxPointsForBudget('wisdom', 10)).toBe(3) // floor
  })

  it('elemental: respects brackets', () => {
    // 100 pts buys exactly 100 strength (first bracket)
    expect(maxPointsForBudget('strength', 100)).toBe(100)
    // 101 pts: still 100 (need 2pts for 101st point, only 1pt left)
    expect(maxPointsForBudget('strength', 101)).toBe(100)
    // 102 pts: can buy 101 strength
    expect(maxPointsForBudget('strength', 102)).toBe(101)
    // 300 pts: 100 + 100 = 200 strength
    expect(maxPointsForBudget('strength', 300)).toBe(200)
  })
})

describe('statBudget', () => {
  it('level 1 has 0 points', () => {
    expect(statBudget(1)).toBe(0)
  })
  it('level 2 has 5 points', () => {
    expect(statBudget(2)).toBe(5)
  })
  it('level 200 has 995 points', () => {
    expect(statBudget(200)).toBe(995)
  })
})

// ── Empty build ───────────────────────────────────────────────────────────────

describe('computeStats — empty build', () => {
  it('AP=6 MP=3 (base values)', () => {
    const s = computeStats(emptyBuild())
    expect(s.ap).toBe(6)
    expect(s.mp).toBe(3)
  })

  it('all damage/resist stats are 0', () => {
    const s = computeStats(emptyBuild())
    expect(s.strength).toBe(0)
    expect(s.vitality).toBe(0)
    expect(s.earthDamage).toBe(0)
    expect(s.earthResPercent).toBe(0)
  })

  it('HP = base at level 1 (55)', () => {
    const s = computeStats(emptyBuild({ level: 1 }))
    expect(s.maxHp).toBe(55)
  })

  it('HP scales with level', () => {
    const s = computeStats(emptyBuild({ level: 200 }))
    // 55 + 199*5 = 55 + 995 = 1050
    expect(s.maxHp).toBe(1050)
  })

  it('pointsBudget=0, pointsSpent=0 at level 1', () => {
    const s = computeStats(emptyBuild())
    expect(s.pointsBudget).toBe(0)
    expect(s.pointsSpent).toBe(0)
  })
})

// ── Characteristic allocation ─────────────────────────────────────────────────

describe('computeStats — characteristics', () => {
  it('allocated strength reflects in stat block', () => {
    const s = computeStats(emptyBuild({
      allocated: { ...ZERO_ALLOC, strength: 100 },
    }))
    expect(s.strength).toBe(100)
    expect(s.pointsSpent).toBe(100) // first bracket: 100pts
  })

  it('scroll adds SCROLL_BONUS to stat', () => {
    const s = computeStats(emptyBuild({
      scrolled: { ...NO_SCROLLS, vitality: true },
    }))
    expect(s.vitality).toBe(SCROLL_BONUS)
  })

  it('all scrolls add SCROLL_BONUS to each stat', () => {
    const s = computeStats(emptyBuild({ scrolled: ALL_SCROLLS }))
    expect(s.vitality).toBe(SCROLL_BONUS)
    expect(s.wisdom).toBe(SCROLL_BONUS)
    expect(s.strength).toBe(SCROLL_BONUS)
    expect(s.intelligence).toBe(SCROLL_BONUS)
    expect(s.chance).toBe(SCROLL_BONUS)
    expect(s.agility).toBe(SCROLL_BONUS)
  })

  it('HP includes allocated vitality', () => {
    const s = computeStats(emptyBuild({
      level:     1,
      allocated: { ...ZERO_ALLOC, vitality: 50 },
    }))
    expect(s.maxHp).toBe(55 + 50)
  })
})

// ── Set bonuses (Gobball Set, ankama_id=1) ────────────────────────────────────
// Data verified against live DofusDude EN API 2026-08-05.

const GOBBALL_SET = {
  ankama_id: 1,
  items: [2411, 2414, 2416, 2419, 2422, 2425, 2428, 18666],
  bonuses: {
    2: [{ stat: 'Strength', min: 5, max: 0 }, { stat: 'Intelligence', min: 5, max: 0 }, { stat: 'Vitality', min: 5, max: 0 }],
    3: [{ stat: 'Strength', min: 10, max: 0 }, { stat: 'Intelligence', min: 10, max: 0 }, { stat: 'Vitality', min: 10, max: 0 }],
    8: [{ stat: 'Strength', min: 50, max: 0 }, { stat: 'Intelligence', min: 50, max: 0 }, { stat: 'Vitality', min: 50, max: 0 }, { stat: 'AP', min: 1, max: 0 }],
  },
}

// Gobball Headgear (2411): Strength +16–20, Intelligence +16–20 (we use min)
const GOBBALL_HAT: BuildInput['items'][0] = {
  ankama_id: 2411,
  set_id:    1,
  effects:   [{ stat: 'Strength', min: 16, max: 20 }, { stat: 'Intelligence', min: 16, max: 20 }],
}

// Gobball Amulet (2414): synthetic — using realistic placeholder values
const GOBBALL_AMULET: BuildInput['items'][0] = {
  ankama_id: 2414,
  set_id:    1,
  effects:   [{ stat: 'Strength', min: 5, max: 8 }, { stat: 'Vitality', min: 11, max: 15 }],
}

// A third Gobball item to test 3-piece bonus
const GOBBALL_BELT: BuildInput['items'][0] = {
  ankama_id: 2416,
  set_id:    1,
  effects:   [{ stat: 'Chance', min: 6, max: 9 }],
}

describe('computeStats — set bonuses', () => {
  it('2-piece Gobball: applies 2-piece bonus once', () => {
    const s = computeStats(emptyBuild({
      items: [GOBBALL_HAT, GOBBALL_AMULET],
      sets:  [GOBBALL_SET],
    }))
    // Item effects: Str 16+5=21, Int 16, Vit 11
    // Set bonus 2pc: Str+5, Int+5, Vit+5
    expect(s.strength).toBe(16 + 5 + 5)     // 26
    expect(s.intelligence).toBe(16 + 5)      // 21
    expect(s.vitality).toBe(11 + 5)          // 16
  })

  it('3-piece Gobball: applies both 2-piece and 3-piece bonuses', () => {
    const s = computeStats(emptyBuild({
      items: [GOBBALL_HAT, GOBBALL_AMULET, GOBBALL_BELT],
      sets:  [GOBBALL_SET],
    }))
    // 2pc: Str+5 Int+5 Vit+5
    // 3pc: Str+10 Int+10 Vit+10
    expect(s.strength).toBe(16 + 5 + (5 + 10))    // 36
    expect(s.intelligence).toBe(16 + (5 + 10))     // 31
    expect(s.chance).toBe(6)                       // only from belt, no set bonus for chance
  })

  it('1 item from set: no set bonus applied', () => {
    const s = computeStats(emptyBuild({
      items: [GOBBALL_HAT],
      sets:  [GOBBALL_SET],
    }))
    // No set bonus — only hat effects
    expect(s.strength).toBe(16)
    expect(s.vitality).toBe(0)
  })

  it('8-piece Gobball: AP bonus from full set', () => {
    const fullSet: BuildInput['items'] = GOBBALL_SET.items.map(id => ({
      ankama_id: id,
      set_id:    1,
      effects:   [],
    }))
    const s = computeStats(emptyBuild({ items: fullSet, sets: [GOBBALL_SET] }))
    // 8-piece bonus includes AP+1
    expect(s.ap).toBe(6 + 1)   // base 6 + set bonus
    expect(s.strength).toBe(5 + 10 + 50)   // 2pc+3pc+8pc
  })
})

// ── Item effects ─────────────────────────────────────────────────────────────

describe('computeStats — item effects', () => {
  it('maps AP/MP from gear correctly', () => {
    const s = computeStats(emptyBuild({
      items: [{ ankama_id: 999, set_id: null, effects: [{ stat: 'AP', min: 1, max: 1 }, { stat: 'MP', min: 1, max: 1 }] }],
      sets:  [],
    }))
    expect(s.ap).toBe(7)
    expect(s.mp).toBe(4)
  })

  it('tracks unknown stats in unknownStats map', () => {
    const s = computeStats(emptyBuild({
      items: [{ ankama_id: 999, set_id: null, effects: [{ stat: 'UnknownStat2099', min: 42, max: 42 }] }],
      sets:  [],
    }))
    expect(s.unknownStats['UnknownStat2099']).toBe(42)
  })

  it('ignores cosmetic stat entries silently', () => {
    const s = computeStats(emptyBuild({
      items: [{ ankama_id: 999, set_id: null, effects: [{ stat: 'Emote', min: 1, max: 1 }] }],
      sets:  [],
    }))
    expect(s.unknownStats['Emote']).toBeUndefined()
  })
})
