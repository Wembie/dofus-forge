import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useLoaderData } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Star, Heart, Clock, Eye, Search, Users, Hammer, Globe, Flame, Layers, Anvil, Sparkles } from 'lucide-react'
import { Tabs, Button, type TabItem } from '@/ui'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { BuildCard } from '@/features/builds/BuildCard.tsx'
import { fetchPublicBuilds, fetchCommunityStats, type BuildRow, type ExploreSort, type CommunityStats } from '@/features/builds/api.ts'
import { TagChip, useTags } from '@/features/builds/TagChips.tsx'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'

// Runs while prerendering: crawlers get the community builds (first page,
// default order) and the stats in the HTML. Tags are not included: a ?tag=
// link would then hydrate a different selection than the HTML shows.
export async function loader() {
  const [builds, stats] = await Promise.all([fetchPublicBuilds({ sort: 'rating', page: 0 }), fetchCommunityStats()])
  return {
    builds: builds.error ? [] : builds.data,
    total: builds.error ? 0 : builds.count ?? 0,
    stats: stats.error ? null : stats.data,
  }
}

// In the browser the page loads and refreshes its own data, as it always has.
export async function clientLoader() {
  return null
}

const STAT_ITEMS: { key: keyof CommunityStats; labelKey: string; Icon: typeof Users }[] = [
  { key: 'usersCount',        labelKey: 'explore_stat_users',        Icon: Users },
  { key: 'publicBuildsCount', labelKey: 'explore_stat_public_builds', Icon: Globe },
  { key: 'buildsCount',       labelKey: 'explore_stat_builds',        Icon: Hammer },
  { key: 'viewsCount',        labelKey: 'explore_stat_views',         Icon: Eye },
  { key: 'buildsThisWeek',    labelKey: 'explore_stat_week',          Icon: Flame },
  { key: 'likesCount',        labelKey: 'explore_stat_likes',         Icon: Heart },
  { key: 'forgeRunsCount',     labelKey: 'explore_stat_forge_runs',     Icon: Anvil },
  { key: 'forgeFinishedCount', labelKey: 'explore_stat_forge_finished', Icon: Sparkles },
]

function StatChip({ children, Icon }: { children: React.ReactNode; Icon: typeof Users }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 40%, transparent)', background: 'color-mix(in srgb, var(--gold) 8%, transparent)' }}
    >
      <Icon size={12} />
      {children}
    </span>
  )
}

function CommunityStatsBar({ initial }: { initial: CommunityStats | null }) {
  const { t } = useTranslation()
  const [stats, setStats] = useState<CommunityStats | null>(initial)
  // Catalog size costs no query at all — Explore already loads game data
  // via useLoadGameData() for the build cards' equipment icons.
  const itemCount = useDataStore(s => s.index?.length ?? 0)
  const setCount  = useDataStore(s => s.sets?.length ?? 0)

  useEffect(() => {
    let cancelled = false
    fetchCommunityStats().then(({ data, error }) => { if (!cancelled && !error) setStats(data) })
    return () => { cancelled = true }
  }, [])

  if (!stats) return null
  return (
    <div className="flex flex-wrap gap-2">
      {STAT_ITEMS.filter(({ key }) => stats[key] != null).map(({ key, labelKey, Icon }) => (
        <StatChip key={key} Icon={Icon}>{t(labelKey, { count: stats[key] ?? 0 })}</StatChip>
      ))}
      {itemCount > 0 && setCount > 0 && (
        <StatChip Icon={Layers}>{t('explore_stat_catalog', { items: itemCount, sets: setCount })}</StatChip>
      )}
    </div>
  )
}

const SORT_ITEMS: TabItem[] = [
  { id: 'rating', label: 'sort_rating', Icon: Star },
  { id: 'likes',  label: 'sort_likes',  Icon: Heart },
  { id: 'recent', label: 'sort_recent', Icon: Clock },
  { id: 'views',  label: 'sort_views',  Icon: Eye },
]

function ClassLabel({ id }: { id: string | null }) {
  const { t } = useTranslation()
  const classLabel = useClassName(id)
  return <>{id ? classLabel : t('explore_all_classes')}</>
}

