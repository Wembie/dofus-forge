import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { ArrowRight, User, UserPlus, UserCheck } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { requestSignIn } from '@/features/auth/requestSignIn.ts'
import { FollowListModal } from '@/features/builds/FollowListModal.tsx'
import { PublicProfileAvatar } from '@/features/account/PublicProfileAvatar.tsx'
import { ProfileBanner } from '@/features/account/ProfileBanner.tsx'
import { isProfileBannerUrl } from '@/features/account/profileBanners.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { useAuthStore } from '@/store/authStore.ts'
import { BuildCard } from '@/features/builds/BuildCard.tsx'
import { useIsFollowing } from '@/features/builds/useIsFollowing.ts'
import { CollectionRowLink } from '@/features/library/LibraryParts.tsx'
import { CustomRankBadge } from '@/features/ranks/CustomRankBadge.tsx'
import { fetchPublicCustomRanks, parsePublicCustomRanks } from '@/features/ranks/api.ts'
import type { PublicCustomRank } from '@/features/ranks/catalog.tsx'
import { streakFrameTier } from '@/features/profile/milestones.ts'
import { StreakChip } from '@/features/profile/StreakChip.tsx'
import { effectiveAvatarUrl, effectiveBannerUrl } from '@/features/profile/exclusiveRewards.ts'
import {
  fetchProfileByUsername, fetchPublicBuilds, fetchProfileSummary, fetchUserCollections, type CollectionRow,
  followUser, unfollowUser,
  type PublicProfile, type BuildRow,
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
  const prefix = langPathPrefix(i18n.language)
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
  const [customRanks, setCustomRanks] = useState<PublicCustomRank[]>(summary?.combined ? parsePublicCustomRanks(summary.ranks) : [])
  const [loginStreakBest, setLoginStreakBest] = useState(summary?.loginStreakBest ?? 0)
  const [exclusiveAvatarSlug, setExclusiveAvatarSlug] = useState(summary?.exclusiveAvatarSlug ?? null)
  const [exclusiveBannerSlug, setExclusiveBannerSlug] = useState(summary?.exclusiveBannerSlug ?? null)

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
  const [tab, setTab]         = useState<'builds' | 'collections'>('builds')
  const [people, setPeople]   = useState<'followers' | 'following' | null>(null)
  const [copied, setCopied]   = useState('')
  useEffect(() => { setTab('builds'); setCopied('') }, [username])

  useEffect(() => {
    if (!username) return
    let cancelled = false
    const fromSeed = seededUsername.current === username
    seededUsername.current = null
    if (!fromSeed) {
      setLoading(true)
      setNotFound(false)
      setCustomRanks([])
      setLoginStreakBest(0)
      setExclusiveAvatarSlug(null)
      setExclusiveBannerSlug(null)
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
        setLoginStreakBest(s.loginStreakBest)
        setExclusiveAvatarSlug(s.exclusiveAvatarSlug)
        setExclusiveBannerSlug(s.exclusiveBannerSlug)
        if (s.combined) setCustomRanks(parsePublicCustomRanks(s.ranks))
        else fetchPublicCustomRanks(data.id).then(ranks => { if (!cancelled) setCustomRanks(ranks) })
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
  }, [session, profile, isFollowing, setIsFollowing])

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
      <div className="min-h-screen bg-forge-bg text-forge-text">
        <SiteHeader />
        <main id="main-content" className="account-page">
          <div className="account-study"><p role="status" className="account-list-state">{t('auth_loading')}</p></div>
        </main>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-forge-bg text-forge-text">
        <SiteHeader />
        <main id="main-content" className="account-page">
          <div className="account-study">
            <div className="account-empty">
              <User size={30} aria-hidden="true" />
              <h1>{t('account_unknown')}</h1>
              <p>{t('profile_not_found')}</p>
              <Link className="site-primary" to={`/${prefix}explore`}>{t('explore_title')}</Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // Always the username, never display_name — same rule as build/comment
  // attribution and the account menu: the nickname is the identity shown
  // everywhere, display_name is just optional flavor text underneath it.
  const name = profile.username
  const joinedDate = formatDate(profile.created_at)
  const avatarUrl = effectiveAvatarUrl(profile.avatar_url, exclusiveAvatarSlug)
  const bannerUrl = effectiveBannerUrl(profile.banner_url, exclusiveBannerSlug)
  const hasBanner = isProfileBannerUrl(profile.banner_url) || !!exclusiveBannerSlug
  const frameTier = streakFrameTier(loginStreakBest)


  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${location.origin}${import.meta.env.BASE_URL}${prefix}u/${encodeURIComponent(name)}`)
      setCopied(t('lib_copied'))
    } catch {
      setCopied(t('share_copy_error'))
    }
  }

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader />

      <main id="main-content" className="account-page">
        <div className="account-study">
          <ProfileBanner key={`${profile.id}:${bannerUrl}`} username={name} url={bannerUrl} />
          <div className={'public-profile-heading' + (hasBanner ? ' has-banner' : '')}>
            <PublicProfileAvatar key={`${profile.id}:${avatarUrl}`} username={name} url={avatarUrl} streakTier={frameTier} />
            <div>
              <p className="account-eyebrow">{t('account_public_identity')}</p>
              <h1>{name}</h1>
              {customRanks.length > 0 && (
                <div className="public-ranks">
                  {customRanks.map(rank => <CustomRankBadge key={rank.name} rank={rank} />)}
                </div>
              )}
              {profile.display_name && <p className="public-display-name">{profile.display_name}</p>}
              <p className="public-biography">{profile.bio?.trim() || t('account_no_bio')}</p>
              <small>{t('profile_joined', { date: joinedDate })}</small>
            </div>
            <div className="public-profile-actions">
              {isOwnProfile ? (
                <Link className="site-primary" to={`/${prefix}account`}>
                  {t('account_edit')}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : session ? (
                <button type="button" className={isFollowing ? '' : 'site-primary'} onClick={handleToggleFollow}>
                  {isFollowing ? <UserCheck size={17} aria-hidden="true" /> : <UserPlus size={17} aria-hidden="true" />}
                  {t(isFollowing ? 'profile_unfollow' : 'profile_follow')}
                </button>
              ) : (
                <button type="button" onClick={requestSignIn} title={t('profile_signin_to_follow')}>
                  <UserPlus size={17} aria-hidden="true" />
                  {t('profile_follow')}
                </button>
              )}
              <button type="button" onClick={() => void copyLink()}>{t('account_copy_link')}</button>
            </div>
          </div>
          {copied && <p role="status" className="account-copy-status">{copied}</p>}

          <nav className="public-social-counts" aria-label={t('account_counts')}>
            <button type="button" onClick={() => setPeople('followers')}>
              <b>{followerCount}</b>
              {t('auth_stat_followers')}
            </button>
            <button type="button" onClick={() => setPeople('following')}>
              <b>{profile.following_count}</b>
              {t('auth_stat_following')}
            </button>
          </nav>
          <section className={'public-profile-metrics' + (loginStreakBest > 0 ? ' has-streak' : '')} aria-label={t('account_counts')}>
            {([[stats.buildCount, 'profile_public_builds'], [stats.likeCount, 'profile_likes_received'], [commentCount, 'profile_comments_posted']] as const).map(([value, key]) => (
              <div key={key}>
                <strong>{value}</strong>
                <span>{t(key)}</span>
              </div>
            ))}
            <StreakChip best={loginStreakBest} metric />
          </section>

          <nav className="account-tabs" aria-label={t('account_public_identity')}>
            <button type="button" aria-current={tab === 'builds' ? 'page' : undefined} onClick={() => setTab('builds')}>
              {t('profile_public_builds')}
            </button>
            <button type="button" aria-current={tab === 'collections' ? 'page' : undefined} onClick={() => setTab('collections')}>
              {t('account_all_collections')}
            </button>
          </nav>
          <p className="public-only-note">{t('account_public_note')}</p>

          {tab === 'builds' ? (
            builds.length === 0 && !buildsLoading ? (
              <div className="account-empty"><p>{t('profile_no_builds')}</p></div>
            ) : (
              <>
                <h2 className="sr-only">{t('profile_builds_title', { username: name })}</h2>
                <div className="build-grid">
                  {builds.map(b => <BuildCard key={b.id} build={b} />)}
                </div>
                {builds.length < total && (
                  <button type="button" className="profile-more" disabled={buildsLoading}
                    onClick={() => { const next = page + 1; setPage(next); loadBuilds(profile.id, next, false) }}>
                    {t(buildsLoading ? 'auth_loading' : 'explore_load_more')}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                )}
              </>
            )
          ) : collections.length === 0 ? (
            <p className="account-list-state">{t('account_empty_collections')}</p>
          ) : (
            <>
              <h2 className="sr-only">{t('profile_collections_title', { username: name })}</h2>
              <div className="library-collections">{collections.map(c => <CollectionRowLink key={c.id} collection={c} />)}</div>
            </>
          )}
        </div>
      </main>

      {people && <FollowListModal userId={profile.id} type={people} onClose={() => setPeople(null)} />}
      <SiteFooter />
    </div>
  )
}

export default UserProfilePage
