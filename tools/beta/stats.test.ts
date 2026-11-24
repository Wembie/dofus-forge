import { describe, expect, it } from 'vitest'
import type { BuildInput } from '../../src/engine/types.ts'
import { computeStats, effectCaps } from './stats.ts'
import { withPassives } from './passives.ts'

const input = (effects: BuildInput['items'][number]['effects']): BuildInput => ({ class: 'iop', level: 200, allocated: { vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0 }, scrolled: { vitality: false, wisdom: false, strength: false, intelligence: false, chance: false, agility: false }, sets: [], items: [{ ankama_id: 1, set_id: null, slot: 'cape', effects }] })
const effect = (stat: string, value: number) => ({ stat, min: value, max: 0 })

describe('beta maximum characteristic effects', () => {
  it('uses the lowest applicable item maximum and retains the raw total', () => {
    const stats = computeStats(input([effect('AP', 5), effect('AP Max.', 8), effect('AP Max.', 7), effect('MP', 4), effect('MP Max.', 4)]))
    expect(stats.apRaw).toBe(12); expect(stats.ap).toBe(7)
    expect(stats.mpRaw).toBe(7); expect(stats.mp).toBe(4)
    expect(stats.unknownStats).toEqual({})
    expect(stats.betaCaps).toEqual({ ap: 7, mp: 4, range: 6, summons: 6 })
  })
  it('also handles range and summons without adding cap values as bonuses', () => {
    const stats = computeStats(input([effect('Range', 6), effect('Summons', 5), effect('Range Max.', 4), effect('Summons Max.', 4)]))
    expect(stats.range).toBe(4); expect(stats.summons).toBe(4)
    expect(effectCaps([effect('AP Max.', -7)])).toEqual({ ap: 12, mp: 6, range: 6, summons: 6 })
  })
  it('applies only the active set tier and counts duplicate item ids once', () => {
    const build = input([effect('MP', 3), effect('Range', 5), effect('Summons', 5)])
    build.items[0].set_id = 9
    build.items.push({ ...build.items[0], ankama_id: 2, effects: [] })
    build.sets = [{ ankama_id: 9, items: [1, 2, 3], bonuses: { 2: [effect('MP Max.', 4)], 3: [effect('MP Max.', 2), effect('Range Max.', 2)] } }]
    expect(computeStats(build).mp).toBe(4)
    build.items.push({ ...build.items[0], effects: [] })
    expect(computeStats(build).mp).toBe(4)
    build.items.push({ ...build.items[0], ankama_id: 3, effects: [] })
    expect(computeStats(build).mp).toBe(2)
    expect(computeStats(build).range).toBe(2)
  })
  it('uses the same item limits when combat passives add or remove AP/MP', () => {
    const stats = computeStats(input([effect('AP', 3), effect('AP Max.', 7), effect('MP Max.', 4)]))
    expect(withPassives(stats, { ap: 2, mp: 3 }).ap).toBe(7)
    expect(withPassives(stats, { ap: -5 }).ap).toBe(5)
    expect(withPassives(stats, { mp: 3 }).mp).toBe(4)
  })
})
