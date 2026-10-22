import { getSupabase } from '@/lib/supabase.ts'
import type { BuildSnapshot, Gender } from '@/store/buildStore.ts'
import { sanitizeSnapshot } from '@/engine/snapshot.ts'

export type BuildVisibility = 'private' | 'unlisted' | 'public'
export type ExploreSort = 'rating' | 'likes' | 'recent' | 'views'

export type BuildOwner = {
  username:     string
  display_name: string | null
  avatar_url:   string | null
}

export type TagCategory = 'playstyle' | 'element' | 'general'
export type Tag = { id: number; name: string; category: TagCategory }

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
  is_featured?:  boolean
  created_at:    string
  user_id:       string
  fork_of:       string | null
  snapshot:      BuildSnapshot
  profiles:      BuildOwner | null
  build_tags?:   { tags: Tag | null }[]
}

export function buildTags(build: Pick<BuildRow, 'build_tags'>): Tag[] {
  return (build.build_tags ?? []).map(bt => bt.tags).filter((tag): tag is Tag => tag != null)
}

/** Most tags a build can carry: enough to describe it, few enough to scan. */
export const MAX_BUILD_TAGS = 5

export type BuildDetailRow = BuildRow

// `profiles!builds_user_id_fkey` is required, not optional — builds has
// several relationships to profiles (fk_pinned_build, plus many-to-many via
// build_likes/build_ratings/build_bookmarks as junction tables), so a bare
// `profiles(...)` embed is ambiguous and PostgREST rejects it (PGRST201).
const ROW_COLUMNS = 'id, name, slug, class_slug, gender, level, visibility, is_featured, like_count, avg_rating, rating_count, view_count, comment_count, created_at, user_id, fork_of, profiles!builds_user_id_fkey(username, display_name, avatar_url), build_tags(tags(id, name, category))'
const DETAIL_COLUMNS = `${ROW_COLUMNS}, snapshot`
// Cards only draw the equipment icons (snapshot.e): the rest of the snapshot
// (characteristics, runes, names, passives) is the bulk of a build row, so
// lists fetch just that path and cardRows() rebuilds a minimal snapshot.
const LIST_COLUMNS = `${ROW_COLUMNS}, e:snapshot->e`

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

// A stored snapshot is user-written jsonb: normalize it before any page
// reads snap.a / snap.e (a malformed one would otherwise crash the page for
// every viewer).
const EMPTY_SNAPSHOT = sanitizeSnapshot({ v: 1 })!
function safeRow<T extends { snapshot: BuildSnapshot }>(row: T): T {
  return { ...row, snapshot: sanitizeSnapshot(row.snapshot) ?? EMPTY_SNAPSHOT }
}
const safeRows = <T extends { snapshot: BuildSnapshot }>(rows: T[]): T[] => rows.map(safeRow)
type CardRow = Omit<BuildRow, 'snapshot'> & { e?: unknown }
function cardRow({ e, ...row }: CardRow): BuildRow {
  const snapshot = sanitizeSnapshot({ v: 1, c: row.class_slug, l: row.level, g: row.gender === 'female' ? 'f' : 'm', e }) ?? EMPTY_SNAPSHOT
  return { ...row, snapshot }
}
const cardRows = (rows: unknown[]): BuildRow[] => (rows as CardRow[]).map(cardRow)

const SORT_COLUMN: Record<ExploreSort, string> = {
  rating: 'avg_rating',
  likes:  'like_count',
  recent: 'created_at',
  views:  'view_count',
}

