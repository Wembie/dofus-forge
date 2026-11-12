import { describe, it, expect } from 'vitest'
import { computeStats } from '@/engine/stats.ts'
import type { BuildInput, AllocatedCharacteristics, ScrolledCharacteristics } from '@/engine/types.ts'
import type { SlotId } from '@/store/buildStore.ts'
import { ALL_SLOTS } from '@/store/buildStore.ts'
import { analyzeGaps } from '../gapAnalysis.ts'

const ZERO_ALLOC: AllocatedCharacteristics = {
  vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0,
}
const NO_SCROLLS: ScrolledCharacteristics = {
  vitality: false, wisdom: false, strength: false, intelligence: false, chance: false, agility: false,
}

function emptyBuild(overrides: Partial<BuildInput> = {}): BuildInput {
  return { class: 'iop', level: 1, allocated: ZERO_ALLOC, scrolled: NO_SCROLLS, items: [], sets: [], ...overrides }
}

const FULL_EQUIPPED: Partial<Record<SlotId, number>> = Object.fromEntries(ALL_SLOTS.map((slot, i) => [slot, i + 1]))

describe('analyzeGaps', () => {
  it('flags every core slot empty on a fresh level-200 build', () => {
    const stats = computeStats(emptyBuild({ level: 200 }))
    const findings = analyzeGaps(stats, 200, {})
    const emptySlotIds = findings.filter(f => f.kind === 'empty_slot').map(f => f.slot)
    expect(emptySlotIds).toEqual(expect.arrayContaining(['hat', 'cape', 'amulet', 'ring1', 'ring2', 'belt', 'boots', 'weapon']))
    expect(findings.some(f => f.kind === 'empty_dofus' && f.count === 6)).toBe(true)
    expect(findings.some(f => f.kind === 'low_ap')).toBe(true)
    expect(findings.some(f => f.kind === 'low_mp')).toBe(true)
    expect(findings.some(f => f.kind === 'no_crit')).toBe(true)
  })

  it('reports no empty-slot findings once every slot is filled', () => {
    const stats = computeStats(emptyBuild({ level: 200 }))
    const findings = analyzeGaps(stats, 200, FULL_EQUIPPED)
    expect(findings.some(f => f.kind === 'empty_slot')).toBe(false)
    expect(findings.some(f => f.kind === 'empty_dofus')).toBe(false)
  })

  it('skips Dofus/AP/MP/HP nagging for very low levels', () => {
    const stats = computeStats(emptyBuild({ level: 5 }))
    const findings = analyzeGaps(stats, 5, FULL_EQUIPPED)
    expect(findings.some(f => f.kind === 'empty_dofus')).toBe(false)
    expect(findings.some(f => f.kind === 'low_ap')).toBe(false)
    expect(findings.some(f => f.kind === 'low_mp')).toBe(false)
    expect(findings.some(f => f.kind === 'low_hp')).toBe(false)
  })

  it('flags a negative resistance as critical and sorts it first', () => {
    const base = computeStats(emptyBuild({ level: 200 }))
    const stats = { ...base, earthResFixed: -5 }
    const findings = analyzeGaps(stats, 200, FULL_EQUIPPED)
    const neg = findings.find(f => f.kind === 'negative_res')
    expect(neg).toBeDefined()
    expect(neg!.severity).toBe('critical')
    expect(findings[0].severity).toBe('critical')
  })

  it('does not nag about HP, AP, MP or crit on a build that clears every breakpoint', () => {
    const base = computeStats(emptyBuild({ level: 200 }))
    const stats = { ...base, ap: 12, mp: 6, maxHp: 10000, critChance: 10 }
    const findings = analyzeGaps(stats, 200, FULL_EQUIPPED)
    expect(findings).toHaveLength(0)
  })
})
