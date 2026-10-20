// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { SLOT_CONFIGS } from '../slotConfig.ts'
import { ItemCatalog } from '../ItemCatalog.tsx'

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
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const cardCount = () => screen.queryAllByText(/^Item \d+$/).length

describe('ItemCatalog', () => {
  it('Escape closes only the set modal when one is open over the catalog', () => {
    const onClose = vi.fn()
    render(<ItemCatalog slot={HAT} slotId="hat" onClose={onClose} />)
    fireEvent.click(screen.getAllByText('Test Set')[0])
    expect(screen.getAllByText('Test Set').length).toBeGreaterThan(1)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()

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

  it('marks a set ring already worn in the other ring slot', () => {
    const ring = { ankama_id: 77, name: 'Set Ring', slot: 'ring', type: 'Ring', level: 100, effects: [], set_id: 900 } as unknown as AppItem
    useDataStore.setState({ equipment: [ring], sets: [{ ...SET, items: [77] }] })
    useBuildStore.setState({ equipped: { ring1: 77 } })
    render(<ItemCatalog slot={SLOT_CONFIGS.find(s => s.id === 'ring2')!} slotId="ring2" onClose={() => {}} />)
    expect(screen.getByText('Set Ring').closest('button')!.getAttribute('aria-disabled')).toBe('true')
  })
})
