// @vitest-environment jsdom
import '@/test/i18n.ts'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { AppItem } from '@/data/loaders.ts'
import { RuneModal } from '../RuneModal.tsx'

afterEach(cleanup)

describe('RuneModal', () => {
  it('renders at the top of the viewport in a portal and keeps the rune list scrollable', () => {
    const item = {
      ankama_id: 1,
      name: 'Test Hat',
      slot: 'hat',
      level: 200,
      effects: [],
    } as unknown as AppItem

    const { container } = render(<RuneModal slotId="hat" item={item} onClose={() => {}} />)
    const overlay = document.body.lastElementChild as HTMLDivElement

    expect(container.childElementCount).toBe(0)
    expect(overlay.className).toContain('items-start')
    expect(overlay.className).toContain('overflow-y-auto')
    expect((overlay.firstElementChild as HTMLDivElement).style.maxHeight).toBe('calc(100dvh - 2rem)')
    expect(overlay.querySelector('.overflow-y-auto.flex-1.min-h-0')).not.toBeNull()
  })
})
