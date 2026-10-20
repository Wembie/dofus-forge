import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FolderOpen, Globe, Lock, Pencil, Trash2, X } from 'lucide-react'
import { Button, Frame } from '@/ui'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { BuildCard } from '@/features/builds/BuildCard.tsx'
import { COLLECTION_NAME_MAX } from '@/features/collections/Collections.tsx'
import { useAuthStore } from '@/store/authStore.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import {
  fetchCollection, updateCollection, deleteCollection, setBuildInCollection,
  type CollectionDetail,
} from '@/features/builds/api.ts'

export function CollectionPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const session  = useAuthStore(s => s.session)
  useLoadGameData()

  const [collection, setCollection] = useState<CollectionDetail | null>(null)
  const [loading, setLoading]       = useState(true)
  const [editing, setEditing]       = useState(false)
  const [name, setName]             = useState('')
  const [description, setDescription] = useState('')
  const [error, setError]           = useState(false)

  usePageSeo(i18n.language.slice(0, 2) as SeoLang, `c/${id ?? ''}`, {
    title: collection?.name,
    noindex: !collection?.is_public,
  })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setCollection(null)
    setEditing(false)
    setError(false)
    fetchCollection(id, session?.user.id ?? null).then(({ data }) => {
      if (cancelled) return
      setCollection(data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [id, session])

  const isOwner = !!collection && session?.user.id === collection.user_id
  const prefix  = langPathPrefix(i18n.language)

  async function patch(changes: { name?: string; description?: string | null; is_public?: boolean }) {
    if (!collection) return
    setError(false)
    const { error: err } = await updateCollection(collection.id, changes)
    if (err) { setError(true); return }
    setCollection({ ...collection, ...changes })
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await patch({ name: name.trim(), description: description.trim() || null })
    setEditing(false)
  }

  async function remove() {
    if (!collection || !window.confirm(t('collection_delete_confirm'))) return
    const { error: err } = await deleteCollection(collection.id)
    if (err) { setError(true); return }
    navigate(`/${prefix}my-builds?tab=collections`)
  }

  async function removeBuild(buildId: string) {
    if (!collection) return
    const { error: err } = await setBuildInCollection(collection.id, buildId, false)
    if (err) { setError(true); return }
    setCollection({ ...collection, builds: collection.builds.filter(b => b.id !== buildId), build_count: collection.build_count - 1 })
  }

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader />
      <main className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-4">
        {loading ? (
          <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>{t('auth_loading')}</p>
        ) : !collection ? (
          <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>{t('collection_not_found')}</p>
        ) : (
          <>
            <Frame padding="lg" className="space-y-2">
              {editing ? (
                <form onSubmit={saveEdit} className="space-y-2">
                  <input
                    type="text"
                    value={name}
                    maxLength={COLLECTION_NAME_MAX}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                    className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                    style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
                  />
                  <textarea
                    value={description}
                    maxLength={300}
                    onChange={e => setDescription(e.target.value)}
                    placeholder={t('collection_description_placeholder')}
                    rows={2}
                    className="w-full text-xs rounded-lg px-3 py-2 focus:outline-none resize-none"
                    style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" variant="primary" size="sm" disabled={!name.trim()}>{t('collection_save')}</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>{t('collection_cancel')}</Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start gap-3">
                  <FolderOpen size={26} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-bold truncate" style={{ color: 'var(--gold)' }}>{collection.name}</h1>
                    {collection.description && <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>{collection.description}</p>}
                    <p className="flex flex-wrap items-center gap-1.5 text-[11px] mt-1" style={{ color: 'var(--ink-faint)' }}>
                      {collection.is_public ? <Globe size={11} /> : <Lock size={11} />}
                      {t(collection.is_public ? 'collections_public' : 'collections_private')}
                      <span>·</span>
                      {t('collections_builds_count', { count: collection.build_count })}
                      {collection.profiles?.username && (
                        <>
                          <span>·</span>
                          <Link to={`/${prefix}u/${collection.profiles.username}`} className="hover:text-gold hover:underline">
                            {t('collection_by', { author: collection.profiles.username })}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      <Button variant="secondary" size="sm" onClick={() => patch({ is_public: !collection.is_public })}>
                        {collection.is_public ? <Lock size={12} /> : <Globe size={12} />}
                        {t(collection.is_public ? 'collection_make_private' : 'collection_make_public')}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => { setName(collection.name); setDescription(collection.description ?? ''); setEditing(true) }}>
                        <Pencil size={12} /> {t('collection_edit')}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={remove}>
                        <Trash2 size={12} /> {t('collection_delete')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {error && <p className="text-[11px]" style={{ color: 'var(--negative)' }}>{t('collections_save_error')}</p>}
            </Frame>

            {collection.builds.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>{t('collection_empty')}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {collection.builds.map(b => (
                  <div key={b.id} className="relative">
                    <BuildCard build={b} />
                    {isOwner && collection.is_public && b.visibility === 'private' && (
                      <span
                        className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold pointer-events-none"
                        style={{ color: 'var(--gold)', background: 'var(--surface-void)', border: '1px solid color-mix(in srgb, var(--gold) 45%, transparent)' }}
                        title={t('collection_private_build_hint')}
                      >
                        <Lock size={9} /> {t('collection_private_build')}
                      </span>
                    )}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => removeBuild(b.id)}
                        aria-label={t('collection_remove_build')}
                        title={t('collection_remove_build')}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:text-negative"
                        style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)', color: 'var(--ink-faint)' }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
