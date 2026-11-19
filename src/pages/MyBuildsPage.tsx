import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { ChevronDown, LayoutGrid, List, Lock, Plus, Search, X } from 'lucide-react'
import { normalizeSearch } from '@/ui'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { useAuthStore } from '@/store/authStore.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { requestSignIn } from '@/features/auth/requestSignIn.ts'
import { resolveClassName } from '@/features/class-picker/useClassName.ts'
import {
  fetchMyBuilds, fetchMyBookmarkedBuilds, fetchUserCollections, toggleBuildBookmark,
  type MyBuildRow, type BuildRow, type CollectionRow,
} from '@/features/builds/api.ts'
import { CollectionDialog, CollectionRowLink, Empty, LibraryCard, Notice, type LibraryItem } from '@/features/library/LibraryParts.tsx'

type MyBuildsTab = 'mine' | 'bookmarked' | 'collections'
const TABS: MyBuildsTab[] = ['mine', 'bookmarked', 'collections']

export function MyBuildsPage() {
  const { t, i18n } = useTranslation()
  useLoadGameData()
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'my-builds', { noindex: true })
  const session = useAuthStore(s => s.session)
  const authLoading = useAuthStore(s => s.loading)
  const prefix = langPathPrefix(i18n.language)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: MyBuildsTab = tabParam === 'bookmarked' || tabParam === 'collections' ? tabParam : 'mine'
  const setTab = (next: MyBuildsTab) => setSearchParams(next === 'mine' ? {} : { tab: next }, { replace: true })

  const [builds, setBuilds]         = useState<MyBuildRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState(false)
  const [bookmarked, setBookmarked] = useState<BuildRow[] | null>(null)
  const [collections, setCollections] = useState<CollectionRow[] | null>(null)
  const [query, setQuery]           = useState('')
  const [visibility, setVisibility] = useState('all')
  const [sort, setSort]             = useState<'recent' | 'name'>('recent')
  const [compact, setCompact]       = useState(false)
  const [creating, setCreating]     = useState(false)
  const [actionError, setActionError] = useState(false)

  const load = useCallback(() => {
    if (!session) { setLoading(false); return }
    setLoading(true)
    setLoadError(false)
    fetchMyBuilds(session.user.id).then(({ data, error }) => {
      setBuilds(data)
      setLoadError(Boolean(error))
      setLoading(false)
    })
  }, [session])
  useEffect(() => { load() }, [load])

  // Bookmarks and collections load the first time their tab opens.
  useEffect(() => {
    if (tab !== 'bookmarked' || bookmarked != null || !session) return
    fetchMyBookmarkedBuilds(session.user.id).then(({ data }) => setBookmarked(data))
  }, [tab, bookmarked, session])
  useEffect(() => {
    if (tab !== 'collections' || collections != null || !session) return
    fetchUserCollections(session.user.id, false, session.user.id).then(({ data }) => setCollections(data))
  }, [tab, collections, session])

  // Each tab starts with its filters cleared.
  useEffect(() => { setQuery(''); setVisibility('all'); setActionError(false) }, [tab])

  async function unbookmark(id: string) {
    if (!session) return
    setActionError(false)
    const { error } = await toggleBuildBookmark(id, session.user.id, true)
    if (error) { setActionError(true); return }
    setBookmarked(prev => prev?.filter(b => b.id !== id) ?? prev)
  }

  const matches = (b: LibraryItem) =>
    normalizeSearch(`${b.name} ${b.profiles?.username ?? ''} ${resolveClassName(b.class_slug, i18n.language, null)} ${b.class_slug}`).includes(normalizeSearch(query))
    && (visibility === 'all' || b.visibility === visibility)
  const source: LibraryItem[] = tab === 'mine' ? builds : bookmarked ?? []
  const rows = source.filter(matches).sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.created_at.localeCompare(a.created_at)))
  const shownCollections = (collections ?? []).filter(c => normalizeSearch(`${c.name} ${c.description ?? ''}`).includes(normalizeSearch(query)))
  const tabLoading = tab === 'mine' ? loading : tab === 'bookmarked' ? bookmarked == null : collections == null
  const filtered = !!query || visibility !== 'all'
  const counts: Record<MyBuildsTab, number | null> = { mine: builds.length, bookmarked: bookmarked?.length ?? null, collections: collections?.length ?? null }

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader />
      <main id="main-content" className="library-page">
        <div className="library-study">
          <div className="library-heading">
            <div>
              <p className="account-eyebrow">{t('lib_eyebrow')}</p>
              <h1>{t('my_builds')}</h1>
              <p>{t('lib_intro')}</p>
            </div>
            <Link className="site-primary" to={`/${prefix}`}>
              <Plus size={17} aria-hidden="true" />
              {t('lib_workshop')}
            </Link>
          </div>

          {!session ? (
            authLoading ? <div className="library-loading" role="status"><span />{t('auth_loading')}</div> : (
              <Empty title={t('auth_signin_title')} body={t('my_builds_signin_required')}>
                <button type="button" className="site-primary" onClick={requestSignIn}>{t('auth_signin_btn')}</button>
              </Empty>
            )
          ) : (
            <>
              <div className="library-summary">
                <span><b>{builds.length}</b>{t('my_builds_total')}</span>
                <span><b>{builds.filter(b => b.visibility === 'public').length}</b>{t('my_builds_public_count')}</span>
                <span><b>{builds.reduce((sum, b) => sum + b.like_count, 0)}</b>{t('my_builds_likes_received')}</span>
              </div>
              <nav className="account-tabs library-tabs" aria-label={t('my_builds')}>
                {TABS.map(id => (
                  <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
                    {t(`my_builds_tab_${id}`)}
                    {counts[id] != null && <span>{counts[id]}</span>}
                  </button>
                ))}
              </nav>

              <div className="library-toolbar">
                <label className="library-search">
                  <Search size={17} aria-hidden="true" />
                  <span className="sr-only">{t(tab === 'collections' ? 'lib_search_collections' : 'lib_search')}</span>
                  <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t(tab === 'collections' ? 'lib_search_collections' : 'lib_search')} />
                  {query && (
                    <button type="button" aria-label={t('lib_clear')} onClick={() => setQuery('')}><X size={16} aria-hidden="true" /></button>
                  )}
                </label>
                {tab === 'collections' ? (
                  <button type="button" className="site-primary" onClick={() => setCreating(true)}>
                    <Plus size={17} aria-hidden="true" />
                    {t('lib_new_collection')}
                  </button>
                ) : (
                  <>
                    <label className="library-filter">
                      {t('publish_visibility_label')}
                      <select value={visibility} onChange={e => setVisibility(e.target.value)}>
                        <option value="all">{t('lib_all')}</option>
                        {(['private', 'unlisted', 'public'] as const).map(v => <option key={v} value={v}>{t(`publish_visibility_${v}`)}</option>)}
                      </select>
                      <ChevronDown size={14} aria-hidden="true" />
                    </label>
                    <label className="library-filter">
                      {t('lib_sort')}
                      <select value={sort} onChange={e => setSort(e.target.value as 'recent' | 'name')}>
                        <option value="recent">{t('lib_recent')}</option>
                        <option value="name">{t('lib_name')}</option>
                      </select>
                      <ChevronDown size={14} aria-hidden="true" />
                    </label>
                  </>
                )}
              </div>
              {actionError && <Notice error>{t('lib_action_error')}</Notice>}

              {tabLoading ? (
                <div className="library-loading" role="status"><span />{t('auth_loading')}</div>
              ) : tab === 'mine' && loadError ? (
                <Empty title={t('lib_load_error')} body={t('lib_load_error_hint')}>
                  <button type="button" onClick={load}>{t('explore_retry')}</button>
                </Empty>
              ) : tab === 'collections' ? (
                shownCollections.length ? (
                  <div className="library-collections">
                    {shownCollections.map(c => <CollectionRowLink key={c.id} collection={c} />)}
                  </div>
                ) : (
                  <Empty title={t(query ? 'lib_no_matches' : 'lib_no_collections')} body={t(query ? 'lib_no_matches_hint' : 'collections_empty')} />
                )
              ) : rows.length ? (
                <>
                  <div className="library-results-count">
                    {t('collections_builds_count', { count: rows.length })}
                    {filtered && <button type="button" onClick={() => { setQuery(''); setVisibility('all') }}>{t('lib_reset')}</button>}
                    <span className="library-density" role="group" aria-label={t('lib_display')}>
                      <button type="button" aria-label={t('lib_detailed_view')} aria-pressed={!compact} onClick={() => setCompact(false)}><LayoutGrid size={17} aria-hidden="true" /></button>
                      <button type="button" aria-label={t('lib_compact_view')} aria-pressed={compact} onClick={() => setCompact(true)}><List size={18} aria-hidden="true" /></button>
                    </span>
                  </div>
                  <div className={'library-build-grid' + (compact ? ' is-compact' : '')}>
                    {rows.map(b => (
                      <div className="library-build-wrap" key={b.id}>
                        <LibraryCard
                          build={b}
                          owner={tab === 'mine'}
                          onChanged={next => setBuilds(prev => prev.map(x => (x.id === next.id ? { ...x, visibility: next.visibility } : x)))}
                          onDeleted={id => setBuilds(prev => prev.filter(x => x.id !== id))}
                          onUnbookmark={tab === 'bookmarked' ? () => void unbookmark(b.id) : undefined}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Empty
                  title={t(filtered ? 'lib_no_matches' : tab === 'bookmarked' ? 'my_builds_no_bookmarks' : 'no_saved_builds')}
                  body={t(filtered ? 'lib_no_matches_hint' : 'lib_empty_hint')}>
                  {filtered
                    ? <button type="button" onClick={() => { setQuery(''); setVisibility('all') }}>{t('lib_reset')}</button>
                    : <Link className="library-button" to={tab === 'bookmarked' ? `/${prefix}explore` : `/${prefix}`}>{t(tab === 'bookmarked' ? 'explore_title' : 'lib_workshop')}</Link>}
                </Empty>
              )}
              <p className="library-device-note">
                <Lock size={15} aria-hidden="true" />
                {t('lib_device_note')}
              </p>
            </>
          )}
        </div>
      </main>
      {creating && session && (
        <CollectionDialog userId={session.user.id} onClose={() => setCreating(false)} onSaved={c => setCollections(prev => [c, ...(prev ?? [])])} />
      )}
      <SiteFooter />
    </div>
  )
}

export default MyBuildsPage