export const fetchPublicBuilds = guard(async function fetchPublicBuilds(opts: { classSlug?: string | null; userId?: string | null; tagId?: number | null; search?: string | null; sort: ExploreSort; page: number; pageSize?: number }) {
  const supabase  = await getSupabase()
  const pageSize  = opts.pageSize ?? 24
  const from      = opts.page * pageSize
  const to        = from + pageSize - 1
  let query = supabase
    .from('builds')
    // A second, aliased !inner embed filters by tag without trimming the
    // build_tags list each card displays.
    // The total only matters for the first page ("Load more" keeps it), and
    // an exact count re-runs the whole filtered query on top of the page.
    .select(opts.tagId ? `${LIST_COLUMNS}, filter_tag:build_tags!inner(tag_id)` : LIST_COLUMNS, opts.page === 0 ? { count: 'exact' } : undefined)
    .eq('visibility', 'public')
    .order(SORT_COLUMN[opts.sort], { ascending: false })
    // Tie-breaker: most builds share like/view/rating counts (often 0), and
    // offset pages over an unstable order repeat or skip builds on "Load more".
    .order('id', { ascending: true })
    .range(from, to)
  if (opts.tagId) query = query.eq('filter_tag.tag_id', opts.tagId)
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
  return { data: cardRows(data ?? []), error: error?.message ?? null, count: opts.page === 0 ? count ?? 0 : null }
}, error => ({ data: [] as BuildRow[], error, count: null as number | null }))

// An unlisted build is readable only by its link: every query about one
// build sends its id here, so RLS can tell "opened from the link" from
// "listed" (requested_build_id() in the 20261021000000 migration).
export const BUILD_LINK_HEADER = 'x-build-id'

export const fetchBuildById = guard(async function fetchBuildById(id: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('builds')
    .select(DETAIL_COLUMNS)
    .eq('id', id)
    .setHeader(BUILD_LINK_HEADER, id)
    .single()
  if (error) return { data: null, error: error.message }
  return { data: safeRow(data as unknown as BuildDetailRow), error: null }
}, error => ({ data: null, error }))

export const publishBuild = guard(async function publishBuild(opts: {
  name:        string
  visibility:  BuildVisibility
  classSlug:   string
  gender:      Gender
  level:       number
  gameVersion: string
  snapshot:    BuildSnapshot
  forkOf?:     string | null
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
      fork_of:      opts.forkOf ?? null,
    })
    .select('id, slug')
    .single()
  if (error) return { data: null, error: error.message }
  return { data: data as { id: string; slug: string | null }, error: null }
}, error => ({ data: null, error }))

let tagsPromise: Promise<Tag[]> | null = null

/** The tag catalog (seeded, moderator-managed): fetched once per session. */
export function fetchTags(): Promise<Tag[]> {
  if (!tagsPromise) {
    tagsPromise = getSupabase()
      .then(supabase => supabase.from('tags').select('id, name, category').order('id'))
      .then(({ data, error }) => {
        if (error) throw error
        return (data ?? []) as Tag[]
      })
      .catch(() => {
        tagsPromise = null
        return []
      })
  }
  return tagsPromise
}

/** Replaces a build's tags (owner only, enforced by RLS on build_tags). */
export const setBuildTags = guard(async function setBuildTags(buildId: string, tagIds: number[]) {
  const supabase = await getSupabase()
  const { error: delError } = await supabase.from('build_tags').delete().eq('build_id', buildId)
  if (delError) return { error: delError.message }
  if (tagIds.length === 0) return { error: null }
  const rows = tagIds.slice(0, MAX_BUILD_TAGS).map(tag_id => ({ build_id: buildId, tag_id }))
  const { error } = await supabase.from('build_tags').insert(rows)
  return { error: error?.message ?? null }
}, error => ({ error }))

// ── Collections ──────────────────────────────────────────────────────────

export type CollectionRow = {
  id:          string
  user_id:     string
  name:        string
  description: string | null
  is_public:   boolean
  updated_at:  string
  build_count: number
}

// Counts only the builds the viewer can actually see: in a public
// collection, someone else's view drops the owner's private builds (builds
// RLS), so a plain collection_builds(count) would overstate it.
const COLLECTION_BASE = 'id, user_id, name, description, is_public, updated_at'
const COLLECTION_COLUMNS = `${COLLECTION_BASE}, visible:collection_builds(builds(id, visibility, user_id))`

type BuildVisibilityRef = { visibility: BuildVisibility; user_id: string }

// Unlisted builds are "only with the link": a collection only shows someone
// else's unlisted build to that build's owner or the collection's owner
// (who added it), never to other visitors. Private ones are already hidden
// by RLS.
function showsInCollection(b: BuildVisibilityRef, collectionOwner: string, viewerId: string | null): boolean {
  return b.visibility === 'public' || b.user_id === viewerId || b.user_id === collectionOwner
    // Someone else's unlisted build, added from its link: only the
    // collection owner sees it, never the visitors of a public collection.
    || (b.visibility === 'unlisted' && viewerId === collectionOwner)
}

