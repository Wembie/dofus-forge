// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { alreadyBumpedToday, rememberBumpedToday } from './authStore.ts'

afterEach(() => localStorage.clear())

describe('login streak bump cache', () => {
  it('is unbumped until remembered for that user and day', () => {
    expect(alreadyBumpedToday('u1', '2026-11-27')).toBe(false)
    rememberBumpedToday('u1', '2026-11-27')
    expect(alreadyBumpedToday('u1', '2026-11-27')).toBe(true)
  })

  it('does not carry over to a different day or a different user', () => {
    rememberBumpedToday('u1', '2026-11-27')
    expect(alreadyBumpedToday('u1', '2026-11-28')).toBe(false)
    expect(alreadyBumpedToday('u2', '2026-11-27')).toBe(false)
  })

  it('treats a storage failure as unbumped instead of throwing', () => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = () => { throw new Error('blocked') }
    try {
      expect(alreadyBumpedToday('u1', '2026-11-27')).toBe(false)
    } finally {
      Storage.prototype.getItem = original
    }
  })

  it('swallows a write failure silently', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new Error('quota') }
    try {
      expect(() => rememberBumpedToday('u1', '2026-11-27')).not.toThrow()
    } finally {
      Storage.prototype.setItem = original
    }
  })
})
