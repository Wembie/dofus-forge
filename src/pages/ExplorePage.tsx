import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Link, useLoaderData, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ArrowUpRight, ChevronDown, Compass, Search, SlidersHorizontal, X } from 'lucide-react'
import { Modal } from '@/ui'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { BuildCard } from '@/features/builds/BuildCard.tsx'
import { fetchPublicBuilds, fetchCommunityStats, fetchTags, type BuildRow, type ExploreSort, type CommunityStats, type Tag } from '@/features/builds/api.ts'
import { useTags } from '@/features/builds/TagChips.tsx'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { catalogCounts } from '@/data/buildCatalog.server.ts'
import './explore.css'

// Runs while prerendering: crawlers get the community builds (first page,
// default order) and the stats in the HTML. The tag catalog and the catalog
// count are in it too, so nothing shifts when they load.
export async function loader() {
  const [builds, stats, tags, catalog] = await Promise.all([
    fetchPublicBuilds({ sort: 'recent', page: 0 }), fetchCommunityStats(), fetchTags(), catalogCounts(),
  ])
  return {
    builds: builds.error ? [] : builds.data,
    total: builds.error ? 0 : builds.count ?? 0,
    stats: stats.error ? null : stats.data,
    tags: tags.length > 0 ? tags : null,
    catalog,
  }
}

// In the browser the page loads and refreshes its own data, as it always has.
export async function clientLoader() {
  return null
}

const noSubscription = () => () => {}
const SORTS: ExploreSort[] = ['rating', 'likes', 'recent', 'views']
const TAG_CATEGORIES = ['playstyle', 'element', 'general'] as const
const STAT_ROWS: [keyof CommunityStats, string][] = [
  ['usersCount', 'explore_stat_players'],
  ['publicBuildsCount', 'explore_stat_public'],
  ['viewsCount', 'explore_stat_seen'],
  ['forgeFinishedCount', 'explore_stat_forged'],
  ['buildsCount', 'explore_stat_all_builds'],
  ['likesCount', 'explore_stat_liked'],
  ['buildsThisWeek', 'explore_stat_this_week'],
  ['forgeRunsCount', 'explore_stat_forge_lit'],
]

type Filters = { search: string; classId: string; tag: string; sort: ExploreSort }

function useHydrated() {
  return useSyncExternalStore(noSubscription, () => true, () => false)
}

