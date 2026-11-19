import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, FolderOpen, Plus, Search } from 'lucide-react'
import { Modal, normalizeSearch } from '@/ui'
import { fetchUserCollections, fetchCollectionsWithBuild, setBuildInCollection, createCollection, type BuildVisibility, type CollectionRow } from '@/features/builds/api.ts'
import { PrivacyChoices } from '@/features/builds/PrivacyChoices.tsx'
import { COLLECTION_DESCRIPTION_MAX, COLLECTION_NAME_MAX, Notice, Visibility } from '@/features/library/LibraryParts.tsx'

/** Add one build to your collections or take it out, or make a new collection with it. */
export function CollectionPicker({ open, onClose, userId, buildId, buildName }: { open: boolean; onClose: () => void; userId: string; buildId: string; buildName?: string }) {
  const { t } = useTranslation()
  const [collections, setCollections] = useState<CollectionRow[] | null>(null)
  const [inIds, setInIds]             = useState<Set<string>>(new Set())
  const [busyIds, setBusyIds]         = useState<Set<string>>(new Set())
  const [error, setError]             = useState(false)
  const [notice, setNotice]           = useState('')
  const [query, setQuery]             = useState('')
  const [adding, setAdding]           = useState(false)
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility]   = useState<BuildVisibility>('private')
  const [creating, setCreating]       = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(false)
    Promise.all([fetchUserCollections(userId, false, userId), fetchCollectionsWithBuild(userId, buildId)]).then(([{ data }, ids]) => {
      if (cancelled) return
      setCollections(data)
      setInIds(ids)
    })
    return () => { cancelled = true }
  }, [open, userId, buildId])

  async function toggle(id: string) {
    const was = inIds.has(id)
    const apply = (inside: boolean) => setInIds(prev => { const next = new Set(prev); if (inside) next.add(id); else next.delete(id); return next })
    apply(!was)
    setError(false)
    setNotice('')
    setBusyIds(prev => new Set(prev).add(id))
    const { error: err } = await setBuildInCollection(id, buildId, !was)
    setBusyIds(prev => { const next = new Set(prev); next.delete(id); return next })
    if (err) { apply(was); setError(true) }
    else setCollections(prev => prev?.map(c => (c.id === id ? { ...c, build_count: c.build_count + (was ? -1 : 1) } : c)) ?? prev)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError(false)
    const { data } = await createCollection(userId, { name: name.trim(), description: description.trim() || null, isPublic: visibility === 'public' })
    if (!data) { setCreating(false); setError(true); return }
    const { error: err } = await setBuildInCollection(data.id, buildId, true)
    setCreating(false)
    setCollections(prev => [{ ...data, build_count: err ? 0 : 1 }, ...(prev ?? [])])
    if (err) { setError(true); return }
    setInIds(prev => new Set(prev).add(data.id))
    setAdding(false)
    setName('')
    setDescription('')
    setVisibility('private')
    setNotice(t('lib_added'))
  }

  const shown = (collections ?? []).filter(c => normalizeSearch(c.name).includes(normalizeSearch(query)))

  return (
    <Modal open={open} onClose={() => !creating && onClose()} title={t('collections_save')} size="md">
      {adding ? (
        <form className="library-dialog-body" onSubmit={create} aria-busy={creating}>
          <button type="button" className="library-back" disabled={creating} onClick={() => { setAdding(false); setError(false) }}>
            <ArrowLeft size={16} aria-hidden="true" />
            {t('lib_back_collections')}
          </button>
          <div className="library-field">
            <label htmlFor="picker-name">{t('lib_collection_name')}</label>
            <input id="picker-name" required maxLength={COLLECTION_NAME_MAX} value={name} disabled={creating} autoFocus onChange={e => setName(e.target.value)} />
            <small>{name.length} / {COLLECTION_NAME_MAX}</small>
          </div>
          <div className="library-field">
            <label htmlFor="picker-description">{t('collection_description_placeholder')}</label>
            <textarea id="picker-description" rows={3} maxLength={COLLECTION_DESCRIPTION_MAX} value={description} disabled={creating} onChange={e => setDescription(e.target.value)} />
            <small>{description.length} / {COLLECTION_DESCRIPTION_MAX}</small>
          </div>
          <PrivacyChoices value={visibility} onChange={setVisibility} collection disabled={creating} />
          {error && <Notice error>{t('collections_save_error')}</Notice>}
          <div className="library-dialog-actions">
            <button type="button" disabled={creating} onClick={() => setAdding(false)}>{t('collection_cancel')}</button>
            <button type="submit" className="site-primary" disabled={creating || !name.trim()}>
              {creating ? t('lib_saving') : t('collections_create')}
              {!creating && <Check size={16} aria-hidden="true" />}
            </button>
          </div>
        </form>
      ) : (
        <div className="library-dialog-body">
          {buildName && (
            <div className="library-dialog-subject">
              <FolderOpen size={23} aria-hidden="true" />
              <span>
                <small>{t('lib_saving_build')}</small>
                <b>{buildName}</b>
              </span>
            </div>
          )}
          <p>{t('lib_picker_hint')}</p>
          {(collections?.length ?? 0) > 4 && (
            <label className="library-search">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">{t('lib_search_collections')}</span>
              <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('lib_search_collections')} />
            </label>
          )}
          {error && <Notice error>{t('collections_save_error')}</Notice>}
          {notice && <Notice>{notice}</Notice>}
          {collections == null ? (
            <p role="status">{t('auth_loading')}</p>
          ) : collections.length === 0 ? (
            <p>{t('collections_empty')}</p>
          ) : (
            <ul className="library-picker-list">
              {shown.map(c => {
                const inside = inIds.has(c.id)
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => void toggle(c.id)} aria-pressed={inside} disabled={busyIds.has(c.id)}>
                      <span className="library-check">{inside && <Check size={16} aria-hidden="true" />}</span>
                      <span>
                        <b>{c.name}</b>
                        <small>{t('collections_builds_count', { count: c.build_count })}</small>
                      </span>
                      <Visibility collection value={c.is_public ? 'public' : 'private'} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {query && collections != null && !shown.length && <p>{t('lib_no_matches')}</p>}
          <div className="library-dialog-actions">
            <button type="button" onClick={() => { setAdding(true); setError(false); setNotice('') }}>
              <Plus size={17} aria-hidden="true" />
              {t('lib_new_collection')}
            </button>
            <button type="button" className="site-primary" disabled={busyIds.size > 0} onClick={onClose}>{t('lib_done')}</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
