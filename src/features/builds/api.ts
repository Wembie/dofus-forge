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

// Each function below reports failures as an `error` value. Supabase already
// does that for failed requests, but getSupabase() itself can still reject
// (supabase-js chunk failed to load: offline, stale deploy), and an awaited
// rejection would leave the caller's loading state hanging. guard() turns it
// into the same failure value the function returns for any other error.
function guard<A extends unknown[], R>(fn: (...args: A) => Promise<R>, fallback: (error: string) => NoInfer<R>) {
  return async (...args: A): Promise<R> => {
    try {
      return await fn(...args)
    } catch (e) {
      return fallback(e instanceof Error ? e.message : String(e))
    }
  }
}

const SORT_COLUMN: Record<ExploreSort, string> = {
  rating: 'avg_rating',
  likes:  'like_count',
  recent: 'created_at',
  views:  'view_count',
}

export const fetchPublicBuilds = guard(async function fetchPublicBuilds(opts: { classSlug?: string | null; userId?: string | null; search?: string | null; sort: ExploreSort; page: number; pageSize?: number }) {
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
  if (opts.userId) query = query.eq('user_id', opts.userId)
  // `builds.search_vector` is a generated+indexed tsvector column (idx_builds_search,
  // a GIN index — see docs/DATABASE.md) — no schema change needed for this. 'simple'
  // config matches exactly how the column itself was generated (no language stemming,
  // since names/descriptions are free text in any of the app's 4 languages).
  //
  // Per-word PREFIX match (word:*) instead of plainto_tsquery's whole-word match — typing
  // "Emp" needs to find "Empujes" as the user types, which a whole-word tsquery can't do
  // (and plain `ilike '%x%'` would, but at the cost of a full sequential scan: no index
  // supports a leading wildcard without a separate pg_trgm index, which doesn't exist here).
  // This still hits the existing GIN index — no new migration needed.
  if (opts.search?.trim()) {
    const tsQuery = opts.search
      .trim()
      .split(/\s+/)
      .map(w => w.replace(/[^\p{L}\p{N}]/gu, '')) // strip tsquery operators/punctuation — avoid syntax errors, not a security issue (PostgREST params are always bound, never interpolated SQL)
      .filter(Boolean)
      .map(w => `${w}:*`)
      .join(' & ')
    if (tsQuery) query = query.textSearch('search_vector', tsQuery, { config: 'simple' })
  }
  const { data, error, count } = await query
  return { data: (data ?? []) as unknown as BuildRow[], error: error?.message ?? null, count: count ?? 0 }
}, error => ({ data: [] as BuildRow[], error, count: 0 }))

export const fetchBuildById = guard(async function fetchBuildById(id: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('builds')
    .select(LIST_COLUMNS)
    .eq('id', id)
    .single()
  if (error) return { data: null, error: error.message }
  return { data: data as unknown as BuildDetailRow, error: null }
}, error => ({ data: null, error }))

export const publishBuild = guard(async function publishBuild(opts: {
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
}, error => ({ data: null, error }))

export const updateBuild = guard(async function updateBuild(buildId: string, opts: {
  name:        string
  visibility:  BuildVisibility
  classSlug:   string
  gender:      Gender
  level:       number
  gameVersion: string
  snapshot:    BuildSnapshot
}) {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('builds')
    .update({
      name:         opts.name,
      game_version: opts.gameVersion,
      class_slug:   opts.classSlug,
      gender:       opts.gender,
      level:        opts.level,
      visibility:   opts.visibility,
      snapshot:     opts.snapshot,
    })
    .eq('id', buildId)
  return { error: error?.message ?? null }
}, error => ({ error }))

export const recordBuildView = guard(async function recordBuildView(buildId: string, userId: string | null) {
  const supabase = await getSupabase()
  await supabase.rpc('record_view', { p_build_id: buildId, p_user_id: userId, p_ip_hash: null })
}, () => undefined)

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
  comment_count: number
  created_at:    string
  snapshot:      BuildSnapshot
}

export const fetchMyBuilds = guard(async function fetchMyBuilds(userId: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('builds')
    .select('id, name, class_slug, gender, level, visibility, like_count, view_count, avg_rating, comment_count, created_at, snapshot')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data: (data ?? []) as unknown as MyBuildRow[], error: error?.message ?? null }
}, error => ({ data: [] as MyBuildRow[], error }))

