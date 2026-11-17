import { describe, it, expect } from 'vitest'
import type { BuildResult, ForgeRequirement } from '../types.ts'
import { fingerprint, formatCount, mergeResults, requirementChecks, surplusRows, targetValue } from '../useForge.ts'

const req = (stat: string, over: Partial<ForgeRequirement> = {}) =>
  ({ stat, minimum: 0, weight: 0, cap: null, strictCap: false, ...over }) as ForgeRequirement
const result = (stats: Record<string, number>, equipped: BuildResult['equipped'] = {}, score = 0) =>
  ({ stats: { power: 0, ...stats }, equipped, score } as unknown as BuildResult)

describe('useForge helpers', () => {
  it('adds power to the stats it boosts', () => {
    const r = result({ strength: 500, power: 100, ap: 11 })
    expect(targetValue(r, 'strength')).toBe(600)
    expect(targetValue(r, 'ap')).toBe(11)
  })

  it('checks every minimum and skips requirements without one', () => {
    const checks = requirementChecks([req('ap', { minimum: 11 }), req('mp', { minimum: 6 }), req('range', { weight: 3 })], result({ ap: 11, mp: 5 }))
    expect(checks.map(c => [c.requirement.stat, c.value, c.ok])).toEqual([['ap', 11, true], ['mp', 5, false]])
  })

  it('values the surplus over each minimum, counting no further than the cap', () => {
    const { rows, total } = surplusRows(
      [req('vitality', { minimum: 3000, weight: 2, cap: 4000 }), req('ap', { minimum: 11, weight: 500 })],
      result({ vitality: 4500, ap: 12 }),
    )
    expect(rows.map(r => [r.r.stat, r.extra, r.worth, r.capped])).toEqual([['vitality', 1000, 2000, true], ['ap', 1, 500, false]])
    expect(total).toBe(2500)
  })

  it('treats swapped rings and Dofus as the same piece and keeps the best score', () => {
    const a = result({}, { ring1: 1, ring2: 2, dofus1: 7, dofus2: 8 }, 10)
    const b = result({}, { ring1: 2, ring2: 1, dofus1: 8, dofus2: 7 }, 12)
    expect(fingerprint(a)).toBe(fingerprint(b))
    const merged = mergeResults([{ generation: 1, evaluations: 1, bestScore: 10, results: [a] }, { generation: 1, evaluations: 1, bestScore: 12, results: [b] }])
    expect(merged).toHaveLength(1)
    expect(merged[0].result.score).toBe(12)
  })

  it('shortens large counts', () => {
    expect([formatCount(950), formatCount(1500), formatCount(2_300_000), formatCount(4_100_000_000)]).toEqual(['950', '1.5k', '2.3M', '4.1B'])
  })
})
