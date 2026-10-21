import { describe, it, expect } from 'vitest'
import { sanitizeSnapshot, SNAPSHOT_SLOTS, SNAPSHOT_SLOT_IDS } from '../snapshot.ts'
import { ALL_SLOTS } from '../../store/buildStore.ts'

describe('sanitizeSnapshot', () => {
  it('rejects anything that is not a v1 snapshot', () => {
    expect(sanitizeSnapshot(null)).toBeNull()
    expect(sanitizeSnapshot('x')).toBeNull()
    expect(sanitizeSnapshot({ v: 2 })).toBeNull()
  })

  it('fills a bare { v: 1 } with safe defaults instead of crashing readers', () => {
    const snap = sanitizeSnapshot({ v: 1 })!
    expect(snap.c).toBe('')
    expect(snap.l).toBe(200)
    expect(snap.a).toEqual([0, 0, 0, 0, 0, 0])
    expect(snap.s).toBe(0)
    expect(snap.e).toHaveLength(SNAPSHOT_SLOTS)
    expect(snap.e.every(x => x === null)).toBe(true)
  })

  it('clamps out-of-range numbers (negative points, level, bitmask)', () => {
    const snap = sanitizeSnapshot({ v: 1, c: 'iop', l: 999, a: [-1, 5.7, 'x', 1e9], s: 255, e: [-3, 1.5, 42] })!
    expect(snap.l).toBe(200)
    expect(snap.a).toEqual([0, 5, 0, 5000, 0, 0])
    expect(snap.s).toBe(63)
    expect(snap.e.slice(0, 3)).toEqual([null, null, 42])
  })

  it('keeps valid optional fields and drops junk inside them', () => {
    const snap = sanitizeSnapshot({
      v: 1, n: 'Build', g: 'f',
      r: { hat: { Vitality: 50, 'exo:Strength': 20, bad: 'x', zero: 0 }, cape: 'nope' },
      fn: { hat: 'Smith', cape: 3 },
      wt: { weapon: { el: 'fire', r: 85 }, shield: { el: 1 } },
    })!
    expect(snap.n).toBe('Build')
    expect(snap.g).toBe('f')
    expect(snap.r).toEqual({ hat: { Vitality: 50, 'exo:Strength': 20 } })
    expect(snap.fn).toEqual({ hat: 'Smith' })
    expect(snap.wt).toEqual({ weapon: { el: 'fire', r: 85 } })
  })

  it('keeps only real slot ids in per-slot maps (no __proto__ or junk keys)', () => {
    const raw = JSON.parse('{"v":1,"r":{"__proto__":{"Vitality":1},"constructor":{"Vitality":1},"hat":{"Vitality":5}},"fn":{"__proto__":"x","toString":"y","cape":"Smith"},"wt":{"__proto__":{"el":"fire","r":1},"weapon":{"el":"fire","r":85}}}')
    const snap = sanitizeSnapshot(raw)!
    expect(Object.keys(snap.r!)).toEqual(['hat'])
    expect(Object.keys(snap.fn!)).toEqual(['cape'])
    expect(Object.keys(snap.wt!)).toEqual(['weapon'])
    expect(Object.getPrototypeOf(snap.r)).toBe(Object.prototype)
    expect(({} as Record<string, unknown>).Vitality).toBeUndefined()
  })

  it('slot ids match the store order', () => {
    expect([...SNAPSHOT_SLOT_IDS]).toEqual(ALL_SLOTS)
  })
})

describe('sanitizeSnapshot: combat passives', () => {
  it('keeps valid passive settings and drops unknown or out-of-range ones', () => {
    const snap = sanitizeSnapshot({ v: 1, p: { '739.0': 50, '1.0': 2, '18043.0': 'x' } })!
    expect(snap.p).toEqual({ '739.0': 10 })
    expect(sanitizeSnapshot({ v: 1, p: { '1.0': 2 } })!.p).toBeUndefined()
  })
})
