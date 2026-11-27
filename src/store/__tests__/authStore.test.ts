import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { CLASS_AVATARS } from '@/features/account/classAvatars.ts'
import { PROFILE_BANNERS } from '@/features/account/profileBanners.ts'

const getSupabase = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase.ts', () => ({ getSupabase }))

import { useAuthStore, shrinkAvatar } from '../authStore.ts'

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
    await vi.waitFor(() => expect(getSupabase).toHaveBeenCalled())
    await Promise.resolve()
    fake.emit('INITIAL_SESSION', null)
    await vi.waitFor(() => expect(useAuthStore.getState().loading).toBe(false))
    fake.emit('SIGNED_IN', { user: { id: 'u1' } })
    fake.emit('SIGNED_OUT', null)
    await vi.waitFor(() => expect(useAuthStore.getState().session).toBeNull())
    releaseProfile({ data: { id: 'u1', username: 'late' }, error: null })
    await new Promise(r => setTimeout(r, 0))
    expect(useAuthStore.getState().session).toBeNull()
    expect(useAuthStore.getState().profile).toBeNull()
  })

  async function signedIn(profile: (id: string) => Promise<unknown>) {
    const fake = fakeClient({ getSession: () => new Promise(() => {}), profile })
    freshInit(fake.client)
    await vi.waitFor(() => expect(getSupabase).toHaveBeenCalled())
    await Promise.resolve()
    fake.emit('INITIAL_SESSION', { user: { id: 'u1' }, access_token: 't1' })
    await vi.waitFor(() => expect(useAuthStore.getState().loading).toBe(false))
    return fake
  }

  it('ignores same-user re-emits (tab refocus, token refresh): no profile refetch, same session object', async () => {
    const profile = vi.fn(async (id: string) => ({ data: { id, username: 'me' }, error: null }))
    const fake = await signedIn(profile)
    const session = useAuthStore.getState().session
    fake.emit('SIGNED_IN', { user: { id: 'u1' }, access_token: 't1' })
    fake.emit('TOKEN_REFRESHED', { user: { id: 'u1' }, access_token: 't2' })
    await new Promise(r => setTimeout(r, 0))
    expect(profile).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().session).toBe(session)
  })

  it('swaps the session on USER_UPDATED without refetching the profile', async () => {
    const profile = vi.fn(async (id: string) => ({ data: { id, username: 'me' }, error: null }))
    const fake = await signedIn(profile)
    const updated = { user: { id: 'u1', email: 'new@x.y' }, access_token: 't1' }
    fake.emit('USER_UPDATED', updated)
    expect(useAuthStore.getState().session).toBe(updated)
    expect(profile).toHaveBeenCalledTimes(1)
  })

  it('retries the profile on the next event when the first fetch failed', async () => {
    const profile = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
      .mockResolvedValueOnce({ data: { id: 'u1', username: 'me' }, error: null })
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fake = await signedIn(profile)
    expect(useAuthStore.getState().profile).toBeNull()
    fake.emit('SIGNED_IN', { user: { id: 'u1' }, access_token: 't1' })
    await vi.waitFor(() => expect(useAuthStore.getState().profile).toEqual({ id: 'u1', username: 'me' }))
    err.mockRestore()
  })
})

describe('authStore.updateProfile avatars', () => {
  const original = useAuthStore.getState()

  beforeEach(() => {
    getSupabase.mockReset()
    useAuthStore.setState({ session: { user: { id: 'avatar-user' } } as Session, profile: null })
  })
  afterEach(() => useAuthStore.setState(original))

  it.each(['https://tracker.example/a.png', '//tracker.example/a.png', '/avatars/classes/v1/unknown-m.webp', '/avatars/classes/v1/iop-m.webp?x=1', '/avatars/exclusive/v1/bakara-drunk-book.webp', ''])('rejects a forged avatar before making a request: %s', async avatar_url => {
    await expect(useAuthStore.getState().updateProfile({ avatar_url })).resolves.toEqual({ error: 'invalid_avatar_url' })
    expect(getSupabase).not.toHaveBeenCalled()
  })

  it('accepts every bundled portrait, the initial and profile edits without an avatar', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ update }))
    getSupabase.mockResolvedValue({ from })
    for (const edits of [...CLASS_AVATARS.map(a => ({ avatar_url: a.url })), { avatar_url: null }, { bio: 'hello' }]) {
      await expect(useAuthStore.getState().updateProfile(edits)).resolves.toEqual({ error: null })
      expect(from).toHaveBeenLastCalledWith('profiles')
      expect(update).toHaveBeenLastCalledWith(edits)
      expect(eq).toHaveBeenLastCalledWith('id', 'avatar-user')
    }
  })
})

describe('authStore.updateProfile banners', () => {
  const original = useAuthStore.getState()
  beforeEach(() => {
    getSupabase.mockReset()
    useAuthStore.setState({ session: { user: { id: 'banner-user' } } as Session, profile: null })
  })
  afterEach(() => useAuthStore.setState(original))

  it.each(['https://tracker.example/banner.png', '//tracker.example/banner.png', '/banners/locations/v1/unknown.webp', '/banners/locations/v1/bonta.webp?x=1', ''])('rejects a forged banner before any request: %s', async banner_url => {
    await expect(useAuthStore.getState().updateProfile({ banner_url })).resolves.toEqual({ error: 'invalid_banner_url' })
    expect(getSupabase).not.toHaveBeenCalled()
  })

  it('accepts all approved banners and null to remove the cover', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    getSupabase.mockResolvedValue({ from: () => ({ update }) })
    for (const banner_url of [...PROFILE_BANNERS.map(b => b.url), null]) {
      await expect(useAuthStore.getState().updateProfile({ banner_url })).resolves.toEqual({ error: null })
      expect(update).toHaveBeenLastCalledWith({ banner_url })
      expect(eq).toHaveBeenLastCalledWith('id', 'banner-user')
    }
  })
})

describe('shrinkAvatar', () => {
  it('keeps the original file when the browser cannot decode it', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    await expect(shrinkAvatar(file)).resolves.toBe(file)
  })
})
