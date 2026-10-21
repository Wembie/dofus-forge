// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import '@/test/i18n.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { reloadCombatView } from '@/store/useCombatView.ts'
import type { AppItem } from '@/data/loaders.ts'
import { CharacteristicsPanel } from '../CharacteristicsPanel.tsx'
import { StatsPanel } from '@/features/stats-panel/StatsPanel.tsx'

const DOFUSTEUSE = { ankama_id: 958, name: 'Dofusteuse', level: 200, type: 'Cloak', slot: 'cape', effects: [], set_id: null } as unknown as AppItem
const NIGHTMARE  = { ankama_id: 26066, name: 'Nightmare Dofus', level: 180, type: 'Dofus', slot: 'dofus', effects: [], set_id: null } as unknown as AppItem
const store = () => useBuildStore.getState()
const row = (label: string) => screen.getByText(label).parentElement!

beforeEach(() => {
  localStorage.clear()
  reloadCombatView()
  store().reset()
  store().setEquipment([DOFUSTEUSE, NIGHTMARE])
  store().setSetsData([])
  store().setClass('iop')
  store().equipItem('cape', 958)
  store().equipItem('dofus1', 26066)
  store().setPassive('958.0', 2)   // Dofusteuse: +400 Strength this turn
  store().setPassive('26066.0', 1) // Nightmare: +100 Power
})
afterEach(cleanup)

describe('CharacteristicsPanel combat view', () => {
  it('shows gear characteristics by default', () => {
    render(<CharacteristicsPanel />)
    expect(row('stat_strength').textContent).not.toContain('+400')
  })

  it('with passives on: characteristics and Power include the passives, with what each adds', () => {
    render(<CharacteristicsPanel />)
    fireEvent.click(screen.getByRole('switch'))
    const strength = row('stat_strength').textContent!
    expect(strength).toContain('+400')
    expect(strength).toContain(String(store().stats!.strength + 400 + 100)) // strength + power
    expect(screen.getByText(/stat_power/).parentElement!.textContent).toContain('+100')
  })

  it('one switch for both panels: turning it on in one turns it on in the other', () => {
    render(<><CharacteristicsPanel /><StatsPanel /></>)
    const [first, second] = screen.getAllByRole('switch')
    fireEvent.click(first)
    expect(second.getAttribute('aria-checked')).toBe('true')
    expect(within(row('stat_strength')).getByText('+400')).toBeTruthy()
  })
})
