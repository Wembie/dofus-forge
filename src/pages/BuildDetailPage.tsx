import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Star, Heart, Eye, User, UploadCloud, Bookmark, ScrollText, Calendar, GitFork, History, RotateCcw, FolderPlus, Flag, Award } from 'lucide-react'
import { CollectionPicker } from '@/features/collections/Collections.tsx'
import { ReportModal } from '@/features/moderation/ReportModal.tsx'
import type { ReportTarget } from '@/features/builds/api.ts'
import { Button, Frame } from '@/ui'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { StatsFromBlock } from '@/features/stats-panel/StatsPanel.tsx'
import { recompute, ALL_SLOTS, type SlotId, type RuneMap } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { useAuthStore, isSafeImageUrl } from '@/store/authStore.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { BuildCharacterView } from '@/features/builds/BuildCharacterView.tsx'
import { PassivesPanel } from '@/features/passives/PassivesPanel.tsx'
import { hasPassive } from '@/engine/passives.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { ActiveSetsGrid, computeActiveSets } from '@/features/equipment/SetBonusesPanel.tsx'
import { encodeSnapshot } from '@/features/share/codec.ts'
import { DOFUS_GAME_VERSION } from '@/data/gameVersion.ts'
import { CHARACTERISTICS, type DofusClass, type AllocatedCharacteristics, type ScrolledCharacteristics, type Characteristic } from '@/engine/types.ts'

// Same mapping as CharacteristicsPanel.tsx's local CHAR_COLOR — kept as its
// own copy rather than importing a planner-page component just for one
// constant (that component isn't otherwise part of BuildDetailPage's chunk).
const CHAR_COLOR: Record<Characteristic, string> = {
  vitality:     'var(--vitality)',
  wisdom:       'var(--wisdom)',
  strength:     'var(--earth)',
  intelligence: 'var(--fire)',
  chance:       'var(--water)',
  agility:      'var(--air)',
}
import {
  fetchBuildById, recordBuildView, fetchViewerState, toggleBuildLike,
  toggleBuildBookmark,
  rateBuild, fetchComments, postComment,
  fetchBuildSummary, fetchForks, toggleCommentLike,
  fetchBuildHistory, fetchVersionSnapshot, updateBuild, setBuildFeatured, type BuildVersion,
  buildTags,
  type BuildDetailRow, type CommentRow, type BuildSummary, type BuildRow,
} from '@/features/builds/api.ts'
import { TagChip } from '@/features/builds/TagChips.tsx'

