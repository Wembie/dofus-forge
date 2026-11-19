// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { track } from '../analytics.ts'

const w = window as unknown as { dataLayer?: unknown[] }
afterEach(() => { delete w.dataLayer })

describe('track', () => {
  it('pushes the event and its params onto the data layer', () => {
    w.dataLayer = []
    track('equip_item', { slot: 'hat' })
    expect(w.dataLayer).toEqual([{ event: 'equip_item', slot: 'hat' }])
  })

  it('does nothing when the data layer is missing', () => {
    expect(() => track('forge_run')).not.toThrow()
  })
})
