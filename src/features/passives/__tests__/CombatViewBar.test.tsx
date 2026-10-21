// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@/test/i18n.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { reloadCombatView } from '@/store/useCombatView.ts'
import type { AppItem } from '@/data/loaders.ts'
import { CombatViewBar } from '../CombatViewBar.tsx'

const TURQUOISE = { ankama_id: 739, name: 'Turquoise Dofus', level: 160, type: 'Dofus', slot: 'dofus', effects: [], set_id: null } as unknown as AppItem
const ABYSSAL   = { ankama_id: 18043, name: 'Abyssal Dofus', level: 180, type: 'Dofus', slot: 'dofus', effects: [], set_id: null } as unknown as AppItem
const HAT       = { ankama_id: 1, name: 'Hat', level: 1, type: 'Hat', slot: 'hat', effects: [], set_id: null } as unknown as AppItem
const store = () => useBuildStore.getState()
const radio = (name: RegExp) => screen.getByRole('radio', { name })

beforeEach(() => {
  localStorage.clear()
  reloadCombatView()
  store().reset()
  store().setEquipment([TURQUOISE, ABYSSAL, HAT])
  store().setSetsData([])
  store().setClass('iop')
})
afterEach(cleanup)

describe('CombatViewBar', () => {
  it('only appears with an equipped passive item', () => {
    store().equipItem('hat', 1)
    const { container } = render(<CombatViewBar />)
    expect(container.innerHTML).toBe('')
  })

  it('Gear / In combat is one choice; gear is the default', () => {
    store().equipItem('dofus1', 739)
    render(<CombatViewBar />)
    expect(screen.getByRole('radiogroup')).toBeTruthy()
    expect(radio(/combat_view_gear/).getAttribute('aria-checked')).toBe('true')
    expect(radio(/combat_view_combat/).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByText('combat_view_gear_hint')).toBeTruthy()
    fireEvent.click(radio(/combat_view_combat/))
    expect(radio(/combat_view_combat/).getAttribute('aria-checked')).toBe('true')
    expect(radio(/combat_view_gear/).getAttribute('aria-checked')).toBe('false')
  })

  it('says when no passive is active yet', () => {
    store().equipItem('dofus1', 739)
    store().equipItem('dofus2', 18043)
    render(<CombatViewBar />)
    fireEvent.click(radio(/combat_view_combat/))
    expect(radio(/combat_view_combat/).textContent).toContain('0')
    expect(screen.getByText('combat_view_none')).toBeTruthy()
  })

  it('counts each item with an active passive once', () => {
    store().equipItem('dofus1', 739)
    store().equipItem('dofus2', 18043)
    store().setPassive('739.0', 4)
    store().setPassive('18043.0', 1)
    render(<CombatViewBar />)
    fireEvent.click(radio(/combat_view_combat/))
    expect(radio(/combat_view_combat/).textContent).toContain('2')
    expect(screen.getByText('stats_combat_hint')).toBeTruthy()
  })

  it('offers the shortcut to the passives panel only where that panel is on screen', () => {
    store().equipItem('dofus1', 739)
    const { rerender } = render(<CombatViewBar />)
    expect(screen.queryByRole('button', { name: /combat_view_edit/ })).toBeNull()
    rerender(<CombatViewBar showEdit />)
    expect(screen.getByRole('button', { name: /combat_view_edit/ })).toBeTruthy()
  })

  it('remembers the choice for the next visit', () => {
    localStorage.setItem('dofus-forge:stats-with-passives', '1')
    reloadCombatView()
    store().equipItem('dofus1', 739)
    render(<CombatViewBar />)
    expect(radio(/combat_view_combat/).getAttribute('aria-checked')).toBe('true')
  })
})