function toCollection(row: Record<string, unknown>, viewerId: string | null): CollectionRow {
  const { visible, ...rest } = row as Record<string, unknown> & { visible?: { builds: BuildVisibilityRef | null }[] }
  const owner = rest.user_id as string
  const count = (visible ?? []).filter(v => v.builds != null && showsInCollection(v.builds, owner, viewerId)).length
  return { ...(rest as Omit<CollectionRow, 'build_count'>), build_count: count }
}

/** The user's collections (all of them for the owner, public ones for anyone else via RLS). */
export const fetchUserCollections = guard(async function fetchUserCollections(userId: string, publicOnly: boolean = false, viewerId: string | null = null) {
  const supabase = await getSupabase()
  let query = supabase.from('collections').select(COLLECTION_COLUMNS).eq('user_id', userId).order('updated_at', { ascending: false })
  if (publicOnly) query = query.eq('is_public', true)
  const { data, error } = await query
  return { data: (data ?? []).map(row => toCollection(row, viewerId)), error: error?.message ?? null }
}, error => ({ data: [] as CollectionRow[], error }))

export type CollectionDetail = CollectionRow & { profiles: Pick<BuildOwner, 'username' | 'display_name'> | null; builds: BuildRow[] }

/** One collection with its owner and builds (builds the viewer can't see are dropped by RLS). */
export const fetchCollection = guard(async function fetchCollection(id: string, viewerId: string | null) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('collections')
    // The card list already has every visible build, so it gives the count too
    // (no second `visible` embed of the same rows).
    .select(`${COLLECTION_BASE}, profiles(username, display_name), entries:collection_builds(position, added_at, builds(${LIST_COLUMNS}))`)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return { data: null, error: error?.message ?? null }
  const row = data as unknown as Record<string, unknown> & { entries: { position: number; added_at: string; builds: CardRow | null }[] }
  const owner = row.user_id as string
  const builds = [...row.entries]
    .sort((a, b) => a.position - b.position || a.added_at.localeCompare(b.added_at))
    .map(e => (e.builds ? cardRow(e.builds) : null))
    .filter((b): b is BuildRow => b != null && showsInCollection(b, owner, viewerId))
  const { entries: _entries, profiles, ...base } = row
  return { data: { ...(base as Omit<CollectionRow, 'build_count'>), build_count: builds.length, profiles: profiles as CollectionDetail['profiles'], builds } as CollectionDetail, error: null }
}, error => ({ data: null, error }))

export const createCollection = guard(async function createCollection(userId: string, opts: { name: string; description?: string | null; isPublic: boolean }) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('collections')
    .insert({ user_id: userId, name: opts.name, description: opts.description ?? null, is_public: opts.isPublic })
    .select(COLLECTION_COLUMNS)
    .single()
  if (error || !data) return { data: null, error: error?.message ?? 'unknown' }
  return { data: toCollection(data as Record<string, unknown>, userId), error: null }
}, error => ({ data: null, error }))

export const updateCollection = guard(async function updateCollection(id: string, patch: { name?: string; description?: string | null; is_public?: boolean }) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('collections').update(patch).eq('id', id)
  return { error: error?.message ?? null }
}, error => ({ error }))

export const deleteCollection = guard(async function deleteCollection(id: string) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('collections').delete().eq('id', id)
  return { error: error?.message ?? null }
}, error => ({ error }))

/** Ids of the user's collections that already contain this build. */
export const fetchCollectionsWithBuild = guard(async function fetchCollectionsWithBuild(userId: string, buildId: string) {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('collection_builds')
    .select('collection_id, collections!inner(user_id)')
    .eq('build_id', buildId)
    .eq('collections.user_id', userId)
  return new Set(((data ?? []) as { collection_id: string }[]).map(r => r.collection_id))
}, () => new Set<string>())

