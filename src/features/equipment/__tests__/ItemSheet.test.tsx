// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@/test/i18n.ts'
import type { AppItem } from '@/data/loaders.ts'
import { useForgePicks } from '@/features/optimizer/forgePicks.ts'
import { ItemSheet } from '../ItemSheet.tsx'

const ITEM = { ankama_id: 42, name: 'Psikopomzop Needle', level: 200, type: 'Dagger', slot: 'weapon', set_id: 7, image_url: null,
  effects: [{ stat: 'Strength', min: 80, max: 80 }], conditions: [{ stat: 'AP', operator: '<', value: 12 }] } as unknown as AppItem

afterEach(() => { cleanup(); useForgePicks.setState({ required: [] } as never) })

function setup() {
  const handlers = { onClose: vi.fn(), onChange: vi.fn(), onRunes: vi.fn(), onViewSet: vi.fn(), onUnequip: vi.fn() }
  render(<ItemSheet slotLabel="Weapon" item={ITEM} slotRunes={{ Strength: 10 }} set={{ name: 'Psiko set', count: 3, max: 6 }} {...handlers} />)
  return handlers
}

describe('ItemSheet', () => {
  it('lists runes and conditions and names every action', () => {
    const h = setup()
    expect(screen.getByText('Psikopomzop Needle')).toBeTruthy()
    expect(screen.getByText('+10')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /item_sheet_change/ }))
    fireEvent.click(screen.getByRole('button', { name: /^magesmithy$/ }))
    fireEvent.click(screen.getByRole('button', { name: /view_set/ }))
    fireEvent.click(screen.getByRole('button', { name: /item_sheet_remove/ }))
    expect(h.onChange).toHaveBeenCalled()
    expect(h.onRunes).toHaveBeenCalled()
    expect(h.onViewSet).toHaveBeenCalled()
    expect(h.onUnequip).toHaveBeenCalled()
  })

  it('pins the piece for The Forger', () => {
    setup()
    const pin = screen.getByRole('button', { name: /slot_pin_forge/ })
    fireEvent.click(pin)
    expect(useForgePicks.getState().required).toContain(42)
    expect(screen.getByRole('button', { name: /slot_unpin_forge/ }).getAttribute('aria-pressed')).toBe('true')
  })
})
