import { VISUAL_REVISION } from '../data/visual.ts'
import { lazy, Suspense, useEffect, useState, useCallback, useId, useMemo, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link, useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { ArrowLeft, ArrowUpRight, Award, Bookmark, Compass, Eye, Flag, FolderPlus, GitFork, Heart, History, MessageSquare, RotateCcw, Star, UploadCloud } from 'lucide-react'
import { ReportModal } from '@/features/moderation/ReportModal.tsx'
import type { ReportTarget } from '@/features/builds/api.ts'
import { Modal } from '@/ui'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { StatsOverview } from '@/features/stats-panel/StatsOverview.tsx'
import { recompute, ALL_SLOTS, type SlotId, type RuneMap } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { useAuthStore, isSafeImageUrl } from '@/store/authStore.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { langFromPath, langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { BuildCharacterView } from '@/features/builds/BuildCharacterView.tsx'
import { StarRating } from '@/features/builds/StarRating.tsx'
import { PassivesPanel } from '@/features/passives/PassivesPanel.tsx'
import { hasPassive } from '@/engine/passives.ts'
import { legendaryBonusOf } from '@/engine/petLegendary.ts'
import { STAT_META, fmtValue, isIgnored, statIconUrl } from '@/features/equipment/statDisplay.ts'
import { computeActiveSets } from '@/features/equipment/SetBonusesPanel.tsx'
import { encodeSnapshot } from '@/features/share/codec.ts'
import { requestSignIn } from '@/features/auth/requestSignIn.ts'
import { DOFUS_GAME_VERSION } from '@/data/gameVersion.ts'
import { CHARACTERISTICS, type DofusClass, type AllocatedCharacteristics, type ScrolledCharacteristics } from '@/engine/types.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import {
  fetchBuildById, recordBuildView, fetchViewerState, toggleBuildLike,
  toggleBuildBookmark,
  rateBuild, fetchRatingSummary, fetchComments, postComment,
  fetchBuildSummary, fetchForks, toggleCommentLike,
  fetchBuildHistory, fetchVersionSnapshot, updateBuild, setBuildFeatured, type BuildVersion,
  buildTags,
  type BuildDetailRow, type CommentRow, type BuildSummary, type BuildRow,
} from '@/features/builds/api.ts'
import { SENTINEL_BUILD_ID } from '@/data/prerenderSentinels.ts'
import { equippedCatalog } from '@/data/buildCatalog.server.ts'
import './build-detail.css'

const CollectionPicker = lazy(() => import('@/features/collections/Collections.tsx').then(m => ({ default: m.CollectionPicker })))
const SetDetailModal = lazy(() => import('@/features/equipment/SetDetailModal.tsx').then(m => ({ default: m.SetDetailModal })))

const COMMENT_MAX = 2000

// Runs only while prerendering public builds (react-router.config.ts), so
// crawlers get the build and its comments in the HTML. A build that stopped
// being public is never served from that file: the Worker checks first.
// The build's equipped items and sets come along too, so its stats, set
// bonuses and equipment are in the HTML instead of waiting for the ~5 MB
// item catalog to download.
export async function loader({ params, request }: LoaderFunctionArgs) {
  const id = params.id ?? ''
  if (id === SENTINEL_BUILD_ID) return { build: null, comments: [] as CommentRow[], catalog: null }
  const [{ data: build }, { data: comments }] = await Promise.all([fetchBuildById(id), fetchComments(id)])
  if (!build) return { build: null, comments: [] as CommentRow[], catalog: null }
  const catalog = await equippedCatalog(langFromPath(new URL(request.url).pathname), build.snapshot.e)
  return { build, comments, catalog }
}

// In the browser the page loads and refreshes its own data, as it always
// has (prerendered builds hydrate from the loader's data first). Builds
// published since the last deploy have no prerendered data to fetch.
export async function clientLoader() {
  return null
}


function Avatar({ name, url }: { name: string; url?: string | null }) {
  return isSafeImageUrl(url)
    ? <img className="detail-initial" src={url} alt="" width={24} height={24} />
    : <span className="detail-initial" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
}

