import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router'
import { ArrowLeft, ChevronDown, Lock, Pencil, Search, Trash2, X } from 'lucide-react'
import { normalizeSearch } from '@/ui'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { useAuthStore } from '@/store/authStore.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { resolveClassName } from '@/features/class-picker/useClassName.ts'
import { fetchCollection, setBuildInCollection, type CollectionDetail } from '@/features/builds/api.ts'
import { CollectionDialog, DeleteCollectionDialog, Empty, LibraryCard, Notice, Visibility } from '@/features/library/LibraryParts.tsx'

export function CollectionPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const session  = useAuthStore(s => s.session)
  useLoadGameData()
  const prefix = langPathPrefix(i18n.language)

  const [collection, setCollection] = useState<CollectionDetail | null>(null)
  const [loading, setLoading]       = useState(true)
  const [dialog, setDialog]         = useState<'edit' | 'delete' | null>(null)
  const [error, setError]           = useState(false)
  const [busy, setBusy]             = useState<string | null>(null)
  const [query, setQuery]           = useState('')
  const [visibility, setVisibility] = useState('all')
  const [sort, setSort]             = useState<'saved' | 'recent' | 'name'>('saved')

  usePageSeo(i18n.language.slice(0, 2) as SeoLang, `c/${id ?? ''}`, {
    title: collection?.name,
    noindex: !collection?.is_public,
  })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setCollection(null)
    setDialog(null)
    setError(false)
    fetchCollection(id, session?.user.id ?? null).then(({ data }) => {
      if (cancelled) return
      setCollection(data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [id, session])

  const isOwner = !!collection && session?.user.id === collection.user_id

  async function removeBuild(buildId: string) {
    if (!collection) return
    setError(false)
    setBusy(buildId)
    const { error: err } = await setBuildInCollection(collection.id, buildId, false)
    setBusy(null)
    if (err) { setError(true); return }
    setCollection({ ...collection, builds: collection.builds.filter(b => b.id !== buildId), build_count: collection.build_count - 1 })
  }

  const rows = (collection?.builds ?? [])
    .filter(b => normalizeSearch(`${b.name} ${b.profiles?.username ?? ''} ${resolveClassName(b.class_slug, i18n.language, null)} ${b.class_slug}`).includes(normalizeSearch(query))
      && (visibility === 'all' || b.visibility === visibility))
  const ordered = sort === 'saved' ? rows : [...rows].sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.created_at.localeCompare(a.created_at)))
  const filtered = !!query || visibility !== 'all'

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader />
      <main id="main-content" className="library-page">
        <div className="library-study">
          {isOwner && (
            <Link className="library-back" to={`/${prefix}my-builds?tab=collections`}>
              <ArrowLeft size={16} aria-hidden="true" />
              {t('my_builds_tab_collections')}
            </Link>
          )}
          {loading ? (
            <div className="library-loading" role="status"><span />{t('auth_loading')}</div>
          ) : !collection ? (
            <Empty title={t('collection_not_found')} body={t('lib_collection_unavailable')} />
          ) : (
            <>
              <div className="library-heading">
                <div>
                  <p className="account-eyebrow">{t('lib_collection_eyebrow')}</p>
                  <h1>{collection.name}</h1>
                  {collection.description && <p>{collection.description}</p>}
                </div>
                {isOwner && (
                  <div className="library-heading-actions">
                    <button type="button" onClick={() => setDialog('edit')}>
                      <Pencil size={16} aria-hidden="true" />
                      {t('collection_edit')}
                    </button>
                    <button type="button" onClick={() => setDialog('delete')} aria-label={t('collection_delete')}>
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
              <div className="library-collection-meta">
                <Visibility collection value={collection.is_public ? 'public' : 'private'} />
                <span>{t('collections_builds_count', { count: collection.build_count })}</span>
                {collection.profiles?.username && (
                  <Link to={`/${prefix}u/${collection.profiles.username}`}>{t('collection_by', { author: collection.profiles.username })}</Link>
                )}
              </div>
              {isOwner && collection.is_public && (
                <p className="library-privacy-note">
                  <Lock size={16} aria-hidden="true" />
                  {t('lib_collection_privacy')}
                </p>
              )}
              {collection.builds.length > 0 && (
                <div className="library-toolbar">
                  <label className="library-search">
                    <Search size={17} aria-hidden="true" />
                    <span className="sr-only">{t('lib_search')}</span>
                    <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('lib_search')} />
                    {query && <button type="button" aria-label={t('lib_clear')} onClick={() => setQuery('')}><X size={16} aria-hidden="true" /></button>}
                  </label>
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
                    <select value={sort} onChange={e => setSort(e.target.value as 'saved' | 'recent' | 'name')}>
                      <option value="saved">{t('lib_saved_order')}</option>
                      <option value="recent">{t('lib_recent')}</option>
                      <option value="name">{t('lib_name')}</option>
                    </select>
                    <ChevronDown size={14} aria-hidden="true" />
                  </label>
                </div>
              )}
              {error && <Notice error>{t('collections_save_error')}</Notice>}
              {ordered.length ? (
                <div className="library-build-grid">
                  {ordered.map(b => (
                    <div className="library-build-wrap" key={b.id}>
                      <LibraryCard
                        build={b}
                        owner={session?.user.id === b.user_id}
                        privacyNote={isOwner && ((collection.is_public && b.visibility === 'private') || (b.visibility === 'unlisted' && b.user_id !== collection.user_id))}
                      />
                      {isOwner && (
                        <button type="button" className="library-remove" disabled={busy === b.id} onClick={() => void removeBuild(b.id)}>
                          <X size={15} aria-hidden="true" />
                          {t('collection_remove_build')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty title={t(filtered ? 'lib_no_matches' : 'collection_empty')} body={t(filtered ? 'lib_no_matches_hint' : 'lib_add_hint')}>
                  {filtered && <button type="button" onClick={() => { setQuery(''); setVisibility('all') }}>{t('lib_reset')}</button>}
                </Empty>
              )}
            </>
          )}
        </div>
      </main>
      {collection && session && dialog === 'edit' && (
        <CollectionDialog userId={session.user.id} collection={collection} onClose={() => setDialog(null)}
          onSaved={c => setCollection(prev => (prev ? { ...prev, ...c } : prev))} />
      )}
      {collection && dialog === 'delete' && (
        <DeleteCollectionDialog collection={collection} onClose={() => setDialog(null)} onDeleted={() => navigate(`/${prefix}my-builds?tab=collections`)} />
      )}
      <SiteFooter />
    </div>
  )
}

export default CollectionPage
