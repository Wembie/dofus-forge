import { describe, it, expect } from 'vitest'
import { applyResist } from '../pvpMath.ts'

describe('applyResist', () => {
  it('subtracts fixed resistance first, then applies the %', () => {
    // 700 Fire, 20 fixed and 30% resistance → (700 − 20) × 0.70 = 476.
    expect(applyResist(700, { fixed: 20, percent: 30 })).toBe(476)
  })

  it('truncates like the game instead of rounding', () => {
    expect(applyResist(101, { fixed: 0, percent: 50 })).toBe(50)
    expect(applyResist(99, { fixed: 0, percent: 1 })).toBe(98)
  })

  it('never heals: fixed resistance above the hit blocks it, negative % amplifies', () => {
    expect(applyResist(30, { fixed: 50, percent: 0 })).toBe(0)
    expect(applyResist(100, { fixed: 0, percent: -20 })).toBe(120)
  })
})