export const deleteBuild = guard(async function deleteBuild(buildId: string) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('builds').delete().eq('id', buildId)
  return { error: error?.message ?? null }
}, error => ({ error }))

export const updateBuildVisibility = guard(async function updateBuildVisibility(buildId: string, visibility: BuildVisibility) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('builds').update({ visibility }).eq('id', buildId)
  return { error: error?.message ?? null }
}, error => ({ error }))

export const fetchMyLike = guard(async function fetchMyLike(buildId: string, userId: string) {
  const supabase = await getSupabase()
  const { data } = await supabase.from('build_likes').select('user_id').eq('build_id', buildId).eq('user_id', userId).maybeSingle()
  return Boolean(data)
}, () => false)

export const toggleBuildLike = guard(async function toggleBuildLike(buildId: string, userId: string, currentlyLiked: boolean) {
  const supabase = await getSupabase()
  if (currentlyLiked) {
    const { error } = await supabase.from('build_likes').delete().eq('build_id', buildId).eq('user_id', userId)
    return { error: error?.message ?? null }
  }
  const { error } = await supabase.from('build_likes').insert({ build_id: buildId, user_id: userId })
  return { error: error?.message ?? null }
}, error => ({ error }))

export const fetchMyBookmark = guard(async function fetchMyBookmark(buildId: string, userId: string) {
  const supabase = await getSupabase()
  const { data } = await supabase.from('build_bookmarks').select('user_id').eq('build_id', buildId).eq('user_id', userId).maybeSingle()
  return Boolean(data)
}, () => false)

export const toggleBuildBookmark = guard(async function toggleBuildBookmark(buildId: string, userId: string, currentlyBookmarked: boolean) {
  const supabase = await getSupabase()
  if (currentlyBookmarked) {
    const { error } = await supabase.from('build_bookmarks').delete().eq('build_id', buildId).eq('user_id', userId)
    return { error: error?.message ?? null }
  }
  const { error } = await supabase.from('build_bookmarks').insert({ build_id: buildId, user_id: userId })
  return { error: error?.message ?? null }
}, error => ({ error }))

/**
 * Builds the current user has bookmarked. `build_bookmarks` RLS is
 * owner-only (`using (auth.uid() = user_id)`, unlike build_likes/follows
 * which are publicly readable) — bookmarks are private, so this can only
 * ever be called for the signed-in user's own id, never someone else's.
 * Inner-joins to builds for the actual card data (same LIST_COLUMNS as
 * Explore/profile), ordered by when it was bookmarked, most recent first.
 */
