import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Star, Heart, Eye, User, UploadCloud } from 'lucide-react'
import { Button, Frame } from '@/ui'
import { StatsFromBlock } from '@/features/stats-panel/StatsPanel.tsx'
import { useBuildStore, recompute, ALL_SLOTS, type SlotId, type RuneMap } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { useAuthStore, isSafeImageUrl } from '@/store/authStore.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { BuildItemsList } from '@/features/builds/BuildItemsList.tsx'
import { STAT_META, statIconUrl } from '@/features/equipment/statDisplay.ts'
import { CHARACTERISTICS, type DofusClass, type AllocatedCharacteristics, type ScrolledCharacteristics } from '@/engine/types.ts'
import {
  fetchBuildById, recordBuildView, fetchMyLike, toggleBuildLike,
  fetchMyRating, rateBuild, fetchComments, postComment,
  type BuildDetailRow, type CommentRow,
} from '@/features/builds/api.ts'

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
  const applySnapshot  = useBuildStore(s => s.applySnapshot)
  const setLinkedBuildId = useBuildStore(s => s.setLinkedBuildId)
  const equipmentData  = useDataStore(s => s.equipment)
  const setsData       = useDataStore(s => s.sets)

  const [build, setBuild]     = useState<BuildDetailRow | null>(null)
  const resolvedClassLabel    = useClassName(build?.class_slug)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [liked, setLiked]         = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [myRating, setMyRating]   = useState<number | null>(null)

  const [comments, setComments]         = useState<CommentRow[]>([])
  const [commentText, setCommentText]   = useState('')
  const [postingComment, setPostingComment] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    fetchBuildById(id).then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) { setNotFound(true); setLoading(false); return }
      setBuild(data)
      setLikeCount(data.like_count)
      setLoading(false)
      recordBuildView(id, session?.user.id ?? null)
    })
    fetchComments(id).then(({ data }) => { if (!cancelled) setComments(data) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately only re-fetch on id change, not on every session refresh
  }, [id])

  useEffect(() => {
    if (!id || !session) return
    fetchMyLike(id, session.user.id).then(setLiked)
    fetchMyRating(id, session.user.id).then(setMyRating)
  }, [id, session])

  const handleToggleLike = useCallback(async () => {
    if (!session || !id) return
    const next = !liked
    setLiked(next)
    setLikeCount(c => c + (next ? 1 : -1))
    const { error } = await toggleBuildLike(id, session.user.id, liked)
    if (error) { setLiked(!next); setLikeCount(c => c + (next ? -1 : 1)) }
  }, [session, id, liked])

  const handleRate = useCallback(async (rating: number) => {
    if (!session || !id) return
    setMyRating(rating)
    await rateBuild(id, session.user.id, rating)
  }, [session, id])

  function handleLoadIntoPlanner() {
    if (!build) return
    applySnapshot(build.snapshot)
    // Only link back to this build if you actually own it — loading someone
    // else's build should let you publish your own copy, never silently
    // overwrite theirs.
    if (session?.user.id === build.user_id) setLinkedBuildId(build.id)
    navigate(`/${langPathPrefix(i18n.language)}`)
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

  const computedStats = useMemo(() => {
    if (!build || !equipmentData || !setsData) return null
    const snap      = build.snapshot
    const allocated = Object.fromEntries(CHARACTERISTICS.map((c, i) => [c, snap.a[i] ?? 0])) as AllocatedCharacteristics
    const scrolled  = Object.fromEntries(CHARACTERISTICS.map((c, i) => [c, Boolean(snap.s & (1 << i))])) as ScrolledCharacteristics
    const equipped  = Object.fromEntries(
      ALL_SLOTS.map((slot, i) => [slot, snap.e[i] ?? undefined]).filter(([, v]) => v != null)
    ) as Partial<Record<SlotId, number>>
    const runes = (snap.r ?? {}) as Partial<Record<SlotId, RuneMap>>
    return recompute(snap.c as DofusClass, snap.l, allocated, scrolled, equipped, equipmentData, setsData, runes)
  }, [build, equipmentData, setsData])

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
  const ownerLabel = owner?.display_name || owner?.username || ''
  const runesForDisplay = (build.snapshot.r ?? {}) as Partial<Record<SlotId, RuneMap>>

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <header
        className="sticky top-0 z-40 px-4 sm:px-6 h-[52px] flex items-center gap-3"
        style={{ background: 'linear-gradient(to bottom, var(--surface-stone), var(--surface-void))', borderBottom: '1px solid var(--metal-edge)' }}
      >
        <Link to={`/${langPathPrefix(i18n.language)}explore`} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--ink-faint)' }}>
          <ArrowLeft size={14} />
          {t('explore_title')}
        </Link>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-4">
        <Frame padding="lg" className="space-y-3">
          <div className="flex items-center gap-3">
            {portrait && (
              <img src={portrait} alt="" width={56} height={56} className="rounded-lg object-cover flex-shrink-0" style={{ background: 'var(--surface-void)' }} />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold truncate" style={{ color: 'var(--gold)' }}>{build.name}</h1>
              <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{resolvedClassLabel} · {t('level_short', { level: build.level })}</p>
            </div>
            <Button variant="primary" size="sm" onClick={handleLoadIntoPlanner} className="flex-shrink-0">
              <UploadCloud size={13} />
              {t('build_detail_load')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs pt-1" style={{ color: 'var(--ink-faint)' }}>
            <span className="flex items-center gap-1.5">
              {isSafeImageUrl(owner?.avatar_url)
                ? <img src={owner.avatar_url} alt="" width={16} height={16} className="rounded-full object-cover" />
                : <User size={13} />
              }
              {ownerLabel}
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
            <span className="flex items-center gap-1.5"><Eye size={14} />{build.view_count}</span>
            <span className="flex items-center gap-1.5"><Star size={14} style={{ color: 'var(--gold)' }} />{build.avg_rating.toFixed(1)} ({build.rating_count})</span>
          </div>
        </Frame>

        {/* Equipment + full stats — same 2-column layout as the real planner */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
          <Frame padding="lg">
            <h2 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--gold)' }}>{t('equipment')}</h2>
            <BuildItemsList snapshot={build.snapshot} equipment={equipmentData} />
          </Frame>

          <div className="space-y-4">
            {computedStats && (
              <Frame padding="lg" material="parchment" className="space-y-4">
                <div>
                  <h2 className="text-[11px] font-display uppercase tracking-[0.22em] font-bold mb-1.5" style={{ color: 'var(--gold)' }}>
                    {t('characteristics')}
                  </h2>
                  <div className="grid grid-cols-2 gap-1">
                    {([
                      ['vitality',     'char_vitality',     computedStats.vitality],
                      ['wisdom',       'char_wisdom',       computedStats.wisdom],
                      ['strength',     'char_strength',     computedStats.strength],
                      ['intelligence', 'char_intelligence', computedStats.intelligence],
                      ['chance',       'char_chance',        computedStats.chance],
                      ['agility',      'char_agility',      computedStats.agility],
                    ] as const).map(([icon, labelKey, value]) => {
                      const color = STAT_META[icon.charAt(0).toUpperCase() + icon.slice(1)]?.color ?? 'var(--ink-muted)'
                      return (
                        <div key={icon} className="flex items-center gap-1.5 px-2 py-1 rounded" style={{
                          background: `color-mix(in srgb, ${color} 5%, var(--surface-stone))`,
                          borderLeft: `2px solid color-mix(in srgb, ${color} 50%, transparent)`,
                        }}>
                          <img src={statIconUrl(icon)} alt="" width={13} height={13} className="object-contain flex-shrink-0" />
                          <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--ink-muted)' }}>{t(labelKey)}</span>
                          <span className="font-mono font-bold text-xs tabular-nums flex-shrink-0" style={{ color }}>{value}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <StatsFromBlock s={computedStats} runes={runesForDisplay} />
              </Frame>
            )}
            <Frame padding="lg">
              <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>{t('build_detail_your_rating')}</p>
              <StarRating value={myRating ?? 0} onRate={handleRate} disabled={!session} />
              {!session && <p className="text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>{t('build_detail_signin_required')}</p>}
            </Frame>
          </div>
        </div>

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
                {t('build_detail_comment_submit')}
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
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
                    {c.profiles?.display_name || c.profiles?.username}
                  </p>
                  <p className="text-xs break-words" style={{ color: 'var(--ink-muted)' }}>{c.content}</p>
                </div>
              </li>
            ))}
          </ul>
        </Frame>
      </main>
    </div>
  )
}
