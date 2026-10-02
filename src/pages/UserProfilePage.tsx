import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import { User, Calendar, Heart, MessageSquare, Layers } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { Button } from '@/ui'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { isSafeImageUrl } from '@/store/authStore.ts'
import { BuildCard } from '@/features/builds/BuildCard.tsx'
import {
  fetchProfileByUsername, fetchPublicBuilds, fetchUserPublicStats, fetchPublicCommentCount,
  type PublicProfile, type BuildRow,
} from '@/features/builds/api.ts'

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

  const [profile, setProfile]   = useState<PublicProfile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [stats, setStats] = useState({ buildCount: 0, likeCount: 0 })
  const [commentCount, setCommentCount] = useState(0)

  const [builds, setBuilds]         = useState<BuildRow[]>([])
  const [page, setPage]             = useState(0)
  const [total, setTotal]           = useState(0)
  const [buildsLoading, setBuildsLoading] = useState(false)

  useEffect(() => {
    if (!username) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    fetchProfileByUsername(username).then(({ data }) => {
      if (cancelled) return
      if (!data) { setNotFound(true); setLoading(false); return }
      setProfile(data)
      setLoading(false)
      fetchUserPublicStats(data.id).then(s => { if (!cancelled) setStats(s) })
      fetchPublicCommentCount(data.id).then(c => { if (!cancelled) setCommentCount(c.count) })
    })
    return () => { cancelled = true }
  }, [username])

  const loadBuilds = useCallback(async (userId: string, nextPage: number, reset: boolean) => {
    setBuildsLoading(true)
    const { data, count } = await fetchPublicBuilds({ userId, sort: 'likes', page: nextPage })
    setBuildsLoading(false)
    setTotal(count)
    setBuilds(prev => reset ? data : [...prev, ...data])
  }, [])

  useEffect(() => {
    if (!profile) return
    setPage(0)
    loadBuilds(profile.id, 0, true)
  }, [profile, loadBuilds])

  usePageSeo(lang as SeoLang, `u/${username ?? ''}`, {
    title: profile ? t('profile_seo_title', { username: profile.display_name || profile.username }) : undefined,
    description: profile ? t('profile_seo_description', { username: profile.display_name || profile.username }) : undefined,
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
        <Link to={`/${prefix}`} className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>{t('app_title')}</Link>
      </div>
    )
  }

  const name = profile.display_name || profile.username
  const joinedDate = new Date(profile.created_at).toLocaleDateString(i18n.language)

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 space-y-8">
        {/* Hero */}
        <div
          className="flex items-center gap-4 p-4 rounded-xl relative overflow-hidden"
          style={{
            animation:   'col-rise 520ms var(--ease-out) 0ms both',
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
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-wide" style={{ color: 'var(--gold)' }}>{name}</h1>
            {profile.display_name && (
              <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>@{profile.username}</p>
            )}
            <p className="flex items-center gap-1.5 text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
              <Calendar size={12} />
              {t('profile_joined', { date: joinedDate })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard Icon={Layers}        value={stats.buildCount} label={t('profile_public_builds')} />
          <StatCard Icon={Heart}         value={stats.likeCount}  label={t('profile_likes_received')} />
          <StatCard Icon={MessageSquare} value={commentCount}     label={t('profile_comments_posted')} />
        </div>

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
