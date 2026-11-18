import { describe, expect, it } from 'vitest'
import type { AppItem } from '@/data/loaders.ts'
import { ALL_SLOTS, type BuildSnapshot } from '@/store/buildStore.ts'
import { snapshotStats } from '../snapshotStats.ts'

const HAT = { ankama_id: 1, name: 'Hat', level: 200, type: 'Hat', slot: 'hat', effects: [], set_id: null, image_url: null } as unknown as AppItem
const equipment = [HAT]

function snapshot(r?: BuildSnapshot['r']): BuildSnapshot {
  const e = ALL_SLOTS.map(slot => (slot === 'hat' ? HAT.ankama_id : null))
  return { v: 1, c: 'iop', l: 200, a: [0, 0, 0, 0, 0, 0], s: 0, e, r }
}

describe('snapshotStats', () => {
  it('counts the magesmithy of a saved build: runes and the transcendence (exo) rune', () => {
    const plain = snapshotStats(snapshot(), equipment, [])!
    const forged = snapshotStats(snapshot({ hat: { Vitality: 50, 'exo:AP': 1 } }), equipment, [])!
    expect(forged.ap).toBe(plain.ap + 1)
    expect(forged.maxHp).toBe(plain.maxHp + 50)
  })

  it('ignores runes left on an empty slot', () => {
    const plain = snapshotStats(snapshot(), equipment, [])!
    const stray = snapshotStats(snapshot({ cape: { 'exo:MP': 1 } }), equipment, [])!
    expect(stray.mp).toBe(plain.mp)
  })
})
