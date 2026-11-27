import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '@/test/supabaseMock.ts'

const supabaseState = vi.hoisted(() => ({ get: (): Promise<unknown> => Promise.reject(new Error('not set')) }))
vi.mock('@/lib/supabase.ts', () => ({ getSupabase: () => supabaseState.get() }))

import { fetchMyExclusiveUnlocks } from '../exclusiveUnlocks.ts'

let mock: ReturnType<typeof createSupabaseMock>

beforeEach(() => {
  mock = createSupabaseMock()
  supabaseState.get = () => Promise.resolve(mock.client)
})

describe('fetchMyExclusiveUnlocks', () => {
  it('parses every valid row from the RPC', async () => {
    mock.client.rpc.mockResolvedValueOnce({
      data: [
        { slug: 'kerubim', threshold: 7, progress: 12, eligible: true },
        { slug: 'ogrest', threshold: 365, progress: 3, eligible: false },
      ],
      error: null,
    } as never)
    await expect(fetchMyExclusiveUnlocks()).resolves.toEqual([
      { slug: 'kerubim', threshold: 7, progress: 12, eligible: true },
      { slug: 'ogrest', threshold: 365, progress: 3, eligible: false },
    ])
  })

  it('drops malformed rows instead of throwing', async () => {
    mock.client.rpc.mockResolvedValueOnce({
      data: [{ slug: 'kerubim', threshold: 7, progress: 1, eligible: true }, { threshold: 30 }, null, 'nope'],
      error: null,
    } as never)
    await expect(fetchMyExclusiveUnlocks()).resolves.toEqual([
      { slug: 'kerubim', threshold: 7, progress: 1, eligible: true },
    ])
  })

  it('returns an empty list on error or when supabase-js fails to load', async () => {
    mock.client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'nope' } } as never)
    await expect(fetchMyExclusiveUnlocks()).resolves.toEqual([])

    supabaseState.get = () => Promise.reject(new Error('chunk failed'))
    await expect(fetchMyExclusiveUnlocks()).resolves.toEqual([])
  })
})
