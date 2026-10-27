import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FolderOpen, Globe, Lock, Plus, Check } from 'lucide-react'
import { Modal, Button } from '@/ui'
import { langPathPrefix } from '@/i18n/langPath.ts'
import {
  fetchUserCollections, fetchCollectionsWithBuild, setBuildInCollection, createCollection,
  type CollectionRow,
} from '@/features/builds/api.ts'

export const COLLECTION_NAME_MAX = 60

/** Inline "new collection" form: name + public toggle. */
export function NewCollectionForm({ userId, onCreated }: { userId: string; onCreated: (c: CollectionRow) => void }) {
  const { t } = useTranslation()
  const [name, setName]         = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(false)
    const { data } = await createCollection(userId, { name: name.trim(), isPublic })
    setBusy(false)
    if (!data) { setError(true); return }
    setName('')
    onCreated(data)
  }

  return (
    <form onSubmit={submit} className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          maxLength={COLLECTION_NAME_MAX}
          onChange={e => setName(e.target.value)}
          placeholder={t('collections_new_placeholder')}
          aria-label={t('collections_new_placeholder')}
          className="flex-1 min-w-0 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
          style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
        />
        <Button type="submit" variant="secondary" size="sm" disabled={busy || !name.trim()}>
          <Plus size={12} /> {t('collections_create')}
        </Button>
      </div>
      <label className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none" style={{ color: 'var(--ink-faint)' }}>
        <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
        {t('collections_public_hint')}
      </label>
      {error && <p className="text-[11px]" style={{ color: 'var(--negative)' }}>{t('collections_save_error')}</p>}
    </form>
  )
}

/** Modal to add / remove one build from the user's collections. */
export function CollectionPicker({ open, onClose, userId, buildId }: { open: boolean; onClose: () => void; userId: string; buildId: string }) {
  const { t } = useTranslation()
  const [collections, setCollections] = useState<CollectionRow[] | null>(null)
  const [inIds, setInIds]             = useState<Set<string>>(new Set())
  const [error, setError]             = useState(false)

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
    const { error: err } = await setBuildInCollection(id, buildId, !was)
    if (err) { apply(was); setError(true) }
  }

  async function onCreated(c: CollectionRow) {
    setCollections(prev => [c, ...(prev ?? [])])
    await toggle(c.id)
  }

  return (
    <Modal open={open} onClose={onClose} title={t('collections_save')} size="sm">
      <div className="p-4 space-y-3">
        {collections == null ? (
          <p className="text-xs text-center py-4" style={{ color: 'var(--ink-faint)' }}>{t('auth_loading')}</p>
        ) : collections.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{t('collections_empty')}</p>
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {collections.map(c => {
              const inside = inIds.has(c.id)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    aria-pressed={inside}
                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors"
                    style={{
                      background: inside ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'var(--surface-panel)',
                      border: `1px solid ${inside ? 'color-mix(in srgb, var(--gold) 45%, transparent)' : 'var(--metal-edge)'}`,
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                      style={{ border: `1px solid ${inside ? 'var(--gold)' : 'var(--metal-edge)'}`, background: inside ? 'var(--gold)' : 'transparent' }}
                    >
                      {inside && <Check size={11} style={{ color: 'var(--surface-void)' }} />}
                    </span>
                    <span className="flex-1 min-w-0 text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>{c.name}</span>
                    {c.is_public ? <Globe size={12} style={{ color: 'var(--ink-faint)' }} /> : <Lock size={12} style={{ color: 'var(--ink-faint)' }} />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {error && <p className="text-[11px]" style={{ color: 'var(--negative)' }}>{t('collections_save_error')}</p>}
        <div className="pt-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
          <NewCollectionForm userId={userId} onCreated={onCreated} />
        </div>
      </div>
    </Modal>
  )
}

export function CollectionGrid({ collections }: { collections: CollectionRow[] }) {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {collections.map(c => (
        <Link
          key={c.id}
          to={`/${prefix}c/${c.id}`}
          className="flex items-start gap-3 p-3 rounded-xl transition-colors hover:brightness-125"
          style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)' }}
        >
          <FolderOpen size={20} style={{ color: 'var(--gold)', flexShrink: 0 }} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold truncate" style={{ color: 'var(--gold)' }}>{c.name}</span>
            {c.description && <span className="block text-[11px] truncate" style={{ color: 'var(--ink-muted)' }}>{c.description}</span>}
            <span className="flex items-center gap-1.5 text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              {c.is_public ? <Globe size={10} /> : <Lock size={10} />}
              {t(c.is_public ? 'collections_public' : 'collections_private')} · {t('collections_builds_count', { count: c.build_count })}
            </span>
          </span>
        </Link>
      ))}
    </div>
  )
}
