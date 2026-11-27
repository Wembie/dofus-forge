import { getSupabase } from '@/lib/supabase.ts'

export type BuildQuota = {
  used: number
  active_streak: number
  streak_bonus: number
  base_limit: number | null
  limit: number | null
}

export async function fetchMyBuildQuota(): Promise<BuildQuota | null> {
  try {
    const supabase = await getSupabase()
    const { data, error } = await supabase.rpc('get_my_build_quota')
    if (error || !data || typeof data !== 'object') return null
    const raw = data as Record<string, unknown>
    if (!['used', 'active_streak', 'streak_bonus'].every(key => typeof raw[key] === 'number' && Number.isInteger(raw[key]) && Number(raw[key]) >= 0)) return null
    if (![raw.base_limit, raw.limit].every(value => value === null || typeof value === 'number' && Number.isInteger(value) && value >= 50)) return null
    return data as BuildQuota
  } catch { return null }
}
