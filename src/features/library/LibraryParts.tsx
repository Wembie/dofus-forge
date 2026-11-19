import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { ArrowUpRight, Bookmark, Check, Copy, Eye, FolderOpen, Globe, Heart, Link2, Lock, MessageSquare, MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react'
import { Modal } from '@/ui'
import { useAuthStore } from '@/store/authStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { encodeSnapshot } from '@/features/share/codec.ts'
import { BuildEquipmentPreview } from '@/features/builds/BuildEquipmentPreview.tsx'
import { snapshotStats } from '@/features/builds/snapshotStats.ts'
import { PrivacyChoices } from '@/features/builds/PrivacyChoices.tsx'
import {
  createCollection, deleteBuild, deleteCollection, fetchBuildById, updateBuildVisibility, updateCollection,
  type BuildVisibility, type CollectionRow,
} from '@/features/builds/api.ts'
import type { BuildSnapshot } from '@/store/buildStore.ts'
import './library.css'

const CollectionPicker = lazy(() => import('@/features/collections/Collections.tsx').then(m => ({ default: m.CollectionPicker })))

export const COLLECTION_NAME_MAX = 60
export const COLLECTION_DESCRIPTION_MAX = 300

/** What a library card needs: your builds (full snapshot) or someone else's (list snapshot). */
export type LibraryItem = {
  id: string
  name: string
  class_slug: string
  gender: 'male' | 'female'
  level: number
  visibility: BuildVisibility
  like_count: number
  view_count: number
  avg_rating: number
  comment_count: number
  created_at: string
  snapshot: BuildSnapshot
  user_id?: string
  profiles?: { username?: string | null } | null
}

const ICONS = { private: Lock, unlisted: Link2, public: Globe }
const VITALS = [
  ['maxHp', 'badge_hp', 'vitality'], ['ap', 'badge_ap', 'ap'], ['mp', 'badge_mp', 'mp'],
  ['range', 'badge_range', 'range'], ['critChance', 'stat_crit_chance', 'crit'], ['summons', 'stat_summons', 'summons'],
] as const

export function Visibility({ value, collection = false }: { value: BuildVisibility; collection?: boolean }) {
  const { t } = useTranslation()
  const Icon = ICONS[value]
  return (
    <span className={`library-visibility is-${value}`}>
      <Icon size={13} aria-hidden="true" />
      {t(collection ? (value === 'public' ? 'collections_public' : 'collections_private') : `publish_visibility_${value}`)}
    </span>
  )
}

export function Empty({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="library-empty">
      <FolderOpen size={30} aria-hidden="true" />
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {children}
    </div>
  )
}

export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={'library-notice' + (error ? ' is-error' : '')} role={error ? 'alert' : 'status'}>{children}</div>
}

function CardMenu({ name, children }: { name: string; children: (close: () => void) => ReactNode }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  function close() {
    setOpen(false)
    trigger.current?.focus()
  }
  return (
    <div className="library-card-menu" ref={ref} onKeyDown={e => { if (e.key === 'Escape' && open) { e.stopPropagation(); close() } }}>
      <button type="button" ref={trigger} aria-label={t('lib_actions', { name })} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>
        <MoreHorizontal size={19} aria-hidden="true" />
      </button>
      {open && <div id={id} className="library-action-list">{children(close)}</div>}
    </div>
  )
}

/** A build in your library: what it is, the workshop in miniature, its main stats and
 * activity, and what you can do with it (open in the workshop, collections, link,
 * visibility, delete when it is yours, unbookmark when it is a bookmark). */
