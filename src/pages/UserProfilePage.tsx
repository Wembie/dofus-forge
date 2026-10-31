import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { User, Calendar, Heart, MessageSquare, Layers, UserPlus, UserCheck } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { Button } from '@/ui'
import { langPathRootSegment } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { useAuthStore, isSafeImageUrl } from '@/store/authStore.ts'
import { BuildCard } from '@/features/builds/BuildCard.tsx'
import { useIsFollowing } from '@/features/builds/useIsFollowing.ts'
import { CollectionGrid } from '@/features/collections/Collections.tsx'
import { CustomRankBadge } from '@/features/ranks/CustomRankBadge.tsx'
import { fetchPublicCustomRank, parsePublicCustomRank } from '@/features/ranks/api.ts'
import type { PublicCustomRank } from '@/features/ranks/catalog.tsx'
import {
  fetchProfileByUsername, fetchPublicBuilds, fetchProfileSummary, fetchUserCollections, type CollectionRow,
  followUser, unfollowUser,
  type PublicProfile, type BuildRow, type MembershipTier,
} from '@/features/builds/api.ts'
import { SENTINEL_USERNAME } from '@/data/prerenderSentinels.ts'
import { useDateFormatter } from '@/ui/useDateFormatter.ts'

// Runs only while prerendering the authors of public builds
// (react-router.config.ts). A profile that no longer exists is never served
// from that file: the Worker checks first.
const NO_PROFILE = { profile: null, summary: null, builds: [] as BuildRow[], total: 0, collections: [] as CollectionRow[] }

export async function loader({ params }: LoaderFunctionArgs) {
  const username = params.username ?? ''
  if (username === SENTINEL_USERNAME) return NO_PROFILE
  const { data: profile } = await fetchProfileByUsername(username)
  if (!profile) return NO_PROFILE
  const [summary, builds, collections] = await Promise.all([
    fetchProfileSummary(profile.id),
    fetchPublicBuilds({ userId: profile.id, sort: 'likes', page: 0 }),
    fetchUserCollections(profile.id, true, null),
  ])
  return { profile, summary, builds: builds.data, total: builds.count ?? 0, collections: collections.data }
}

// In the browser the page loads its own data, as it always has.
export async function clientLoader() {
  return null
}

// Ascending gold intensity by tier — same accent already used for anything
// "special" on this page (hero border, username), so the ladder reads as
// "more of the app's own premium color" instead of borrowing the elemental
// damage hues (earth/fire/water/air), which already mean something else
// everywhere in this app.
const TIER_COLOR: Record<Exclude<MembershipTier, 'free'>, string> = {
  apprentice: 'var(--gold-deep)',
  artisan:    'var(--gold)',
  forger:     'var(--gold-bright)',
  master:     'var(--gold-bright)',
}

/**
 * Public profile page, routed by USERNAME, never the internal uuid
 * (/u/:username, not /u/:id) — keeps the id out of the URL entirely, even
 * though `profiles` is already publicly readable. Shows only what the
 * user created themselves (public builds, comments on public builds) —
 * deliberately excludes anything about their activity on OTHER people's
 * content (likes/ratings given), since that's browsing behavior, not
 * something they published.
 */