/** The community at a glance: open on wide screens, a one-line summary on phones. */
function CommunitySummary({ initial, catalog }: { initial: CommunityStats | null; catalog: { items: number; sets: number } | null }) {
  const { t, i18n } = useTranslation()
  const id = useId()
  const hydrated = useHydrated()
  const [stats, setStats] = useState<CommunityStats | null>(initial)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(initial ? 'ready' : 'loading')
  const [open, setOpen] = useState<boolean | null>(null)
  const itemCount = useDataStore(s => s.index?.length ?? 0) || (catalog?.items ?? 0)
  const setCount  = useDataStore(s => s.sets?.length ?? 0) || (catalog?.sets ?? 0)
  const nf = new Intl.NumberFormat(i18n.language)
  const expanded = open ?? (hydrated ? matchMedia('(min-width: 1000px)').matches : true)

  const load = useCallback(() => {
    setState(s => (s === 'ready' ? s : 'loading'))
    fetchCommunityStats().then(({ data, error }) => {
      if (error || !data) setState(s => (s === 'ready' ? s : 'error'))
      else { setStats(data); setState('ready') }
    })
  }, [])
  useEffect(load, [load])

  return (
    <section className="explore-community" aria-label={t('explore_community')}>
      <button type="button" className="explore-community-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setOpen(!expanded)}>
        <span>
          <b>{t('explore_community')}</b>
          <small>{t('explore_community_hint')}</small>
        </span>
        <span>
          {state === 'ready' && stats && t('explore_community_short', { players: nf.format(stats.usersCount ?? 0), builds: nf.format(stats.publicBuildsCount ?? 0) })}
          <ChevronDown size={17} className={expanded ? 'is-open' : ''} aria-hidden="true" />
        </span>
      </button>
      <div id={id} hidden={!expanded}>
        {state === 'loading' ? (
          <p className="explore-community-state" role="status">{t('explore_stats_loading')}</p>
        ) : state === 'error' || !stats ? (
          <div className="explore-community-state">
            <p>{t('explore_stats_error')}</p>
            <button type="button" onClick={load}>{t('explore_retry')}</button>
          </div>
        ) : (
          <>
            <dl>
              {STAT_ROWS.filter(([key]) => stats[key] != null).map(([key, label]) => (
                <div key={key}>
                  <dt>{t(label)}</dt>
                  <dd>{nf.format(stats[key] as number)}</dd>
                </div>
              ))}
            </dl>
            {itemCount > 0 && setCount > 0 && (
              <p className="explore-catalog-count">{t('explore_stat_catalog', { items: nf.format(itemCount), sets: nf.format(setCount) })}</p>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function ClassOptions() {
  return CLASS_DATA.map(c => <ClassOption key={c.id} id={c.id} />)
}
function ClassOption({ id }: { id: string }) {
  return <option value={id}>{useClassName(id)}</option>
}

function ClassChoice({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="explore-select">
      <label htmlFor={id}>{t('class')}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{t('explore_all_classes')}</option>
        <ClassOptions />
      </select>
    </div>
  )
}

/** Class and tag, chosen together and applied at once (phones read the list behind it). */
function FilterDialog({ filters, tags, onApply, onClose }: { filters: Filters; tags: Tag[] | null; onApply: (next: Partial<Filters>) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const id = useId()
  const [classId, setClassId] = useState(filters.classId)
  const [tag, setTag] = useState(filters.tag)
  return (
    <Modal open onClose={onClose} title={t('explore_filter_title')} size="lg" className="explore-filter-dialog">
      <form onSubmit={e => { e.preventDefault(); onApply({ classId, tag }); onClose() }}>
        <div className="explore-filter-scroll">
          <ClassChoice id={`${id}-class`} value={classId} onChange={setClassId} />
          <p className="explore-filter-hint">{t('explore_filter_hint')}</p>
          {tags == null ? (
            <p role="status">{t('explore_tags_loading')}</p>
          ) : tags.length === 0 ? (
            <p className="explore-inline-error">{t('explore_tags_error')}</p>
          ) : (
            <fieldset className="explore-tag-options">
              <legend>{t('explore_tags_label')}</legend>
              <label className={!tag ? 'is-selected' : ''}>
                <input type="radio" name={`${id}-tag`} checked={!tag} onChange={() => setTag('')} />
                <span>{t('explore_tag_all')}</span>
              </label>
              {TAG_CATEGORIES.map(category => (
                <div key={category}>
                  <p className="explore-tag-category">{t(`tag_category_${category}`)}</p>
                  <div>
                    {tags.filter(option => option.category === category).map(option => (
                      <label key={option.id} className={tag === option.name ? 'is-selected' : ''}>
                        <input type="radio" name={`${id}-tag`} checked={tag === option.name} onChange={() => setTag(option.name)} />
                        <span>{t(`tag_${option.name}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </fieldset>
          )}
        </div>
        <div className="explore-filter-actions">
          <button type="button" onClick={() => { setClassId(''); setTag('') }}>{t('explore_clear_selection')}</button>
          <button type="submit" className="site-primary">{t('explore_apply')}<ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      </form>
    </Modal>
  )
}

function ExploreEmpty({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="explore-empty">
      <Compass size={30} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{body}</p>
      {children}
    </div>
  )
}

function ActiveClass({ id }: { id: string }) {
  return <>{useClassName(id)}</>
}

export function ExplorePage() {
  const { t, i18n } = useTranslation()
  const seed = useLoaderData<typeof loader | typeof clientLoader>()
  useLoadGameData()
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'explore', {
    title: t('explore_seo_title'),
    description: t('explore_seo_description'),
  })
  const id = useId()
  const prefix = langPathPrefix(i18n.language)
  const nf = new Intl.NumberFormat(i18n.language)
  const tagList = useTags(seed?.tags ?? null)
  // The prerendered HTML has no query string, so the filters in the URL
  // apply right after hydration rather than during it.
  const hydrated = useHydrated()
  const [params, setParams] = useSearchParams()
  const filters: Filters = hydrated ? {
    search: params.get('q') ?? '',
    classId: params.get('class') ?? '',
    tag: params.get('tag') ?? '',
    sort: SORTS.includes(params.get('sort') as ExploreSort) ? params.get('sort') as ExploreSort : 'recent',
  } : { search: '', classId: '', tag: '', sort: 'recent' }
  const setFilters = useCallback((next: Partial<Filters>) => {
    setParams(prev => {
      const out = new URLSearchParams(prev)
      const keys: [keyof Filters, string][] = [['search', 'q'], ['classId', 'class'], ['tag', 'tag'], ['sort', 'sort']]
      for (const [key, param] of keys) {
        if (!(key in next)) continue
        const value = next[key]
        if (value && !(key === 'sort' && value === 'recent')) out.set(param, value)
        else out.delete(param)
      }
      return out
    }, { replace: true })
  }, [setParams])

  const [search, setSearch] = useState('')
  useEffect(() => { if (hydrated) setSearch(params.get('q') ?? '') }, [hydrated]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (search === filters.search) return
    const timer = setTimeout(() => setFilters({ search }), 350)
    return () => clearTimeout(timer)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [builds, setBuilds] = useState<BuildRow[]>(seed?.builds ?? [])
  const [page, setPage]     = useState(0)
  const [total, setTotal]   = useState(seed?.total ?? 0)
  const [loading, setLoading] = useState(!seed)
  const [error, setError]   = useState<'initial' | 'more' | null>(null)

  const tagId = tagList?.find(tag => tag.name === filters.tag)?.id ?? null
  const unknownTag = !!filters.tag && tagList != null && tagList.length > 0 && tagId == null
  // A ?tag= link waits for the tag catalog, so it doesn't first list everything.
  const tagPending = !hydrated || (!!filters.tag && tagList == null)

  // Only the latest request may update the list: changing filters quickly
  // must not leave an older, slower result set on screen.
  const requestRef = useRef(0)
  const firstNew = useRef<string | null>(null)
  const load = useCallback(async (nextPage: number) => {
    const request = ++requestRef.current
    setLoading(true)
    setError(null)
    const { data, error: err, count } = await fetchPublicBuilds({
      classSlug: filters.classId || null, tagId: unknownTag ? null : tagId, sort: filters.sort, search: filters.search, page: nextPage,
    })
    if (request !== requestRef.current) return
    setLoading(false)
    if (err) { setError(nextPage === 0 ? 'initial' : 'more'); return }
    if (count != null) setTotal(count)
    setPage(nextPage)
    firstNew.current = nextPage > 0 ? data[0]?.id ?? null : null
    setBuilds(prev => (nextPage === 0 ? data : [...prev, ...data]))
  }, [filters.classId, filters.sort, filters.search, tagId, unknownTag])

  // Skipped while the prerendered first page is still what the URL asks for.
  const seeded = useRef(seed != null)
  useEffect(() => {
    if (tagPending) return
    const isDefault = !filters.search && !filters.classId && !filters.tag && filters.sort === 'recent'
    if (seeded.current && isDefault) { seeded.current = false; return }
    seeded.current = false
    load(0)
  }, [load, tagPending]) // eslint-disable-line react-hooks/exhaustive-deps

  // After "load more", the first new card takes focus so the keyboard continues there.
  useEffect(() => {
    if (!firstNew.current) return
    document.getElementById(`card-${firstNew.current}`)?.focus({ preventScroll: true })
    firstNew.current = null
  }, [builds])

  function clear() {
    setSearch('')
    setFilters({ search: '', classId: '', tag: '' })
  }
  const active = !!filters.search || !!filters.classId || !!filters.tag
  const filterCount = Number(!!filters.classId) + Number(!!filters.tag)
  const searchPending = search !== filters.search
  const showing = t('explore_showing', { shown: nf.format(builds.length), total: nf.format(total) })

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader />
      <main id="main-content" className="explore-page">
        <div className="explore-study">
          <div className="explore-heading">
            <div>
              <p className="account-eyebrow">{t('explore_eyebrow')}</p>
              <h1>{t('explore_title')}</h1>
              <p>{t('explore_intro')}</p>
            </div>
            <Link to={`/${prefix}`}>
              {t('lib_workshop')}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <CommunitySummary initial={seed?.stats ?? null} catalog={seed?.catalog ?? null} />
          <section className="explore-controls" aria-label={t('explore_controls')}>
            <div className="explore-toolbar">
              <form className="explore-search" role="search" onSubmit={e => { e.preventDefault(); setFilters({ search }) }}>
                <Search size={18} aria-hidden="true" />
                <label className="sr-only" htmlFor={`${id}-search`}>{t('explore_search_placeholder')}</label>
                <input id={`${id}-search`} type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('explore_search_placeholder')} />
                {search && (
                  <button type="button" aria-label={t('lib_clear')} onClick={() => { setSearch(''); setFilters({ search: '' }) }}>
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </form>
              <div className="explore-desktop-class">
                <ClassChoice id={`${id}-class`} value={filters.classId} onChange={classId => setFilters({ classId })} />
              </div>
              <div className="explore-select explore-sort">
                <label htmlFor={`${id}-sort`}>{t('lib_sort')}</label>
                <select id={`${id}-sort`} value={filters.sort} onChange={e => setFilters({ sort: e.target.value as ExploreSort })}>
                  {SORTS.map(sort => <option key={sort} value={sort}>{t(`sort_${sort}`)}</option>)}
                </select>
              </div>
              <button type="button" className="explore-filter-trigger" aria-haspopup="dialog" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal size={17} aria-hidden="true" />
                {t('explore_filters')}
                {filterCount > 0 && <span>{filterCount}</span>}
              </button>
            </div>
            {active && (
              <div className="explore-active-filters" role="group" aria-label={t('explore_active')}>
                {filters.search && (
                  <button type="button" onClick={() => { setSearch(''); setFilters({ search: '' }) }} aria-label={t('explore_remove_search')}>
                    <span>“{filters.search}”</span><X size={13} aria-hidden="true" />
                  </button>
                )}
                {filters.classId && (
                  <button type="button" onClick={() => setFilters({ classId: '' })} aria-label={t('explore_remove_class')}>
                    <span><ActiveClass id={filters.classId} /></span><X size={13} aria-hidden="true" />
                  </button>
                )}
                {filters.tag && (
                  <button type="button" onClick={() => setFilters({ tag: '' })} aria-label={t('explore_remove_tag')}>
                    <span>{unknownTag ? filters.tag : t(`tag_${filters.tag}`)}</span><X size={13} aria-hidden="true" />
                  </button>
                )}
                <button type="button" className="explore-clear" onClick={clear}>{t('lib_reset')}</button>
              </div>
            )}
          </section>
          {unknownTag && <p className="explore-inline-notice" role="status">{t('explore_unknown_tag', { tag: filters.tag })}</p>}
          <div className="explore-results-heading">
            <h2>{t('explore_results')}</h2>
            <p role="status" aria-live="polite">
              {(loading && !builds.length) || searchPending ? t('explore_searching')
                : error === 'initial' ? t('explore_load_error') : showing}
            </p>
          </div>
          <div className="explore-results" aria-busy={loading || searchPending}>
            {loading && !builds.length ? (
              <div className="explore-loading" role="status">
                <span>{t('auth_loading')}</span>
                <div className="build-grid" aria-hidden="true">
                  {[0, 1, 2].map(i => <div key={i} className="explore-skeleton"><span /><span /><span /></div>)}
                </div>
              </div>
            ) : error === 'initial' ? (
              <ExploreEmpty title={t('explore_load_error')} body={t('explore_load_error_hint')}>
                <button type="button" onClick={() => load(0)}>{t('explore_retry')}</button>
              </ExploreEmpty>
            ) : !builds.length ? (
              <ExploreEmpty title={t(active ? 'explore_no_results' : 'explore_no_builds')} body={t(active ? 'explore_no_results_hint' : 'explore_no_builds_hint')}>
                {active
                  ? <button type="button" onClick={clear}>{t('lib_reset')}</button>
                  : <Link className="site-primary" to={`/${prefix}`}>{t('lib_workshop')}<ArrowRight size={16} aria-hidden="true" /></Link>}
              </ExploreEmpty>
            ) : (
              <div className="build-grid explore-grid">
                {builds.map(build => (
                  <BuildCard key={build.id} build={build} activeTag={filters.tag || null} onTag={tag => setFilters({ tag })} />
                ))}
              </div>
            )}
          </div>
          {builds.length > 0 && builds.length < total && (
            <div className="explore-pagination">
              {error === 'more' && <p role="alert">{t('explore_more_error')}</p>}
              <button type="button" className="explore-more" disabled={loading} onClick={() => load(page + 1)}>
                {t(loading ? 'auth_loading' : error === 'more' ? 'explore_retry_more' : 'explore_load_more')}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <span>{showing}</span>
            </div>
          )}
          {builds.length > 0 && builds.length >= total && !loading && <p className="explore-end">{t('explore_end')}</p>}
        </div>
      </main>
      {filtersOpen && <FilterDialog filters={filters} tags={tagList} onApply={setFilters} onClose={() => setFiltersOpen(false)} />}
      <SiteFooter />
    </div>
  )
}

export default ExplorePage
