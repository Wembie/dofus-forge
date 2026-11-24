import { describe, it, expect } from 'vitest'
import {
  LEGENDARY_BONUSES, legendaryBonusOf, legendaryMax, legendaryStatBonus, sanitizeLegendaryPick,
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

  it('a stacks control adds up per stack; a text-only bonus adds nothing', () => {
    const mulou = legendaryBonusOf('poukachi.mulou')!
    expect(legendaryStatBonus({ id: mulou.id, value: 2 })).toEqual({ finalDamagePercent: 10 })
    const prespic = legendaryBonusOf('bakushana.prespic')!
    expect(legendaryStatBonus({ id: prespic.id, value: 1 })).toEqual({})
    expect(legendaryStatBonus(null)).toEqual({})
  })

  it('a choice control with two options picks either branch by value', () => {
    const bwork = legendaryBonusOf('poukachi.bwork')!
    expect(legendaryStatBonus({ id: bwork.id, value: 1 })).toEqual({ rangedDamagePercent: 3 })
    expect(legendaryStatBonus({ id: bwork.id, value: 2 })).toEqual({ meleeDamagePercent: 3 })
    expect(legendaryStatBonus({ id: bwork.id, value: 0 })).toEqual({})
  })

  it('legendaryMax reports the control cap, or 1 for a text-only bonus (a plain on/off)', () => {
    expect(legendaryMax('poukachi.mulou')).toBe(2)
    expect(legendaryMax('bakushana.prespic')).toBe(1)
  })

  it('sanitizeLegendaryPick drops an unknown id and clamps a value past the max', () => {
    expect(sanitizeLegendaryPick(null)).toBeNull()
    expect(sanitizeLegendaryPick({ id: 'nope.nope', value: 1 })).toBeNull()
    expect(sanitizeLegendaryPick({ id: 'poukachi.mulou', value: 99 })).toEqual({ id: 'poukachi.mulou', value: 2 })
    expect(sanitizeLegendaryPick({ id: 'poukachi.mulou', value: -5 })).toEqual({ id: 'poukachi.mulou', value: 0 })
    // Text-only: no control to clamp against, so a pick always counts as "on".
    expect(sanitizeLegendaryPick({ id: 'bakushana.prespic', value: 0 })).toEqual({ id: 'bakushana.prespic', value: 1 })
  })
})
