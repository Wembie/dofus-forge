import { useState, useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { AlertCircle, ArrowRight, GitFork, History, LogIn, Send } from 'lucide-react'
import { Modal } from '@/ui'
import { useBuildStore } from '@/store/buildStore.ts'
import { useAuthStore } from '@/store/authStore.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { buildSnapshotFromState } from '@/features/share/codec.ts'
import { requestSignIn } from '@/features/auth/requestSignIn.ts'
import { publishBuild, updateBuild, fetchBuildById, fetchBuildSummary, setBuildTags, buildTags, MAX_BUILD_TAGS, type BuildVisibility, type BuildSummary } from '@/features/builds/api.ts'
import { useTags } from '@/features/builds/TagChips.tsx'
import { PrivacyChoices } from '@/features/builds/PrivacyChoices.tsx'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { DOFUS_GAME_VERSION } from '@/data/gameVersion.ts'
import './publish.css'

const NAME_MAX = 60
const CATEGORIES = ['playstyle', 'element', 'general'] as const
const SLOTS_SHOWN = 16

/** The build being published, read back before it goes out. */
function Subject({ name }: { name: string }) {
  const { t } = useTranslation()
  const selectedClass = useBuildStore(s => s.selectedClass)
  const gender = useBuildStore(s => s.gender)
  const level = useBuildStore(s => s.level)
  const equipped = useBuildStore(s => s.equipped)
  const stats = useBuildStore(s => s.stats)
  const classLabel = useClassName(selectedClass)
  const info = CLASS_DATA.find(c => c.id === selectedClass)
  if (!info) return null
  const worn = Object.entries(equipped).filter(([slot, id]) => id != null && slot !== 'sidekick').length
  return (
    <div className="publish-subject">
      <img src={gender === 'female' ? info.imageFUrl : info.imageUrl} alt="" />
      <span>
        <b>{name.trim() || t('untitled_build')}</b>
        <small>{classLabel} · {t('level_short', { level })} · {t('build_worn', { count: Math.min(worn, SLOTS_SHOWN), total: SLOTS_SHOWN })}</small>
      </span>
      {stats && (
        <ul aria-label={t('lib_vitals')}>
          {([['ap', 'badge_ap'], ['mp', 'badge_mp'], ['range', 'badge_range']] as const).map(([key, label]) => (
            <li key={key}>
              <img src={statIconUrl(key)} alt="" />
              <strong>{stats[key]}</strong>
              {t(label)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PublishModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const navigate     = useNavigate()
  const id           = useId()
  const session       = useAuthStore(s => s.session)
  // The build itself is only read inside submit() via useBuildStore.getState(),
  // so editing the build elsewhere doesn't re-render this dialog on every change.
  const linkedBuildId = useBuildStore(s => s.linkedBuildId)
  const setLinkedBuildId = useBuildStore(s => s.setLinkedBuildId)
  const forkOf        = useBuildStore(s => s.forkOf)
  const setForkOf     = useBuildStore(s => s.setForkOf)
  const [forkParent, setForkParent] = useState<BuildSummary | null>(null)
  const tags = useTags()

  const [name, setName]             = useState(() => useBuildStore.getState().buildName || '')
  const [visibility, setVisibility] = useState<BuildVisibility>('public')
  const [tagIds, setTagIds]         = useState<number[]>([])
  // Tags as loaded from the published build; null until that prefill lands
  // (or if it failed), so an early or offline Update never wipes them.
  const [savedTagIds, setSavedTagIds] = useState<number[] | null>(null)
  const [busy, setBusy]             = useState(false)
  const [error, setError]           = useState<'error' | 'limit' | null>(null)

  // Editing an already-published build (loaded from My Builds, or your own
  // build's detail page) — prefill its real name/visibility/tags, since we're
  // about to update that same row.
  useEffect(() => {
    if (!open || !linkedBuildId) return
    setSavedTagIds(null)
    fetchBuildById(linkedBuildId).then(({ data }) => {
      if (!data) return
      // A link carrying someone else's &edit=<id> (shared by its owner) must
      // not "update" a build this user can't write to: publish it as a remix.
      if (data.user_id !== session?.user.id) {
        setLinkedBuildId(null)
        setForkOf(data.visibility === 'public' ? data.id : null)
        return
      }
      const ids = buildTags(data).map(tag => tag.id)
      setName(data.name); setVisibility(data.visibility); setTagIds(ids); setSavedTagIds(ids)
    })
  }, [open, linkedBuildId, session, setLinkedBuildId, setForkOf])

  useEffect(() => {
    if (!open || linkedBuildId || !forkOf) { setForkParent(null); return }
    fetchBuildSummary(forkOf, session?.user.id ?? null).then(setForkParent)
  }, [open, linkedBuildId, forkOf, session])

  function close() {
    setError(null)
    onClose()
  }

  const isUpdate = linkedBuildId != null
  const waiting  = isUpdate && savedTagIds == null
  const full     = tagIds.length >= MAX_BUILD_TAGS
  const langPath = langPathPrefix(i18n.language)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const store = useBuildStore.getState()
    if (!store.selectedClass || busy || waiting) return
    setBusy(true)
    setError(null)

    const payload = {
      name:        name.trim() || t('untitled_build'),
      visibility,
      classSlug:   store.selectedClass,
      gender:      store.gender,
      level:       store.level,
      gameVersion: DOFUS_GAME_VERSION,
      snapshot:    buildSnapshotFromState(store),
    }

    if (linkedBuildId) {
      const { error: err } = await updateBuild(linkedBuildId, payload)
      const tagsChanged = savedTagIds != null && (savedTagIds.length !== tagIds.length || tagIds.some(tagId => !savedTagIds.includes(tagId)))
      if (!err && tagsChanged) await setBuildTags(linkedBuildId, tagIds)
      setBusy(false)
      if (err) { setError('error'); return }
      store.setBuildName(payload.name)
      close()
      navigate(`/${langPath}build/${linkedBuildId}`)
      return
    }

    const { data, error: err } = await publishBuild({ ...payload, forkOf })
    if (data) await setBuildTags(data.id, tagIds)
    setBusy(false)
    if (err || !data) {
      setError(err?.includes('BUILD_LIMIT_REACHED') ? 'limit' : 'error')
      return
    }

    store.setBuildName(payload.name)
    setLinkedBuildId(data.id)
    setForkOf(null)
    close()
    navigate(`/${langPath}build/${data.id}`)
  }

  if (!session) {
    return (
      <Modal open={open} onClose={close} title={t('publish_title')} size="sm" className="publish-dialog">
        <div className="publish-signin">
          <LogIn size={26} aria-hidden="true" />
          <p>{t('publish_signin_required')}</p>
          <p className="publish-muted">{t('publish_signin_hint')}</p>
          <div className="publish-actions">
            <button type="button" onClick={close}>{t('modal_close')}</button>
            <button type="button" className="site-primary" onClick={() => { close(); requestSignIn() }}>{t('auth_signin_btn')}</button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={close} title={t(isUpdate ? 'publish_title_update' : 'publish_title')} size="lg" className="publish-dialog">
      <form onSubmit={submit}>
        <Subject name={name} />
        {isUpdate ? (
          <p className="publish-note">
            <History size={16} aria-hidden="true" />
            <span>{t('publish_already_published_hint')} {t('publish_history_hint')}</span>
          </p>
        ) : forkParent && (
          <p className="publish-note">
            <GitFork size={16} aria-hidden="true" />
            <span>{t('publish_remix_hint', { name: forkParent.name, author: forkParent.profiles?.username || '?' })}</span>
          </p>
        )}
        {waiting && <p className="publish-muted" role="status">{t('publish_prefill')}</p>}
        <div className="publish-field">
          <div>
            <label htmlFor={`${id}-name`}>{t('build_name_label')}</label>
            <small id={`${id}-count`}>{name.length} / {NAME_MAX}</small>
          </div>
          <input id={`${id}-name`} type="text" maxLength={NAME_MAX} value={name} disabled={waiting} autoFocus
            placeholder={t('untitled_build')} aria-describedby={`${id}-count`} onChange={e => setName(e.target.value)} />
        </div>
        <PrivacyChoices value={visibility} onChange={setVisibility} disabled={waiting} />
        <fieldset className="publish-tags" disabled={waiting}>
          <legend>
            {t('publish_tags_label')}
            <small aria-live="polite">{tagIds.length} / {MAX_BUILD_TAGS}</small>
          </legend>
          {tags == null ? (
            <p className="publish-muted" role="status">{t('explore_tags_loading')}</p>
          ) : tags.length === 0 ? (
            <div className="publish-inline-error"><p>{t('publish_tags_error')}</p></div>
          ) : (
            <>
              <p className="publish-muted">{t(full ? 'publish_tags_full' : 'publish_tags_hint', { max: MAX_BUILD_TAGS })}</p>
              {CATEGORIES.map(cat => (
                <div key={cat} className="publish-tag-group">
                  <p className="publish-tag-category">{t(`tag_category_${cat}`)}</p>
                  <div>
                    {tags.filter(tag => tag.category === cat).map(tag => {
                      const on = tagIds.includes(tag.id)
                      return (
                        <button type="button" key={tag.id} aria-pressed={on} disabled={!on && full}
                          onClick={() => setTagIds(on ? tagIds.filter(x => x !== tag.id) : [...tagIds, tag.id])}>
                          {t(`tag_${tag.name}`)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </fieldset>
        {/* In the sticky footer, so the reason a submit failed shows where you pressed it. */}
        <div className="publish-actions has-status">
          {error && (
            <div className="publish-error" role="alert">
              <AlertCircle size={17} aria-hidden="true" />
              <p>{t(error === 'limit' ? 'publish_limit_reached' : 'publish_error')}</p>
              {error === 'limit' && (
                <button type="button" onClick={() => { close(); navigate(`/${langPath}my-builds`) }}>
                  {t('publish_go_library')}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          <div>
            <button type="button" onClick={close}>{t('report_cancel')}</button>
            <button type="submit" className="site-primary" disabled={busy || waiting}>
              <Send size={16} aria-hidden="true" />
              {busy ? t(isUpdate ? 'publish_updating' : 'publish_publishing') : t(isUpdate ? 'publish_submit_update' : 'publish_submit')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
