import { useEffect, useRef, useMemo, Suspense, useState, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router'
import { User, BarChart2, Undo2, Redo2, Wand2, Layers, UploadCloud, RefreshCw, Compass, FolderOpen, SunMoon, RotateCcw, Volume2, Settings, Info, BookOpen, ShieldCheck, Keyboard, Library, Sparkles, Share2 } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { WorkshopBar, WorkshopIdentity, WorkshopMobileNav, WorkshopStatus, WorkshopTools, type WorkshopTool, type WorkshopView } from '@/features/workshop/WorkshopBar.tsx'
import { StatsQuick } from '@/features/stats-panel/StatsOverview.tsx'
import { toggleTheme } from '@/ui/ThemeToggle.tsx'
import { toggleSound } from '@/lib/sound.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { useAuthStore } from '@/store/authStore.ts'
import { ClassPicker } from '@/features/class-picker/ClassPicker.tsx'
import { CharacteristicsPanel } from '@/features/characteristics/CharacteristicsPanel.tsx'
import { EquipmentGrid } from '@/features/equipment/EquipmentGrid.tsx'
import { StatsPanel } from '@/features/stats-panel/StatsPanel.tsx'
import { CombatViewBar } from '@/features/passives/CombatViewBar.tsx'
import { useBuildUrl } from '@/features/share/useBuildUrl.ts'
import { useCompareUrl } from '@/features/share/useCompareUrl.ts'
import { encodeBuild } from '@/features/share/codec.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { useToastStore } from '@/store/toastStore.ts'
import { assignSetSlots } from '@/features/equipment/setSlots.ts'
import { useHistoryStore } from '@/store/historyStore.ts'
import { useHistory } from '@/store/useHistory.ts'
import { BrandMark, Frame, Modal } from '@/ui'
import { useCompareStore } from '@/store/compareStore.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { DOFUS_CLASSES, type DofusClass } from '@/engine/types.ts'
import { getSidebarSide, LAYOUT_SETTINGS_EVENT, type SidebarSide } from '@/lib/layoutSettings.ts'
import { scrollBehavior } from '@/lib/motionSettings.ts'
import { langPathRootSegment } from '@/i18n/langPath.ts'
import { OPEN_CHARACTERISTICS_EVENT, openCharacteristics } from '@/features/characteristics/openCharacteristics.ts'
import type { Characteristic } from '@/engine/types.ts'

// Lazy: none of these are needed for the initial paint (spells/compare
// only render after a class is picked / compare mode is toggled; the
// modals only mount on click) — keeps them out of the eager bundle.
const SpellsPanel     = lazy(() => import('@/features/spells/SpellsPanel.tsx').then(m => ({ default: m.SpellsPanel })))
const PvpArena        = lazy(() => import('@/features/pvp/PvpArena.tsx').then(m => ({ default: m.PvpArena })))
const ComparePanel    = lazy(() => import('@/features/compare/ComparePanel.tsx').then(m => ({ default: m.ComparePanel })))
const ChangelogModal  = lazy(() => import('@/features/changelog/ChangelogModal.tsx').then(m => ({ default: m.ChangelogModal })))
const OptimizerModal  = lazy(() => import('@/features/optimizer/OptimizerModal.tsx').then(m => ({ default: m.OptimizerModal })))
const SetsCatalog     = lazy(() => import('@/features/equipment/SetsCatalog.tsx').then(m => ({ default: m.SetsCatalog })))
const SharePanel      = lazy(() => import('@/features/share/SharePanel.tsx').then(m => ({ default: m.SharePanel })))
const PublishModal    = lazy(() => import('@/features/publish/PublishModal.tsx').then(m => ({ default: m.PublishModal })))


// Isolated in its own component because its href has to encode the FULL
// build state (so right-click/middle-click "open in new tab" carries the
// current build) — that means subscribing to the whole buildStore. Doing
// that subscription here, instead of in BuilderContent, keeps the re-render
// it triggers on every single build change (equip, scroll toggle, level,
// stat point, …) scoped to this one small link instead of cascading through
// the entire page (header, equipment grid, stats panel, characteristics, …).
function BrandLink({ onReset }: { onReset: () => void }) {
  const { t, i18n } = useTranslation()
  const buildState  = useBuildStore(s => s)
  const brandHref   = useMemo(() => {
    const encoded  = encodeBuild(buildState)
    const lang     = i18n.language.slice(0, 2)
    const langPath = langPathRootSegment(lang)
    return `${import.meta.env.BASE_URL}${langPath}?b=${encoded}`
  }, [buildState, i18n.language])

  return (
    <a
      href={brandHref}
      className="site-brand"
      onClick={e => {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onReset()
      }}
      title={t('reset_build')}
    >
      <BrandMark />
      {/* Not a heading: the workshop's <h1> is the build title. */}
      <span className="brand-wordmark">{t('app_title')}</span>
    </a>
  )
}

function BuilderContent() {
  const { t, i18n } = useTranslation()
  const navigate       = useNavigate()
  const routerLocation = useLocation()
  const hasClass  = useBuildStore(s => s.selectedClass !== null)
  // A build loaded from (or just published as) a cloud build re-publishes as
  // an update of that same row, so the button says so.
  const isPublished = useBuildStore(s => s.linkedBuildId !== null)
  const publishLabel = t(isPublished ? 'publish_update_open' : 'publish_open')
  const PublishIcon  = isPublished ? RefreshCw : UploadCloud
  const isAdmin   = useAuthStore(s => s.profile?.role === 'admin')
  const setClass  = useBuildStore(s => s.setClass)
  const [activeTab, setActiveTab] = useState<WorkshopView>('equipment')
  const load      = useDataStore(s => s.load)
  const canUndo   = useHistoryStore(s => s.canUndo)
  const canRedo   = useHistoryStore(s => s.canRedo)
  const undo      = useHistoryStore(s => s.undo)
  const redo      = useHistoryStore(s => s.redo)
  const reset        = useBuildStore(s => s.reset)
  const clearHistory = useHistoryStore(s => s.clear)
  const [showChangelog,  setShowChangelog]  = useState(false)
  const [showOptimizer,  setShowOptimizer]  = useState(false)
  // ?forge=1 (the guide's "Open The Forger") opens it on arrival, once: a
  // reload or a shared link must not reopen it. Read after mount, since the
  // prerendered page this hydrates was rendered without the query.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('forge')) return
    if (url.searchParams.get('forge') === '1') setShowOptimizer(true)
    url.searchParams.delete('forge')
    window.history.replaceState(window.history.state, '', url)
  }, [])
  const [showSetsCatalog, setShowSetsCatalog] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [showCharacteristics, setShowCharacteristics] = useState(false)
  const [showSpells, setShowSpells] = useState(false)
  const [showPvp, setShowPvp]       = useState(false)
  const [charFocus, setCharFocus] = useState<Characteristic | undefined>()
  useEffect(() => {
    const open = (e: Event) => { setCharFocus((e as CustomEvent<Characteristic | undefined>).detail); setShowCharacteristics(true) }
    window.addEventListener(OPEN_CHARACTERISTICS_EVENT, open)
    return () => window.removeEventListener(OPEN_CHARACTERISTICS_EVENT, open)
  }, [])
  const [showShare, setShowShare] = useState(false)
  const [showIdentity, setShowIdentity] = useState(false)
  // The saved side is applied after mount; the prerendered page uses the default.
  const [sidebarSide, setSidebarSideState] = useState<SidebarSide>('right')

  useEffect(() => {
    const sync = () => setSidebarSideState(getSidebarSide())
    sync()
    window.addEventListener(LAYOUT_SETTINGS_EVENT, sync)
    return () => window.removeEventListener(LAYOUT_SETTINGS_EVENT, sync)
  }, [])
  const sidebarLeft = sidebarSide === 'left'

  function resetBuild() {
    reset()
    clearHistory()
    // useBuildUrl skips updating the URL once selectedClass is null (nothing
    // to encode), so without this the old ?b=... stays stuck in the address
    // bar even though the build itself was reset.
    navigate(routerLocation.pathname, { replace: true })
  }

  const navToLangPath = (path: string) => {
    const lang     = i18n.language.slice(0, 2)
    const langPath = lang === 'en' ? '' : `${lang}/`
    navigate(`/${langPath}${path}`)
  }

  const compareActive  = useCompareStore(s => s.active)
  const toggleCompare  = useCompareStore(s => s.toggle)
  const refreshCompare = useCompareStore(s => s.refreshStats)
  const comparePanelRef = useRef<HTMLDivElement>(null)

  useBuildUrl()
  useCompareUrl()
  useHistory()
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, '')

  // `?class=iop` preselects a class on load — lets About's class list (and
  // any external link) land someone straight into a real starting point
  // instead of a bare empty planner. Skipped once a build is already
  // underway (`?b=` or a class already picked) so it never clobbers one.
  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search)
    const classParam = params.get('class')
    if (!classParam || params.get('b') || hasClass) return
    if ((DOFUS_CLASSES as readonly string[]).includes(classParam)) {
      setClass(classParam as DofusClass)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately mount-only, mirrors useBuildUrl's `?b=` parser
  }, [])

  // Scroll to the compare panel whenever it becomes active — covers both a
  // manual toggle click and a shared compare link (?c=...) auto-activating
  // it once useCompareUrl finishes loading Build B.
  const wasCompareActive = useRef(false)
  useEffect(() => {
    if (compareActive && !wasCompareActive.current) {
      setTimeout(() => comparePanelRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }), 50)
    }
    wasCompareActive.current = compareActive
  }, [compareActive])

  useEffect(() => {
    const lang = i18n.language.slice(0, 2)
    const supported = ['en', 'es', 'fr', 'pt']
    load(supported.includes(lang) ? lang : 'en')
  }, [load, i18n.language])

  // Refresh compare stats when equipment data changes (language switch)
  const _compEquip = useDataStore(s => s.equipment)
  const _compSets  = useDataStore(s => s.sets)
  useEffect(() => {
    if (_compEquip && _compSets) refreshCompare(_compEquip, _compSets)
  }, [_compEquip, _compSets, refreshCompare])

  // ?set=<id> (a set page's "Try it in the planner") equips the whole set
  // once the catalog has loaded, once: the param is dropped right away so a
  // reload or a shared link never re-equips it over later changes.
  const pendingSetId = useRef<number | null>(null)
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('set')) return
    const id = Number(url.searchParams.get('set'))
    if (Number.isInteger(id) && id > 0 && !url.searchParams.has('b')) pendingSetId.current = id
    url.searchParams.delete('set')
    window.history.replaceState(window.history.state, '', url)
  }, [])
  useEffect(() => {
    const id = pendingSetId.current
    if (id == null || !_compEquip || !_compSets) return
    pendingSetId.current = null
    const set = _compSets.find(s => s.ankama_id === id)
    if (!set) return
    const byId = new Map(_compEquip.map(it => [it.ankama_id, it]))
    const items = set.items.flatMap(itemId => (byId.has(itemId) ? [byId.get(itemId)!] : [])).sort((a, b) => b.level - a.level)
    const assigned = assignSetSlots(items, useBuildStore.getState().equipped)
    if (assigned.length === 0) return
    useBuildStore.getState().equipMultiple(assigned.map(({ slot, item }) => ({ slot, ankama_id: item.ankama_id })))
    useToastStore.getState().addToast(t('set_page_equipped_toast', { name: set.name }))
  }, [_compEquip, _compSets, t])


  function selectTool(tool: WorkshopTool) {
    if (tool === 'sets') return setShowSetsCatalog(true)
    if (tool === 'characteristics') return openCharacteristics()
    if (tool === 'compare') return toggleCompare()
    if (tool === 'share') return setShowShare(true)
    if (tool === 'spells') return setShowSpells(true)
    if (tool === 'pvp') return setShowPvp(true)
    // Until each tool gets its own panel, the bar reaches the one on the page.
    if (!window.matchMedia('(min-width: 1024px)').matches) setActiveTab('equipment')
    setTimeout(() => {
      const target = [...document.querySelectorAll<HTMLElement>(`[data-tool="${tool}"]`)].find(el => el.offsetParent !== null)
      target?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
    }, 60)
  }

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader
        workshop
        brand={<BrandLink onReset={resetBuild} />}
        commands={openSettings => [
          { key: 'my-builds', label: t('my_builds'),         Icon: FolderOpen,  onRun: () => navToLangPath('my-builds') },
          { key: 'explore',   label: t('explore_open'),      Icon: Compass,     onRun: () => navToLangPath('explore') },
          { key: 'publish',   label: publishLabel,           Icon: PublishIcon, disabled: !hasClass, onRun: () => setShowPublish(true) },
          { key: 'optimizer', label: t('optimizer_open'),    Icon: Wand2,       onRun: () => setShowOptimizer(true) },
          { key: 'sets',      label: t('sets_catalog_open'), Icon: Layers,      onRun: () => setShowSetsCatalog(true) },
          { key: 'compare',   label: t('compare'),           Icon: BarChart2,   onRun: toggleCompare },
          { key: 'share',     label: t('tool_share'),        Icon: Share2,      disabled: !hasClass, onRun: () => setShowShare(true) },
          { key: 'undo',      label: t('undo'),               Icon: Undo2,      disabled: !canUndo, onRun: undo },
          { key: 'redo',      label: t('redo'),               Icon: Redo2,      disabled: !canRedo, onRun: redo },
          { key: 'characteristics', label: t('tool_characteristics'), Icon: User, disabled: !hasClass, onRun: () => openCharacteristics() },
          { key: 'identity',  label: t('tool_identity'),      Icon: Settings,   disabled: !hasClass, onRun: () => setShowIdentity(true) },
          { key: 'reset',     label: t('reset_build'),        Icon: RotateCcw,  onRun: resetBuild },
          { key: 'sets-page',  label: t('nav_sets'),          Icon: Library,    onRun: () => navToLangPath('sets') },
          { key: 'how-to-use', label: t('nav_how_to_use'),    Icon: BookOpen,   onRun: () => navToLangPath('how-to-use') },
          { key: 'shortcuts',  label: t('nav_shortcuts'),     Icon: Keyboard,   onRun: () => navToLangPath('shortcuts') },
          { key: 'about',      label: t('nav_about'),         Icon: Info,       onRun: () => navToLangPath('about') },
          ...(isAdmin ? [{ key: 'admin', label: t('admin_nav'), Icon: ShieldCheck, onRun: () => navToLangPath('admin') }] : []),
          { key: 'news',      label: t('changelog_title'),    Icon: Sparkles,   onRun: () => setShowChangelog(true) },
          { key: 'settings',  label: t('settings_title'), Icon: Settings, onRun: openSettings },
          { key: 'theme',     label: t('theme_label_dark') + ' / ' + t('theme_label_light'), Icon: SunMoon, onRun: toggleTheme },
          { key: 'sound',     label: t('sound_mute') + ' / ' + t('sound_unmute'), Icon: Volume2, onRun: toggleSound },
        ]}
      />
      <WorkshopBar
        onForge={() => setShowOptimizer(true)}
        onCompare={toggleCompare}
        compareActive={compareActive}
        onPublish={() => setShowPublish(true)}
        publishLabel={publishLabel}
        PublishIcon={PublishIcon}
        onIdentity={() => setShowIdentity(true)}
        onShare={() => setShowShare(true)}
      />
      <WorkshopIdentity open={showIdentity} onClose={() => setShowIdentity(false)} />
      <Modal open={showCharacteristics} onClose={() => setShowCharacteristics(false)} title={t('tool_characteristics')} size="2xl">
        <div className="p-4 space-y-4"><CombatViewBar /><CharacteristicsPanel focus={charFocus} /></div>
      </Modal>
      <Modal open={showSpells} onClose={() => setShowSpells(false)} title={t('tool_spells')} size="4xl" className="tool-modal">
        {showSpells && <div className="tool-modal-body"><Suspense fallback={null}><SpellsPanel heading={false} /></Suspense></div>}
      </Modal>
      <Modal open={showPvp} onClose={() => setShowPvp(false)} title={t('tool_pvp')} size="4xl" className="tool-modal">
        {showPvp && <div className="tool-modal-body"><Suspense fallback={null}><PvpArena heading={false} /></Suspense></div>}
      </Modal>
      <Modal open={showShare} onClose={() => setShowShare(false)} title={t('tool_share')} size="xl">
        {showShare && <Suspense fallback={null}><SharePanel /></Suspense>}
      </Modal>
      <WorkshopTools onSelect={selectTool} compareActive={compareActive} />
      {hasClass && <div className="lg:hidden"><StatsQuick /></div>}

      {/* Changelog modal */}
      {showChangelog && (
        <Suspense fallback={null}>
          <ChangelogModal onClose={() => setShowChangelog(false)} />
        </Suspense>
      )}

      {/* Optimizer modal — La Forjadora */}
      {showOptimizer && (
        <Suspense fallback={null}>
          <OptimizerModal open={showOptimizer} onClose={() => setShowOptimizer(false)} />
        </Suspense>
      )}

      {/* Sets catalog */}
      {showSetsCatalog && (
        <Suspense fallback={null}>
          <SetsCatalog onClose={() => setShowSetsCatalog(false)} />
        </Suspense>
      )}

      {/* Publish build */}
      {showPublish && (
        <Suspense fallback={null}>
          <PublishModal open={showPublish} onClose={() => setShowPublish(false)} />
        </Suspense>
      )}

      {/* Main content */}
      <main id="main-content" className="px-4 py-6 pb-24 lg:pb-6">
        {/* Mobile: one view at a time (< lg), chosen in the bottom bar */}
        <div className="lg:hidden space-y-4">
          {activeTab === 'equipment' && (
            <>
              {!hasClass && <Frame><ClassPicker /></Frame>}
              <section aria-label={t('equipment')} className="rounded-frame overflow-hidden" style={{ border: '1px solid var(--metal-edge)' }}>
                <EquipmentGrid />
              </section>
            </>
          )}
          {activeTab === 'stats' && (
            <aside aria-label={t('stats')} aria-live="polite" className="space-y-4">
              <CombatViewBar />
              <Frame><StatsPanel /></Frame>
            </aside>
          )}
        </div>

        {/* Desktop: equipment and stats side by side (lg+); the side follows Settings */}
        <div className="hidden lg:grid gap-5 items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col gap-5" style={{ order: sidebarLeft ? 2 : 1 }}>
            <section
              aria-label={t('equipment')}
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--metal-edge)', animation: 'page-rise 520ms var(--ease-out) 0ms both' }}
            >
              <EquipmentGrid />
            </section>
          </div>

          <aside
            aria-label={hasClass ? t('stats') : t('class')}
            aria-live="polite"
            className="sticky top-[76px] max-h-[calc(100vh-88px)] overflow-y-auto space-y-4 pb-4"
            style={{ order: sidebarLeft ? 1 : 2, animation: 'page-rise 520ms var(--ease-out) 60ms both' }}
          >
            {hasClass ? (
              <>
                {/* Applies to the stats below and to the tools, so it sits above them. */}
                <CombatViewBar showEdit />
                <Frame><StatsPanel /></Frame>
              </>
            ) : (
              <Frame><ClassPicker /></Frame>
            )}
          </aside>
        </div>
      </main>

      {/* Mobile bottom bar (< lg) */}
      <WorkshopMobileNav
        view={activeTab}
        onView={setActiveTab}
        onForge={() => setShowOptimizer(true)}
        onCompare={toggleCompare}
        compareActive={compareActive}
        onPublish={() => setShowPublish(true)}
        publishLabel={publishLabel}
        PublishIcon={PublishIcon}
        canPublish={hasClass}
      />

      {/* Compare panel — full width below main grid */}
      {compareActive && (
        <div ref={comparePanelRef} className="px-4 pb-6">
          <Suspense fallback={null}>
            <ComparePanel />
          </Suspense>
        </div>
      )}

      <WorkshopStatus onChangelog={() => setShowChangelog(true)} />
      <SiteFooter />
    </div>
  )
}

export function BuilderPage() {
  const { t } = useTranslation()
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-forge-bg flex items-center justify-center text-forge-muted text-sm">
        {t('loading_data')}
      </div>
    }>
      <BuilderContent />
    </Suspense>
  )
}

export default BuilderPage
