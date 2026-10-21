// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import '@/test/i18n.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { reloadCombatView } from '@/store/useCombatView.ts'
import type { AppItem } from '@/data/loaders.ts'
import { StatsPanel } from '../StatsPanel.tsx'
import { CombatViewBar } from '@/features/passives/CombatViewBar.tsx'

const ABYSSAL = { ankama_id: 18043, name: 'Abyssal Dofus', level: 180, type: 'Dofus', slot: 'dofus', effects: [], set_id: null } as unknown as AppItem
const store = () => useBuildStore.getState()
const apBadge = () => screen.getByText('badge_ap').parentElement!

beforeEach(() => {
  localStorage.clear()
  reloadCombatView()
  store().reset()
  store().setEquipment([ABYSSAL])
  store().setSetsData([])
  store().setClass('iop')
  store().equipItem('dofus1', 18043)
  store().setPassive('18043.0', 2) // +1 AP (adjacent enemy)
})
afterEach(cleanup)

describe('StatsPanel combat view', () => {
  it('has no control of its own (the view is chosen in CombatViewBar)', () => {
    render(<StatsPanel />)
    expect(screen.queryByRole('switch')).toBeNull()
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('gear stats by default; in combat, the combat value, what the passive adds and a header tag', () => {
    render(<><CombatViewBar /><div data-testid="stats"><StatsPanel /></div></>)
    const gearAp = store().stats!.ap
    expect(apBadge().textContent).toContain(String(gearAp))
    expect(apBadge().textContent).not.toContain('+1')
    expect(within(screen.getByTestId('stats')).queryByText('combat_view_combat')).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: /combat_view_combat/ }))
    expect(apBadge().textContent).toContain(String(gearAp + 1))
    expect(apBadge().textContent).toContain('+1')
    expect(within(screen.getByTestId('stats')).getByText('combat_view_combat')).toBeTruthy()
    expect(localStorage.getItem('dofus-forge:stats-with-passives')).toBe('1')
  })
})
