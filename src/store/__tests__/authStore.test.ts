import { describe, it, expect, vi } from 'vitest'

const getSupabase = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase.ts', () => ({ getSupabase }))

import { useAuthStore } from '../authStore.ts'

describe('authStore.init', () => {
  it('stops loading (signed out) when supabase-js fails to load, and allows a retry', async () => {
    getSupabase.mockRejectedValueOnce(new Error('offline'))
    useAuthStore.getState().init()
    await vi.waitFor(() => expect(useAuthStore.getState().loading).toBe(false))
    expect(useAuthStore.getState().session).toBeNull()
    expect(useAuthStore.getState().initialized).toBe(false)

    getSupabase.mockResolvedValueOnce({
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
    })
    useAuthStore.getState().init()
    expect(useAuthStore.getState().initialized).toBe(true)
    expect(getSupabase).toHaveBeenCalledTimes(2)
  })
})

describe('authStore auth events', () => {
  type Listener = (event: string, session: unknown) => void
  function fakeClient(opts: { getSession: () => Promise<unknown>; profile: (id: string) => Promise<unknown> }) {
    let listener: Listener = () => {}
    const client = {
      auth: {
        getSession: opts.getSession,
        onAuthStateChange: (cb: Listener) => { listener = cb; return { data: { subscription: { unsubscribe() {} } } } },
      },
      from: () => ({ select: () => ({ eq: (_c: string, id: string) => ({ single: () => opts.profile(id) }) }) }),
    }
    return { client, emit: (event: string, session: unknown) => listener(event, session) }
  }

  function freshInit(client: unknown) {
    useAuthStore.setState({ session: null, profile: null, loading: true, initialized: false, passwordRecovery: false })
    getSupabase.mockResolvedValue(client)
    useAuthStore.getState().init()
  }

  it('catches PASSWORD_RECOVERY even if it fires before getSession resolves', async () => {
    const fake = fakeClient({ getSession: () => new Promise(() => {}), profile: async () => ({ data: null, error: null }) })
    freshInit(fake.client)
    await vi.waitFor(() => expect(getSupabase).toHaveBeenCalled())
    await Promise.resolve()
    fake.emit('PASSWORD_RECOVERY', { user: { id: 'u1' } })
    expect(useAuthStore.getState().passwordRecovery).toBe(true)
  })

  it('a slow profile fetch from before a sign-out does not restore the session', async () => {
    let releaseProfile: (v: unknown) => void = () => {}
    const fake = fakeClient({
      getSession: async () => ({ data: { session: null } }),
      profile: () => new Promise(r => { releaseProfile = r }),
    })
    freshInit(fake.client)
    await vi.waitFor(() => expect(useAuthStore.getState().loading).toBe(false))
    fake.emit('SIGNED_IN', { user: { id: 'u1' } })
    fake.emit('SIGNED_OUT', null)
    await vi.waitFor(() => expect(useAuthStore.getState().session).toBeNull())
    releaseProfile({ data: { id: 'u1', username: 'late' }, error: null })
    await new Promise(r => setTimeout(r, 0))
    expect(useAuthStore.getState().session).toBeNull()
    expect(useAuthStore.getState().profile).toBeNull()
  })
})