export function ExplorePage() {
  const { t, i18n } = useTranslation()
  const seed = useLoaderData<typeof loader | typeof clientLoader>()
  useLoadGameData()
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'explore', {
    title: t('explore_seo_title'),
    description: t('explore_seo_description'),
  })
  const [sort, setSort]           = useState<ExploreSort>('rating')
  const [classSlug, setClassSlug] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const tagList = useTags()
  const tags    = tagList ?? []
  const tagName = searchParams.get('tag')
  const tagId   = tags.find(tag => tag.name === tagName)?.id ?? null
  const selectTag = (name: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (name) next.set('tag', name)
    else next.delete('tag')
    setSearchParams(next, { replace: true })
  }
  const [search, setSearch]       = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [builds, setBuilds]       = useState<BuildRow[]>(seed?.builds ?? [])
  const [page, setPage]           = useState(0)
  const [total, setTotal]         = useState(seed?.total ?? 0)
  const [loading, setLoading]     = useState(!seed)
  const [error, setError]         = useState(false)

  // Debounced so typing doesn't fire a network request (and a full-text
  // query against builds) on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(id)
  }, [search])

  // Only the latest request may update the list: changing tag / class / sort
  // quickly must not leave an older, slower result set on screen.
  const requestRef = useRef(0)
  const load = useCallback(async (nextPage: number, reset: boolean) => {
    const request = ++requestRef.current
    setLoading(true)
    setError(false)
    const { data, error: err, count } = await fetchPublicBuilds({ classSlug, tagId, sort, search: debouncedSearch, page: nextPage })
    if (request !== requestRef.current) return
    setLoading(false)
    if (err) { setError(true); return }
    if (count != null) setTotal(count)
    setBuilds(prev => reset ? data : [...prev, ...data])
  }, [classSlug, tagId, sort, debouncedSearch])

  // A ?tag= link waits for the tag catalog, so it doesn't first list
  // everything; if the catalog fails to load it gives up and lists all.
  const tagPending = tagName != null && tagList == null

  useEffect(() => {
    if (tagPending) return
    setPage(0)
    load(0, true)
  }, [load, tagPending])

  const sortLabels = SORT_ITEMS.map(item => ({ ...item, label: t(item.label) }))

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader />

      <main id="main-content" className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-4">
        <h1 className="font-display font-bold tracking-[0.15em] uppercase text-xs" style={{ color: 'var(--gold)' }}>
          {t('explore_title')}
        </h1>

        <CommunityStatsBar initial={seed?.stats ?? null} />

        <div className="flex flex-wrap items-center gap-3 justify-between">
          <Tabs items={sortLabels} active={sort} onChange={id => setSort(id as ExploreSort)} variant="segment" />

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('explore_search_placeholder')}
              aria-label={t('explore_search_placeholder')}
              className="text-xs rounded-md pl-7 pr-2.5 py-1.5 w-40 sm:w-56"
              style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
            />
          </div>

          <select
            value={classSlug ?? ''}
            aria-label={t('class')}
            onChange={e => setClassSlug(e.target.value || null)}
            className="text-xs rounded-md px-2.5 py-1.5"
            style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
          >
            <option value=""><ClassLabel id={null} /></option>
            {CLASS_DATA.map(c => (
              <option key={c.id} value={c.id}><ClassLabel id={c.id} /></option>
            ))}
          </select>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('explore_tags_label')}>
            <button
              type="button"
              onClick={() => selectTag(null)}
              aria-pressed={tagId == null}
              className="text-[11px] font-semibold rounded-full px-2 py-0.5 transition-colors"
              style={tagId == null
                ? { color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 50%, transparent)' }
                : { color: 'var(--ink-faint)', background: 'transparent', border: '1px solid var(--metal-edge)' }}
            >
              {t('explore_tag_all')}
            </button>
            {tags.map(tag => (
              <TagChip key={tag.id} tag={tag} active={tag.id === tagId} onClick={() => selectTag(tag.id === tagId ? null : tag.name)} />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-center py-10" style={{ color: 'var(--negative)' }}>{t('explore_error')}</p>
        )}

        {!error && !loading && builds.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>{t('explore_empty')}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {builds.map(b => <BuildCard key={b.id} build={b} />)}
        </div>

        {loading && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--ink-faint)' }}>{t('auth_loading')}</p>
        )}

        {!loading && builds.length < total && (
          <div className="flex justify-center pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => { const next = page + 1; setPage(next); load(next, false) }}
            >
              {t('explore_load_more')}
            </Button>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}

export default ExplorePage
