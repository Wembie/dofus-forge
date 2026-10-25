// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@/test/i18n.ts'
import type { AppItem } from '@/data/loaders.ts'
import { EquipmentGrid } from '../EquipmentGrid.tsx'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { useForgePicks } from '@/features/optimizer/forgePicks.ts'

afterEach(() => {
  cleanup()
  useBuildStore.getState().reset()
  useDataStore.setState({ equipment: null, loading: false })
  useForgePicks.setState({ required: [], banned: [] })
  vi.unstubAllGlobals()
})

const HAT: AppItem = {
  ankama_id: 1,
  name: 'Test Hat',
  level: 200,
  type: 'Hat',
  slot: 'hat',
  effects: [],
  set_id: null,
  image_url: null,
} as AppItem

describe('EquipmentGrid', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((media: string) => ({
      matches: false,
      media,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })))
    useDataStore.setState({ equipment: [HAT], loading: false })
    useBuildStore.setState({ selectedClass: 'iop', equipped: { hat: HAT.ankama_id } })
  })

  it('pins an equipped item on right-click without opening the browser context menu', () => {
    render(<EquipmentGrid />)
    const slot = screen.getAllByRole('button', { name: /Test Hat/ })[0]

    expect(fireEvent.contextMenu(slot)).toBe(false)
    expect(useForgePicks.getState().required).toEqual([HAT.ankama_id])
  })

  it('keeps an already pinned item pinned on right-click', () => {
    useForgePicks.getState().require(HAT.ankama_id)
    render(<EquipmentGrid />)
    fireEvent.contextMenu(screen.getAllByRole('button', { name: /Test Hat/ })[0])

    expect(useForgePicks.getState().required).toEqual([HAT.ankama_id])
  })
})
