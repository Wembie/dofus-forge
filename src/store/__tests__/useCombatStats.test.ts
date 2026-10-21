// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBuildStore } from '../buildStore.ts'
import { useCombatStats } from '../useCombatStats.ts'
import type { AppItem } from '@/data/loaders.ts'

const TURQUOISE = { ankama_id: 739, name: 'Turquoise Dofus', level: 160, type: 'Dofus', slot: 'dofus', effects: [], set_id: null } as unknown as AppItem
const store = () => useBuildStore.getState()

beforeEach(() => {
  store().reset()
  store().setEquipment([TURQUOISE])
  store().setSetsData([])
  store().setClass('iop')
})

describe('useCombatStats', () => {
  it('adds the passives of equipped items on top of the gear stats', () => {
    store().equipItem('dofus1', 739)
    const { result } = renderHook(() => useCombatStats())
    expect(result.current?.finalDamagePercent).toBe(0)
    act(() => store().setPassive('739.0', 6))
    expect(result.current?.finalDamagePercent).toBe(6)
    expect(store().stats?.finalDamagePercent).toBe(0)
  })

  it('ignores the setting once the item is unequipped', () => {
    store().equipItem('dofus1', 739)
    store().setPassive('739.0', 6)
    const { result } = renderHook(() => useCombatStats())
    act(() => store().unequipItem('dofus1'))
    expect(result.current?.finalDamagePercent).toBe(0)
  })
})