export function LibraryCard({ build, owner, onChanged, onDeleted, onUnbookmark, privacyNote }: {
  build: LibraryItem
  owner: boolean
  onChanged?: (next: LibraryItem) => void
  onDeleted?: (id: string) => void
  onUnbookmark?: () => void
  privacyNote?: boolean
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const session = useAuthStore(s => s.session)
  const equipment = useDataStore(s => s.equipment)
  const sets = useDataStore(s => s.sets)
  const classLabel = useClassName(build.class_slug)
  const prefix = langPathPrefix(i18n.language)
  const stats = useMemo(() => snapshotStats(build.snapshot, equipment, sets), [build.snapshot, equipment, sets])
  const nf = new Intl.NumberFormat(i18n.language === 'es' ? 'es-CO' : i18n.language)
  const [dialog, setDialog] = useState<'visibility' | 'delete' | 'collections' | null>(null)
  const [copy, setCopy] = useState('')
  const detail = `/${prefix}build/${build.id}`
  const ownerName = build.profiles?.username ?? ''

  // Your own build opens with its edit link, so publishing updates it; someone
  // else's is fetched whole (lists carry a light snapshot) and opens as a remix.
  async function openInWorkshop() {
    const lang = langPathRootSegment(i18n.language.slice(0, 2))
    if (owner) {
      navigate(`/${lang}?b=${encodeSnapshot({ ...build.snapshot, n: build.name || undefined })}&edit=${build.id}`)
      return
    }
    const { data } = await fetchBuildById(build.id)
    if (!data) { navigate(detail); return }
    const link = data.visibility === 'public' ? `&fork=${data.id}` : ''
    navigate(`/${lang}?b=${encodeSnapshot({ ...data.snapshot, n: data.name || undefined })}${link}`)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${location.origin}${import.meta.env.BASE_URL}${prefix}build/${build.id}`)
      setCopy(t('lib_copied'))
    } catch {
      setCopy(t('share_copy_error'))
    }
  }

  return (
    <article className="library-card" aria-label={build.name}>
      <div className="library-card-meta">
        <Visibility value={build.visibility} />
        <span>{t('level_short', { level: build.level })}</span>
      </div>
      <Link className="library-card-main" to={detail}>
        <BuildEquipmentPreview snapshot={build.snapshot} equipment={equipment} classSlug={build.class_slug} gender={build.gender} />
        <h2>{build.name}</h2>
        <span>{classLabel}{ownerName && !owner ? ` · ${ownerName}` : ''}</span>
      </Link>
      {stats && (
        <ul className="library-vitals" aria-label={t('lib_vitals')}>
          {VITALS.map(([key, label, icon]) => (
            <li key={key}>
              <img src={statIconUrl(icon)} alt="" />
              <b>{nf.format(stats[key])}</b>
              <span>{t(label)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="library-social">
        <span title={t('build_rating')}><Star size={13} aria-hidden="true" />{build.avg_rating.toFixed(1)}</span>
        <span title={t('build_like')}><Heart size={13} aria-hidden="true" />{build.like_count}</span>
        <span title={t('build_views')}><Eye size={13} aria-hidden="true" />{build.view_count}</span>
        <span title={t('lib_comments', { count: build.comment_count })}><MessageSquare size={13} aria-hidden="true" />{build.comment_count}</span>
      </div>
      {privacyNote && (
        <p className="library-private-note">
          <Lock size={13} aria-hidden="true" />
          {t(build.visibility === 'unlisted' ? 'collection_unlisted_build_hint' : 'collection_private_build_hint')}
        </p>
      )}
      <footer>
        <a href={detail} onClick={e => { e.preventDefault(); void openInWorkshop() }}>
          <Pencil size={15} aria-hidden="true" />
          {t(owner ? 'my_builds_edit' : 'lib_open_workshop')}
        </a>
        {session && (
          <button type="button" onClick={() => setDialog('collections')} aria-label={t('lib_save_named', { name: build.name })}>
            <FolderOpen size={17} aria-hidden="true" />
          </button>
        )}
        <CardMenu name={build.name}>
          {close => (
            <>
              <button type="button" onClick={() => { close(); void copyLink() }}>
                <Copy size={15} aria-hidden="true" />{t('my_builds_copy_link')}
              </button>
              {owner && (
                <>
                  <button type="button" onClick={() => { close(); setDialog('visibility') }}>
                    <Globe size={15} aria-hidden="true" />{t('publish_visibility_label')}
                  </button>
                  <button type="button" className="danger" onClick={() => { close(); setDialog('delete') }}>
                    <Trash2 size={15} aria-hidden="true" />{t('my_builds_delete')}
                  </button>
                </>
              )}
              {onUnbookmark && (
                <button type="button" onClick={() => { close(); onUnbookmark() }}>
                  <Bookmark size={15} aria-hidden="true" />{t('lib_unbookmark')}
                </button>
              )}
            </>
          )}
        </CardMenu>
      </footer>
      {copy && <p className="library-copy" role="status">{copy}</p>}
      {dialog === 'visibility' && <VisibilityDialog build={build} onClose={() => setDialog(null)} onSaved={v => onChanged?.({ ...build, visibility: v })} />}
      {dialog === 'delete' && <DeleteBuildDialog build={build} onClose={() => setDialog(null)} onDeleted={() => onDeleted?.(build.id)} />}
      {dialog === 'collections' && session && (
        <Suspense fallback={null}>
          <CollectionPicker open onClose={() => setDialog(null)} userId={session.user.id} buildId={build.id} buildName={build.name} />
        </Suspense>
      )}
    </article>
  )
}

function Subject({ icon, kicker, name }: { icon: ReactNode; kicker: string; name: string }) {
  return (
    <div className="library-dialog-subject">
      {icon}
      <span>
        <small>{kicker}</small>
        <b>{name}</b>
      </span>
    </div>
  )
}

function DialogActions({ busy, disabled, danger, label, onCancel }: { busy: boolean; disabled?: boolean; danger?: boolean; label: string; onCancel: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="library-dialog-actions">
      <button type="button" disabled={busy} onClick={onCancel}>{t('collection_cancel')}</button>
      <button type="submit" className={danger ? 'library-danger' : 'site-primary'} disabled={busy || disabled}>
        {busy ? t('lib_saving') : label}
        {!busy && !danger && <Check size={16} aria-hidden="true" />}
      </button>
    </div>
  )
}

function VisibilityDialog({ build, onClose, onSaved }: { build: LibraryItem; onClose: () => void; onSaved: (v: BuildVisibility) => void }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(build.visibility)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(false)
    const { error: err } = await updateBuildVisibility(build.id, value)
    setBusy(false)
    if (err) { setError(true); return }
    onSaved(value)
    onClose()
  }
  return (
    <Modal open onClose={() => !busy && onClose()} title={t('lib_visibility_title')} size="md">
      <form className="library-dialog-body" onSubmit={submit} aria-busy={busy}>
        <Subject icon={<Pencil size={25} aria-hidden="true" />} kicker={t('lib_build')} name={build.name} />
        <PrivacyChoices value={value} onChange={setValue} disabled={busy} />
        {error && <Notice error>{t('lib_action_error')}</Notice>}
        <DialogActions busy={busy} disabled={value === build.visibility} label={t('collection_save')} onCancel={onClose} />
      </form>
    </Modal>
  )
}

function DeleteBuildDialog({ build, onClose, onDeleted }: { build: LibraryItem; onClose: () => void; onDeleted: () => void }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(false)
    const { error: err } = await deleteBuild(build.id)
    setBusy(false)
    if (err) { setError(true); return }
    onDeleted()
    onClose()
  }
  return (
    <Modal open onClose={() => !busy && onClose()} title={t('lib_delete_build')} size="md">
      <form className="library-dialog-body" onSubmit={submit} aria-busy={busy}>
        <Subject icon={<Trash2 size={25} aria-hidden="true" />} kicker={t('lib_build')} name={build.name} />
        <p>{t('lib_delete_build_hint')}</p>
        <p className="library-warning">{t('lib_delete_relations')}</p>
        {error && <Notice error>{t('lib_action_error')}</Notice>}
        <DialogActions busy={busy} danger label={t('my_builds_delete')} onCancel={onClose} />
      </form>
    </Modal>
  )
}

/** Create a collection, or edit one's name, description and visibility. */
export function CollectionDialog({ userId, collection, onClose, onSaved }: {
  userId: string
  collection?: CollectionRow
  onClose: () => void
  onSaved: (c: CollectionRow) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [name, setName] = useState(collection?.name ?? '')
  const [description, setDescription] = useState(collection?.description ?? '')
  const [visibility, setVisibility] = useState<BuildVisibility>(collection?.is_public ? 'public' : 'private')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(false)
    const fields = { name: name.trim(), description: description.trim() || null, is_public: visibility === 'public' }
    if (collection) {
      const { error: err } = await updateCollection(collection.id, fields)
      setBusy(false)
      if (err) { setError(true); return }
      onSaved({ ...collection, ...fields })
    } else {
      const { data } = await createCollection(userId, { name: fields.name, description: fields.description, isPublic: fields.is_public })
      setBusy(false)
      if (!data) { setError(true); return }
      onSaved(data)
    }
    onClose()
  }
  return (
    <Modal open onClose={() => !busy && onClose()} title={t(collection ? 'lib_edit_collection' : 'lib_new_collection')} size="md">
      <form className="library-dialog-body" onSubmit={submit} aria-busy={busy}>
        <Subject icon={<FolderOpen size={25} aria-hidden="true" />} kicker={t('lib_collection_eyebrow')} name={collection?.name ?? t('lib_new_collection')} />
        <div className="library-field">
          <label htmlFor={`${id}-name`}>{t('lib_collection_name')}</label>
          <input id={`${id}-name`} required maxLength={COLLECTION_NAME_MAX} value={name} disabled={busy} autoFocus onChange={e => setName(e.target.value)} />
          <small>{name.length} / {COLLECTION_NAME_MAX}</small>
        </div>
        <div className="library-field">
          <label htmlFor={`${id}-description`}>{t('collection_description_placeholder')}</label>
          <textarea id={`${id}-description`} rows={3} maxLength={COLLECTION_DESCRIPTION_MAX} value={description} disabled={busy} onChange={e => setDescription(e.target.value)} />
          <small>{description.length} / {COLLECTION_DESCRIPTION_MAX}</small>
        </div>
        <PrivacyChoices value={visibility} onChange={setVisibility} collection disabled={busy} />
        {collection && <p className="library-warning">{t('lib_collection_privacy')}</p>}
        {error && <Notice error>{t('collections_save_error')}</Notice>}
        <DialogActions busy={busy} disabled={!name.trim()} label={t(collection ? 'collection_save' : 'collections_create')} onCancel={onClose} />
      </form>
    </Modal>
  )
}

export function DeleteCollectionDialog({ collection, onClose, onDeleted }: { collection: CollectionRow; onClose: () => void; onDeleted: () => void }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(false)
    const { error: err } = await deleteCollection(collection.id)
    setBusy(false)
    if (err) { setError(true); return }
    onDeleted()
  }
  return (
    <Modal open onClose={() => !busy && onClose()} title={t('lib_delete_collection')} size="md">
      <form className="library-dialog-body" onSubmit={submit} aria-busy={busy}>
        <Subject icon={<Trash2 size={25} aria-hidden="true" />} kicker={t('lib_collection_eyebrow')} name={collection.name} />
        <p>{t('collection_delete_confirm')}</p>
        {error && <Notice error>{t('collections_save_error')}</Notice>}
        <DialogActions busy={busy} danger label={t('collection_delete')} onCancel={onClose} />
      </form>
    </Modal>
  )
}

/** One collection in the list: its name, description, visibility and size. */
export function CollectionRowLink({ collection: c }: { collection: CollectionRow }) {
  const { t, i18n } = useTranslation()
  return (
    <Link className="library-collection-row" to={`/${langPathPrefix(i18n.language)}c/${c.id}`}>
      <span className="library-collection-art" aria-hidden="true"><FolderOpen size={32} /></span>
      <span className="library-collection-copy">
        <b>{c.name}</b>
        {c.description && <span>{c.description}</span>}
        <small>
          <Visibility collection value={c.is_public ? 'public' : 'private'} />
          {t('collections_builds_count', { count: c.build_count })}
        </small>
      </span>
      <ArrowUpRight size={20} aria-hidden="true" />
    </Link>
  )
}
