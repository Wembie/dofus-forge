// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
const mock = vi.hoisted(() => ({ rpc: vi.fn(), single: vi.fn(), listener: undefined as undefined | ((event: string, session: unknown) => void) }))
vi.mock('@/lib/supabase.ts', () => ({ getSupabase: async () => ({
  rpc: mock.rpc,
  from: () => ({ select: () => ({ eq: () => ({ single: mock.single }) }) }),
  auth: { onAuthStateChange: (listener: typeof mock.listener) => { mock.listener = listener } },
}) }))
import { alreadyBumpedToday, useAuthStore } from './authStore.ts'
const session = { user: { id: 'streak-user' } }
beforeEach(() => {
  localStorage.clear()
  mock.listener = undefined
  mock.rpc.mockReset()
  mock.single.mockResolvedValue({ data: { id: 'streak-user', login_streak_current: 4, login_streak_best: 10 }, error: null })
  useAuthStore.setState({ initialized: false, loading: true, session: null, profile: null })
})
async function signIn() {
  useAuthStore.getState().init()
  await waitFor(() => expect(mock.listener).toBeTruthy())
  mock.listener!('INITIAL_SESSION', session)
}
describe('daily streak response', () => {
  it('refreshes active streak and record immediately after a successful bump', async () => {
    mock.rpc.mockResolvedValue({ data: { current: 5, best: 10 }, error: null })
    await signIn()
    await waitFor(() => expect(useAuthStore.getState().profile?.login_streak_current).toBe(5))
    expect(useAuthStore.getState().profile?.login_streak_best).toBe(10)
    expect(alreadyBumpedToday('streak-user', new Date().toISOString().slice(0, 10))).toBe(true)
  })
  it('keeps a failed RPC eligible for retry instead of caching a successful day', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { message: 'network' } })
    await signIn()
    await waitFor(() => expect(mock.rpc).toHaveBeenCalled())
    expect(alreadyBumpedToday('streak-user', new Date().toISOString().slice(0, 10))).toBe(false)
    expect(useAuthStore.getState().profile?.login_streak_current).toBe(4)
  })
  it('never restores a signed-out account when an earlier bump finishes late', async () => {
    let finish!: (value: unknown) => void
    mock.rpc.mockReturnValue(new Promise(resolve => { finish = resolve }))
    await signIn()
    await waitFor(() => expect(mock.rpc).toHaveBeenCalled())
    mock.listener!('SIGNED_OUT', null)
    finish({ data: { current: 5, best: 10 }, error: null })
    await waitFor(() => expect(useAuthStore.getState().profile).toBeNull())
    expect(useAuthStore.getState().session).toBeNull()
  })
})
