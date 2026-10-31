import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { slugify, setSlugs, setBonusAt, fullSetTotals, gearTotals, elementScore, statElements, setLevel, setClass } from '../setGuide.ts'
import type { AppItem, AppSet } from '../loaders.ts'

const ROOT = join(__dirname, '..', '..', '..')
const readData = <T>(file: string) => JSON.parse(readFileSync(join(ROOT, 'public', 'data', file), 'utf8')) as T

const item = (ankama_id: number, effects: AppItem['effects'], extra: Partial<AppItem> = {}): AppItem => ({
  ankama_id, name: `Item ${ankama_id}`, level: 100, type: 'Hat', slot: 'hat', effects, set_id: 1, image_url: null, ...extra,
})

const SET: AppSet = {
  ankama_id: 1,
  name: 'Test Set',
  items: [10, 11],
  bonuses: {
    2: [{ stat: 'Strength', min: 20, max: 0 }, { stat: 'AP', min: 1, max: 0 }],
  },
}

describe('slugify', () => {
  it('drops accents, case and punctuation', () => {
    expect(slugify('Panoplie de l\'Abraknyde')).toBe('panoplie-de-l-abraknyde')
    expect(slugify('Set de Jalató Real')).toBe('set-de-jalato-real')
    expect(slugify('  --Gobball Set!! ')).toBe('gobball-set')
  })
})

describe('setSlugs', () => {
  it('skips sets with no known item and tells same-named sets apart by id, older first', () => {
    const sets = [
      { ankama_id: 9, name: 'Abyss Set', items: [3] },
      { ankama_id: 2, name: 'Abyss Set', items: [1] },
      { ankama_id: 5, name: 'Cosmetic Set', items: [999] },
    ]
    const slugs = setSlugs(sets, new Set([1, 3]))
    expect(slugs.get(2)).toBe('abyss-set')
    expect(slugs.get(9)).toBe('abyss-set-9')
    expect(slugs.has(5)).toBe(false)
  })

  it('gives every real set a unique, URL-safe slug', () => {
    const sets = readData<AppSet[]>('en/sets.json')
    const ids = new Set(readData<AppItem[]>('en/equipment.json').map(it => it.ankama_id))
    const slugs = [...setSlugs(sets, ids).values()]
    expect(slugs.length).toBeGreaterThan(400)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(slugs).toContain('gobball-set')
  })
})

describe('set totals', () => {
  it('reaches the highest tier at or below the pieces worn, never a sum of tiers', () => {
    const set = { bonuses: { 2: [{ stat: 'AP', min: 1, max: 0 }], 4: [{ stat: 'AP', min: 2, max: 0 }] } }
    expect(setBonusAt(set, 1)).toEqual([])
    expect(setBonusAt(set, 3)).toEqual([{ stat: 'AP', min: 1, max: 0 }])
    expect(setBonusAt(set, 8)).toEqual([{ stat: 'AP', min: 2, max: 0 }])
  })

  it('adds items at max roll plus the full-set bonus, merging stat spellings and leaving out weapon hits', () => {
    const items = [
      item(10, [{ stat: 'Strength', min: 30, max: 40 }, { stat: 'Earth Damage', min: 5, max: 0 }]),
      item(11, [{ stat: 'Earth damage', min: 3, max: 0, effect_id: 194 }, { stat: 'Earth damage', min: 2, max: 0, effect_id: 48 }], { slot: 'weapon' }),
    ]
    const totals = fullSetTotals(SET, items)
    expect(totals.get('strength')).toBe(60)
    expect(totals.get('earthDamage')).toBe(7)
    expect(totals.get('ap')).toBe(1)
    expect(totals.list().map(t => t.stat)).toEqual(['AP', 'Strength', 'Earth Damage'])
  })

  it('counts a set bonus from the distinct pieces worn', () => {
    const items = [item(10, []), item(11, [])]
    expect(gearTotals(items, new Map([[1, SET]])).get('strength')).toBe(20)
    expect(gearTotals([items[0]], new Map([[1, SET]])).get('strength')).toBe(0)
  })
})

describe('elements', () => {
  it('scores only the elements the stats play, and tags close ones together', () => {
    // Strength 50 + 20 from the set bonus = 70; Chance 50 is within 60% of it, Intelligence 10 is not.
    const totals = fullSetTotals(SET, [item(10, [{ stat: 'Strength', min: 50, max: 0 }, { stat: 'Chance', min: 50, max: 0 }, { stat: 'Intelligence', min: 10, max: 0 }]), item(11, [])])
    expect(elementScore(totals, 'air')).toBe(0)
    expect(elementScore(totals, 'earth')).toBeGreaterThan(elementScore(totals, 'water'))
    expect(statElements(totals)).toEqual(['earth', 'water'])
  })

  it('has no element without characteristics or elemental damage', () => {
    const totals = fullSetTotals({ bonuses: {} }, [item(10, [{ stat: 'Vitality', min: 300, max: 0 }])])
    expect(statElements(totals)).toEqual([])
  })
})

describe('setLevel and setClass', () => {
  it('takes the highest item level', () => {
    expect(setLevel([{ level: 40 }, { level: 60 }])).toBe(60)
  })

  it('finds the class whose spells the items modify (the spell id is in min)', () => {
    const spells = new Map([[13106, 'iop'], [12857, 'ecaflip']])
    const items = [
      item(1, [{ stat: ': line of sight off', min: 13106, max: 0, effect_id: 205 }]),
      item(2, [{ stat: ': + Maximum Range', min: 13106, max: 0, effect_id: 208 }, { stat: ': +% Critical', min: 12857, max: 0, effect_id: 226 }]),
    ]
    expect(setClass(items, spells)).toBe('iop')
    expect(setClass([item(3, [{ stat: 'Strength', min: 13106, max: 0 }])], spells)).toBeNull()
  })
})

describe('element ranking', () => {
  it('ranks a set focused on the element above an omni set with the same stats spread four ways', () => {
    const focused = fullSetTotals({ bonuses: {} }, [item(1, [{ stat: 'Agility', min: 200, max: 0 }, { stat: 'AP', min: 1, max: 0 }])])
    const omni = fullSetTotals({ bonuses: {} }, [item(2, ['Strength', 'Intelligence', 'Chance', 'Agility'].map(stat => ({ stat, min: 200, max: 0 })).concat({ stat: 'AP', min: 1, max: 0 }))])
    expect(elementScore(focused, 'air')).toBeGreaterThan(elementScore(omni, 'air'))
    expect(statElements(omni)).toEqual(['earth', 'fire', 'water', 'air'])
  })
})
