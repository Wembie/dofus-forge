// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import '@/test/i18n.ts'
import type { AppItem } from '@/data/loaders.ts'
import { ForgePassivesBlock } from '../ForgePassivesBlock.tsx'

afterEach(cleanup)

const item = (ankama_id: number, name: string, slot: string, type = 'Misc', level = 200): AppItem =>
  ({ ankama_id, name, level, type, slot, effects: [], set_id: null, image_url: null }) as AppItem

const ABYSSAL   = item(18043, 'Abyssal Dofus', 'dofus', 'Dofus')
const OCHRE     = item(7754, 'Ochre Dofus', 'dofus', 'Dofus')
const PRYSM     = item(22012, 'Shiny Prysipitate', 'dofus', 'Prysmaradite')
const BRUMAIRE  = item(20355, "Brumaire's Shiver", 'weapon')
const TURQUOISE = item(739, 'Turquoise Dofus', 'dofus', 'Dofus') // final damage only: never listed
const itemsById = new Map([ABYSSAL, OCHRE, PRYSM, BRUMAIRE, TURQUOISE].map(i => [i.ankama_id, i]))

function block(props: Partial<Parameters<typeof ForgePassivesBlock>[0]> = {}) {
  const onExcluded = vi.fn()
  const onMode = vi.fn()
  render(<ForgePassivesBlock mode="max" excluded={[]} itemsById={itemsById} planner={{}} onMode={onMode} onExcluded={onExcluded} {...props} />)
  return { onExcluded, onMode }
}

const section = (key: string) => screen.getByText(key).closest('div.rounded-md') as HTMLElement

describe('ForgePassivesBlock', () => {
  it('lists no section while passives are off', () => {
    block({ mode: 'off' })
    expect(screen.queryByTestId('passive-sections')).toBeNull()
  })

  it('splits the passive items into Dofus, Prysmaradites and legendary items, with counts', () => {
    block({ excluded: [OCHRE.ankama_id] })
    expect(within(section('optimizer_passive_section_dofus')).getByText('1/2')).toBeTruthy()
    expect(within(section('optimizer_passive_section_prysmaradite')).getByText('1/1')).toBeTruthy()
    expect(within(section('optimizer_passive_section_legendary')).getByText('1/1')).toBeTruthy()
    const dofus = within(section('optimizer_passive_section_dofus')).getByRole('checkbox') as HTMLInputElement
    expect(dofus.checked && dofus.indeterminate).toBe(true)
  })

  it('a section checkbox leaves its whole section out, or brings it back', () => {
    const { onExcluded } = block({ excluded: [OCHRE.ankama_id, PRYSM.ankama_id] })
    fireEvent.click(within(section('optimizer_passive_section_dofus')).getByRole('checkbox'))
    expect(onExcluded).toHaveBeenLastCalledWith([PRYSM.ankama_id])
    fireEvent.click(within(section('optimizer_passive_section_legendary')).getByRole('checkbox'))
    expect(onExcluded.mock.lastCall![0].sort()).toEqual([OCHRE.ankama_id, BRUMAIRE.ankama_id, PRYSM.ankama_id].sort())
  })

  it('the gear opens the section items, each with its bonus and its own checkbox', () => {
    const { onExcluded } = block()
    const legendary = section('optimizer_passive_section_legendary')
    const gear = within(legendary).getByRole('button', { name: 'optimizer_passive_section_configure' })
    expect(gear.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(gear)
    expect(gear.getAttribute('aria-expanded')).toBe('true')
    const row = within(legendary).getByText("Brumaire's Shiver").closest('label')!
    expect(row.textContent).toMatch(/\+\d/)
    fireEvent.click(within(row).getByRole('checkbox'))
    expect(onExcluded).toHaveBeenLastCalledWith([BRUMAIRE.ankama_id])
  })

  it('in planner mode an item the player never set says so', () => {
    block({ mode: 'planner' })
    const dofus = section('optimizer_passive_section_dofus')
    fireEvent.click(within(dofus).getByRole('button'))
    expect(within(dofus).getAllByText('optimizer_passive_not_set')).toHaveLength(2)
  })
})
