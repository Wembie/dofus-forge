import { describe, it, expect, vi } from 'vitest'

const createClient = vi.hoisted(() => vi.fn())
vi.mock('@supabase/supabase-js', () => ({ createClient }))

import { getSupabase } from '../supabase.ts'

describe('getSupabase', () => {
  it('does not cache a failed load: the next call retries', async () => {
    createClient.mockImplementationOnce(() => { throw new Error('chunk failed') })
    await expect(getSupabase()).rejects.toThrow('chunk failed')

    const client = { from: () => null }
    createClient.mockImplementationOnce(() => client)
    await expect(getSupabase()).resolves.toBe(client)
    // and the working client is then reused
    await expect(getSupabase()).resolves.toBe(client)
    expect(createClient).toHaveBeenCalledTimes(2)
  })
})
