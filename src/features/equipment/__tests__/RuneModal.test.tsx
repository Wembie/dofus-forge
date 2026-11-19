// @vitest-environment jsdom
import '@/test/i18n.ts'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { AppItem } from '@/data/loaders.ts'
import { RuneModal } from '../RuneModal.tsx'

afterEach(cleanup)

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
