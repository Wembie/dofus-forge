// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, renderHook, act, within } from '@testing-library/react'
import '@/test/i18n.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { reloadCombatView, setCombatView } from '@/store/useCombatView.ts'
import { useCombatStats } from '@/store/useCombatStats.ts'
import { calcDamage } from '@/features/spells/spellDamage.ts'
import type { AppItem } from '@/data/loaders.ts'
import { CharacteristicsPanel } from '../CharacteristicsPanel.tsx'
import { StatsPanel } from '@/features/stats-panel/StatsPanel.tsx'
import { CombatViewBar } from '@/features/passives/CombatViewBar.tsx'

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
  it('shows gear characteristics by default, with no control of its own', () => {
    render(<CharacteristicsPanel />)
    expect(row('stat_strength').textContent).not.toContain('+400')
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByText('combat_view_combat')).toBeNull()
  })

  it('one control for both panels (the bar above them): In combat updates the characteristics too', () => {
    render(<><CombatViewBar /><div data-testid="chars"><CharacteristicsPanel /></div><StatsPanel /></>)
    expect(screen.getAllByRole('radiogroup')).toHaveLength(1)
    fireEvent.click(screen.getByRole('radio', { name: /combat_view_combat/ }))
    const strength = row('stat_strength').textContent!
    expect(strength).toContain('+400')
    expect(strength).toContain(String(store().stats!.strength + 400 + 100)) // strength + power
    expect(within(screen.getByTestId('chars')).getByText(/stat_power/).parentElement!.textContent).toContain('+100')
    // Each panel says why its numbers changed.
    expect(within(screen.getByTestId('chars')).getByText('combat_view_combat')).toBeTruthy()
  })
})

describe('passives count once, wherever they are shown', () => {
  it('spell damage uses gear + passives once, and the view switch does not change it', () => {
    const { result } = renderHook(() => useCombatStats())
    const before = result.current!
    expect(before.strength).toBe(store().stats!.strength + 400)
    expect(before.power).toBe(store().stats!.power + 100)
    const hit = calcDamage(10, 'earth', before)
    act(() => setCombatView(true))
    expect(calcDamage(10, 'earth', result.current!)).toBe(hit)
    expect(store().stats!.strength).toBe(before.strength - 400) // gear stats never include passives
  })
})
