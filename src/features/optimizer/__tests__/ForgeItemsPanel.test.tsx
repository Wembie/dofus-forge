// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import '@/test/i18n.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import { ForgeItemsPanel } from '../ForgeItemsPanel.tsx'
import { BuildResultCard } from '../BuildResultCard.tsx'
import { useForgePicks, planRequired, searchItems } from '../forgePicks.ts'
import type { BuildResult } from '../types.ts'

afterEach(cleanup)
beforeEach(() => {
  localStorage.clear()
  useForgePicks.setState({ required: [], banned: [] })
})

const item = (ankama_id: number, name: string, slot: string, level = 200, set_id: number | null = null): AppItem =>
  ({ ankama_id, name, level, type: 'Misc', slot, effects: [], set_id, image_url: null }) as AppItem

const WAND   = item(1, 'Anomalous Wand', 'weapon', 200)
const WAND_2 = item(2, 'Wandering Hat', 'hat', 150)
const RING   = item(3, 'Ring of Ages', 'ring', 190, 50)
const LOW    = item(4, 'Wand of Dawn', 'weapon', 20)
const ODD    = item(5, 'Wanderer Mount Certificate', 'certificate', 200)
const ITEMS  = [WAND, WAND_2, RING, LOW, ODD]
const SETS   = [{ ankama_id: 50, name: 'Ancient Set', items: [3], bonuses: {} }] as AppSet[]
const setNames = new Map(SETS.map(s => [s.ankama_id, s.name]))

function panel(equipped = {}) {
  const required = useForgePicks.getState().required
  const placements = planRequired(required, new Map(ITEMS.map(i => [i.ankama_id, i])), new Set(), equipped, 200)
  return render(<ForgeItemsPanel items={ITEMS} sets={SETS} equipped={equipped} placements={placements} />)
}

describe('searchItems', () => {
  it('matches every word in the name or the set name, accent-insensitive, best first', () => {
    // Whole word (higher level first), then a name starting with it.
    expect(searchItems(ITEMS, setNames, 'wand').map(i => i.ankama_id)).toEqual([1, 4, 2])
    expect(searchItems([item(10, 'Bowand', 'weapon'), item(11, 'Wandy', 'weapon', 1), item(12, 'Big Wandy', 'weapon')], setNames, 'wand').map(i => i.ankama_id)).toEqual([11, 12, 10])
    expect(searchItems([item(13, 'Wand (x)', 'weapon')], setNames, '(x').map(i => i.ankama_id)).toEqual([13])
    expect(searchItems(ITEMS, setNames, 'ANCIENT').map(i => i.ankama_id)).toEqual([3])
    expect(searchItems(ITEMS, setNames, 'ring ancient').map(i => i.ankama_id)).toEqual([3])
    expect(searchItems([item(9, 'Épée Royale', 'weapon')], setNames, 'epee').map(i => i.ankama_id)).toEqual([9])
  })

  it('needs two letters and leaves out items no slot can wear', () => {
    expect(searchItems(ITEMS, setNames, 'w')).toEqual([])
    expect(searchItems(ITEMS, setNames, 'wanderer')).toEqual([])
  })
})

describe('ForgeItemsPanel', () => {
  it('pins from the search (button or Enter) and bans from it', () => {
    panel()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'wand' } })
    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(rows[0].textContent).toContain('Anomalous Wand')
    fireEvent.click(within(rows[2]).getByRole('button', { name: /optimizer_ban_item/ }))
    expect(useForgePicks.getState().banned).toEqual([2])
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(useForgePicks.getState().required).toEqual([1])
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('arrow keys choose which result Enter pins', () => {
    panel()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'wand' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(useForgePicks.getState().required).toEqual([4])
  })

  it('pins the planner gear in one tap', () => {
    panel({ weapon: 1, hat: 2 })
    // Planner order: hat, then weapon.
    const [, pinWand] = screen.getAllByRole('button', { pressed: false }).filter(b => b.getAttribute('aria-label')?.includes('optimizer_items_pin_hint'))
    fireEvent.click(pinWand)
    expect(useForgePicks.getState().required).toEqual([1])
  })

  it('lists pinned items with their slot and conflicts, and banned ones to release', () => {
    useForgePicks.setState({ required: [1, 4], banned: [3] })
    panel()
    expect(screen.getByText('Anomalous Wand')).toBeTruthy()
    expect(screen.getByText(/optimizer_items_goes_to/)).toBeTruthy()
    expect(screen.getByText(/optimizer_items_no_slot/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /optimizer_unban: Ring of Ages/ }))
    expect(useForgePicks.getState().banned).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: /optimizer_items_unpin: Wand of Dawn/ }))
    expect(useForgePicks.getState().required).toEqual([1])
  })
})

describe('BuildResultCard pins', () => {
  const result = {
    equipped: { weapon: 1, hat: 2 }, stats: { pointsBudget: 0, pointsSpent: 0, power: 0 }, score: 10, meetsRequired: true,
    conditionsOk: true, exo: {}, runes: {}, requirementsMet: 0, requirementsTotal: 0,
  } as unknown as BuildResult

  it('marks a pinned item, which can no longer be banned, and pins another one', () => {
    let pinned = 0
    let bans = 0
    render(
      <BuildResultCard
        result={result} rank={1} items={ITEMS} requirements={[]} runes={{}} lockedSlots={new Set()}
        onLoad={() => {}} onBan={() => { bans++ }} onPin={id => { pinned = id }} requiredItems={[1]}
      />,
    )
    expect(screen.getAllByLabelText('optimizer_pinned_badge')).toHaveLength(1)
    const pinButtons = screen.getAllByRole('button', { name: 'optimizer_pin_item' })
    expect(pinButtons).toHaveLength(1)
    fireEvent.click(pinButtons[0])
    expect(pinned).toBe(2)
    expect(screen.getAllByRole('button', { name: 'optimizer_ban_item' })).toHaveLength(1)
    expect(bans).toBe(0)
  })
})

describe('BuildResultCard passives', () => {
  const result = {
    equipped: { weapon: 1, hat: 2 }, stats: { pointsBudget: 0, pointsSpent: 0, power: 0 }, score: 10, meetsRequired: true,
    conditionsOk: true, exo: {}, runes: {}, requirementsMet: 0, requirementsTotal: 0,
  } as unknown as BuildResult
  const card = (passiveItems?: ReadonlySet<number>) => render(
    <BuildResultCard result={result} rank={1} items={ITEMS} requirements={[]} runes={{}} lockedSlots={new Set()} onLoad={() => {}} passiveItems={passiveItems} />,
  )

  it('marks the items whose counted passive is in the stats, and says so in the header', () => {
    card(new Set([2, 999]))
    expect(screen.getAllByLabelText('optimizer_passive_badge')).toHaveLength(1)
    expect(screen.getByText(/optimizer_with_passives/)).toBeTruthy()
  })

  it('shows nothing when no worn item has a counted passive', () => {
    card(new Set([999]))
    expect(screen.queryByLabelText('optimizer_passive_badge')).toBeNull()
    expect(screen.queryByText(/optimizer_with_passives/)).toBeNull()
  })
})
