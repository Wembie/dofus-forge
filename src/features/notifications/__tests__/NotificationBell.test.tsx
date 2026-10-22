// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@/test/i18n.ts'

type Sub = { onInsert: () => void; onLive: (live: boolean) => void; stop: ReturnType<typeof vi.fn> }
const subs: Sub[] = []
const api = vi.hoisted(() => ({
  fetchUnreadNotificationCount: vi.fn(() => new Promise<number>(() => {})),
  fetchNotifications:           vi.fn(async () => []),
  markNotificationsRead:        vi.fn(async () => ({ error: null })),
  subscribeToNotifications:     vi.fn(),
}))
vi.mock('@/features/builds/api.ts', async importOriginal => ({ ...(await importOriginal<object>()), ...api }))

import { NotificationBell } from '../NotificationBell.tsx'
import { useAuthStore } from '@/store/authStore.ts'

let visibility: DocumentVisibilityState = 'visible'
function setVisibility(v: DocumentVisibilityState) {
  visibility = v
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
}
const lastSub = () => subs[subs.length - 1]
const countCalls = () => api.fetchUnreadNotificationCount.mock.calls.length

beforeEach(() => {
  vi.useFakeTimers()
  subs.length = 0
  visibility = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
  Object.values(api).forEach(fn => fn.mockClear())
  api.subscribeToNotifications.mockImplementation((_u: string, onInsert: () => void, onLive: (live: boolean) => void) => {
    const stop = vi.fn()
    subs.push({ onInsert, onLive, stop })
    return stop
  })
  useAuthStore.setState({ session: { user: { id: 'me' } } as never, loading: false })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

const renderBell = () => render(<MemoryRouter><NotificationBell /></MemoryRouter>)

describe('NotificationBell', () => {
  it('fetches the count once on join and never polls while live', () => {
    renderBell()
    expect(api.subscribeToNotifications).toHaveBeenCalledWith('me', expect.any(Function), expect.any(Function))
    act(() => lastSub().onLive(true))
    expect(countCalls()).toBe(1)
    act(() => { vi.advanceTimersByTime(10 * 60_000) })
    expect(countCalls()).toBe(1)
  })

  it('falls back to polling while the channel is not joined', () => {
    renderBell()
    act(() => lastSub().onLive(false))
    act(() => { vi.advanceTimersByTime(3_000) })
    expect(countCalls()).toBe(1)
    act(() => { vi.advanceTimersByTime(120_000) })
    expect(countCalls()).toBe(2)
  })

  it('keeps the channel through a quick tab switch, drops it when hidden for long and rejoins on return', () => {
    renderBell()
    act(() => lastSub().onLive(true))
    setVisibility('hidden')
    act(() => { vi.advanceTimersByTime(30_000) })
    setVisibility('visible')
    expect(lastSub().stop).not.toHaveBeenCalled()
    expect(subs).toHaveLength(1)

    setVisibility('hidden')
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(lastSub().stop).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(10 * 60_000) })
    expect(countCalls()).toBe(1)

    setVisibility('visible')
    expect(subs).toHaveLength(2)
    act(() => lastSub().onLive(true))
    expect(countCalls()).toBe(2)
  })
})
