import { describe, it, expect } from 'vitest'
import { defaultBuildName } from '../defaultName.ts'

describe('defaultBuildName', () => {
  it('is the class with AP/MP/range', () => {
    expect(defaultBuildName('Yopuka', { ap: 12, mp: 6, range: 3 })).toBe('Yopuka 12/6/3')
  })
  it('is just the class before stats exist, and empty without a class', () => {
    expect(defaultBuildName('Iop', null)).toBe('Iop')
    expect(defaultBuildName('', { ap: 7, mp: 3, range: 0 })).toBe('')
  })
})
