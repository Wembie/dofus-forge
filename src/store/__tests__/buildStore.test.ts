import { describe, it, expect, beforeEach } from 'vitest'
import { useBuildStore, type BuildSnapshot } from '../buildStore.ts'
import { encodeBuild } from '@/features/share/codec.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { AllocatedCharacteristics, ScrolledCharacteristics } from '@/engine/types.ts'

const item = (id: number, slot: string, extra: Partial<AppItem> = {}): AppItem =>
  ({ ankama_id: id, name: `Item ${id}`, level: 1, type: 'Misc', slot, effects: [], set_id: null, image_url: null, ...extra })

const SET_RING   = item(10, 'ring', { set_id: 5, type: 'Ring' })
const PLAIN_RING = item(11, 'ring', { type: 'Ring' })
const PRYSMA_A   = item(20, 'dofus', { type: 'Prysmaradite' })
const PRYSMA_B   = item(21, 'dofus', { type: 'Prysmaradite' })
const DOFUS      = item(22, 'dofus', { type: 'Dofus' })
const HAT        = item(30, 'hat', { effects: [{ stat: 'Vitality', min: 100, max: 100 }] })
const WEAPON_A   = item(40, 'weapon')
const WEAPON_B   = item(41, 'weapon')
const SETS: AppSet[] = [{ ankama_id: 5, name: 'S', items: [10], bonuses: {} }]

const store = () => useBuildStore.getState()
const ZERO = { vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0 } as AllocatedCharacteristics
const NONE = { vitality: false, wisdom: false, strength: false, intelligence: false, chance: false, agility: false } as ScrolledCharacteristics

beforeEach(() => {
  store().reset()
  store().setEquipment([SET_RING, PLAIN_RING, PRYSMA_A, PRYSMA_B, DOFUS, HAT, WEAPON_A, WEAPON_B])
  store().setSetsData(SETS)
  store().setClass('iop')
})

describe('equipping follows the game rules', () => {
  it('the same set ring moves instead of being worn twice', () => {
    store().equipItem('ring1', SET_RING.ankama_id)
    store().equipItem('ring2', SET_RING.ankama_id)
    expect(store().equipped.ring1).toBeUndefined()
    expect(store().equipped.ring2).toBe(SET_RING.ankama_id)
  })

  it('a ring outside any set can be worn twice', () => {
    store().equipItem('ring1', PLAIN_RING.ankama_id)
    store().equipItem('ring2', PLAIN_RING.ankama_id)
    expect(store().equipped.ring1).toBe(PLAIN_RING.ankama_id)
    expect(store().equipped.ring2).toBe(PLAIN_RING.ankama_id)
  })

  it('only one Prysmaradite at a time', () => {
    store().equipItem('dofus1', PRYSMA_A.ankama_id)
    store().equipItem('dofus2', DOFUS.ankama_id)
    store().equipItem('dofus3', PRYSMA_B.ankama_id)
    expect(store().equipped.dofus1).toBeUndefined()
    expect(store().equipped.dofus2).toBe(DOFUS.ankama_id)
    expect(store().equipped.dofus3).toBe(PRYSMA_B.ankama_id)
  })

  it('equipMultiple applies the same rules', () => {
    store().equipMultiple([{ slot: 'ring1', ankama_id: SET_RING.ankama_id }, { slot: 'ring2', ankama_id: SET_RING.ankama_id }])
    expect(store().equipped.ring1).toBeUndefined()
    expect(store().equipped.ring2).toBe(SET_RING.ankama_id)
  })

  it('re-picking the item already in the slot keeps its forgemagie', () => {
    store().equipItem('hat', HAT.ankama_id)
    store().setRune('hat', 'Vitality', 50)
    store().setForjamagoName('hat', 'Smith')
    store().equipItem('hat', HAT.ankama_id)
    expect(store().runes.hat).toEqual({ Vitality: 50 })
    expect(store().forjamagoNames.hat).toBe('Smith')
  })
})

describe('stats', () => {
  it('runes left on an empty slot add nothing', () => {
    store().equipItem('hat', HAT.ankama_id)
    store().setRune('hat', 'Vitality', 50)
    const withRune = store().stats!.vitality
    store().setEquipped({})
    expect(store().stats!.vitality).toBe(withRune - 150)
    expect(store().runes.hat).toEqual({ Vitality: 50 })
  })
})

describe('build name', () => {
  it('cutting at 60 characters never splits an emoji (share link keeps encoding)', () => {
    store().setBuildName(`${'a'.repeat(59)}😀😀`)
    expect(Array.from(store().buildName)).toHaveLength(60)
    expect(() => encodeBuild(store())).not.toThrow()
  })
})

describe('applySnapshot', () => {
  it('a malformed snapshot is normalized instead of crashing', () => {
    expect(() => store().applySnapshot({ v: 1, c: 'iop', a: [-1] } as unknown as BuildSnapshot)).not.toThrow()
    expect(store().allocated.vitality).toBe(0)
    expect(store().level).toBe(200)
  })
})

describe('applyForgeResult', () => {
  const result = {
    equipped: { weapon: WEAPON_B.ankama_id, hat: HAT.ankama_id },
    allocated: ZERO, scrolled: NONE,
    exo: { hat: 'ap' as const },
    runes: { weapon: { stat: 'Strength', value: 20 } },
  }

  it('loads gear, exo and transcendence runes in one update', () => {
    let updates = 0
    const unsub = useBuildStore.subscribe(() => { updates++ })
    store().applyForgeResult(result, new Set())
    unsub()
    expect(updates).toBe(1)
    expect(store().equipped).toEqual(result.equipped)
    expect(store().runes.hat).toEqual({ AP: 1 })
    expect(store().runes.weapon).toEqual({ 'exo:Strength': 20 })
  })

  it('resets the weapon transform and craftsman name of a slot whose item changed', () => {
    store().equipItem('weapon', WEAPON_A.ankama_id)
    store().setWeaponTransform('weapon', { element: 'fire', ratio: 85 })
    store().setForjamagoName('weapon', 'Smith')
    store().applyForgeResult(result, new Set())
    expect(store().weaponTransforms.weapon).toBeNull()
    expect(store().forjamagoNames.weapon).toBe('')
  })

  it('leaves locked slots untouched', () => {
    store().equipItem('hat', HAT.ankama_id)
    store().setRune('hat', 'Vitality', 50)
    store().applyForgeResult(result, new Set(['hat']))
    expect(store().runes.hat).toEqual({ Vitality: 50 })
  })
})