export const setBuildInCollection = guard(async function setBuildInCollection(collectionId: string, buildId: string, inCollection: boolean) {
  const supabase = await getSupabase()
  const { error } = inCollection
    ? await supabase.from('collection_builds').upsert({ collection_id: collectionId, build_id: buildId }, { onConflict: 'collection_id,build_id', ignoreDuplicates: true })
    : await supabase.from('collection_builds').delete().eq('collection_id', collectionId).eq('build_id', buildId)
  return { error: error?.message ?? null }
}, error => ({ error }))

// ── Reports & moderation ─────────────────────────────────────────────────

export type ReportReason = 'spam' | 'incorrect_data' | 'inappropriate' | 'other'
export const REPORT_REASONS: ReportReason[] = ['spam', 'incorrect_data', 'inappropriate', 'other']
export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed'
export type ReportTarget = { kind: 'build'; id: string } | { kind: 'comment'; id: string }

/** Files a report. `duplicate` when this user already reported that target. */
export const submitReport = guard(async function submitReport(reporterId: string, target: ReportTarget, reason: ReportReason, detail: string | null) {
  const supabase = await getSupabase()
  const row = { reporter_id: reporterId, reason, detail: detail?.trim() ? detail.trim().slice(0, 500) : null }
  const { error } = target.kind === 'build'
    ? await supabase.from('build_reports').insert({ ...row, build_id: target.id })
    : await supabase.from('comment_reports').insert({ ...row, comment_id: target.id })
  if (error?.code === '23505') return { error: 'duplicate' as const }
  return { error: error?.message ?? null }
}, error => ({ error }))

export type ReportRow = {
  id:          string
  kind:        'build' | 'comment'
  reason:      ReportReason
  detail:      string | null
  status:      ReportStatus
  created_at:  string
  reporter:    { username: string } | null
  build:       { id: string; name: string; visibility: BuildVisibility; moderation_hidden: boolean } | null
  comment:     { id: string; content: string; build_id: string; deleted_at: string | null } | null
}

/** Moderation queue (moderators / admins only, enforced by RLS). */
export const fetchReports = guard(async function fetchReports(status: ReportStatus) {
  const supabase = await getSupabase()
  const [builds, comments] = await Promise.all([
    supabase
      .from('build_reports')
      .select('id, reason, detail, status, created_at, reporter:profiles!build_reports_reporter_id_fkey(username), build:builds(id, name, visibility, moderation_hidden)')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('comment_reports')
      .select('id, reason, detail, status, created_at, reporter:profiles!comment_reports_reporter_id_fkey(username), comment:build_comments(id, content, build_id, deleted_at)')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100),
  ])
  const rows: ReportRow[] = [
    ...((builds.data ?? []) as unknown as Omit<ReportRow, 'kind' | 'comment'>[]).map(r => ({ ...r, kind: 'build' as const, comment: null })),
    ...((comments.data ?? []) as unknown as Omit<ReportRow, 'kind' | 'build'>[]).map(r => ({ ...r, kind: 'comment' as const, build: null })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at))
  return { data: rows, error: builds.error?.message ?? null, commentsError: comments.error?.message ?? null }
}, error => ({ data: [] as ReportRow[], error, commentsError: null as string | null }))

export const setReportStatus = guard(async function setReportStatus(report: Pick<ReportRow, 'id' | 'kind'>, status: ReportStatus, reviewerId: string) {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from(report.kind === 'build' ? 'build_reports' : 'comment_reports')
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', report.id)
  return { error: error?.message ?? null }
}, error => ({ error }))

/** Hides (build → private, comment → soft-deleted) or deletes reported content. */
/** Admins only (checked in the DB); only a public build can be featured. */
export const setBuildFeatured = guard(async function setBuildFeatured(buildId: string, featured: boolean) {
  const supabase = await getSupabase()
  const { error } = await supabase.rpc('set_build_featured', { p_build: buildId, p_featured: featured })
  return { error: error?.message ?? null }
}, error => ({ error }))

export const moderateContent = guard(async function moderateContent(kind: 'build' | 'comment', targetId: string, action: 'hide' | 'delete' | 'restore') {
  const supabase = await getSupabase()
  const { error } = await supabase.rpc('moderate_content', { p_kind: kind, p_target: targetId, p_action: action })
  return { error: error?.message ?? null }
}, error => ({ error }))

