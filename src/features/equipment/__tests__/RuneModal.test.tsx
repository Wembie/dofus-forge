// @vitest-environment jsdom
import '@/test/i18n.ts'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { AppItem } from '@/data/loaders.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { RuneModal } from '../RuneModal.tsx'
import { runeImpossible, runeRoom } from '../runeRules.ts'

afterEach(() => {
  cleanup()
  useBuildStore.getState().reset()
})

const gear = (slot: string, effects: [string, number][]) =>
  ({ ankama_id: 1, name: 'Piece', slot, level: 200, effects: effects.map(([stat, max]) => ({ stat, min: max, max: 0 })) }) as unknown as AppItem

describe('impossible magesmithy', () => {
  // Brus ring: a native +1 Range, so another +1 Range would weigh 102.
  const ring = gear('ring', [['Range', 1], ['Vitality', 300]])

  it('blocks doubling a line past the 101 weight limit', () => {
    expect(runeRoom(ring, {}, 'Range')).toMatchObject({ room: 0, block: 'line', lineWeight: 102 })
    expect(runeRoom(gear('hat', [['AP', 1]]), {}, 'AP')).toMatchObject({ room: 0, block: 'line' })
    expect(runeRoom(gear('hat', []), {}, 'AP').room).toBe(1)
  })

  it('lets an exotic % resistance reach 101, minus what the item already rolls', () => {
    expect(runeRoom(gear('hat', []), {}, '% Earth Resistance').room).toBe(16)
    expect(runeRoom(gear('hat', [['% Earth Resistance', 12]]), {}, '% Earth Resistance').room).toBe(4)
  })

  it('never grows a line whose own roll already weighs more than 101', () => {
    expect(runeRoom(gear('cape', [['Vitality', 600]]), {}, 'Vitality')).toMatchObject({ room: 0, block: 'line' })
  })

  it('caps the exo and over weight of the whole item at 101', () => {
    const hat = gear('hat', [])
    expect(runeRoom(hat, { AP: 1 }, 'Strength')).toMatchObject({ room: 1, itemWeight: 100 })
    expect(runeRoom(hat, { AP: 1 }, 'MP')).toMatchObject({ room: 0, block: 'item' })
    expect(runeImpossible(hat, { AP: 1, MP: 1 }, 'MP')).toBe('item')
  })

  it('takes no other rune next to a transcendence rune', () => {
    expect(runeRoom(gear('hat', []), { 'exo:Vitality': 100 }, 'Strength')).toMatchObject({ room: 0, block: 'transcendence' })
  })

  it('flags what a slot already carries when the game would not allow it', () => {
    expect(runeImpossible(ring, { Range: 1 }, 'Range')).toBe('line')
    expect(runeImpossible(ring, { Vitality: 100 }, 'Vitality')).toBeNull()
  })

  it('greys the rune out and explains why in the editor', () => {
    useBuildStore.setState({ runes: { ring1: { Range: 1 } } })
    render(<RuneModal slotId="ring1" item={ring} onClose={() => {}} />)
    const range = screen.getAllByRole('button', { name: /stat_range|Range/ })[0]
    expect(range.className).toContain('is-blocked')
    fireEvent.click(range)
    expect(screen.getByText('runes_block_line')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'runes_add' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('runes_impossible')).toBeTruthy()
  })
})

describe('RuneModal', () => {
  it('renders as a dialog in a portal with a scrollable body', () => {
    const item = {
      ankama_id: 1,
      name: 'Test Hat',
      slot: 'hat',
      level: 200,
      effects: [],
    } as unknown as AppItem

    const { container } = render(<RuneModal slotId="hat" item={item} onClose={() => {}} />)
    expect(container.childElementCount).toBe(0)
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector('.overflow-y-auto.flex-1.min-h-0')).not.toBeNull()
    expect(screen.getByText('Test Hat')).toBeTruthy()
  })
})