function StarRating({ value, onRate, disabled }: { value: number; onRate: (n: number) => void; disabled: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onRate(n)}
          className="disabled:cursor-not-allowed"
        >
          <Star size={18} fill={n <= value ? 'var(--gold)' : 'none'} style={{ color: 'var(--gold)' }} />
        </button>
      ))}
    </div>
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
  const equipmentData  = useDataStore(s => s.equipment)
  const setsData       = useDataStore(s => s.sets)

  const [build, setBuild]     = useState<BuildDetailRow | null>(null)
  const resolvedClassLabel    = useClassName(build?.class_slug)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [liked, setLiked]         = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [bookmarked, setBookmarked] = useState(false)
  const [myRating, setMyRating]   = useState<number | null>(null)

  const [comments, setComments]         = useState<CommentRow[]>([])
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const [history, setHistory]           = useState<BuildVersion[]>([])
  const [collectOpen, setCollectOpen]   = useState(false)
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null)
  const [restoring, setRestoring]       = useState<string | null>(null)
  // undefined = not loaded / not a remix, null = original no longer visible
  const [forkParent, setForkParent]     = useState<BuildSummary | null | undefined>(undefined)
  const [forks, setForks]               = useState<{ data: BuildRow[]; count: number }>({ data: [], count: 0 })
  const [commentText, setCommentText]   = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const baseSeoTitle = build ? t('build_detail_seo_title', { class: resolvedClassLabel, level: build.level }) : undefined

  usePageSeo(i18n.language.slice(0, 2) as SeoLang, `build/${id ?? ''}`, {
    title: build ? (build.name ? `${build.name} — ${baseSeoTitle}` : baseSeoTitle) : undefined,
    description: build ? t('build_detail_seo_description', { class: resolvedClassLabel, level: build.level }) : undefined,
    image: build ? `https://dofusforge.com/og/${i18n.language.slice(0, 2)}/${id}.png` : undefined,
    noindex: notFound,
  })

  useEffect(() => {
    if (!id) return
    let cancelled = false
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
    fetchBuildById(id).then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) { setNotFound(true); setLoading(false); return }
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
    fetchViewerState(id, session.user.id).then(s => {
      if (cancelled) return
      setLiked(s.liked)
      setBookmarked(s.bookmarked)
      setMyRating(s.rating)
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
    if (!session || !id) return
    setMyRating(rating)
    await rateBuild(id, session.user.id, rating)
  }, [session, id])

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
  async function restoreVersion(version: BuildVersion) {
    if (!build || session?.user.id !== build.user_id) return
    if (!window.confirm(t('build_history_restore_confirm'))) return
    setRestoring(version.id)
    const snap = await fetchVersionSnapshot(build.id, version.id)
    if (!snap) { setRestoring(null); return }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-forge-bg flex items-center justify-center text-sm" style={{ color: 'var(--ink-faint)' }}>
        {t('auth_loading')}
      </div>
    )
  }

  if (notFound || !build) {
    return (
      <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center gap-3 text-sm" style={{ color: 'var(--ink-faint)' }}>
        <p>{t('build_detail_not_found')}</p>
        <Link to={`/${langPathPrefix(i18n.language)}explore`} className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>
          {t('explore_title')}
        </Link>
      </div>
    )
  }

  const classInfo  = CLASS_DATA.find(c => c.id === build.class_slug)
  const portrait   = classInfo ? (build.gender === 'female' ? classInfo.imageFUrl : classInfo.imageUrl) : undefined
  const owner      = build.profiles
  // Always the username, never display_name — see BuildCard.tsx for why.
  const ownerLabel = owner?.username || ''
  const runesForDisplay = (build.snapshot.r ?? {}) as Partial<Record<SlotId, RuneMap>>

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader />

      <main className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-4">
        <Frame padding="lg" className="space-y-3">
          <div className="flex items-center gap-3">
            {portrait && (
              <img src={portrait} alt="" width={56} height={56} className="rounded-lg object-cover flex-shrink-0" style={{ background: 'var(--surface-void)' }} />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-1.5 text-lg font-bold min-w-0" style={{ color: 'var(--gold)' }}>
                {build.is_featured && <Award size={17} className="flex-shrink-0" aria-label={t('build_featured')}><title>{t('build_featured')}</title></Award>}
                <span className="truncate">{build.name}</span>
              </h1>
              <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{resolvedClassLabel} · {t('level_short', { level: build.level })}</p>
            </div>
            {session?.user.id === build.user_id || build.visibility !== 'public' ? (
              <Button variant="primary" size="sm" onClick={handleLoadIntoPlanner} className="flex-shrink-0">
                <UploadCloud size={13} />
                {t('build_detail_load')}
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleLoadIntoPlanner} className="flex-shrink-0" title={t('build_detail_remix_hint')}>
                <GitFork size={13} />
                {t('build_detail_remix')}
              </Button>
            )}
          </div>

          {buildTags(build).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {buildTags(build).map(tag => (
                <Link key={tag.id} to={`/${langPathPrefix(i18n.language)}explore?tag=${tag.name}`} className="hover:brightness-125 transition">
                  <TagChip tag={tag} />
                </Link>
              ))}
            </div>
          )}

          {build.fork_of && forkParent !== undefined && (
            <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-faint)' }}>
              <GitFork size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              {forkParent ? (
                <>
                  {t('build_detail_remix_of')}
                  <Link to={`/${langPathPrefix(i18n.language)}build/${forkParent.id}`} className="font-semibold text-ink hover:text-gold hover:underline transition-colors truncate">
                    {forkParent.name}
                  </Link>
                  {forkParent.profiles?.username && <span>{t('build_detail_remix_by', { author: forkParent.profiles.username })}</span>}
                </>
              ) : t('build_detail_remix_unavailable')}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs pt-1" style={{ color: 'var(--ink-faint)' }}>
            {owner?.username ? (
              <Link to={`/${langPathPrefix(i18n.language)}u/${owner.username}`} className="flex items-center gap-1.5 hover:text-gold hover:underline transition-colors">
                {isSafeImageUrl(owner.avatar_url)
                  ? <img src={owner.avatar_url} alt="" width={16} height={16} className="rounded-full object-cover" />
                  : <User size={13} />
                }
                {ownerLabel}
              </Link>
            ) : (
              <span className="flex items-center gap-1.5">
                <User size={13} />
                {ownerLabel}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar size={13} />
              {new Date(build.created_at).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            <button
              onClick={handleToggleLike}
              disabled={!session}
              className="flex items-center gap-1.5 disabled:cursor-not-allowed"
              style={{ color: liked ? 'var(--negative)' : 'var(--ink-faint)' }}
              title={session ? undefined : t('build_detail_signin_required')}
            >
              <Heart size={14} fill={liked ? 'var(--negative)' : 'none'} />
              {likeCount}
            </button>
            <button
              onClick={handleToggleBookmark}
              disabled={!session}
              className="flex items-center gap-1.5 disabled:cursor-not-allowed"
              style={{ color: bookmarked ? 'var(--gold)' : 'var(--ink-faint)' }}
              title={session ? t('build_detail_bookmark') : t('build_detail_signin_required')}
            >
              <Bookmark size={14} fill={bookmarked ? 'var(--gold)' : 'none'} />
            </button>
            {(build.visibility !== 'private' || session?.user.id === build.user_id) && (
              <button
                onClick={() => setCollectOpen(true)}
                disabled={!session}
                className="flex items-center gap-1.5 disabled:cursor-not-allowed hover:text-gold transition-colors"
                title={session ? t('collections_save') : t('build_detail_signin_required')}
                aria-label={t('collections_save')}
              >
                <FolderPlus size={14} />
              </button>
            )}
            {session?.user.id !== build.user_id && (
              <button
                onClick={() => setReportTarget({ kind: 'build', id: build.id })}
                disabled={!session}
                className="flex items-center gap-1.5 disabled:cursor-not-allowed hover:text-negative transition-colors"
                title={session ? t('report_build_title') : t('build_detail_signin_required')}
                aria-label={t('report_build_title')}
              >
                <Flag size={14} />
              </button>
            )}
            {isAdmin && (build.visibility === 'public' || build.is_featured) && (
              <button
                onClick={handleToggleFeatured}
                disabled={featureBusy}
                className="flex items-center gap-1.5 disabled:opacity-50 hover:text-gold transition-colors"
                style={{ color: build.is_featured ? 'var(--gold)' : 'var(--ink-faint)' }}
                title={t(build.is_featured ? 'build_feature_off' : 'build_feature_on')}
                aria-label={t(build.is_featured ? 'build_feature_off' : 'build_feature_on')}
                aria-pressed={Boolean(build.is_featured)}
              >
                <Award size={14} />
              </button>
            )}
            <span className="flex items-center gap-1.5"><Eye size={14} />{build.view_count}</span>
            {forks.count > 0 && (
              <a href="#remixes" className="flex items-center gap-1.5 hover:text-gold transition-colors" title={t('build_detail_remixes', { count: forks.count })}>
                <GitFork size={14} />{forks.count}
              </a>
            )}
            <span className="flex items-center gap-1.5"><Star size={14} style={{ color: 'var(--gold)' }} />{build.avg_rating.toFixed(1)} ({build.rating_count})</span>
          </div>

          <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--metal-edge)' }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>{t('build_detail_your_rating')}</p>
            <StarRating value={myRating ?? 0} onRate={handleRate} disabled={!session} />
            {!session && <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>({t('build_detail_signin_required')})</p>}
          </div>
        </Frame>

        {/* Equipment + full stats — same 2-column layout as the real planner */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
          <div className="space-y-4">
            <Frame padding="lg">
              <BuildCharacterView
                snapshot={build.snapshot}
                equipment={equipmentData}
                portrait={portrait}
                classLabel={resolvedClassLabel}
                level={build.level}
                stage={classInfo ? { breed: classInfo.breed, gender: build.gender } : undefined}
              />
            </Frame>

            {activeSets.length > 0 && (
              <Frame padding="lg">
                <ActiveSetsGrid activeSets={activeSets} />
              </Frame>
            )}

            {passiveItems.length > 0 && (
              <Frame padding="lg">
                <PassivesPanel items={passiveItems} state={build.snapshot.p ?? {}} />
              </Frame>
            )}
          </div>

          <div className="space-y-4">
            {computedStats && (
              <Frame padding="lg" material="parchment" className="space-y-4">
                <div>
                  <h2 className="text-[11px] font-display uppercase tracking-[0.22em] font-bold mb-1.5" style={{ color: 'var(--gold)' }}>
                    {t('characteristics')}
                  </h2>
                  <div className="grid grid-cols-2 gap-1">
                    {([
                      ['vitality',     'char_vitality',     computedStats.vitality,     false],
                      ['wisdom',       'char_wisdom',       computedStats.wisdom,       false],
                      ['strength',     'char_strength',     computedStats.strength,     true],
                      ['intelligence', 'char_intelligence', computedStats.intelligence, true],
                      ['chance',       'char_chance',       computedStats.chance,       true],
                      ['agility',      'char_agility',      computedStats.agility,      true],
                    ] as const).map(([icon, labelKey, base, getsPower]) => {
                      const color    = CHAR_COLOR[icon]
                      const power    = getsPower ? computedStats.power : 0
                      const total    = base + power
                      // Power boosts these 4 (they double as the matching
                      // element's damage stat in Dofus 3) — the planner shows
                      // it as "980 +290 =1,270" inline since you're actively
                      // tuning it; here it's just noise, so show one number
                      // and put the breakdown in a hover tooltip instead.
                      const tooltip  = power > 0
                        ? t('build_detail_power_breakdown', { base, power, label: t('stat_power') })
                        : undefined
                      return (
                        <div
                          key={icon}
                          className="flex items-center gap-1.5 px-2 py-1 rounded"
                          title={tooltip}
                          style={{
                            background: `color-mix(in srgb, ${color} 5%, var(--surface-stone))`,
                            borderLeft: `2px solid color-mix(in srgb, ${color} 50%, transparent)`,
                          }}
                        >
                          <img src={statIconUrl(icon)} alt="" width={13} height={13} className="object-contain flex-shrink-0" />
                          <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--ink-muted)' }}>{t(labelKey)}</span>
                          {scrolledMap?.[icon] && (
                            <span title={t('build_detail_scrolled')}>
                              <ScrollText size={11} style={{ color }} aria-label={t('build_detail_scrolled')} />
                            </span>
                          )}
                          <span className="font-mono font-bold text-xs tabular-nums flex-shrink-0" style={{ color }}>{total.toLocaleString()}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <StatsFromBlock s={computedStats} runes={runesForDisplay} />
              </Frame>
            )}
          </div>
        </div>

        {forks.count > 0 && (
          <Frame padding="lg" className="space-y-3" id="remixes">
            <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
              <GitFork size={13} /> {t('build_detail_remixes', { count: forks.count })}
            </h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {forks.data.map(f => {
                const info = CLASS_DATA.find(c => c.id === f.class_slug)
                const img  = info ? (f.gender === 'female' ? info.imageFUrl : info.imageUrl) : undefined
                return (
                  <li key={f.id}>
                    <Link
                      to={`/${langPathPrefix(i18n.language)}build/${f.id}`}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:brightness-125"
                      style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)' }}
                    >
                      {img && <img src={img} alt="" width={28} height={28} loading="lazy" className="rounded-md object-cover flex-shrink-0" />}
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>{f.name}</span>
                        <span className="block text-[10px] truncate" style={{ color: 'var(--ink-faint)' }}>
                          {f.profiles?.username ?? ''} · {t('level_short', { level: f.level })}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-[10px] flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>
                        <Heart size={11} />{f.like_count}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Frame>
        )}

        {session && (
          <>
            <CollectionPicker open={collectOpen} onClose={() => setCollectOpen(false)} userId={session.user.id} buildId={build.id} />
            <ReportModal target={reportTarget} reporterId={session.user.id} onClose={() => setReportTarget(null)} />
          </>
        )}

        {history.length > 0 && (
          <Frame padding="lg" className="space-y-3">
            <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
              <History size={13} /> {t('build_history_title', { count: history.length })}
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{t('build_history_hint')}</p>
            <ul className="space-y-1.5">
              {history.map(v => (
                <li key={v.id} onPointerEnter={() => void fetchVersionSnapshot(build.id, v.id)} onFocusCapture={() => void fetchVersionSnapshot(build.id, v.id)} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)' }}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>{v.label || build.name}</span>
                    <span className="block text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                      {new Date(v.created_at).toLocaleString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' · '}{t('level_short', { level: v.level })}
                    </span>
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => openVersion(v)}>
                    <UploadCloud size={12} /> {t('build_history_open')}
                  </Button>
                  {session?.user.id === build.user_id && (
                    <Button variant="secondary" size="sm" onClick={() => restoreVersion(v)} disabled={restoring != null}>
                      <RotateCcw size={12} /> {restoring === v.id ? t('auth_loading') : t('build_history_restore')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Frame>
        )}

        <Frame padding="lg" className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
            {t('build_detail_comments')} ({comments.length})
          </h2>

          {session ? (
            <form onSubmit={handlePostComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                maxLength={2000}
                placeholder={t('build_detail_comment_placeholder')}
                className="flex-1 text-sm rounded-lg px-3 py-2 transition-colors focus:outline-none"
                style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
              />
              <Button type="submit" variant="primary" size="sm" disabled={postingComment || !commentText.trim()}>
                {postingComment ? t('build_detail_posting') : t('build_detail_comment_submit')}
              </Button>
            </form>
          ) : (
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{t('build_detail_signin_required')}</p>
          )}

          <ul className="space-y-3">
            {comments.length === 0 && (
              <li className="text-xs" style={{ color: 'var(--ink-faint)' }}>{t('build_detail_no_comments')}</li>
            )}
            {comments.map(c => (
              <li key={c.id} className="flex gap-2">
                {isSafeImageUrl(c.profiles?.avatar_url)
                  ? <img src={c.profiles.avatar_url} alt="" width={22} height={22} className="rounded-full object-cover flex-shrink-0" />
                  : <div className="flex items-center justify-center w-[22px] h-[22px] rounded-full flex-shrink-0" style={{ background: 'var(--surface-panel)' }}><User size={11} style={{ color: 'var(--ink-faint)' }} /></div>
                }
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    {c.profiles?.username ? (
                      <Link
                        to={`/${langPathPrefix(i18n.language)}u/${c.profiles.username}`}
                        className="text-[11px] font-semibold text-ink hover:text-gold hover:underline transition-colors"
                      >
                        {c.profiles.username}
                      </Link>
                    ) : (
                      <p className="text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
                        {c.profiles?.username}
                      </p>
                    )}
                    {/* Date + time (not just date) — comments can happen
                        several times in the same day, a date alone wouldn't
                        tell two same-day replies apart. */}
                    <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                      {new Date(c.created_at).toLocaleString(i18n.language, {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs break-words" style={{ color: 'var(--ink-muted)' }}>{c.content}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <button
                      type="button"
                      onClick={() => handleToggleCommentLike(c.id)}
                      disabled={!session}
                      aria-pressed={likedComments.has(c.id)}
                      aria-label={t('comment_like')}
                      title={session ? t('comment_like') : t('build_detail_signin_required')}
                      className="flex items-center gap-1 text-[10px] disabled:cursor-not-allowed transition-colors"
                      style={{ color: likedComments.has(c.id) ? 'var(--negative)' : 'var(--ink-faint)' }}
                    >
                      <Heart size={11} fill={likedComments.has(c.id) ? 'var(--negative)' : 'none'} />
                      {c.like_count > 0 && c.like_count}
                    </button>
                    {session?.user.id !== c.user_id && (
                      <button
                        type="button"
                        onClick={() => setReportTarget({ kind: 'comment', id: c.id })}
                        disabled={!session}
                        title={session ? undefined : t('build_detail_signin_required')}
                        className="text-[10px] hover:text-gold hover:underline transition-colors disabled:cursor-not-allowed disabled:no-underline"
                        style={{ color: 'var(--ink-faint)' }}
                      >
                        {t('comment_report')}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Frame>
      </main>

      <SiteFooter />
    </div>
  )
}
