// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import '@/test/i18n.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import { SetBonusesPanel } from '../SetBonusesPanel.tsx'

const item = (id: number, slot: string, extra: Partial<AppItem> = {}): AppItem =>
  ({ ankama_id: id, name: `Item ${id}`, level: 1, type: 'Misc', slot, effects: [], set_id: null, image_url: null, ...extra })

const HAT = item(1, 'hat', { set_id: 9 })
const CAPE = item(2, 'cape', { set_id: 9 })
const BOOTS = item(3, 'boots', { set_id: 9 })
const OTHER_CAPE = item(4, 'cape')
const SET = {
  ankama_id: 9, name: 'Test set', items: [1, 2, 3],
  bonuses: { 2: [{ stat: 'Vitality', min: 50, max: 50 }], 3: [{ stat: 'Vitality', min: 150, max: 150 }] },
} as unknown as AppSet
const store = () => useBuildStore.getState()
// Missing pieces, in set order: the cape, then the boots.
const missing = () => screen.getAllByRole('button', { name: /setcat_piece_equip/ })

beforeEach(() => {
  store().reset()
  store().setEquipment([HAT, CAPE, BOOTS, OTHER_CAPE])
  store().setSetsData([SET])
  store().setClass('iop')
  store().equipItem('hat', HAT.ankama_id)
})
afterEach(cleanup)

describe('SetBonusesPanel', () => {
  it('shows only the next tier while none is in force', () => {
    render(<SetBonusesPanel />)
    expect(screen.getAllByText(/setcat_more_pieces/)).toHaveLength(1)
    expect(document.querySelectorAll('.set-tiers li')).toHaveLength(1)
  })

  it('shows only the tier in force once reached', () => {
    store().equipItem('cape', CAPE.ankama_id)
    render(<SetBonusesPanel />)
    expect(document.querySelectorAll('.set-tiers li.is-reached')).toHaveLength(1)
    expect(document.querySelectorAll('.set-tiers li')).toHaveLength(1)
  })

  it('equips a missing piece straight into its free slot', () => {
    render(<SetBonusesPanel />)
    fireEvent.click(missing()[0])
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(store().equipped.cape).toBe(CAPE.ankama_id)
  })

  it('asks before replacing what the slot holds', () => {
    store().equipItem('cape', OTHER_CAPE.ankama_id)
    render(<SetBonusesPanel />)
    fireEvent.click(missing()[0])
    expect(store().equipped.cape).toBe(OTHER_CAPE.ankama_id)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /setcat_replace_confirm/ }))
    expect(store().equipped.cape).toBe(CAPE.ankama_id)
  })
})
