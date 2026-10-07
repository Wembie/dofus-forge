import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Star, Heart, Eye, Link2, Globe, Lock, Trash2, MessageSquare, UploadCloud, Layers, Bookmark } from 'lucide-react'
import { Frame, Tabs } from '@/ui'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { useAuthStore } from '@/store/authStore.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { BuildEquipmentPreview } from '@/features/builds/BuildEquipmentPreview.tsx'
import { BuildCard } from '@/features/builds/BuildCard.tsx'
import {
  fetchMyBuilds, deleteBuild, updateBuildVisibility, fetchMyBookmarkedBuilds,
  type MyBuildRow, type BuildVisibility, type BuildRow,
} from '@/features/builds/api.ts'

const VISIBILITY_ORDER: BuildVisibility[] = ['private', 'unlisted', 'public']

const VISIBILITY_ICON: Record<BuildVisibility, typeof Globe> = {
  private:  Lock,
  unlisted: Link2,
  public:   Globe,
}

function MyBuildCard({ build, onChanged, onDeleted }: {
  build: MyBuildRow
  onChanged: (b: MyBuildRow) => void
  onDeleted: (id: string) => void
}) {
  const { t, i18n } = useTranslation()
  const navigate    = useNavigate()
  const applySnapshot = useBuildStore(s => s.applySnapshot)
  const setBuildName = useBuildStore(s => s.setBuildName)
  const setLinkedBuildId = useBuildStore(s => s.setLinkedBuildId)
  const equipment   = useDataStore(s => s.equipment)
  const classLabel  = useClassName(build.class_slug)
  const classInfo   = CLASS_DATA.find(c => c.id === build.class_slug)
  const portrait    = classInfo ? (build.gender === 'female' ? classInfo.imageFUrl : classInfo.imageUrl) : undefined
  const [busy, setBusy] = useState(false)
  const [showVisMenu, setShowVisMenu] = useState(false)
  const visMenuRef = useRef<HTMLDivElement>(null)
  const VisIcon = VISIBILITY_ICON[build.visibility]

  useEffect(() => {
    if (!showVisMenu) return
    function onClickOutside(e: MouseEvent) {
      if (visMenuRef.current && !visMenuRef.current.contains(e.target as Node)) setShowVisMenu(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showVisMenu])

  function handleEdit() {
    applySnapshot(build.snapshot)
    // build.name (the real DB column) is authoritative — the snapshot's own
    // embedded name can be stale/empty for builds saved before that name was
    // synced back into the store on publish, so it's set explicitly here
    // rather than trusted from applySnapshot alone.
    setBuildName(build.name)
    // These are all your own builds (fetchMyBuilds) — republishing this one
    // should update it in place, not create a duplicate row.
    setLinkedBuildId(build.id)
    navigate(`/${langPathPrefix(i18n.language)}`)
  }

  async function handleSetVisibility(next: BuildVisibility) {
    setShowVisMenu(false)
    if (next === build.visibility) return
    setBusy(true)
    const { error } = await updateBuildVisibility(build.id, next)
    setBusy(false)
    if (!error) onChanged({ ...build, visibility: next })
  }

  function handleViewDetail() {
    navigate(`/${langPathPrefix(i18n.language)}build/${build.id}`)
  }

  async function handleCopyLink() {
    const url = `${location.origin}${import.meta.env.BASE_URL}${langPathPrefix(i18n.language)}build/${build.id}`
    await navigator.clipboard.writeText(url)
  }

  async function handleDelete() {
    if (!confirm(t('my_builds_confirm_delete', { name: build.name }))) return
    setBusy(true)
    const { error } = await deleteBuild(build.id)
    setBusy(false)
    if (!error) onDeleted(build.id)
  }

  return (
    <div
      className="flex flex-col gap-2.5 p-3 rounded-xl transition-shadow"
      style={{
        background:   'var(--surface-panel)',
        borderTop:    '1px solid var(--gold-deep)',
        borderRight:  '1px solid var(--metal-edge)',
        borderBottom: '1px solid var(--metal-edge)',
        borderLeft:   '1px solid var(--metal-edge)',
        boxShadow:    'var(--inset-bevel)',
        opacity:      busy ? 0.6 : 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--inset-bevel), var(--glow-gold)'; e.currentTarget.style.borderTopColor = 'var(--gold)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--inset-bevel)'; e.currentTarget.style.borderTopColor = 'var(--gold-deep)' }}
    >
      <button onClick={handleViewDetail} className="flex items-center gap-2.5 text-left">
        {portrait && (
          <img src={portrait} alt="" width={44} height={44} className="rounded-lg object-cover flex-shrink-0" style={{ background: 'var(--surface-void)' }} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--gold)' }}>{build.name}</p>
          <p className="text-[11px] truncate" style={{ color: 'var(--ink-faint)' }}>{classLabel} · {t('level_short', { level: build.level })}</p>
        </div>
      </button>

      <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
        <span className="flex items-center gap-1"><Star size={11} style={{ color: 'var(--gold)' }} />{build.avg_rating.toFixed(1)}</span>
        <span className="flex items-center gap-1"><Heart size={11} />{build.like_count}</span>
        <span className="flex items-center gap-1"><Eye size={11} />{build.view_count}</span>
        <span className="flex items-center gap-1"><MessageSquare size={11} />{build.comment_count}</span>
      </div>

      <BuildEquipmentPreview snapshot={build.snapshot} equipment={equipment} size={34} hideEmpty />

      <div className="flex items-center gap-1.5 pt-1.5" style={{ borderTop: '1px solid var(--metal-edge)' }}>
        <div ref={visMenuRef} className="relative">
          <button
            onClick={() => setShowVisMenu(v => !v)}
            disabled={busy}
            title={t('my_builds_cycle_visibility')}
            aria-label={t('my_builds_cycle_visibility')}
            className="flex items-center gap-1 text-[10px] uppercase font-semibold px-2 py-1 rounded transition-colors"
            style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)' }}
          >
            <VisIcon size={11} />
            {t(`publish_visibility_${build.visibility}`)}
          </button>
          {showVisMenu && (
            <div
              role="menu"
              className="absolute left-0 top-[calc(100%+4px)] z-10 flex flex-col gap-0.5 p-1 rounded-lg min-w-[120px]"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--metal-edge-strong)', boxShadow: 'var(--shadow-frame)' }}
            >
              {VISIBILITY_ORDER.map(v => {
                const Icon = VISIBILITY_ICON[v]
                const active = v === build.visibility
                return (
                  <button
                    key={v}
                    role="menuitem"
                    onClick={() => handleSetVisibility(v)}
                    className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1.5 rounded whitespace-nowrap transition-colors"
                    style={active
                      ? { color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 12%, transparent)' }
                      : { color: 'var(--ink-faint)' }}
                  >
                    <Icon size={11} />
                    {t(`publish_visibility_${v}`)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <button
          onClick={handleEdit}
          title={t('my_builds_edit')}
          aria-label={t('my_builds_edit')}
          className="ml-auto flex items-center gap-1 text-[10px] uppercase font-semibold px-2 py-1 rounded transition-colors"
          style={{ color: 'var(--water)', background: 'color-mix(in srgb, var(--water) 10%, transparent)' }}
        >
          <UploadCloud size={11} />
          {t('my_builds_edit')}
        </button>
        <button onClick={handleCopyLink} title={t('my_builds_copy_link')} aria-label={t('my_builds_copy_link')} className="p-1.5 rounded transition-colors hover:bg-surface-raised" style={{ color: 'var(--ink-faint)' }}>
          <Link2 size={13} />
        </button>
        <button
          onClick={handleDelete}
          disabled={busy}
          title={t('my_builds_delete')}
          aria-label={t('my_builds_delete')}
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--negative)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--negative) 15%, transparent)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

type MyBuildsTab = 'mine' | 'bookmarked'

const TAB_ITEMS: { id: MyBuildsTab; label: string; Icon: typeof Layers }[] = [
  { id: 'mine',       label: 'my_builds_tab_mine',       Icon: Layers },
  { id: 'bookmarked', label: 'my_builds_tab_bookmarked', Icon: Bookmark },
]

export function MyBuildsPage() {
  const { t, i18n } = useTranslation()
  useLoadGameData()
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'my-builds', { noindex: true })
  const session      = useAuthStore(s => s.session)
  const [tab, setTab]         = useState<MyBuildsTab>('mine')
  const [builds, setBuilds]   = useState<MyBuildRow[]>([])
  const [bookmarked, setBookmarked] = useState<BuildRow[]>([])
  const [loading, setLoading] = useState(true)
  const [bookmarksLoaded, setBookmarksLoaded] = useState(false)

  const load = useCallback(() => {
    if (!session) { setLoading(false); return }
    setLoading(true)
    fetchMyBuilds(session.user.id).then(({ data }) => {
      setBuilds(data)
      setLoading(false)
    })
  }, [session])

  useEffect(() => { load() }, [load])

  // Lazy: only fetch bookmarks once the user actually opens that tab.
  useEffect(() => {
    if (tab !== 'bookmarked' || bookmarksLoaded || !session) return
    fetchMyBookmarkedBuilds(session.user.id).then(({ data }) => {
      setBookmarked(data)
      setBookmarksLoaded(true)
    })
  }, [tab, bookmarksLoaded, session])

  const publicCount = builds.filter(b => b.visibility === 'public').length
  const totalLikes  = builds.reduce((sum, b) => sum + b.like_count, 0)

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader />

      <main className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-5">
        <h1 className="font-display font-bold tracking-[0.15em] uppercase text-xs" style={{ color: 'var(--gold)' }}>
          {t('my_builds')}
        </h1>
        {!session ? (
          <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>{t('my_builds_signin_required')}</p>
        ) : (
          <>
            <Frame padding="md" className="flex items-center gap-6">
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--gold)' }}>{builds.length}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>{t('my_builds_total')}</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--gold)' }}>{publicCount}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>{t('my_builds_public_count')}</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--gold)' }}>{totalLikes}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>{t('my_builds_likes_received')}</p>
              </div>
            </Frame>

            <Tabs
              items={TAB_ITEMS.map(it => ({ ...it, label: t(it.label) }))}
              active={tab}
              onChange={id => setTab(id as MyBuildsTab)}
              variant="segment"
            />

            {tab === 'mine' ? (
              <>
                {loading && (
                  <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>{t('auth_loading')}</p>
                )}

                {!loading && builds.length === 0 && (
                  <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>{t('no_saved_builds')}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {builds.map(b => (
                    <MyBuildCard
                      key={b.id}
                      build={b}
                      onChanged={updated => setBuilds(prev => prev.map(x => x.id === updated.id ? updated : x))}
                      onDeleted={id => setBuilds(prev => prev.filter(x => x.id !== id))}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                {!bookmarksLoaded && (
                  <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>{t('auth_loading')}</p>
                )}

                {bookmarksLoaded && bookmarked.length === 0 && (
                  <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>{t('my_builds_no_bookmarks')}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {bookmarked.map(b => <BuildCard key={b.id} build={b} />)}
                </div>
              </>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
