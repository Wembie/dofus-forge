// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@/test/i18n.ts'
import { STAT_META } from '@/features/equipment/statDisplay.ts'
import { OPTIMIZER_STATS, STAT_GROUPS } from '@/features/optimizer/statList.ts'
import { FILTER_LAYOUT, layoutStats } from '../statFilterLayout.ts'
import { StatFilter } from '../StatFilter.tsx'

afterEach(cleanup)

const tKeyOf = (s: string) => STAT_META[s]?.tKey
const layout = (stats: string[]) => layoutStats(stats, tKeyOf, s => s)

describe('statFilterLayout', () => {
  it('places every known item stat, so none falls into "Other"', () => {
    const unplaced = [...new Set(Object.values(STAT_META).map(m => m.tKey))]
      .filter(tKey => !FILTER_LAYOUT.some(g => g.sections.some(s => s.tKeys.includes(tKey))))
    expect(unplaced).toEqual([])
  })

  it('follows the Forge: same groups, same order, Power with the main effects', () => {
    const tKey = new Map(OPTIMIZER_STATS.map(s => [s.key, s.tKey]))
    const forgeOrder = STAT_GROUPS.flatMap(g => g.statKeys).map(k => tKey.get(k)!)
    const filterOrder = FILTER_LAYOUT.flatMap(g => g.sections.flatMap(s => s.tKeys)).filter(k => forgeOrder.includes(k))
    expect(filterOrder).toEqual(forgeOrder)
    const primary = FILTER_LAYOUT.find(g => g.key === 'primary')!
    expect(primary.sections.flatMap(s => s.tKeys)).toContain('stat_power')
    expect(FILTER_LAYOUT.find(g => g.key === 'damage')!.sections.flatMap(s => s.tKeys)).not.toContain('stat_power')
  })

  it('lays catalog stats out by group and sub-section in that order, leaving out empty ones', () => {
    const { groups, other } = layout(['Agility', 'Power', 'AP', '% Fire Resistance', 'Fire Resistance', 'Neutral damage', 'Damage', 'Fertile', 'Lock'])
    expect(groups.map(g => [g.key, g.sections.map(s => s.stats)])).toEqual([
      ['primary', [['AP'], ['Agility', 'Power']]],
      ['damage', [['Damage', 'Neutral damage']]],
      ['res', [['Fire Resistance'], ['% Fire Resistance']]],
      ['combat', [['Lock']]],
    ])
    expect(other).toEqual(['Fertile'])
  })
})

describe('StatFilter', () => {
  it('shows the groups in the Forge order with Power under the main effects', () => {
    render(<StatFilter stats={['Lock', 'Power', 'Strength', 'AP', 'Damage', '% Water Resistance']} selected={[]} onSelect={() => {}} />)
    fireEvent.click(screen.getByRole('button'))
    const text = document.body.textContent!
    const at = (s: string) => text.indexOf(s)
    expect(at('stat_group_primary')).toBeLessThan(at('stat_power'))
    expect(at('stat_power')).toBeLessThan(at('stat_group_damage'))
    expect(at('stat_group_damage')).toBeLessThan(at('stat_group_resistance'))
    expect(at('stat_group_resistance')).toBeLessThan(at('optimizer_group_combat'))
    expect(at('optimizer_group_core')).toBeLessThan(at('stat_ap'))
    expect(at('optimizer_group_chars')).toBeLessThan(at('stat_strength'))
    expect(text).not.toContain('stat_group_other')
  })
})
