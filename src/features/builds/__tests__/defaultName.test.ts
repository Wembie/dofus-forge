import { describe, it, expect } from 'vitest'
import { BUILD_NAME_MAX, defaultBuildName, mainCharacteristics } from '../defaultName.ts'

const NAMES = { strength: 'Fuerza', intelligence: 'Inteligencia', chance: 'Suerte', agility: 'Agilidad' } as const
const label = { characteristic: (c: keyof typeof NAMES) => NAMES[c], mixed: 'Mixto', level: (n: number) => `Nvl ${n}` }
const stats = (s: Partial<Record<keyof typeof NAMES, number>>) =>
  ({ ap: 12, mp: 6, range: 3, strength: 0, intelligence: 0, chance: 0, agility: 0, ...s })

describe('defaultBuildName', () => {
  it('is the class, its main characteristic and AP/MP/range', () => {
    expect(defaultBuildName('Yopuka', stats({ strength: 900, agility: 100 }), 200, label)).toBe('Yopuka Fuerza 12/6/3')
  })

  it('joins two close characteristics and calls three or more mixed', () => {
    expect(defaultBuildName('Ocra', stats({ chance: 800, agility: 750 }), 200, label)).toBe('Ocra Suerte-Agilidad 12/6/3')
    expect(defaultBuildName('Steamer', stats({ strength: 500, intelligence: 480, chance: 470 }), 200, label)).toBe('Steamer Mixto 12/6/3')
  })

  it('adds the level below 200', () => {
    expect(defaultBuildName('Yopuka', stats({ strength: 400 }), 150, label)).toBe('Yopuka Fuerza 12/6/3 · Nvl 150')
  })

  it('leaves the characteristic out with none spent, and is empty without a class', () => {
    expect(defaultBuildName('Iop', stats({}), 200, label)).toBe('Iop 12/6/3')
    expect(defaultBuildName('Iop', null, 200, label)).toBe('Iop')
    expect(defaultBuildName('', stats({ strength: 10 }), 200, label)).toBe('')
  })

  it('never goes past the name limit', () => {
    expect(defaultBuildName('X'.repeat(80), stats({ strength: 1 }), 1, label).length).toBe(BUILD_NAME_MAX)
  })

  it('ignores power: it is not a characteristic', () => {
    expect(mainCharacteristics(stats({ intelligence: 300 }))).toEqual(['intelligence'])
  })
})
