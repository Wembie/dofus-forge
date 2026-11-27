import { beforeEach, describe, expect, it, vi } from 'vitest'
const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase.ts', () => ({ getSupabase: async () => ({ rpc }) }))
import { fetchMyBuildQuota } from '../buildQuota.ts'

beforeEach(() => { rpc.mockReset() })
describe('own build allowance', () => {
  it('reads the server quota without accepting an arbitrary account id', async () => {
    const data = { used: 51, limit: 52, base_limit: 50, streak_bonus: 2, active_streak: 10 }
    rpc.mockResolvedValue({ data, error: null })
    expect(await fetchMyBuildQuota()).toEqual(data)
    expect(rpc).toHaveBeenCalledWith('get_my_build_quota')
  })
  it('preserves an unlimited rank allowance', async () => {
    rpc.mockResolvedValue({ data: { used: 201, limit: null, base_limit: null, streak_bonus: 1, active_streak: 5 }, error: null })
    expect((await fetchMyBuildQuota())?.limit).toBeNull()
  })
  it('does not fabricate a quota when the RPC is unavailable or malformed', async () => {
    for (const result of [{ error: { message: 'offline' }, data: null }, { data: { limit: 52 }, error: null }, { data: { used: -1, limit: 50, base_limit: 50, streak_bonus: 0, active_streak: 0 }, error: null }]) {
      rpc.mockResolvedValue(result)
      expect(await fetchMyBuildQuota()).toBeNull()
    }
    rpc.mockRejectedValue(new Error('offline'))
    expect(await fetchMyBuildQuota()).toBeNull()
  })
})
