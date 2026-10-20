// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const fetchIsFollowing = vi.hoisted(() => vi.fn())
vi.mock('../api.ts', () => ({ fetchIsFollowing }))

import { useIsFollowing } from '../useIsFollowing.ts'

beforeEach(() => fetchIsFollowing.mockReset())

describe('useIsFollowing', () => {
  it('checks again when the session arrives after the profile (page refresh)', async () => {
    fetchIsFollowing.mockResolvedValue({ following: true, error: null })
    const { result, rerender } = renderHook(({ viewer }) => useIsFollowing(viewer, 'profile-1'), { initialProps: { viewer: null as string | null } })
    expect(result.current[0]).toBe(false)
    expect(fetchIsFollowing).not.toHaveBeenCalled()
    rerender({ viewer: 'me' })
    await waitFor(() => expect(result.current[0]).toBe(true))
    expect(fetchIsFollowing).toHaveBeenCalledWith('me', 'profile-1')
  })

  it('never checks your own profile', () => {
    renderHook(() => useIsFollowing('me', 'me'))
    expect(fetchIsFollowing).not.toHaveBeenCalled()
  })

  it('ignores a late answer for a profile you already left', async () => {
    let resolveFirst: (v: unknown) => void = () => {}
    fetchIsFollowing.mockReturnValueOnce(new Promise(r => { resolveFirst = r })).mockResolvedValueOnce({ following: false, error: null })
    const { result, rerender } = renderHook(({ profile }) => useIsFollowing('me', profile), { initialProps: { profile: 'a' } })
    rerender({ profile: 'b' })
    resolveFirst({ following: true, error: null })
    await new Promise(r => setTimeout(r, 0))
    expect(result.current[0]).toBe(false)
  })
})