// ── Notifications ────────────────────────────────────────────────────────

export type NotificationType = 'build_liked' | 'build_commented' | 'build_rated' | 'build_forked' | 'comment_liked' | 'comment_replied' | 'new_follower'

export type NotificationRow = {
  id:         string
  type:       NotificationType
  read:       boolean
  created_at: string
  actor:      { username: string; avatar_url: string | null } | null
  build:      { id: string; name: string } | null
  /** Kept even when `build` is null (e.g. an unlisted remix not in the
   * reader's lists): opening it by id still works through its link. */
  build_id:   string | null
}

export const fetchUnreadNotificationCount = guard(async function fetchUnreadNotificationCount(userId: string) {
  const supabase = await getSupabase()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
  return count ?? 0
}, () => 0)

export const fetchNotifications = guard(async function fetchNotifications(userId: string) {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('notifications')
    .select('id, type, read, created_at, build_id, actor:profiles!notifications_actor_id_fkey(username, avatar_url), build:builds(id, name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  return (data ?? []) as unknown as NotificationRow[]
}, () => [] as NotificationRow[])

/**
 * Live feed of the user's new notifications: a private Realtime Broadcast
 * topic fed by a trigger on `notifications` (RLS on realtime.messages only
 * lets the owner join it). Broadcast rather than Postgres Changes because
 * the latter keeps Realtime polling the database even when nothing happens.
 * `onLive` reports whether the channel is currently joined, so the caller
 * can poll only while it isn't. Returns an unsubscribe function.
 */
export function subscribeToNotifications(userId: string, onInsert: () => void, onLive: (live: boolean) => void = () => {}): () => void {
  let stopped = false
  let cleanup = () => {}
  getSupabase().then(async supabase => {
    await supabase.realtime.setAuth()
    if (stopped) return
    const channel = supabase
      .channel(`notifications:${userId}`, { config: { private: true } })
      .on('broadcast', { event: 'notification' }, onInsert)
      .subscribe(status => { if (!stopped) onLive(status === 'SUBSCRIBED') })
    cleanup = () => { void supabase.removeChannel(channel) }
  }).catch(() => { if (!stopped) onLive(false) })
  return () => { stopped = true; cleanup() }
}

/** Marks the given notifications (or all unread ones) as read. */
export const markNotificationsRead = guard(async function markNotificationsRead(userId: string, ids?: string[]) {
  const supabase = await getSupabase()
  let query = supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
  if (ids) query = query.in('id', ids)
  const { error } = await query
  return { error: error?.message ?? null }
}, error => ({ error }))

export type BuildSummary = { id: string; name: string; profiles: Pick<BuildOwner, 'username' | 'display_name'> | null }

/** Name + owner of a build (the original a remix points to). null when it
 * was deleted, is private (RLS hides it) or is someone else's unlisted
 * build, which must not become discoverable through a remix. */
export const fetchBuildSummary = guard(async function fetchBuildSummary(id: string, viewerId: string | null) {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('builds')
    .select('id, name, visibility, user_id, profiles!builds_user_id_fkey(username, display_name)')
    .eq('id', id)
    .setHeader(BUILD_LINK_HEADER, id)
    .maybeSingle()
  const row = data as unknown as (BuildSummary & BuildVisibilityRef) | null
  if (!row || (row.visibility !== 'public' && row.user_id !== viewerId)) return null
  return { id: row.id, name: row.name, profiles: row.profiles } as BuildSummary
}, () => null)

/** Public remixes of a build, newest first, plus their total count. */
export const fetchForks = guard(async function fetchForks(buildId: string, limit: number = 6) {
  const supabase = await getSupabase()
  const { data, error, count } = await supabase
    .from('builds')
    .select(LIST_COLUMNS, { count: 'exact' })
    .eq('fork_of', buildId)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data: cardRows(data ?? []), count: count ?? 0, error: error?.message ?? null }
}, error => ({ data: [] as BuildRow[], count: 0, error }))

/** Versions kept per build in build_snapshots; older ones are pruned (archive_build_version trigger). */
export const HISTORY_LIMIT = 20

export type BuildVersion = { id: string; label: string | null; created_at: string; level: number }

