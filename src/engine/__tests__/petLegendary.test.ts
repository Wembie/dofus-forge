import { describe, it, expect } from 'vitest'
import {
  LEGENDARY_BONUSES, LEGENDARY_LAYOUT_MISMATCHES, legendaryBonusOf, legendaryMax, legendaryStatBonus, sanitizeLegendaryPick,
} from '../petLegendary.ts'

describe('petLegendary', () => {
  it('every bonus resolves by id, and only stat-modeled ones carry a control', () => {
    for (const b of LEGENDARY_BONUSES) expect(legendaryBonusOf(b.id)).toBe(b)
    const numeric = LEGENDARY_BONUSES.filter(b => b.control)
    const textOnly = LEGENDARY_BONUSES.filter(b => !b.control)
    expect(numeric.length).toBeGreaterThan(0)
    expect(textOnly.length).toBeGreaterThan(0)
    expect(numeric.length + textOnly.length).toBe(LEGENDARY_BONUSES.length)
  })

  it('the hand layout still matches the generated game data', () => {
    expect(LEGENDARY_LAYOUT_MISMATCHES).toEqual([])
  })

  it('a stacks control adds up per stack; a text-only bonus adds nothing', () => {
    const boowolf = legendaryBonusOf('poukachi.boowolf')!
    expect(legendaryStatBonus({ id: boowolf.id, value: 2 })).toEqual({ finalDamagePercent: 10 })
    const chafer = legendaryBonusOf('bakushana.chafer')!
    expect(legendaryStatBonus({ id: chafer.id, value: 1 })).toEqual({})
    expect(legendaryStatBonus(null)).toEqual({})
  })

  it('a choice control with two options picks either branch by value', () => {
    const bwork = legendaryBonusOf('magicrabe.bwork')!
    expect(legendaryStatBonus({ id: bwork.id, value: 1 })).toEqual({ meleeDamagePercent: 3 })
    expect(legendaryStatBonus({ id: bwork.id, value: 2 })).toEqual({ rangedDamagePercent: 3 })
    expect(legendaryStatBonus({ id: bwork.id, value: 0 })).toEqual({})
  })

  it('legendaryMax reports the control cap, or 1 for a text-only bonus (a plain on/off)', () => {
    expect(legendaryMax('poukachi.boowolf')).toBe(3)
    expect(legendaryMax('bakushana.chafer')).toBe(1)
  })

  it('sanitizeLegendaryPick drops an unknown id and clamps a value past the max', () => {
    expect(sanitizeLegendaryPick(null)).toBeNull()
    expect(sanitizeLegendaryPick({ id: 'nope.nope', value: 1 })).toBeNull()
    expect(sanitizeLegendaryPick({ id: 'poukachi.boowolf', value: 99 })).toEqual({ id: 'poukachi.boowolf', value: 3 })
    expect(sanitizeLegendaryPick({ id: 'poukachi.boowolf', value: -5 })).toEqual({ id: 'poukachi.boowolf', value: 0 })
    // Text-only: no control to clamp against, so a pick always counts as "on".
    expect(sanitizeLegendaryPick({ id: 'bakushana.chafer', value: 0 })).toEqual({ id: 'bakushana.chafer', value: 1 })
  })
})
