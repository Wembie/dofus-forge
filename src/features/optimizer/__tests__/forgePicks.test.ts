// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import type { AppItem } from '@/data/loaders.ts'
import type { SlotId } from '@/store/buildStore.ts'
import { useForgePicks, readPicks, planRequired, slotsFor, PICKS_KEY } from '../forgePicks.ts'
import { STORAGE_KEY, makeDefaultConfig, toWireConfig } from '../forgeConfig.ts'

const item = (ankama_id: number, slot: string, type = 'Misc', level = 200): AppItem =>
  ({ ankama_id, name: `Item ${ankama_id}`, level, type, slot, effects: [], set_id: null, image_url: null }) as AppItem

const WAND     = item(1, 'weapon', 'Wand')
const RING_A   = item(2, 'ring', 'Ring')
const RING_B   = item(3, 'ring', 'Ring')
const RING_C   = item(4, 'ring', 'Ring')
const DOFUS    = item(5, 'dofus', 'Dofus')
const PRYSMA   = item(6, 'dofus', 'Prysmaradite')
const PRYSMA_2 = item(7, 'dofus', 'Prysmaradite')
const PET      = item(8, 'pet', 'Pet')
const LOW_HAT  = item(9, 'hat', 'Hat', 120)
const byId = new Map([WAND, RING_A, RING_B, RING_C, DOFUS, PRYSMA, PRYSMA_2, PET, LOW_HAT].map(i => [i.ankama_id, i]))

const none = new Set<SlotId>()
const plan = (ids: number[], locked = none, equipped: Partial<Record<SlotId, number>> = {}, level = 200) =>
  planRequired(ids, byId, locked, equipped, level)

describe('planRequired (mirrors the engine placement)', () => {
  it('puts each item in its slot; rings and Dofus share their slots', () => {
    const p = plan([WAND.ankama_id, RING_A.ankama_id, RING_B.ankama_id, PRYSMA.ankama_id, DOFUS.ankama_id, PET.ankama_id])
    expect(p.map(x => [x.id, x.slot, x.status])).toEqual([
      [1, 'weapon', 'placed'],
      [2, 'ring1', 'placed'],
      [3, 'ring2', 'placed'],
      [6, 'dofus1', 'placed'],
      [5, 'dofus6', 'placed'],
      [8, 'companion', 'placed'],
    ])
  })

  it('a third ring has no slot left', () => {
    expect(plan([2, 3, 4]).map(x => x.status)).toEqual(['placed', 'placed', 'no_slot'])
  })

  it('never uses a locked slot, and an item already kept there counts as worn', () => {
    const locked = new Set<SlotId>(['weapon', 'ring1'])
    const p = plan([WAND.ankama_id, RING_A.ankama_id, RING_B.ankama_id], locked, { weapon: 99, ring1: RING_A.ankama_id })
    expect(p.map(x => [x.slot, x.status])).toEqual([[null, 'no_slot'], ['ring1', 'kept'], ['ring2', 'placed']])
  })

  it('only one Prysmaradite, counting one kept in a locked slot', () => {
    expect(plan([6, 7]).map(x => x.status)).toEqual(['placed', 'prysmaradite'])
    expect(plan([7], new Set<SlotId>(['dofus1']), { dofus1: 6 })[0].status).toBe('prysmaradite')
  })

  it('flags items above the character level and ids missing from the catalog', () => {
    expect(plan([LOW_HAT.ankama_id], none, {}, 100)[0]).toMatchObject({ status: 'placed', overLevel: true })
    expect(plan([LOW_HAT.ankama_id], none, {}, 150)[0].overLevel).toBe(false)
    expect(plan([12345])[0]).toMatchObject({ status: 'unknown', slot: null })
  })

  it('slotsFor matches the sheet slots', () => {
    expect(slotsFor(RING_A)).toEqual(['ring1', 'ring2'])
    expect(slotsFor(PET)).toEqual(['companion'])
    expect(slotsFor(DOFUS)).toHaveLength(6)
  })
})

describe('useForgePicks', () => {
  beforeEach(() => {
    localStorage.clear()
    useForgePicks.setState({ required: [], banned: [] })
  })

  it('an item is either required or banned, never both', () => {
    const s = useForgePicks.getState()
    s.require(1)
    s.ban(1)
    expect(useForgePicks.getState()).toMatchObject({ required: [], banned: [1] })
    s.require(1)
    expect(useForgePicks.getState()).toMatchObject({ required: [1], banned: [] })
    s.toggleRequired(1)
    expect(useForgePicks.getState().required).toEqual([])
  })

  it('persists and reads back, dropping junk ids', () => {
    useForgePicks.getState().require(5)
    useForgePicks.getState().ban(6)
    expect(JSON.parse(localStorage.getItem(PICKS_KEY)!)).toEqual({ required: [5], banned: [6] })
    localStorage.setItem(PICKS_KEY, JSON.stringify({ required: [5, 5, -1, 'x', 6], banned: [6, 1.5] }))
    expect(readPicks()).toEqual({ required: [5], banned: [6] })
  })

  it('moves bans saved in the old order config over, once', () => {
    localStorage.removeItem(PICKS_KEY)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bannedItems: [11, 12] }))
    expect(readPicks()).toEqual({ required: [], banned: [11, 12] })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({}))
    expect(readPicks().banned).toEqual([11, 12])
  })

  it('reaches the engine config', () => {
    const wire = toWireConfig(makeDefaultConfig(), 96, 200, { required: [1, 2], banned: [3] })
    expect(wire).toMatchObject({ requiredItems: [1, 2], bannedItems: [3] })
    expect(toWireConfig(makeDefaultConfig(), 96, 200)).toMatchObject({ requiredItems: [], bannedItems: [] })
  })
})