/**
 * Previous versions of a build, newest first (readable wherever the build
 * is). The list only shows label, date and level, so it skips the snapshots
 * (up to 20 full ones per detail view); fetchVersionSnapshot loads one when
 * it is opened or restored.
 */
export const fetchBuildHistory = guard(async function fetchBuildHistory(buildId: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('build_snapshots')
    .select('id, label, created_at, l:snapshot->l')
    .eq('build_id', buildId)
    .setHeader(BUILD_LINK_HEADER, buildId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)
  const rows = (data ?? []) as { id: string; label: string | null; created_at: string; l: unknown }[]
  return { data: rows.map(({ l, ...v }) => ({ ...v, level: sanitizeSnapshot({ v: 1, l: l ?? undefined })!.l })), error: error?.message ?? null }
}, error => ({ data: [] as BuildVersion[], error }))

// Archived versions never change, so a fetched snapshot is reused (opening
// then restoring the same version, or the hover prefetch then the click).
const versionSnapshots = new Map<string, Promise<BuildSnapshot | null>>()
const loadVersionSnapshot = guard(async function loadVersionSnapshot(buildId: string, versionId: string) {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('build_snapshots')
    .select('snapshot')
    .eq('id', versionId)
    .setHeader(BUILD_LINK_HEADER, buildId)
    .maybeSingle()
  return data ? sanitizeSnapshot((data as { snapshot: unknown }).snapshot) : null
}, () => null)

export function fetchVersionSnapshot(buildId: string, versionId: string): Promise<BuildSnapshot | null> {
  let pending = versionSnapshots.get(versionId)
  if (!pending) {
    pending = loadVersionSnapshot(buildId, versionId)
    versionSnapshots.set(versionId, pending)
    void pending.then(snap => { if (!snap) versionSnapshots.delete(versionId) })
  }
  return pending
}

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
  const { data, error } = await supabase
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
    .select('id')
  if (error) return { error: error.message }
  // RLS turns an update of someone else's (or a deleted) build into a silent
  // 0-row success; report it so the caller doesn't claim it saved.
  if (!data || data.length === 0) return { error: 'not_updated' }
  // The replaced version is archived (and old ones pruned) by the
  // archive_build_version trigger, in the same statement.
  return { error: null }
}, error => ({ error }))

// record_view counts one view per visitor per build per hour; a refresh or
// back-and-forth within the hour wouldn't count anyway, so skip the request.
const VIEW_WINDOW_MS = 60 * 60 * 1000
function viewedRecently(buildId: string): boolean {
  try {
    const key = `df_viewed_${buildId}`
    const last = Number(sessionStorage.getItem(key))
    if (last && Date.now() - last < VIEW_WINDOW_MS) return true
    sessionStorage.setItem(key, String(Date.now()))
  } catch { /* storage blocked: just record */ }
  return false
}

export const recordBuildView = guard(async function recordBuildView(buildId: string, userId: string | null) {
  if (viewedRecently(buildId)) return
  const supabase = await getSupabase()
  await supabase.rpc('record_view', { p_build_id: buildId, p_user_id: userId, p_ip_hash: null })
}, () => undefined)

export type ViewerState = { liked: boolean; bookmarked: boolean; rating: number | null; commentLikes: Set<string> }

/** The signed-in viewer's like, bookmark, rating and liked comments on a
 * build in one round trip (get_build_viewer_state); falls back to the four
 * separate queries if that function isn't deployed. */
