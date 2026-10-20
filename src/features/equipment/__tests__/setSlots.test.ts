import { describe, it, expect } from 'vitest'
import type { AppItem } from '@/data/loaders.ts'
import { assignSetSlots } from '../setSlots.ts'

const item = (ankama_id: number, slot: string) => ({ ankama_id, slot, name: String(ankama_id) }) as AppItem

describe('assignSetSlots', () => {
  const A = item(1, 'ring'), B = item(2, 'ring'), HAT = item(3, 'hat')

  it('puts both rings of a set in different slots when both ring slots are full', () => {
    const out = assignSetSlots([A, B], { ring1: 90, ring2: 91 })
    expect(Object.fromEntries(out.map(o => [o.slot, o.item.ankama_id]))).toEqual({ ring1: 1, ring2: 2 })
  })

  it('prefers the empty ring slot, then the other one', () => {
    const out = assignSetSlots([A, B], { ring1: 90 })
    expect(out.map(o => [o.slot, o.item.ankama_id])).toEqual([['ring2', 1], ['ring1', 2]])
  })

  it('skips items that are already equipped', () => {
    const out = assignSetSlots([A, B, HAT], { ring1: 1, hat: 77 })
    expect(out.map(o => [o.slot, o.item.ankama_id])).toEqual([['ring2', 2], ['hat', 3]])
  })
})
