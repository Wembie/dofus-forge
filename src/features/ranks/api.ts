import { getSupabase } from '@/lib/supabase.ts'
import {
  isRankBadgeStyle, isRankColor, isRankIcon,
  type PublicCustomRank,
} from './catalog.tsx'

/** Public profile data is returned by a narrow RPC; internal assignment data never reaches this query. */
export async function fetchPublicCustomRank(userId: string): Promise<PublicCustomRank | null> {
  const supabase = await getSupabase().catch(() => null)
  if (!supabase) return null
  const { data, error } = await supabase.rpc('get_public_custom_rank', { p_user_id: userId })
  if (error || !Array.isArray(data) || !data[0]) return null

  const row = data[0] as {
    rank_name?: unknown
    rank_description?: unknown
    rank_icon?: unknown
    rank_color?: unknown
    badge_style?: unknown
  }
  if (
    typeof row.rank_name !== 'string' ||
    typeof row.rank_description !== 'string' ||
    typeof row.rank_icon !== 'string' || !isRankIcon(row.rank_icon) ||
    typeof row.rank_color !== 'string' || !isRankColor(row.rank_color) ||
    typeof row.badge_style !== 'string' || !isRankBadgeStyle(row.badge_style)
  ) return null

  return {
    name: row.rank_name,
    description: row.rank_description,
    icon: row.rank_icon,
    color: row.rank_color,
    badgeStyle: row.badge_style,
  }
}