export const fetchMyBookmarkedBuilds = guard(async function fetchMyBookmarkedBuilds(userId: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('build_bookmarks')
    .select(`created_at, builds!inner(${LIST_COLUMNS})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) return { data: [] as BuildRow[], error: error.message }
  const builds = (data ?? []).map(row => (row as unknown as { builds: BuildRow }).builds)
  return { data: builds, error: null }
}, error => ({ data: [] as BuildRow[], error }))

export const fetchMyRating = guard(async function fetchMyRating(buildId: string, userId: string) {
  const supabase = await getSupabase()
  const { data } = await supabase.from('build_ratings').select('rating').eq('build_id', buildId).eq('user_id', userId).maybeSingle()
  return data?.rating ?? null
}, () => null)

export const rateBuild = guard(async function rateBuild(buildId: string, userId: string, rating: number) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('build_ratings').upsert({ build_id: buildId, user_id: userId, rating })
  return { error: error?.message ?? null }
}, error => ({ error }))

export type CommentRow = {
  id:         string
  content:    string
  created_at: string
  user_id:    string
  profiles:   BuildOwner | null
}

export const fetchComments = guard(async function fetchComments(buildId: string) {
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
}, error => ({ data: [] as CommentRow[], error }))

export const postComment = guard(async function postComment(buildId: string, userId: string, content: string) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('build_comments').insert({ build_id: buildId, user_id: userId, content })
  return { error: error?.message ?? null }
}, error => ({ error }))

export type PublicProfile = {
  id:               string
  username:         string
  display_name:     string | null
  bio:              string | null
  avatar_url:       string | null
  created_at:       string
  followers_count:  number
  following_count:  number
}

/**
 * Public profile lookup by username — never by id/UID, so the profile URL
 * (/u/:username) never exposes the internal uuid. `profiles` already has a
 * `for select using (true)` RLS policy (same one BuildCard/comments already
 * rely on for owner names), so this needs no new policy. followers_count/
 * following_count are already trigger-synced columns (sync_follow_counts) —
 * reading them here is just two more columns off the same row, not a
 * separate count query.
 */
export const fetchProfileByUsername = guard(async function fetchProfileByUsername(username: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, created_at, followers_count, following_count')
    .eq('username', username)
    .maybeSingle()
  if (error || !data) return { data: null, error: error?.message ?? null }
  return { data: data as PublicProfile, error: null }
}, error => ({ data: null, error }))

export type MembershipTier = 'free' | 'apprentice' | 'artisan' | 'forger' | 'master'

/**
 * `memberships`' own RLS only lets a user read their own row (it holds
 * billing fields like provider_customer_id, and RLS is row-level, not
 * column-level) — so a public profile showing someone ELSE's tier goes
 * through this RPC instead, which exposes only the tier via a security
 * definer function (get_public_membership_tier). No row in `memberships`
 * means free tier (docs/MEMBERSHIP_DESIGN.md §7): the table only ever holds
 * accounts that actually subscribed, so that's the common case today.
 */
export const fetchMembershipTier = guard(async function fetchMembershipTier(userId: string): Promise<MembershipTier> {
  const supabase = await getSupabase()
  const { data } = await supabase.rpc('get_public_membership_tier', { p_user_id: userId })
  return (data as MembershipTier | null) ?? 'free'
}, () => 'free' as const)

/**
 * Lightweight aggregate stats for a profile's public builds — count + total
 * likes received, WITHOUT ever pulling the full build rows (snapshot JSON
 * included in LIST_COLUMNS is the heaviest part of a build row and isn't
 * needed just to show two numbers). Deliberately excludes private/unlisted,
 * unlike profiles.builds_count (incremented by sync_builds_count for every
 * build regardless of visibility). The actual build cards are fetched
 * separately, paginated, via fetchPublicBuilds({ userId }) — same function
 * and page size Explore already uses, so a profile with many public builds
 * doesn't pull them (and their snapshots) all at once.
 */
export const fetchUserPublicStats = guard(async function fetchUserPublicStats(userId: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('builds')
    .select('like_count')
    .eq('user_id', userId)
    .eq('visibility', 'public')
  const rows = data ?? []
  return {
    buildCount: rows.length,
    likeCount:  rows.reduce((sum, b) => sum + (b.like_count ?? 0), 0),
    error: error?.message ?? null,
  }
}, error => ({ buildCount: 0, likeCount: 0, error }))

/**
 * Comments this user has posted, scoped to comments on PUBLIC builds only
 * (the `builds!inner` embed + filter excludes comments left on private/
 * unlisted builds from the count — those shouldn't be inferable from a
 * public profile even as a bare number).
 */
export const fetchPublicCommentCount = guard(async function fetchPublicCommentCount(userId: string) {
  const supabase = await getSupabase()
  const { count, error } = await supabase
    .from('build_comments')
    .select('id, builds!inner(visibility)', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null)
    .eq('builds.visibility', 'public')
  return { count: count ?? 0, error: error?.message ?? null }
}, error => ({ count: 0, error }))

/**
 * Does `followerId` already follow `followingId`? `.maybeSingle()` on the
 * (follower_id, following_id) primary key — a single indexed row lookup,
 * no count/scan needed.
 */
export const fetchIsFollowing = guard(async function fetchIsFollowing(followerId: string, followingId: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()
  return { following: !!data, error: error?.message ?? null }
}, error => ({ following: false, error }))

export type FollowProfile = { id: string; username: string; display_name: string | null; avatar_url: string | null }

/** Accounts that follow `userId` — the "followers" list behind that count. */
export const fetchFollowers = guard(async function fetchFollowers(userId: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('follows')
    .select('profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)')
    .eq('following_id', userId)
  const rows = ((data ?? []) as unknown as { profiles: FollowProfile | null }[])
    .map(r => r.profiles).filter((p): p is FollowProfile => p != null)
  return { data: rows, error: error?.message ?? null }
}, error => ({ data: [] as FollowProfile[], error }))

/** Accounts `userId` follows — the "following" list behind that count. */
export const fetchFollowing = guard(async function fetchFollowing(userId: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('follows')
    .select('profiles!follows_following_id_fkey(id, username, display_name, avatar_url)')
    .eq('follower_id', userId)
  const rows = ((data ?? []) as unknown as { profiles: FollowProfile | null }[])
    .map(r => r.profiles).filter((p): p is FollowProfile => p != null)
  return { data: rows, error: error?.message ?? null }
}, error => ({ data: [] as FollowProfile[], error }))

export const followUser = guard(async function followUser(followerId: string, followingId: string) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId })
  return { error: error?.message ?? null }
}, error => ({ error }))

export const unfollowUser = guard(async function unfollowUser(followerId: string, followingId: string) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId)
  return { error: error?.message ?? null }
}, error => ({ error }))

/**
 * Total builds on the site, public + private — a single security-definer
 * RPC (get_total_builds_count), since builds' own RLS would otherwise only
 * let this count public builds + the caller's own. Returns just a number,
 * never row content, so bypassing RLS here doesn't leak anything.
 */
export const fetchTotalBuildsCount = guard(async function fetchTotalBuildsCount() {
  const supabase = await getSupabase()
  const { data, error } = await supabase.rpc('get_total_builds_count')
  return { count: typeof data === 'number' ? data : Number(data ?? 0), error: error?.message ?? null }
}, error => ({ count: 0, error }))

export type CommunityStats = {
  usersCount:        number
  buildsCount:       number
  publicBuildsCount: number
  likesCount:        number
  viewsCount:        number
  buildsThisWeek:    number
  // null until the forge_runs migration has been run on the database.
  forgeRunsCount:     number | null
  forgeFinishedCount: number | null
}

/**
 * Headline numbers for the Explore stats bar — one RPC round trip
 * (get_community_stats) instead of six separate count queries.
 */
export const fetchCommunityStats = guard(async function fetchCommunityStats(): Promise<{ data: CommunityStats | null; error: string | null }> {
  const supabase = await getSupabase()
  const { data, error } = await supabase.rpc('get_community_stats')
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, number> | null
  const stats: CommunityStats = {
    usersCount:        Number(row?.users_count ?? 0),
    buildsCount:       Number(row?.builds_count ?? 0),
    publicBuildsCount: Number(row?.public_builds_count ?? 0),
    likesCount:        Number(row?.likes_count ?? 0),
    viewsCount:        Number(row?.views_count ?? 0),
    buildsThisWeek:    Number(row?.builds_this_week ?? 0),
    forgeRunsCount:     row?.forge_runs_count == null ? null : Number(row.forge_runs_count),
    forgeFinishedCount: row?.forge_finished_count == null ? null : Number(row.forge_finished_count),
  }
  return { data: stats, error: error?.message ?? null }
}, error => ({ data: null, error }))

export type ForgeRunStart = {
  intensity:     'quick' | 'standard' | 'master' | 'eternal'
  transcendence: boolean
  requirements:  number
}

/**
 * Logs one La Forjadora use when the forge is lit (no order details, no IP)
 * and resolves to its row id, or null. Fire and forget: a failure here
 * (offline, migration not run yet) must never affect the forge itself.
 */
export async function startForgeRun(run: ForgeRunStart): Promise<number | null> {
  try {
    const supabase = await getSupabase()
    const { data } = await supabase.rpc('start_forge_run', {
      p_intensity:     run.intensity,
      p_transcendence: run.transcendence,
      p_requirements:  run.requirements,
    })
    return data == null ? null : Number(data)
  } catch {
    return null
  }
}

/** Marks a use logged by startForgeRun as finished ("Pieces forged"). */
export async function finishForgeRun(started: Promise<number | null> | null, result: { allMet: boolean; seconds: number }) {
  try {
    const id = await started
    if (id == null) return
    const supabase = await getSupabase()
    await supabase.rpc('finish_forge_run', {
      p_id:      id,
      p_all_met: result.allMet,
      p_seconds: Math.round(result.seconds),
    })
  } catch {
    /* stats only */
  }
}
