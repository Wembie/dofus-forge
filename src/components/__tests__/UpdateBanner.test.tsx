// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import '@/test/i18n.ts'
import { UpdateBanner } from '../UpdateBanner.tsx'

let visibility: DocumentVisibilityState = 'visible'
const fetchMock = vi.fn(async () => new Response(JSON.stringify({ version: __APP_VERSION__ })))

function setVisibility(v: DocumentVisibilityState) {
  visibility = v
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
}

beforeEach(() => {
  vi.useFakeTimers()
  visibility = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('UpdateBanner', () => {
  it('checks at most once a minute across quick tab switches', () => {
    render(<UpdateBanner />)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    for (let i = 0; i < 5; i++) { setVisibility('hidden'); act(() => { vi.advanceTimersByTime(5_000) }); setVisibility('visible') }
    expect(fetchMock).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(60_000) })
    setVisibility('hidden')
    setVisibility('visible')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not poll while the tab is hidden', () => {
    render(<UpdateBanner />)
    setVisibility('hidden')
    act(() => { vi.advanceTimersByTime(60 * 60_000) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stops checking once a newer version was found', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ version: '999.0.0' })))
    render(<UpdateBanner />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    act(() => { vi.advanceTimersByTime(60 * 60_000) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
