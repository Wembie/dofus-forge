import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Globe, Link2, Lock, Swords, GitFork } from 'lucide-react'
import { Modal, Button } from '@/ui'
import { useBuildStore } from '@/store/buildStore.ts'
import { useAuthStore } from '@/store/authStore.ts'
import { buildSnapshotFromState } from '@/features/share/codec.ts'
import { publishBuild, updateBuild, fetchBuildById, fetchBuildSummary, setBuildTags, buildTags, MAX_BUILD_TAGS, type BuildVisibility, type BuildSummary } from '@/features/builds/api.ts'
import { TagPicker } from '@/features/builds/TagChips.tsx'
import { DOFUS_GAME_VERSION } from '@/data/gameVersion.ts'

const VISIBILITY_OPTIONS: { id: BuildVisibility; Icon: typeof Globe }[] = [
  { id: 'private',  Icon: Lock },
  { id: 'unlisted', Icon: Link2 },
  { id: 'public',   Icon: Globe },
]

export function PublishModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const navigate     = useNavigate()
  const session       = useAuthStore(s => s.session)
  // Not subscribed with a selector: the build itself (selectedClass,
  // equipment, level, stats…) is only read inside submit() via
  // useBuildStore.getState(), so editing the build elsewhere doesn't
  // re-render this modal on every change.
  const linkedBuildId = useBuildStore(s => s.linkedBuildId)
  const setLinkedBuildId = useBuildStore(s => s.setLinkedBuildId)
  const forkOf        = useBuildStore(s => s.forkOf)
  const setForkOf     = useBuildStore(s => s.setForkOf)
  const [forkParent, setForkParent] = useState<BuildSummary | null>(null)

  const [name, setName]             = useState(() => useBuildStore.getState().buildName || '')
  const [visibility, setVisibility] = useState<BuildVisibility>('public')
  const [tagIds, setTagIds]         = useState<number[]>([])
  // Tags as loaded from the published build; null until that prefill lands
  // (or if it failed), so an early or offline Update never wipes them.
  const [savedTagIds, setSavedTagIds] = useState<number[] | null>(null)
  const [busy, setBusy]             = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Editing an already-published build (loaded from My Builds, or your own
  // build's detail page) — prefill its real name/visibility instead of
  // defaulting to "private", since we're about to update that same row.
  useEffect(() => {
    if (!open || !linkedBuildId) return
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const store = useBuildStore.getState()
    if (!store.selectedClass) return
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

    const lang     = i18n.language.slice(0, 2)
    const langPath = lang === 'en' ? '' : `${lang}/`

    if (linkedBuildId) {
      const { error: err } = await updateBuild(linkedBuildId, payload)
      const tagsChanged = savedTagIds != null && (savedTagIds.length !== tagIds.length || tagIds.some(id => !savedTagIds.includes(id)))
      if (!err && tagsChanged) await setBuildTags(linkedBuildId, tagIds)
      setBusy(false)
      if (err) { setError(t('publish_error')); return }
      store.setBuildName(payload.name)
      close()
      navigate(`/${langPath}build/${linkedBuildId}`)
      return
    }

    const { data, error: err } = await publishBuild({ ...payload, forkOf })
    if (data) await setBuildTags(data.id, tagIds)
    setBusy(false)
    if (err || !data) {
      setError(err?.includes('BUILD_LIMIT_REACHED') ? t('publish_limit_reached') : t('publish_error'))
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
      <Modal open={open} onClose={close} title={t('publish_title')} size="sm">
        <div className="p-5 text-center space-y-3">
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>{t('publish_signin_required')}</p>
          <Button variant="secondary" size="sm" onClick={close}>{t('modal_close')}</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={close} title={t(linkedBuildId ? 'publish_title_update' : 'publish_title')} size="sm">
      <form onSubmit={submit} className="p-5 space-y-4">
        {linkedBuildId && (
          <p
            className="text-[11px] rounded-md px-2.5 py-1.5"
            style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 25%, transparent)' }}
          >
            {t('publish_already_published_hint')}
          </p>
        )}
        {!linkedBuildId && forkParent && (
          <p
            className="flex items-center gap-1.5 text-[11px] rounded-md px-2.5 py-1.5"
            style={{ color: 'var(--ink-muted)', background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)' }}
          >
            <GitFork size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} />
            {t('publish_remix_hint', { name: forkParent.name, author: forkParent.profiles?.display_name || forkParent.profiles?.username || '?' })}
          </p>
        )}

        <div>
          <label htmlFor="publish-build-name" className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>
            {t('build_name_label')}
          </label>
          <div className="relative">
            <Swords size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />
            <input
              id="publish-build-name"
              type="text"
              maxLength={60}
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('untitled_build')}
              className="w-full text-sm rounded-lg pl-8 pr-3 py-2 transition-colors focus:outline-none"
              style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-deep)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>
            {t('publish_visibility_label')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {VISIBILITY_OPTIONS.map(({ id, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setVisibility(id)}
                className="flex flex-col items-center gap-1 py-2.5 rounded-lg border text-[10px] font-semibold transition-colors"
                style={visibility === id ? {
                  background:  'color-mix(in srgb, var(--gold) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--gold) 45%, transparent)',
                  color:       'var(--gold)',
                } : {
                  background:  'var(--surface-panel)',
                  borderColor: 'var(--metal-edge)',
                  color:       'var(--ink-faint)',
                }}
              >
                <Icon size={16} />
                {t(`publish_visibility_${id}`)}
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: 'var(--ink-faint)' }}>{t(`publish_visibility_${visibility}_hint`)}</p>
        </div>

        <div>
          <label className="flex items-baseline justify-between text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-faint)' }}>
            {t('publish_tags_label')}
            <span className="normal-case tracking-normal font-mono">{tagIds.length}/{MAX_BUILD_TAGS}</span>
          </label>
          <TagPicker selected={tagIds} onChange={setTagIds} />
        </div>

        {error && (
          <p
            className="text-[11px] rounded-md px-2.5 py-1.5"
            style={{ color: 'var(--negative)', background: 'color-mix(in srgb, var(--negative) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--negative) 25%, transparent)' }}
          >
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" size="md" disabled={busy || (linkedBuildId != null && savedTagIds == null)} className="w-full justify-center">
          {busy ? t('auth_loading') : t(linkedBuildId ? 'publish_submit_update' : 'publish_submit')}
        </Button>
      </form>
    </Modal>
  )
}
