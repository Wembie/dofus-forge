import { describe, it, expect } from 'vitest'
import { streakFrameTier } from '../milestones.ts'

describe('streakFrameTier', () => {
  it('is null below the first milestone', () => {
    expect(streakFrameTier(0)).toBeNull()
    expect(streakFrameTier(6)).toBeNull()
  })

  it('returns the exact tier at each boundary, inclusive', () => {
    expect(streakFrameTier(7)).toBe('bronze')
    expect(streakFrameTier(29)).toBe('bronze')
    expect(streakFrameTier(30)).toBe('silver')
    expect(streakFrameTier(99)).toBe('silver')
    expect(streakFrameTier(100)).toBe('gold')
    expect(streakFrameTier(364)).toBe('gold')
    expect(streakFrameTier(365)).toBe('molten')
  })

  it('never downgrades past the top tier', () => {
    expect(streakFrameTier(10000)).toBe('molten')
  })
})
