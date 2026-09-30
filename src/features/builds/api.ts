import { getSupabase } from '@/lib/supabase.ts'
import type { BuildSnapshot, Gender } from '@/store/buildStore.ts'

export type BuildVisibility = 'private' | 'unlisted' | 'public'
export type ExploreSort = 'rating' | 'likes' | 'recent' | 'views'

export type BuildOwner = {
  username:     string
  display_name: string | null
  avatar_url:   string | null
}

export type BuildRow = {
  id:            string
  name:          string
  slug:          string | null
  class_slug:    string
  gender:        Gender
  level:         number
  visibility:    BuildVisibility
  like_count:    number
  avg_rating:    number
  rating_count:  number
  view_count:    number
  comment_count: number
  created_at:    string
  user_id:       string
  snapshot:      BuildSnapshot
  profiles:      BuildOwner | null
}

export type BuildDetailRow = BuildRow

// `profiles!builds_user_id_fkey` is required, not optional — builds has
// several relationships to profiles (fk_pinned_build, plus many-to-many via
// build_likes/build_ratings/build_bookmarks as junction tables), so a bare
// `profiles(...)` embed is ambiguous and PostgREST rejects it (PGRST201).
// `snapshot` included even in the list query — Explore/My Builds cards show
// equipment icons, not just text, so they need it up front too.
const LIST_COLUMNS = 'id, name, slug, class_slug, gender, level, visibility, like_count, avg_rating, rating_count, view_count, comment_count, created_at, user_id, snapshot, profiles!builds_user_id_fkey(username, display_name, avatar_url)'

const SORT_COLUMN: Record<ExploreSort, string> = {
  rating: 'avg_rating',
  likes:  'like_count',
  recent: 'created_at',
  views:  'view_count',
}

export async function fetchPublicBuilds(opts: { classSlug?: string | null; sort: ExploreSort; page: number; pageSize?: number }) {
  const supabase  = await getSupabase()
  const pageSize  = opts.pageSize ?? 24
  const from      = opts.page * pageSize
  const to        = from + pageSize - 1
  let query = supabase
    .from('builds')
    .select(LIST_COLUMNS, { count: 'exact' })
    .eq('visibility', 'public')
    .order(SORT_COLUMN[opts.sort], { ascending: false })
    .range(from, to)
  if (opts.classSlug) query = query.eq('class_slug', opts.classSlug)
  const { data, error, count } = await query
  return { data: (data ?? []) as unknown as BuildRow[], error: error?.message ?? null, count: count ?? 0 }
}

export async function fetchBuildById(id: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('builds')
    .select(LIST_COLUMNS)
    .eq('id', id)
    .single()
  if (error) return { data: null, error: error.message }
  return { data: data as unknown as BuildDetailRow, error: null }
}

export async function publishBuild(opts: {
  name:        string
  visibility:  BuildVisibility
  classSlug:   string
  gender:      Gender
  level:       number
  gameVersion: string
  snapshot:    BuildSnapshot
}) {
  const supabase = await getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: null, error: 'not_signed_in' }

  const { data: slug } = await supabase.rpc('generate_slug', { p_name: opts.name })

  const { data, error } = await supabase
    .from('builds')
    .insert({
      user_id:      session.user.id,
      name:         opts.name,
      slug:         (slug as string | null) ?? null,
      game_version: opts.gameVersion,
      class_slug:   opts.classSlug,
      gender:       opts.gender,
      level:        opts.level,
      visibility:   opts.visibility,
      snapshot:     opts.snapshot,
    })
    .select('id, slug')
    .single()
  if (error) return { data: null, error: error.message }
  return { data: data as { id: string; slug: string | null }, error: null }
}

export async function recordBuildView(buildId: string, userId: string | null) {
  const supabase = await getSupabase()
  await supabase.rpc('record_view', { p_build_id: buildId, p_user_id: userId, p_ip_hash: null })
}

export type MyBuildRow = {
  id:            string
  name:          string
  class_slug:    string
  gender:        Gender
  level:         number
  visibility:    BuildVisibility
  like_count:    number
  view_count:    number
  avg_rating:    number
  created_at:    string
  snapshot:      BuildSnapshot
}

export async function fetchMyBuilds(userId: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('builds')
    .select('id, name, class_slug, gender, level, visibility, like_count, view_count, avg_rating, created_at, snapshot')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data: (data ?? []) as unknown as MyBuildRow[], error: error?.message ?? null }
}

export async function deleteBuild(buildId: string) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('builds').delete().eq('id', buildId)
  return { error: error?.message ?? null }
}

export async function updateBuildVisibility(buildId: string, visibility: BuildVisibility) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('builds').update({ visibility }).eq('id', buildId)
  return { error: error?.message ?? null }
}

export async function fetchMyLike(buildId: string, userId: string) {
  const supabase = await getSupabase()
  const { data } = await supabase.from('build_likes').select('user_id').eq('build_id', buildId).eq('user_id', userId).maybeSingle()
  return Boolean(data)
}

export async function toggleBuildLike(buildId: string, userId: string, currentlyLiked: boolean) {
  const supabase = await getSupabase()
  if (currentlyLiked) {
    const { error } = await supabase.from('build_likes').delete().eq('build_id', buildId).eq('user_id', userId)
    return { error: error?.message ?? null }
  }
  const { error } = await supabase.from('build_likes').insert({ build_id: buildId, user_id: userId })
  return { error: error?.message ?? null }
}

export async function fetchMyRating(buildId: string, userId: string) {
  const supabase = await getSupabase()
  const { data } = await supabase.from('build_ratings').select('rating').eq('build_id', buildId).eq('user_id', userId).maybeSingle()
  return data?.rating ?? null
}

export async function rateBuild(buildId: string, userId: string, rating: number) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('build_ratings').upsert({ build_id: buildId, user_id: userId, rating })
  return { error: error?.message ?? null }
}

export type CommentRow = {
  id:         string
  content:    string
  created_at: string
  user_id:    string
  profiles:   BuildOwner | null
}

export async function fetchComments(buildId: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('build_comments')
    // Explicit FK name — same PGRST201 ambiguity risk as LIST_COLUMNS above
    // (comment_likes joins build_comments to profiles as a second path).
    .select('id, content, created_at, user_id, profiles!build_comments_user_id_fkey(username, display_name, avatar_url)')
    .eq('build_id', buildId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  return { data: (data ?? []) as unknown as CommentRow[], error: error?.message ?? null }
}

export async function postComment(buildId: string, userId: string, content: string) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('build_comments').insert({ build_id: buildId, user_id: userId, content })
  return { error: error?.message ?? null }
}
