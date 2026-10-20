import { describe, it, expect } from 'vitest'
import { decodeBuild, encodeSnapshot } from '../codec.ts'
import type { BuildSnapshot } from '@/store/buildStore.ts'

describe('share link codec', () => {
  it('round-trips a snapshot', () => {
    const snap: BuildSnapshot = {
      v: 1, c: 'iop', n: 'Mi build ⚔', l: 199, g: 'f', a: [10, 0, 5, 0, 0, 0], s: 3,
      e: [1, null, 2, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      r: { hat: { Vitality: 50, 'exo:Strength': 20 } },
    }
    expect(decodeBuild(encodeSnapshot(snap))).toEqual(snap)
  })

  it('a link with a bare or malformed snapshot decodes to safe defaults', () => {
    const decoded = decodeBuild(encodeSnapshot({ v: 1 } as unknown as BuildSnapshot))!
    expect(decoded.a).toEqual([0, 0, 0, 0, 0, 0])
    expect(decoded.e).toHaveLength(17)
  })

  it('rejects garbage and unknown versions', () => {
    expect(decodeBuild('v1:%%%')).toBeNull()
    expect(decodeBuild('nope')).toBeNull()
    expect(decodeBuild(encodeSnapshot({ v: 2 } as unknown as BuildSnapshot))).toBeNull()
  })
})
