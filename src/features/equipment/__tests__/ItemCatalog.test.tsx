// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup, within, waitFor } from '@testing-library/react'
import '@/test/i18n.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { SLOT_CONFIGS } from '../slotConfig.ts'
import { ItemCatalog } from '../ItemCatalog.tsx'
import { STORAGE_KEY } from '@/features/optimizer/forgeConfig.ts'

let observerCallback: IntersectionObserverCallback | null = null
class FakeObserver {
  constructor(cb: IntersectionObserverCallback) { observerCallback = cb }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() { return [] }
}

const HAT = SLOT_CONFIGS.find(s => s.id === 'hat')!
const items: AppItem[] = Array.from({ length: 50 }, (_, i) => ({
  ankama_id: i + 1, name: `Item ${i + 1}`, slot: 'hat', type: 'Hat', level: 100,
  effects: [], set_id: i === 0 ? 900 : null,
}) as unknown as AppItem)
const SET = { ankama_id: 900, name: 'Test Set', items: [1], bonuses: {} } as unknown as AppSet

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeObserver)
  useDataStore.setState({ equipment: items, sets: [SET] })
  useBuildStore.setState({ equipped: {} })
  localStorage.removeItem(STORAGE_KEY)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const cardCount = () => screen.queryAllByText(/^Item \d+$/).length

describe('ItemCatalog', () => {
  it('Escape closes only the set modal both while loading and after it opens', async () => {
    const onClose = vi.fn()
    render(<ItemCatalog slot={HAT} slotId="hat" onClose={onClose} />)
    // The card's set link (the set filter lists the same name as an <option>).
    fireEvent.click(screen.getByRole('button', { name: /Test Set/ }))
    expect(screen.getAllByText('Test Set').length).toBeGreaterThan(1)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()
    act(() => { useDataStore.setState({ sets: [{ ...SET, items: [1, 2], bonuses: { 2: [] } }] }) })
    fireEvent.click(screen.getByRole('button', { name: /Test Set/ }))
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(2))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('a pending infinite-scroll bump does not grow the list after a filter change', () => {
    vi.useFakeTimers()
    render(<ItemCatalog slot={HAT} slotId="hat" onClose={() => {}} />)
    expect(cardCount()).toBe(20)

    act(() => {
      observerCallback!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'item' } })
    act(() => { vi.advanceTimersByTime(200) })
    expect(cardCount()).toBe(20)
  })

  it('keeps the active type filter applied while searching by name', () => {
    const mixed: AppItem[] = [
      { ankama_id: 1, name: 'Dragopavo ebano', slot: 'hat', type: 'Dragopavo', level: 60, effects: [] },
      { ankama_id: 2, name: 'Mulagua ebano', slot: 'hat', type: 'Mulagua', level: 60, effects: [] },
    ] as unknown as AppItem[]
    useDataStore.setState({ equipment: mixed, sets: [] })
    render(<ItemCatalog slot={HAT} slotId="hat" onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Mulagua' }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ebano' } })

    expect(screen.queryByText('Dragopavo ebano')).toBeNull()
    expect(screen.getByText('Mulagua ebano')).not.toBeNull()
  })

  it('right-clicking a card equips it and pins its slot for the Forge', () => {
    const onAfterEquip = vi.fn()
    render(<ItemCatalog slot={HAT} slotId="hat" onClose={() => {}} onAfterEquip={onAfterEquip} />)

    const card = screen.getByText('Item 1').closest('article')!
    fireEvent.contextMenu(card)

    expect(onAfterEquip).toHaveBeenCalledWith('hat')
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.lockedSlots).toContain('hat')
  })

  it('the pin button equips and pins without needing a right click', () => {
    const onAfterEquip = vi.fn()
    render(<ItemCatalog slot={HAT} slotId="hat" onClose={() => {}} onAfterEquip={onAfterEquip} />)

    const card = screen.getByText('Item 1').closest('article')!
    const { getByLabelText } = within(card)
    fireEvent.click(getByLabelText('catalog_card_pin'))

    expect(onAfterEquip).toHaveBeenCalledWith('hat')
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.lockedSlots).toContain('hat')
  })

  it('marks a set ring already worn in the other ring slot', () => {
    const ring = { ankama_id: 77, name: 'Set Ring', slot: 'ring', type: 'Ring', level: 100, effects: [], set_id: 900 } as unknown as AppItem
    useDataStore.setState({ equipment: [ring], sets: [{ ...SET, items: [77] }] })
    useBuildStore.setState({ equipped: { ring1: 77 } })
    render(<ItemCatalog slot={SLOT_CONFIGS.find(s => s.id === 'ring2')!} slotId="ring2" onClose={() => {}} />)
    expect(screen.getByText('Set Ring').closest('button')!.getAttribute('aria-disabled')).toBe('true')
  })
})
