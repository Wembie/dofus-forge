import { describe, it, expect } from 'vitest'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import { searchItems } from '../forgePicks.ts'

const item = (ankama_id: number, name: string, slot: string, level = 200, set_id: number | null = null): AppItem =>
  ({ ankama_id, name, level, type: 'Misc', slot, effects: [], set_id, image_url: null }) as AppItem

const WAND   = item(1, 'Anomalous Wand', 'weapon', 200)
const WAND_2 = item(2, 'Wandering Hat', 'hat', 150)
const RING   = item(3, 'Ring of Ages', 'ring', 190, 50)
const LOW    = item(4, 'Wand of Dawn', 'weapon', 20)
const ODD    = item(5, 'Wanderer Mount Certificate', 'certificate', 200)
const ITEMS  = [WAND, WAND_2, RING, LOW, ODD]
const SETS   = [{ ankama_id: 50, name: 'Ancient Set', items: [3], bonuses: {} }] as AppSet[]
const setNames = new Map(SETS.map(s => [s.ankama_id, s.name]))

describe('searchItems', () => {
  it('matches every word in the name or the set name, accent-insensitive, best first', () => {
    // Whole word (higher level first), then a name starting with it.
    expect(searchItems(ITEMS, setNames, 'wand').map(i => i.ankama_id)).toEqual([1, 4, 2])
    expect(searchItems([item(10, 'Bowand', 'weapon'), item(11, 'Wandy', 'weapon', 1), item(12, 'Big Wandy', 'weapon')], setNames, 'wand').map(i => i.ankama_id)).toEqual([11, 12, 10])
    expect(searchItems([item(13, 'Wand (x)', 'weapon')], setNames, '(x').map(i => i.ankama_id)).toEqual([13])
    expect(searchItems(ITEMS, setNames, 'ANCIENT').map(i => i.ankama_id)).toEqual([3])
    expect(searchItems(ITEMS, setNames, 'ring ancient').map(i => i.ankama_id)).toEqual([3])
    expect(searchItems([item(9, 'Épée Royale', 'weapon')], setNames, 'epee').map(i => i.ankama_id)).toEqual([9])
  })

  it('needs two letters and leaves out items no slot can wear', () => {
    expect(searchItems(ITEMS, setNames, 'w')).toEqual([])
    expect(searchItems(ITEMS, setNames, 'wanderer')).toEqual([])
  })
})
