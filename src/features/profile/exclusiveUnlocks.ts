import { getSupabase } from '@/lib/supabase.ts'

export type ExclusiveUnlock = {
  slug:      string
  threshold: number
  progress:  number
  eligible:  boolean
}

function parseUnlocks(raw: unknown): ExclusiveUnlock[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(row => {
    if (!row || typeof row !== 'object') return []
    const r = row as Record<string, unknown>
    if (typeof r.slug !== 'string') return []
    return [{
      slug: r.slug,
      threshold: Number(r.threshold ?? 0),
      progress: Number(r.progress ?? 0),
      eligible: r.eligible === true,
    }]
  })
}

/** The signed-in account's own progress toward every exclusive reward. */
export async function fetchMyExclusiveUnlocks(): Promise<ExclusiveUnlock[]> {
  const supabase = await getSupabase().catch(() => null)
  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_my_exclusive_unlocks')
  if (error) return []
  return parseUnlocks(data)
}
