// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@/test/i18n.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { reloadCombatView } from '@/store/useCombatView.ts'
import type { AppItem } from '@/data/loaders.ts'
import { StatsPanel } from '../StatsPanel.tsx'

const RING = { ankama_id: 999, name: 'Ring', level: 1, type: 'Ring', slot: 'ring', set_id: null,
  effects: [{ stat: 'Strength', min: 100, max: 100 }, { stat: 'Power', min: 60, max: 60 }] } as unknown as AppItem
const store = () => useBuildStore.getState()

beforeEach(() => {
  localStorage.clear()
  reloadCombatView()
  store().reset()
  store().setEquipment([RING])
  store().setSetsData([])
  store().setClass('iop')
  store().equipItem('ring1', 999)
})
afterEach(cleanup)

describe('StatsOverview characteristics', () => {
  it('shows strength with power added, and the split on hover', () => {
    render(<StatsPanel />)
    const total = screen.getByText('160')
    fireEvent.mouseEnter(total.closest('.stats-has-breakdown')!)
    expect(screen.getAllByText(/stats_power_own/).length).toBeGreaterThan(0)
  })

  it('counts unspent points and opens the window from a characteristic', () => {
    render(<StatsPanel />)
    expect(screen.getByText(/stats_points_left/)).toBeTruthy()
    let detail: unknown = 'none'
    window.addEventListener('df:open-characteristics', e => { detail = (e as CustomEvent).detail }, { once: true })
    fireEvent.click(screen.getAllByRole('button', { name: /stats_allocate_stat/ })[1])
    expect(detail).toBe('strength')
  })

  it('initiative counts characteristics without power', () => {
    expect(store().stats!.initiative).toBe(100)
  })
})
