// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@/test/i18n.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import type { AppItem } from '@/data/loaders.ts'
import { StatsPanel } from '../StatsPanel.tsx'

const ABYSSAL = { ankama_id: 18043, name: 'Abyssal Dofus', level: 180, type: 'Dofus', slot: 'dofus', effects: [], set_id: null } as unknown as AppItem
const HAT     = { ankama_id: 1, name: 'Hat', level: 1, type: 'Hat', slot: 'hat', effects: [{ stat: 'AP', min: 1, max: 1 }], set_id: null } as unknown as AppItem
const store = () => useBuildStore.getState()
const apBadge = () => screen.getByText('badge_ap').parentElement!

beforeEach(() => {
  localStorage.clear()
  store().reset()
  store().setEquipment([ABYSSAL, HAT])
  store().setSetsData([])
  store().setClass('iop')
})
afterEach(cleanup)

describe('StatsPanel combat view', () => {
  it('offers the switch only when an equipped item has a passive', () => {
    store().equipItem('hat', 1)
    render(<StatsPanel />)
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('shows gear stats by default and combat stats with what each passive adds when switched on', () => {
    store().equipItem('dofus1', 18043)
    store().setPassive('18043.0', 2) // +1 AP (adjacent enemy)
    render(<StatsPanel />)
    const gearAp = store().stats!.ap
    expect(apBadge().textContent).toContain(String(gearAp))
    expect(apBadge().textContent).not.toContain(`+1`)

    fireEvent.click(screen.getByRole('switch'))
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
    expect(apBadge().textContent).toContain(String(gearAp + 1))
    expect(apBadge().textContent).toContain('+1')
    expect(screen.getByText('stats_combat_hint')).toBeTruthy()
    expect(localStorage.getItem('dofus-forge:stats-with-passives')).toBe('1')
  })

  it('remembers the choice for the next visit', () => {
    localStorage.setItem('dofus-forge:stats-with-passives', '1')
    store().equipItem('dofus1', 18043)
    render(<StatsPanel />)
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  })
})