function Section({ id, title, aside, children, className = '' }: { id: string; title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={className}>
      <div className="detail-section-head">
        <h2 id={`${id}-title`}>{title}</h2>
        {aside != null && <span>{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function useWhen() {
  const { i18n } = useTranslation()
  return (iso: string) => new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

/** The build's sets under its gear: pieces worn or missing, each tier, the one in force. */
function ActiveSets({ active, items, worn }: { active: { set: AppSet; count: number }[]; items: Map<number, AppItem>; worn: Set<number> }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<AppSet | null>(null)
  if (!active.length) return null
  return (
    <section aria-labelledby="detail-sets-title" className="detail-sets">
      <div className="detail-section-head">
        <h2 id="detail-sets-title">{t('active_sets')}</h2>
        <span>{t('build_sets_count', { count: active.length })}</span>
      </div>
      {active.map(({ set, count }) => {
        const pieces = set.items.flatMap(id => items.get(id) ?? [])
        const tiers = Object.keys(set.bonuses).map(Number).sort((a, b) => a - b)
        const inForce = tiers.filter(n => n <= count).at(-1)
        return (
          <article key={set.ankama_id}>
            <div className="detail-set-head">
              <h3>{set.name}</h3>
              <p>{t('build_set_pieces', { count, total: pieces.length })}</p>
              <button type="button" onClick={() => setOpen(set)}>
                {t('build_open_set')}
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </div>
            <ul className="detail-set-pieces">
              {pieces.map(it => (
                <li key={it.ankama_id}>
                  <span className={worn.has(it.ankama_id) ? '' : 'is-missing'} title={it.name}>
                    {it.image_url && <img src={it.image_url} alt={`${it.name}, ${t(worn.has(it.ankama_id) ? 'build_worn_piece' : 'build_missing_piece')}`} loading="lazy" />}
                  </span>
                </li>
              ))}
            </ul>
            <ol className="detail-tiers">
              {tiers.map(n => (
                <li key={n} className={n === inForce ? 'is-reached' : n <= count ? 'is-passed' : ''}>
                  <span className="detail-tier-count">
                    {t('build_tier', { count: n })}
                    {n === inForce && <em>{t('build_tier_active')}</em>}
                  </span>
                  <span className="detail-tier-effects">
                    {set.bonuses[n].filter(e => !isIgnored(e.stat)).map((e, i) => {
                      const meta = STAT_META[e.stat]
                      return (
                        <span key={i}>
                          {meta?.icon && <img src={statIconUrl(meta.icon)} alt="" />}
                          <b>{fmtValue(e.min, e.max)}</b> {meta ? t(meta.tKey) : e.stat}
                        </span>
                      )
                    })}
                  </span>
                </li>
              ))}
            </ol>
          </article>
        )
      })}
      {open && <Suspense fallback={null}><SetDetailModal set={open} onClose={() => setOpen(null)} /></Suspense>}
    </section>
  )
}

/** Restoring asks first, with which version and when; the current one is kept in the history. */
function RestoreDialog({ version, name, busy, onConfirm, onClose }: { version: BuildVersion; name: string; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  const { t } = useTranslation()
  const when = useWhen()
  return (
    <Modal open onClose={onClose} size="sm" title={t('build_restore_title')} className="detail-dialog">
      <div className="detail-restore">
        <div className="detail-restore-version">
          <History size={20} aria-hidden="true" />
          <span>
            <b>{version.label || name}</b>
            <small>{when(version.created_at)} · {t('level_short', { level: version.level })}</small>
          </span>
        </div>
        <p>{t('build_history_restore_confirm')}</p>
        <div className="detail-dialog-actions">
          <button type="button" onClick={onClose}>{t('report_cancel')}</button>
          <button type="button" className="site-primary" disabled={busy} onClick={onConfirm}>
            <RotateCcw size={15} aria-hidden="true" />
            {busy ? t('auth_loading') : t('build_restore_confirm')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function BuildDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const { t, i18n }  = useTranslation()
  const navigate      = useNavigate()
  useLoadGameData()
  const session        = useAuthStore(s => s.session)
  const isAdmin        = useAuthStore(s => s.profile?.role === 'admin')
  const [featureBusy, setFeatureBusy] = useState(false)
  const seed = useLoaderData<typeof loader | typeof clientLoader>()
  // A prerendered build carries its own items and sets until the full
  // catalog loads; both give the same stats.
  const seedCatalog    = seed?.catalog && seed.build?.id === id ? seed.catalog : null
  const equipmentData  = useDataStore(s => s.equipment) ?? seedCatalog?.items ?? null
  const setsData       = useDataStore(s => s.sets) ?? seedCatalog?.sets ?? null

  // The first data load on mount refreshes a prerendered build in place
  // instead of blanking it, so the hydrated page doesn't flash to "loading".
  const seededId = useRef(seed ? id : null)

  const [build, setBuild]     = useState<BuildDetailRow | null>(seed?.build ?? null)
  const resolvedClassLabel    = useClassName(build?.class_slug)
  const [loading, setLoading] = useState(!seed)
  const [notFound, setNotFound] = useState(!!seed && !seed.build)

  const [liked, setLiked]         = useState(false)
  const [likeCount, setLikeCount] = useState(seed?.build?.like_count ?? 0)
  const [bookmarked, setBookmarked] = useState(false)
  const [myRating, setMyRating]   = useState<number | null>(null)
  const [ratingBusy, setRatingBusy] = useState(false)
  const [ratingError, setRatingError] = useState(false)
  const ratingRequest = useRef(0)

  useEffect(() => {
    ratingRequest.current += 1
    setRatingBusy(false)
    setRatingError(false)
  }, [id, session?.user.id])

  const [comments, setComments]         = useState<CommentRow[]>(seed?.comments ?? [])
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const [history, setHistory]           = useState<BuildVersion[]>([])
  const [collectOpen, setCollectOpen]   = useState(false)
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null)
  const [restoring, setRestoring]       = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<BuildVersion | null>(null)
  const commentId = useId()
  const when = useWhen()
  const prefix = langPathPrefix(i18n.language)
  // undefined = not loaded / not a remix, null = original no longer visible
  const [forkParent, setForkParent]     = useState<BuildSummary | null | undefined>(undefined)
  const [forks, setForks]               = useState<{ data: BuildRow[]; count: number }>({ data: [], count: 0 })
  const [commentText, setCommentText]   = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const baseSeoTitle = build ? t('build_detail_seo_title', { class: resolvedClassLabel, level: build.level }) : undefined

  usePageSeo(i18n.language.slice(0, 2) as SeoLang, `build/${id ?? ''}`, {
    title: build ? (build.name ? `${build.name} — ${baseSeoTitle}` : baseSeoTitle) : undefined,
    description: build ? t('build_detail_seo_description', { class: resolvedClassLabel, level: build.level }) : undefined,
    // ?v= changes with every edit, so link previews (Discord, WhatsApp) that
    // cache by exact image URL pick up the new image; same as the Worker.
    image: build ? `https://dofusforge.com/og/${i18n.language.slice(0, 2)}/${id}.png?v=${Date.parse(build.updated_at) || 0}-${VISUAL_REVISION}` : undefined,
    noindex: notFound,
  })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const fromSeed = seededId.current === id
    seededId.current = null
    if (!fromSeed) {
      setLoading(true)
      setNotFound(false)
      // Build → build navigation (remix links) keeps this page mounted: drop
      // everything from the previous build so nothing of it (history with
      // Restore buttons, comments, remixes) shows under the new one.
      setBuild(null)
      setComments([])
      setForks({ data: [], count: 0 })
      setHistory([])
      setForkParent(undefined)
      setReportTarget(null)
      setCollectOpen(false)
    }
    fetchBuildById(id).then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) { setBuild(null); setNotFound(true); setLoading(false); return }
      setBuild(data)
      setLikeCount(data.like_count)
      setLoading(false)
      recordBuildView(id, session?.user.id ?? null)
      if (data.fork_of) fetchBuildSummary(data.fork_of, session?.user.id ?? null).then(parent => { if (!cancelled) setForkParent(parent) })
    })
    fetchComments(id).then(({ data }) => { if (!cancelled) setComments(data) })
    fetchForks(id).then(({ data, count }) => { if (!cancelled) setForks({ data, count }) })
    fetchBuildHistory(id).then(({ data }) => { if (!cancelled) setHistory(data) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately only re-fetch on id change, not on every session refresh
  }, [id])

  useEffect(() => {
    setLiked(false)
    setBookmarked(false)
    setMyRating(null)
    setLikedComments(new Set())
    if (!id || !session) return
    let cancelled = false
    const ratingVersion = ratingRequest.current
    fetchViewerState(id, session.user.id).then(s => {
      if (cancelled) return
      setLiked(s.liked)
      setBookmarked(s.bookmarked)
      if (ratingVersion === ratingRequest.current) setMyRating(s.rating)
      setLikedComments(s.commentLikes)
    })
    return () => { cancelled = true }
  }, [id, session])

  const handleToggleCommentLike = useCallback(async (commentId: string) => {
    if (!session) return
    const wasLiked = likedComments.has(commentId)
    const apply = (liked: boolean) => {
      setLikedComments(prev => { const next = new Set(prev); if (liked) next.add(commentId); else next.delete(commentId); return next })
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, like_count: c.like_count + (liked ? 1 : -1) } : c))
    }
    apply(!wasLiked)
    const { error } = await toggleCommentLike(commentId, session.user.id, wasLiked)
    if (error) apply(wasLiked)
  }, [session, likedComments])

  const handleToggleLike = useCallback(async () => {
    if (!session || !id) return
    const next = !liked
    setLiked(next)
    setLikeCount(c => c + (next ? 1 : -1))
    const { error } = await toggleBuildLike(id, session.user.id, liked)
    if (error) { setLiked(!next); setLikeCount(c => c + (next ? -1 : 1)) }
  }, [session, id, liked])

  const handleToggleBookmark = useCallback(async () => {
    if (!session || !id) return
    const next = !bookmarked
    setBookmarked(next)
    const { error } = await toggleBuildBookmark(id, session.user.id, bookmarked)
    if (error) setBookmarked(!next)
  }, [session, id, bookmarked])

  const handleRate = useCallback(async (rating: number) => {
    if (!session || !id || ratingBusy) return
    const request = ++ratingRequest.current
    const previous = myRating
    setMyRating(rating)
    setRatingBusy(true)
    setRatingError(false)
    const { error } = await rateBuild(id, session.user.id, rating)
    if (request !== ratingRequest.current) return
    setRatingBusy(false)
    if (error) {
      setMyRating(previous)
      setRatingError(true)
      return
    }
    setMyRating(rating)
    const summaryVersion = ++ratingRequest.current
    const summary = await fetchRatingSummary(id)
    if (summaryVersion === ratingRequest.current && summary) {
      setBuild(current => current?.id === id ? { ...current, ...summary } : current)
    }
  }, [session, id, ratingBusy, myRating])

  const handleToggleFeatured = useCallback(async () => {
    if (!build) return
    const next = !build.is_featured
    setFeatureBusy(true)
    const { error } = await setBuildFeatured(build.id, next)
    setFeatureBusy(false)
    if (!error) setBuild(prev => (prev && prev.id === build.id ? { ...prev, is_featured: next } : prev))
  }, [build])

  async function openVersion(version: BuildVersion) {
    if (!build) return
    const snap = await fetchVersionSnapshot(build.id, version.id)
    if (!snap) return
    const lang = langPathRootSegment(i18n.language.slice(0, 2))
    const linkParam = session?.user.id === build.user_id ? `&edit=${build.id}` : build.visibility === 'public' ? `&fork=${build.id}` : ''
    navigate(`/${lang}?b=${encodeSnapshot({ ...snap, n: version.label || build.name || undefined })}${linkParam}`)
  }

  // Restoring updates the build to that version; updateBuild archives the
  // current one first, so a restore can itself be undone from the history.
  async function restoreVersion(version: BuildVersion): Promise<boolean> {
    if (!build || session?.user.id !== build.user_id) return false
    setRestoring(version.id)
    const snap = await fetchVersionSnapshot(build.id, version.id)
    if (!snap) { setRestoring(null); return false }
    const { error } = await updateBuild(build.id, {
      name:        build.name,
      visibility:  build.visibility,
      classSlug:   snap.c || build.class_slug,
      gender:      snap.g === 'f' ? 'female' : 'male',
      level:       snap.l || build.level,
      gameVersion: DOFUS_GAME_VERSION,
      snapshot:    snap,
    })
    if (!error) {
      const [{ data: fresh }, { data: versions }] = await Promise.all([fetchBuildById(build.id), fetchBuildHistory(build.id)])
      if (fresh) setBuild(fresh)
      setHistory(versions)
    }
    setRestoring(null)
    return !error
  }

  function handleLoadIntoPlanner() {
    if (!build) return
    // Routed through ?b=/?edit= (same mechanism a shared build link already
    // restores from, see useBuildUrl.ts) instead of mutating the store and
    // navigating to a bare path — that left a refresh with nothing to
    // recover `linkedBuildId` from, so hitting Update post-refresh silently
    // published a duplicate instead of updating this build. build.name (the
    // real DB column) overrides the snapshot's own `n`, which can be stale
    // for builds saved before that name was synced back on publish.
    const snapshot = { ...build.snapshot, n: build.name || undefined }
    const encoded  = encodeSnapshot(snapshot)
    const lang     = i18n.language.slice(0, 2)
    const langPath = langPathRootSegment(lang)
    // Your own build: carry the edit link so publishing updates it. Someone
    // else's: a remix — publishing creates your copy, linked back via fork_of,
    // and never touches theirs.
    const linkParam = session?.user.id === build.user_id ? `&edit=${build.id}` : build.visibility === 'public' ? `&fork=${build.id}` : ''
    navigate(`/${langPath}?b=${encoded}${linkParam}`)
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault()
    if (!session || !id || !commentText.trim()) return
    setPostingComment(true)
    const { error } = await postComment(id, session.user.id, commentText.trim())
    setPostingComment(false)
    if (!error) {
      setCommentText('')
      const { data } = await fetchComments(id)
      setComments(data)
    }
  }

  // Separate from computedStats below: this only needs the snapshot's bitmask
  // (not equipment/sets data), so the scroll badges can render before game
  // data finishes loading, and so the read-only characteristics grid can show
  // which stats the build's author scrolled — that's otherwise only visible
  // in the editable planner's own ScrollToggles, with no equivalent here.
  const scrolledMap = useMemo(() => {
    if (!build) return null
    const snap = build.snapshot
    return Object.fromEntries(CHARACTERISTICS.map((c, i) => [c, Boolean(snap.s & (1 << i))])) as ScrolledCharacteristics
  }, [build])

  const computedStats = useMemo(() => {
    if (!build || !equipmentData || !setsData || !scrolledMap) return null
    const snap      = build.snapshot
    const allocated = Object.fromEntries(CHARACTERISTICS.map((c, i) => [c, snap.a[i] ?? 0])) as AllocatedCharacteristics
    const equipped  = Object.fromEntries(
      ALL_SLOTS.map((slot, i) => [slot, snap.e[i] ?? undefined]).filter(([, v]) => v != null)
    ) as Partial<Record<SlotId, number>>
    const runes = (snap.r ?? {}) as Partial<Record<SlotId, RuneMap>>
    return recompute(snap.c as DofusClass, snap.l, allocated, scrolledMap, equipped, equipmentData, setsData, runes)
  }, [build, equipmentData, setsData, scrolledMap])

  const activeSets = useMemo(() => {
    if (!build || !equipmentData || !setsData) return []
    const equipped = Object.fromEntries(
      ALL_SLOTS.map((slot, i) => [slot, build.snapshot.e[i] ?? undefined]).filter(([, v]) => v != null)
    ) as Partial<Record<SlotId, number>>
    return computeActiveSets(equipped, equipmentData, setsData)
  }, [build, equipmentData, setsData])

  // Equipped items with a combat passive, in slot order (read-only panel).
  const passiveItems = useMemo(() => {
    if (!build || !equipmentData) return []
    const byId = new Map(equipmentData.map(it => [it.ankama_id, it]))
    return build.snapshot.e.flatMap(id => (id != null && hasPassive(id) && byId.has(id) ? [byId.get(id)!] : []))
  }, [build, equipmentData])

  // The companion's legendary bonus, only shown when a companion is actually equipped.
  const legendaryPick = useMemo(() => {
    if (!build) return null
    const companionEquipped = build.snapshot.e[ALL_SLOTS.indexOf('companion')] != null
    return companionEquipped && build.snapshot.lb && legendaryBonusOf(build.snapshot.lb.id) ? build.snapshot.lb : null
  }, [build])


  if (loading) {
    return (
      <div className="min-h-screen bg-forge-bg text-forge-text">
        <SiteHeader />
        <main id="main-content" className="detail-page">
          <div className="detail-study" aria-busy="true">
            <div className="detail-loading" role="status">
              <span className="sr-only">{t('auth_loading')}</span>
              <div className="detail-skel detail-skel-hero" />
              <div className="detail-skel-body">
                <div className="detail-skel detail-skel-stage" />
                <div className="detail-skel detail-skel-stats" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (notFound || !build) {
    return (
      <div className="min-h-screen bg-forge-bg text-forge-text">
        <SiteHeader />
        <main id="main-content" className="detail-page">
          <div className="detail-study">
            <div className="detail-missing">
              <Compass size={32} aria-hidden="true" />
              <h1>{t('build_missing_title')}</h1>
              <p>{t('build_detail_not_found')}</p>
              <Link className="site-primary" to={`/${prefix}explore`}>
                <ArrowLeft size={16} aria-hidden="true" />
                {t('explore_title')}
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const classInfo  = CLASS_DATA.find(c => c.id === build.class_slug)
  const portrait   = classInfo ? (build.gender === 'female' ? classInfo.imageFUrl : classInfo.imageUrl) : undefined
  // Always the username, never display_name — see BuildCard.tsx for why.
  const ownerLabel = build.profiles?.username || ''
  const own        = session?.user.id === build.user_id
  const nonPublic  = build.visibility !== 'public'
  const tags       = buildTags(build)
  const nf         = new Intl.NumberFormat(i18n.language === 'es' ? 'es-CO' : i18n.language)
  const ratingFmt  = new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const created    = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(build.created_at))
  const runesForDisplay = (build.snapshot.r ?? {}) as Partial<Record<SlotId, RuneMap>>
  const itemsById  = new Map((equipmentData ?? []).map(it => [it.ankama_id, it]))
  const worn       = new Set(build.snapshot.e.filter((id): id is number => id != null))
  // Actions that need an account ask for it instead of doing nothing.
  const gated = (action: () => void) => (session ? action() : requestSignIn())

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader />

      <main id="main-content" className="detail-page">
        <div className="detail-study">
          <nav className="detail-crumbs" aria-label={t('build_breadcrumb')}>
            <Link to={`/${prefix}explore`}>
              <ArrowLeft size={16} aria-hidden="true" />
              {t('explore_title')}
            </Link>
          </nav>

          <div className="detail-hero">
            {portrait && <img className="detail-portrait" src={portrait} alt="" />}
            <div className="detail-identity">
              <p className="detail-kicker">
                {resolvedClassLabel}
                <span>{t('level_short', { level: build.level })}</span>
                {build.is_featured && (
                  <span className="detail-featured"><Award size={14} aria-hidden="true" />{t('build_featured')}</span>
                )}
                {nonPublic && <span className="detail-visibility">{t(`publish_visibility_${build.visibility}`)}</span>}
              </p>
              <h1>{build.name}</h1>
              <p className="detail-byline">
                {ownerLabel ? (
                  <Link to={`/${prefix}u/${ownerLabel}`}>
                    <Avatar name={ownerLabel} url={build.profiles?.avatar_url} />
                    {ownerLabel}
                  </Link>
                ) : <span />}
                <span aria-hidden="true">·</span>
                <time dateTime={build.created_at}>{t('build_published', { date: created })}</time>
              </p>
              {build.fork_of && forkParent !== undefined && (
                <p className="detail-parent">
                  <GitFork size={14} aria-hidden="true" />
                  {forkParent ? (
                    <>
                      {t('build_detail_remix_of')}{' '}
                      <Link to={`/${prefix}build/${forkParent.id}`}>{forkParent.name}</Link>{' '}
                      {forkParent.profiles?.username && t('build_detail_remix_by', { author: forkParent.profiles.username })}
                    </>
                  ) : t('build_detail_remix_unavailable')}
                </p>
              )}
              {tags.length > 0 && (
                <ul className="detail-tags" aria-label={t('publish_tags_label')}>
                  {tags.map(tag => (
                    <li key={tag.id}><Link to={`/${prefix}explore?tag=${tag.name}`}>{t(`tag_${tag.name}`)}</Link></li>
                  ))}
                </ul>
              )}
            </div>
            <div className="detail-cta">
              <button type="button" className="site-primary" onClick={handleLoadIntoPlanner}>
                {own || nonPublic ? <UploadCloud size={18} aria-hidden="true" /> : <GitFork size={18} aria-hidden="true" />}
                {t(own || nonPublic ? 'build_load' : 'build_remix')}
              </button>
              <p>{t(own ? 'build_load_own_hint' : nonPublic ? 'build_load_hint' : 'build_remix_hint')}</p>
            </div>
          </div>

          <div className="detail-bar">
            <div className="detail-social" role="group" aria-label={t('build_actions')}>
              <button type="button" onClick={() => gated(handleToggleLike)} aria-pressed={session ? liked : undefined}
                aria-label={t('a11y_like_build', { count: likeCount })} className={liked ? 'is-on is-like' : ''}>
                <Heart size={17} aria-hidden="true" />
                <b>{nf.format(likeCount)}</b>
                <span aria-hidden="true">{t('build_like')}</span>
              </button>
              <button type="button" onClick={() => gated(handleToggleBookmark)} aria-pressed={session ? bookmarked : undefined} className={bookmarked ? 'is-on' : ''}>
                <Bookmark size={17} aria-hidden="true" />
                <span>{t(bookmarked ? 'build_bookmarked_label' : 'build_detail_bookmark')}</span>
              </button>
              {(build.visibility !== 'private' || own) && (
                <button type="button" onClick={() => gated(() => setCollectOpen(true))}>
                  <FolderPlus size={17} aria-hidden="true" />
                  <span>{t('collections_save')}</span>
                </button>
              )}
              {!own && (
                <button type="button" className="is-quiet" onClick={() => gated(() => setReportTarget({ kind: 'build', id: build.id }))}>
                  <Flag size={16} aria-hidden="true" />
                  <span>{t('build_report')}</span>
                </button>
              )}
              {isAdmin && (build.visibility === 'public' || build.is_featured) && (
                <button type="button" onClick={handleToggleFeatured} disabled={featureBusy} aria-pressed={Boolean(build.is_featured)}
                  className={'is-admin' + (build.is_featured ? ' is-on' : '')}>
                  <Award size={17} aria-hidden="true" />
                  <span>{t(build.is_featured ? 'build_feature_off' : 'build_feature_on')}</span>
                </button>
              )}
            </div>
            <dl className="detail-numbers">
              <div>
                <dt>{t('build_rating')}</dt>
                <dd>
                  <Star size={15} aria-hidden="true" />
                  {build.rating_count ? (
                    <><b>{ratingFmt.format(build.avg_rating)}</b><small>{t('build_ratings', { count: build.rating_count })}</small></>
                  ) : <small>{t('build_no_ratings')}</small>}
                </dd>
              </div>
              <div>
                <dt>{t('build_views')}</dt>
                <dd><Eye size={15} aria-hidden="true" /><b>{nf.format(build.view_count)}</b></dd>
              </div>
              <div>
                <dt>{t('build_remixes')}</dt>
                <dd>
                  <GitFork size={15} aria-hidden="true" />
                  {forks.count ? <a href="#remixes">{nf.format(forks.count)}</a> : <b>0</b>}
                </dd>
              </div>
              <div>
                <dt>{t('build_detail_comments')}</dt>
                <dd><MessageSquare size={15} aria-hidden="true" /><a href="#comments">{nf.format(comments.length)}</a></dd>
              </div>
            </dl>
            <div className="detail-rate">
              <span>{t('build_detail_your_rating')}{myRating != null && <b className="detail-rating-selected">{new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(myRating)}</b>}</span>
              <StarRating value={myRating ?? 0} disabled={ratingBusy} onRate={n => gated(() => handleRate(n))} />
            </div>
            {ratingError && <p role="alert" className="detail-rating-error">{t('build_rating_save_error')}</p>}
            {!session && (
              <p className="detail-signin-note">
                {t('build_signin_note')}{' '}
                <button type="button" onClick={requestSignIn}>{t('auth_signin_btn')}</button>
              </p>
            )}
          </div>

          <div className="detail-body">
            <div className="detail-column">
              <BuildCharacterView
                snapshot={build.snapshot}
                equipment={equipmentData}
                portrait={portrait}
                classLabel={resolvedClassLabel}
                level={build.level}
                stage={classInfo ? { breed: classInfo.breed, gender: build.gender } : undefined}
              />
              <ActiveSets active={activeSets} items={itemsById} worn={worn} />
            </div>
            <div className="detail-column">
              {computedStats && (
                <aside className="detail-stats" aria-labelledby="detail-stats-title">
                  <div className="detail-section-head">
                    <h2 id="detail-stats-title">{t('build_stats')}</h2>
                    <span>{t('build_stats_hint')}</span>
                  </div>
                  <StatsOverview s={computedStats} runes={runesForDisplay} inCombat={false} />
                </aside>
              )}
            </div>
          </div>

          {(passiveItems.length > 0 || legendaryPick) && (
            <div className="detail-passives-panel">
              <PassivesPanel items={passiveItems} state={build.snapshot.p ?? {}} legendary={legendaryPick} />
            </div>
          )}

          <div className="detail-community">
            <Section id="comments" className="detail-comments" title={t('build_detail_comments')} aside={nf.format(comments.length)}>
              {session ? (
                <form className="detail-comment-form" onSubmit={handlePostComment}>
                  <label htmlFor={commentId} className="sr-only">{t('build_detail_comment_placeholder')}</label>
                  <textarea id={commentId} rows={3} maxLength={COMMENT_MAX} value={commentText}
                    placeholder={t('build_comment_placeholder')} onChange={e => setCommentText(e.target.value)}
                    aria-describedby={`${commentId}-count`} />
                  <div>
                    <small id={`${commentId}-count`} className="detail-count">{nf.format(commentText.length)} / {nf.format(COMMENT_MAX)}</small>
                    <button type="submit" className="site-primary" disabled={postingComment || !commentText.trim()}>
                      {postingComment ? t('build_detail_posting') : t('build_detail_comment_submit')}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="detail-comment-signin">
                  <p>{t('build_comment_signin')}</p>
                  <button type="button" onClick={requestSignIn}>{t('auth_signin_btn')}</button>
                </div>
              )}
              {comments.length ? (
                <ul className="detail-comment-list">
                  {comments.map(c => {
                    const author = c.profiles?.username ?? ''
                    const mine = session?.user.id === c.user_id
                    const likedIt = likedComments.has(c.id)
                    return (
                      <li key={c.id} className="detail-comment">
                        <Avatar name={author || '?'} url={c.profiles?.avatar_url} />
                        <div>
                          <p className="detail-comment-meta">
                            {author ? <Link to={`/${prefix}u/${author}`}>{author}</Link> : <span />}
                            {mine && <span className="detail-you">{t('build_you')}</span>}
                            <time dateTime={c.created_at}>{when(c.created_at)}</time>
                          </p>
                          <p className="detail-comment-text">{c.content}</p>
                          <div className="detail-comment-actions">
                            <button type="button" onClick={() => gated(() => handleToggleCommentLike(c.id))} aria-pressed={likedIt}
                              aria-label={t('comment_like') + (c.like_count ? ` (${c.like_count})` : '')} className={likedIt ? 'is-on' : ''}>
                              <Heart size={14} aria-hidden="true" />
                              {c.like_count > 0 && <span>{c.like_count}</span>}
                            </button>
                            {!mine && (
                              <button type="button" onClick={() => gated(() => setReportTarget({ kind: 'comment', id: c.id }))}
                                aria-label={t('build_report_comment_of', { name: author })}>
                                <Flag size={13} aria-hidden="true" />
                                {t('comment_report')}
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : <p className="detail-empty">{t('build_detail_no_comments')}</p>}
            </Section>
            <div className="detail-side">
              {history.length > 0 && (
                <Section id="history" className="detail-history"
                  title={<><History size={15} aria-hidden="true" />{t('build_history')}</>} aside={nf.format(history.length)}>
                  <p className="detail-muted">{t('build_history_hint')}</p>
                  <ol>
                    {history.map(v => (
                      <li key={v.id} onPointerEnter={() => void fetchVersionSnapshot(build.id, v.id)} onFocusCapture={() => void fetchVersionSnapshot(build.id, v.id)}>
                        <span>
                          <b>{v.label || build.name}</b>
                          <small>
                            <time dateTime={v.created_at}>{when(v.created_at)}</time>
                            {' · '}{t('level_short', { level: v.level })}
                          </small>
                        </span>
                        <button type="button" onClick={() => openVersion(v)}>
                          <UploadCloud size={14} aria-hidden="true" />
                          {t('build_history_open')}
                        </button>
                        {own && (
                          <button type="button" onClick={() => setRestoreTarget(v)} disabled={restoring != null}>
                            <RotateCcw size={14} aria-hidden="true" />
                            {t('build_history_restore')}
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                </Section>
              )}
              {forks.count > 0 && (
                <Section id="remixes" className="detail-remixes"
                  title={<><GitFork size={15} aria-hidden="true" />{t('build_remixes')}</>} aside={nf.format(forks.count)}>
                  <ul>
                    {forks.data.map(f => {
                      const info = CLASS_DATA.find(c => c.id === f.class_slug)
                      const img  = info ? (f.gender === 'female' ? info.imageFUrl : info.imageUrl) : undefined
                      return (
                        <li key={f.id}>
                          <Link to={`/${prefix}build/${f.id}`}>
                            {img && <img src={img} alt="" loading="lazy" />}
                            <span>
                              <b>{f.name}</b>
                              <small>{f.profiles?.username ?? ''} · {t('level_short', { level: f.level })}</small>
                            </span>
                            <span className="detail-fork-likes">
                              <Heart size={13} aria-hidden="true" />
                              <span className="sr-only">{t('build_like')}: </span>
                              {nf.format(f.like_count)}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </Section>
              )}
            </div>
          </div>
        </div>

        {session && (
          <>
            {collectOpen && <Suspense fallback={null}><CollectionPicker open onClose={() => setCollectOpen(false)} userId={session.user.id} buildId={build.id} /></Suspense>}
            <ReportModal target={reportTarget} reporterId={session.user.id} onClose={() => setReportTarget(null)} />
          </>
        )}
        {restoreTarget && (
          <RestoreDialog version={restoreTarget} name={build.name} busy={restoring != null}
            onClose={() => setRestoreTarget(null)}
            onConfirm={async () => { if (await restoreVersion(restoreTarget)) setRestoreTarget(null) }} />
        )}
      </main>

      <SiteFooter />
    </div>
  )
}

export default BuildDetailPage