export const fetchViewerState = guard(async function fetchViewerState(buildId: string, userId: string): Promise<ViewerState> {
  const supabase = await getSupabase()
  const { data, error } = await supabase.rpc('get_build_viewer_state', { p_build_id: buildId })
  if (!error && data) {
    const s = data as { liked?: boolean; bookmarked?: boolean; rating?: number | null; comment_likes?: string[] }
    return { liked: !!s.liked, bookmarked: !!s.bookmarked, rating: s.rating ?? null, commentLikes: new Set(s.comment_likes ?? []) }
  }
  const [liked, bookmarked, rating, commentLikes] = await Promise.all([
    fetchMyLike(buildId, userId), fetchMyBookmark(buildId, userId), fetchMyRating(buildId, userId), fetchMyCommentLikes(buildId, userId),
  ])
  return { liked, bookmarked, rating, commentLikes }
}, () => ({ liked: false, bookmarked: false, rating: null, commentLikes: new Set<string>() }))

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
  return { data: safeRows((data ?? []) as unknown as MyBuildRow[]), error: error?.message ?? null }
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
  const builds = cardRows((data ?? []).map(row => (row as unknown as { builds: CardRow }).builds))
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
  like_count: number
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
    .select('id, content, like_count, created_at, user_id, profiles!build_comments_user_id_fkey(username, display_name, avatar_url)')
    .eq('build_id', buildId)
    .is('deleted_at', null)
    .setHeader(BUILD_LINK_HEADER, buildId)
    .order('created_at', { ascending: true })
  return { data: (data ?? []) as unknown as CommentRow[], error: error?.message ?? null }
}, error => ({ data: [] as CommentRow[], error }))

/** Ids of this build's comments the user has liked (comment_likes RLS
 * only exposes the user's own rows; the totals live in like_count). */
export const fetchMyCommentLikes = guard(async function fetchMyCommentLikes(buildId: string, userId: string) {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('comment_likes')
    .select('comment_id, build_comments!inner(build_id)')
    .eq('user_id', userId)
    .eq('build_comments.build_id', buildId)
  return new Set(((data ?? []) as { comment_id: string }[]).map(r => r.comment_id))
}, () => new Set<string>())

export const toggleCommentLike = guard(async function toggleCommentLike(commentId: string, userId: string, currentlyLiked: boolean) {
  const supabase = await getSupabase()
  const { error } = currentlyLiked
    ? await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId)
    : await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId })
  return { error: error?.message ?? null }
}, error => ({ error }))

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

export type ProfileSummary = {
  stats:        { buildCount: number; likeCount: number }
  commentCount: number
  tier:         MembershipTier
  /** Raw get_public_custom_rank row; parse with parsePublicCustomRank. */
  rank:         unknown
  /** False when the combined RPC isn't deployed: the caller fetches the rank itself. */
  combined:     boolean
}

/** A public profile's header numbers, tier and custom rank in one round trip
 * (get_public_profile_summary); falls back to the separate queries if that
 * function isn't deployed. */
export const fetchProfileSummary = guard(async function fetchProfileSummary(userId: string): Promise<ProfileSummary> {
  const supabase = await getSupabase()
  const { data, error } = await supabase.rpc('get_public_profile_summary', { p_user_id: userId })
  if (!error && data) {
    const s = data as { tier?: MembershipTier; rank?: unknown; build_count?: number; like_count?: number; comment_count?: number }
    return {
      stats: { buildCount: Number(s.build_count ?? 0), likeCount: Number(s.like_count ?? 0) },
      commentCount: Number(s.comment_count ?? 0),
      tier: s.tier ?? 'free',
      rank: s.rank ?? null,
      combined: true,
    }
  }
  const [stats, comments, tier] = await Promise.all([fetchUserPublicStats(userId), fetchPublicCommentCount(userId), fetchMembershipTier(userId)])
  return { stats: { buildCount: stats.buildCount, likeCount: stats.likeCount }, commentCount: comments.count, tier, rank: null, combined: false }
}, () => ({ stats: { buildCount: 0, likeCount: 0 }, commentCount: 0, tier: 'free' as MembershipTier, rank: null, combined: false }))

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
// The database caches these for 5 minutes too; the client keeps its copy as
// long so going back and forth to Explore doesn't ask again.
const STATS_TTL_MS = 5 * 60 * 1000
let statsCache: { at: number; data: CommunityStats } | null = null

export async function fetchCommunityStats(): Promise<{ data: CommunityStats | null; error: string | null }> {
  if (statsCache && Date.now() - statsCache.at < STATS_TTL_MS) return { data: statsCache.data, error: null }
  const result = await loadCommunityStats()
  if (result.data && !result.error) statsCache = { at: Date.now(), data: result.data }
  return result
}

const loadCommunityStats = guard(async function loadCommunityStats(): Promise<{ data: CommunityStats | null; error: string | null }> {
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