export function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { t, i18n } = useTranslation()
  const homePath = `/${langPathRootSegment(i18n.language)}`
  const lang = i18n.language.slice(0, 2)

  useLoadGameData()
  const session = useAuthStore(s => s.session)
  const formatDate = useDateFormatter()
  const seed = useLoaderData<typeof loader | typeof clientLoader>()
  const summary = seed?.summary ?? null
  // The first load on mount refreshes a prerendered profile in place
  // instead of blanking it, so the hydrated page doesn't flash to "loading".
  const seededUsername = useRef(seed ? username : null)

  const [profile, setProfile]   = useState<PublicProfile | null>(seed?.profile ?? null)
  const [loading, setLoading]   = useState(!seed)
  const [notFound, setNotFound] = useState(!!seed && !seed.profile)
  const [tier, setTier]         = useState<MembershipTier>(summary?.tier ?? 'free')
  const [customRank, setCustomRank] = useState<PublicCustomRank | null>(summary?.combined ? parsePublicCustomRank(summary.rank) : null)

  const [stats, setStats] = useState(summary?.stats ?? { buildCount: 0, likeCount: 0 })
  const [commentCount, setCommentCount] = useState(summary?.commentCount ?? 0)

  const [isFollowing, setIsFollowing] = useIsFollowing(session?.user.id ?? null, profile?.id ?? null)
  const [followerCount, setFollowerCount] = useState(seed?.profile?.followers_count ?? 0)
  const isOwnProfile = session?.user.id === profile?.id

  const [builds, setBuilds]         = useState<BuildRow[]>(seed?.builds ?? [])
  const [collections, setCollections] = useState<CollectionRow[]>(seed?.collections ?? [])
  const [page, setPage]             = useState(0)
  const [total, setTotal]           = useState(seed?.total ?? 0)
  const [buildsLoading, setBuildsLoading] = useState(false)

  useEffect(() => {
    if (!username) return
    let cancelled = false
    const fromSeed = seededUsername.current === username
    seededUsername.current = null
    if (!fromSeed) {
      setLoading(true)
      setNotFound(false)
      setCustomRank(null)
    }
    fetchProfileByUsername(username).then(({ data }) => {
      if (cancelled) return
      if (!data) { setProfile(null); setNotFound(true); setLoading(false); return }
      setProfile(data)
      setFollowerCount(data.followers_count)
      setLoading(false)
      fetchProfileSummary(data.id).then(s => {
        if (cancelled) return
        setStats(s.stats)
        setCommentCount(s.commentCount)
        setTier(s.tier)
        if (s.combined) setCustomRank(parsePublicCustomRank(s.rank))
        else fetchPublicCustomRank(data.id).then(rank => { if (!cancelled) setCustomRank(rank) })
      })
      fetchUserCollections(data.id, true, session?.user.id ?? null).then(({ data: list }) => { if (!cancelled) setCollections(list) })
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetching on session change would race the optimistic toggle below; session is read fresh inside, just not a re-trigger
  }, [username])

  const handleToggleFollow = useCallback(async () => {
    if (!session || !profile) return
    const next = !isFollowing
    setIsFollowing(next)
    setFollowerCount(c => c + (next ? 1 : -1))
    const { error } = next
      ? await followUser(session.user.id, profile.id)
      : await unfollowUser(session.user.id, profile.id)
    if (error) { setIsFollowing(!next); setFollowerCount(c => c + (next ? -1 : 1)) }
  }, [session, profile, isFollowing])

  const loadBuilds = useCallback(async (userId: string, nextPage: number, reset: boolean) => {
    setBuildsLoading(true)
    const { data, count } = await fetchPublicBuilds({ userId, sort: 'likes', page: nextPage })
    setBuildsLoading(false)
    if (count != null) setTotal(count)
    setBuilds(prev => reset ? data : [...prev, ...data])
  }, [])

  useEffect(() => {
    if (!profile) return
    setPage(0)
    loadBuilds(profile.id, 0, true)
  }, [profile, loadBuilds])

  usePageSeo(lang as SeoLang, `u/${username ?? ''}`, {
    title: profile ? t('profile_seo_title', { username: profile.username }) : undefined,
    description: profile ? t('profile_seo_description', { username: profile.username }) : undefined,
    noindex: !profile,
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-forge-bg flex items-center justify-center text-sm" style={{ color: 'var(--ink-faint)' }}>
        {t('auth_loading')}
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center gap-3 text-sm" style={{ color: 'var(--ink-faint)' }}>
        <p>{t('profile_not_found')}</p>
        <Link to={homePath} className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>{t('app_title')}</Link>
      </div>
    )
  }

  // Always the username, never display_name — same rule as build/comment
  // attribution and the account menu: the nickname is the identity shown
  // everywhere, display_name is just optional flavor text underneath it.
  const name = profile.username
  const joinedDate = formatDate(profile.created_at)

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />

      <main id="main-content" className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 space-y-8">
        {/* Hero */}
        <div
          className="flex items-center gap-4 p-4 rounded-xl relative overflow-hidden"
          style={{
            animation:   'page-rise 520ms var(--ease-out) 0ms both',
            background:  'linear-gradient(135deg, color-mix(in srgb, var(--gold) 12%, var(--surface-panel)), var(--surface-void))',
            borderTop:   '2px solid color-mix(in srgb, var(--gold) 55%, transparent)',
            borderRight: '1px solid var(--metal-edge)',
            borderBottom:'1px solid var(--metal-edge)',
            borderLeft:  '1px solid var(--metal-edge)',
            boxShadow:   '0 0 28px color-mix(in srgb, var(--gold) 12%, transparent), var(--inset-bevel)',
          }}
        >
          <div
            className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{
              width: 72, height: 72,
              border: '1.5px solid color-mix(in srgb, var(--gold) 50%, transparent)',
              background: 'var(--surface-panel)',
            }}
          >
            {isSafeImageUrl(profile.avatar_url)
              ? <img src={profile.avatar_url!} alt="" className="w-full h-full object-cover" />
              : <User size={32} style={{ color: 'var(--ink-faint)' }} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold tracking-wide" style={{ color: 'var(--gold)' }}>{name}</h1>
              {tier !== 'free' && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{
                    color: TIER_COLOR[tier],
                    background: `color-mix(in srgb, ${TIER_COLOR[tier]} 16%, var(--surface-panel))`,
                    border: `1px solid color-mix(in srgb, ${TIER_COLOR[tier]} 50%, transparent)`,
                  }}
                >
                  {t(`membership_tier_${tier}`)}
                </span>
              )}
              {customRank && <CustomRankBadge rank={customRank} />}
            </div>
            {profile.display_name && (
              <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{profile.display_name}</p>
            )}
            {profile.bio?.trim() && (
              <p className="mt-2 max-w-2xl text-xs leading-relaxed whitespace-pre-line break-words" style={{ color: 'var(--ink-muted)' }}>
                {profile.bio.trim()}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
              <span className="flex items-center gap-1.5">
                <Calendar size={12} />
                {t('profile_joined', { date: joinedDate })}
              </span>
              <span><strong style={{ color: 'var(--ink)' }}>{followerCount}</strong> {t('profile_followers')}</span>
              <span><strong style={{ color: 'var(--ink)' }}>{profile.following_count}</strong> {t('profile_following')}</span>
            </div>
          </div>

          {!isOwnProfile && (
            <Button
              variant={isFollowing ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleToggleFollow}
              disabled={!session}
              title={session ? undefined : t('profile_signin_to_follow')}
              className="relative z-10 flex-shrink-0"
            >
              {isFollowing ? <UserCheck size={13} /> : <UserPlus size={13} />}
              {isFollowing ? t('profile_unfollow') : t('profile_follow')}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard Icon={Layers}        value={stats.buildCount} label={t('profile_public_builds')} />
          <StatCard Icon={Heart}         value={stats.likeCount}  label={t('profile_likes_received')} />
          <StatCard Icon={MessageSquare} value={commentCount}     label={t('profile_comments_posted')} />
        </div>

        {collections.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>
              {t('profile_collections_title', { username: name })}
            </h2>
            <CollectionGrid collections={collections} />
          </div>
        )}

        {/* Public builds — paginated, same fetchPublicBuilds/page size Explore uses */}
        <div className="space-y-4">
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>
            {t('profile_builds_title', { username: name })}
          </h2>
          {builds.length === 0 && !buildsLoading ? (
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{t('profile_no_builds')}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {builds.map(b => <BuildCard key={b.id} build={b} />)}
            </div>
          )}
          {!buildsLoading && builds.length < total && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => { const next = page + 1; setPage(next); loadBuilds(profile.id, next, false) }}
              >
                {t('explore_load_more')}
              </Button>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

function StatCard({ Icon, value, label }: { Icon: typeof Layers; value: number; label: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1 p-3 rounded-lg text-center"
      style={{ background: 'var(--surface-stone)', border: '1px solid var(--metal-edge)' }}
    >
      <Icon size={16} style={{ color: 'var(--gold)' }} />
      <span className="text-lg font-bold font-display" style={{ color: 'var(--ink)' }}>{value}</span>
      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-faint)' }}>{label}</span>
    </div>
  )
}

export default UserProfilePage
