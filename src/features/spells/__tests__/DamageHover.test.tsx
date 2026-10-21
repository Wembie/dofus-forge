// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@/test/i18n.ts'
import type { StatBlock } from '@/engine/types.ts'
import { DamageHover } from '../DamageHover.tsx'
import { calcDamage } from '../spellDamage.ts'

afterEach(cleanup)

const stats = {
  strength: 0, intelligence: 820, chance: 0, agility: 0, power: 180,
  damage: 0, bestElemDamage: 0, critDamage: 174,
  earthDamage: 0, fireDamage: 104, waterDamage: 0, airDamage: 0, neutralDamage: 0,
} as StatBlock

function hover() {
  fireEvent.mouseEnter(screen.getByTestId('damage-hover'))
  return screen.getByRole('tooltip')
}

describe('DamageHover', () => {
  it('shows every step of a critical ranged spell hit, ending on the shown value', () => {
    const mods = { kindPct: 0, rangePct: 10, range: 'ranged' as const }
    render(
      <DamageHover roll={[35, 35]} elem="fire" stats={stats} mods={mods} extraFlat={174} kind="spell" crit>
        {calcDamage(35, 'fire', stats, mods, 174)}
      </DamageHover>,
    )
    const tip = hover().textContent!
    expect(tip).toContain('dmg_bd_crit_title')
    expect(tip).toContain('char_intelligence 820 + stat_power 180')
    expect(tip).toContain('×11')
    expect(tip).toContain('385')
    expect(tip).toContain('dmg_bd_fixed+104489')
    expect(tip).toContain('stat_crit_damage+174663')
    expect(tip).toContain('stat_ranged_dmg×1,1729')
    expect(tip).not.toContain('stat_spell_dmg')
    expect(tip).toMatch(/dmg_bd_total729/)
  })

  // The test i18n runs in Spanish, so multipliers use a decimal comma.
  it('weapon hits label % Weapon Damage and Weapon Mastery; hides on leave', () => {
    const s = { ...stats, intelligence: 100, power: 0, fireDamage: 0 } as StatBlock
    render(
      <DamageHover roll={[10, 20]} elem="fire" stats={s} mods={{ kindPct: 20, rangePct: 0, power: 300 }} kind="weapon">
        x
      </DamageHover>,
    )
    const tip = hover().textContent!
    expect(tip).toContain('weapon_mastery 300')
    expect(tip).toContain('stat_weapon_dmg×1,2')
    expect(tip).toContain(`dmg_bd_total${calcDamage(10, 'fire', s, { kindPct: 20, rangePct: 0, power: 300 })}–${calcDamage(20, 'fire', s, { kindPct: 20, rangePct: 0, power: 300 })}`)
    fireEvent.mouseLeave(screen.getByTestId('damage-hover'))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('renders just the value when there are no stats to explain', () => {
    render(<DamageHover roll={[1, 2]} elem="fire" stats={null} mods={{ kindPct: 0, rangePct: 0 }} kind="spell">1–2</DamageHover>)
    expect(screen.queryByTestId('damage-hover')).toBeNull()
    expect(screen.getByText('1–2')).toBeTruthy()
  })
})

describe('DamageHover with % final damage', () => {
  it('shows the final damage step only when a passive gives it', () => {
    const s = { ...stats, finalDamagePercent: 10 } as StatBlock
    const mods = { kindPct: 0, rangePct: 10, range: 'ranged' as const }
    render(<DamageHover roll={[35, 35]} elem="fire" stats={s} mods={mods} extraFlat={174} kind="spell" crit>x</DamageHover>)
    const tip = hover().textContent!
    expect(tip).toContain('stat_final_dmg×1,1802')
    expect(tip).toMatch(/dmg_bd_total802/)
  })
})

describe('DamageHover with target vulnerability', () => {
  it('shows it as the last step', () => {
    const s = { ...stats, intelligence: 0, power: 0, fireDamage: 0, finalDamagePercent: 10, targetVulnerabilityPercent: 6 } as StatBlock
    render(<DamageHover roll={[1000, 1000]} elem="fire" stats={s} mods={{ kindPct: 0, rangePct: 0 }} kind="spell">x</DamageHover>)
    const tip = hover().textContent!
    expect(tip).toContain('stat_final_dmg×1,11100')
    expect(tip).toContain('stat_target_vulnerability×1,061166')
  })
})
