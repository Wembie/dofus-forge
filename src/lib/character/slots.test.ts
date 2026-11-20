import { describe, expect, it } from 'vitest'
import { hiddenParts, pickRule, type SlotRule } from './slots'

const rules: SlotRule[] = [
  [0, 0, [[5, 62], [13, 62]]],
  [1, 6, [[8, 62], [9, 62]]],
  [2, 13, [[6, 62]]],
  [3, 2124, [[5, 0]]],
]

describe('slot rules', () => {
  it('picks the most specific rule that applies', () => {
    expect(pickRule(rules, { breed: 8, female: false, head: 1 })?.[0]).toBe(0)
    expect(pickRule(rules, { breed: 6, female: false, head: 1 })?.[0]).toBe(1)
    expect(pickRule(rules, { breed: 6, female: true, head: 1 })?.[0]).toBe(2)
    expect(pickRule(rules, { breed: 8, female: false, head: 2124 })?.[0]).toBe(3)
  })

  it('hides the slots of the chosen rule for the facing', () => {
    expect([...hiddenParts([rules], { breed: 8, female: false, head: 1 }, 1)]).toEqual(['cheveux_1', 'MasqueB_1'])
    expect([...hiddenParts([rules], { breed: 6, female: false, head: 1 }, 6)]).toEqual(['Oreille_d_6', 'Oreille_g_6'])
    expect(hiddenParts([rules], { breed: 8, female: false, head: 2124 }, 1).size).toBe(0)
    expect(hiddenParts([undefined], { breed: 8, female: false, head: 1 }, 1).size).toBe(0)
  })

  it('reads facing bits from the mask', () => {
    const partial: SlotRule[] = [[0, 0, [[5, 0b111010]]]]
    const who = { breed: 1, female: false, head: 1 }
    expect(hiddenParts([partial], who, 0).size).toBe(1)
    expect(hiddenParts([partial], who, 1).size).toBe(0)
  })
})
