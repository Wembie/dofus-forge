import { useEffect, useRef, useMemo, Suspense, useState, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import i18next from 'i18next'
import { Swords, User, BarChart2, Undo2, Redo2, Wand2, Layers, UploadCloud, Compass, FolderOpen, SunMoon, RotateCcw, Volume2, Settings, Info, BookOpen } from 'lucide-react'
import { HeaderMenuButton } from '@/components/HeaderMenuButton.tsx'
import { CommandPalette } from '@/components/CommandPalette.tsx'
import { SettingsModal } from '@/components/SettingsModal.tsx'
import { toggleTheme } from '@/ui/ThemeToggle.tsx'
import { toggleSound } from '@/lib/sound.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { ClassPicker } from '@/features/class-picker/ClassPicker.tsx'
import { CharacteristicsPanel } from '@/features/characteristics/CharacteristicsPanel.tsx'
import { EquipmentGrid } from '@/features/equipment/EquipmentGrid.tsx'
import { StatsPanel } from '@/features/stats-panel/StatsPanel.tsx'
import { ShareBar } from '@/features/share/ShareBar.tsx'
import { useBuildUrl } from '@/features/share/useBuildUrl.ts'
import { useCompareUrl } from '@/features/share/useCompareUrl.ts'
import { encodeBuild } from '@/features/share/codec.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { useHistoryStore } from '@/store/historyStore.ts'
import { useHistory } from '@/store/useHistory.ts'
import { IconButton, Tabs, Frame, type TabItem } from '@/ui'
import { DOFUS_GAME_VERSION } from '@/data/gameVersion.ts'
import { useCompareStore } from '@/store/compareStore.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { DOFUS_CLASSES, type DofusClass } from '@/engine/types.ts'

// Lazy: none of these are needed for the initial paint (spells/compare
// only render after a class is picked / compare mode is toggled; the
// modals only mount on click) — keeps them out of the eager bundle.
const SpellsPanel     = lazy(() => import('@/features/spells/SpellsPanel.tsx').then(m => ({ default: m.SpellsPanel })))
const ComparePanel    = lazy(() => import('@/features/compare/ComparePanel.tsx').then(m => ({ default: m.ComparePanel })))
const ChangelogModal  = lazy(() => import('@/features/changelog/ChangelogModal.tsx').then(m => ({ default: m.ChangelogModal })))
const OptimizerModal  = lazy(() => import('@/features/optimizer/OptimizerModal.tsx').then(m => ({ default: m.OptimizerModal })))
const AuthButton      = lazy(() => import('@/features/auth/AuthButton.tsx').then(m => ({ default: m.AuthButton })))
const SetsCatalog     = lazy(() => import('@/features/equipment/SetsCatalog.tsx').then(m => ({ default: m.SetsCatalog })))
const PublishModal    = lazy(() => import('@/features/publish/PublishModal.tsx').then(m => ({ default: m.PublishModal })))

type MobileTab = 'equipment' | 'character' | 'stats'

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
    const langPath = lang === 'en' ? '' : `${lang}/`
    return `${location.origin}${import.meta.env.BASE_URL}${langPath}?b=${encoded}`
  }, [buildState, i18n.language])

  return (
    <a
      href={brandHref}
      className="flex items-center gap-2 flex-shrink-0"
      style={{ textDecoration: 'none', cursor: 'pointer' }}
      onClick={e => {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onReset()
      }}
      title={t('reset_build')}
    >
      {/* Diamond accent */}
      <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
        <path d="M5 0 L10 5 L5 10 L0 5Z" fill="var(--gold)" opacity="0.9" />
      </svg>
      <h1
        className="font-display font-bold tracking-[0.18em] uppercase"
        style={{
          fontSize:   '0.82rem',
          color:      'var(--gold)',
          textShadow: '0 0 32px rgba(201,162,75,0.5), 0 1px 0 rgba(0,0,0,0.8)',
          letterSpacing: '0.2em',
        }}
      >
        {t('app_title')}
      </h1>
    </a>
  )
}

function BuilderContent() {
  const { t, i18n } = useTranslation()
  const navigate       = useNavigate()
  const routerLocation = useLocation()  // basename-relative pathname, unlike window.location used below for brandHref's absolute URL
  const hasClass  = useBuildStore(s => s.selectedClass !== null)
  const setClass  = useBuildStore(s => s.setClass)
  const [activeTab, setActiveTab] = useState<MobileTab>('equipment')
  const load      = useDataStore(s => s.load)
  const loading   = useDataStore(s => s.loading)
  const error     = useDataStore(s => s.error)
  const canUndo   = useHistoryStore(s => s.canUndo)
  const canRedo   = useHistoryStore(s => s.canRedo)
  const undo      = useHistoryStore(s => s.undo)
  const redo      = useHistoryStore(s => s.redo)
  const reset        = useBuildStore(s => s.reset)
  const clearHistory = useHistoryStore(s => s.clear)
  const [showChangelog,  setShowChangelog]  = useState(false)
  const [showOptimizer,  setShowOptimizer]  = useState(false)
  const [showSetsCatalog, setShowSetsCatalog] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

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
      setTimeout(() => comparePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
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

  const mobileTabItems: TabItem[] = [
    { id: 'equipment', label: t('equipment'), Icon: Swords },
    { id: 'character', label: t('character'), Icon: User },
    { id: 'stats',     label: t('stats'),     Icon: BarChart2 },
  ]

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{
          height:       52,
          background:   'linear-gradient(to bottom, var(--surface-stone), var(--surface-void))',
          borderBottom: '1px solid var(--metal-edge)',
          boxShadow:    '0 1px 0 color-mix(in srgb, var(--gold) 10%, transparent), 0 4px 28px rgba(0,0,0,0.65)',
        }}
      >
        <div className="px-3 sm:px-6 h-full flex items-center gap-2 sm:gap-4">
          <a href="#main-content" className="skip-link">{t('skip_to_main')}</a>

          {/* Brand — left-click resets, right-click/middle-click opens new tab with current build */}
          <BrandLink onReset={resetBuild} />
          <button
            onClick={() => setShowChangelog(true)}
            className="font-mono text-[9px] hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors"
            style={{
              color:      'var(--ink-faint)',
              background: 'var(--surface-void)',
              border:     '1px solid var(--metal-edge)',
              flexShrink: 0,
            }}
            title={t('open_changelog')}
          >
            <span>v{__APP_VERSION__}</span>
            <span style={{ color: 'var(--metal-edge)' }}>·</span>
            <span style={{ color: 'color-mix(in srgb, var(--gold) 55%, var(--ink-faint))' }}>Dofus {DOFUS_GAME_VERSION}</span>
          </button>

          {/* Status indicators */}
          {loading && (
            <span className="text-[11px] font-mono animate-pulse hidden lg:inline" style={{ color: 'var(--ink-faint)' }} role="status" aria-live="polite">
              {t('loading_data')}
            </span>
          )}
          {error && (
            <span className="text-[11px]" role="alert" style={{ color: 'var(--negative)' }}>{t('error_loading')}</span>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <IconButton label={t('settings_title')} variant="subtle" size="md" onClick={() => setShowSettings(true)}>
              <Settings size={14} />
            </IconButton>
            {/* Divider — hidden on mobile */}
            <div className="hidden lg:block w-px h-5 mx-1" style={{ background: 'var(--metal-edge)' }} />
            {/* Undo / Redo — hidden on mobile */}
            <IconButton
              label={t('undo')}
              variant="subtle"
              size="md"
              onClick={undo}
              disabled={!canUndo}
              title={t('undo_title')}
              className="hidden lg:flex"
            >
              <Undo2 size={14} />
            </IconButton>
            <IconButton
              label={t('redo')}
              variant="subtle"
              size="md"
              onClick={redo}
              disabled={!canRedo}
              title={t('redo_title')}
              className="hidden lg:flex"
            >
              <Redo2 size={14} />
            </IconButton>
            {/* La Forjadora — optimizer — hidden on mobile */}
            <button
              onClick={() => setShowOptimizer(true)}
              title={t('optimizer_open')}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border"
              style={{
                background:  'transparent',
                borderColor: 'var(--metal-edge)',
                color:       'var(--ink-faint)',
              }}
            >
              <Wand2 size={13} />
              <span className="hidden lg:inline">{t('optimizer_open')}</span>
            </button>
            {/* Sets catalog — hidden on mobile */}
            <button
              onClick={() => setShowSetsCatalog(true)}
              title={t('sets_catalog_open')}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border"
              style={{
                background:  'transparent',
                borderColor: 'var(--metal-edge)',
                color:       'var(--ink-faint)',
              }}
            >
              <Layers size={13} />
              <span className="hidden lg:inline">{t('sets_catalog_open')}</span>
            </button>
            {/* Explore public builds — hidden on mobile */}
            <button
              onClick={() => navToLangPath('explore')}
              title={t('explore_open')}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border"
              style={{ background: 'transparent', borderColor: 'var(--metal-edge)', color: 'var(--ink-faint)' }}
            >
              <Compass size={13} />
              <span className="hidden lg:inline">{t('explore_open')}</span>
            </button>
            {/* My builds — hidden on mobile */}
            <button
              onClick={() => navToLangPath('my-builds')}
              title={t('my_builds')}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border"
              style={{ background: 'transparent', borderColor: 'var(--metal-edge)', color: 'var(--ink-faint)' }}
            >
              <FolderOpen size={13} />
              <span className="hidden lg:inline">{t('my_builds')}</span>
            </button>
            {/* Publish current build — hidden on mobile */}
            <button
              onClick={() => setShowPublish(true)}
              disabled={!hasClass}
              title={t('publish_open')}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border disabled:opacity-30"
              style={{ background: 'transparent', borderColor: 'var(--metal-edge)', color: 'var(--ink-faint)' }}
            >
              <UploadCloud size={13} />
              <span className="hidden lg:inline">{t('publish_open')}</span>
            </button>
            {/* Compare toggle — hidden on mobile */}
            <button
              onClick={toggleCompare}
              title={t('compare_mode')}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border"
              style={compareActive ? {
                background:  'color-mix(in srgb, var(--gold) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--gold) 45%, transparent)',
                color:       'var(--gold)',
              } : {
                background:  'transparent',
                borderColor: 'var(--metal-edge)',
                color:       'var(--ink-faint)',
              }}
            >
              <span>⚖</span>
              <span className="hidden lg:inline">{t('compare')}</span>
            </button>
            {/* Divider — hidden on mobile */}
            <div className="hidden lg:block w-px h-5 mx-1" style={{ background: 'var(--metal-edge)' }} />
            {/* Mobile/tablet fallback — everything above is hidden below lg with no other way to reach it */}
            <HeaderMenuButton
              className="lg:hidden"
              items={[
                { key: 'my-builds',  label: t('my_builds'),         Icon: FolderOpen, onClick: () => navToLangPath('my-builds') },
                { key: 'explore',    label: t('explore_open'),      Icon: Compass,    onClick: () => navToLangPath('explore') },
                { key: 'publish',    label: t('publish_open'),      Icon: UploadCloud, disabled: !hasClass, onClick: () => setShowPublish(true) },
                { key: 'optimizer',  label: t('optimizer_open'),    Icon: Wand2,      onClick: () => setShowOptimizer(true) },
                { key: 'sets',       label: t('sets_catalog_open'), Icon: Layers,     onClick: () => setShowSetsCatalog(true) },
                { key: 'compare',    label: t('compare'),           Icon: BarChart2,  active: compareActive, onClick: toggleCompare },
                { key: 'undo',       label: t('undo'),              Icon: Undo2,      disabled: !canUndo, onClick: undo },
                { key: 'redo',       label: t('redo'),              Icon: Redo2,      disabled: !canRedo, onClick: redo },
                { key: 'how-to-use', label: t('nav_how_to_use'),    Icon: BookOpen,   onClick: () => navToLangPath('how-to-use') },
                { key: 'about',      label: t('nav_about'),         Icon: Info,       onClick: () => navToLangPath('about') },
              ]}
            />
            <Suspense fallback={null}><AuthButton /></Suspense>
            <ShareBar />
          </div>
        </div>
      </header>

      <CommandPalette
        commands={[
          { key: 'my-builds', label: t('my_builds'),         Icon: FolderOpen,  onRun: () => navToLangPath('my-builds') },
          { key: 'explore',   label: t('explore_open'),      Icon: Compass,     onRun: () => navToLangPath('explore') },
          { key: 'publish',   label: t('publish_open'),      Icon: UploadCloud, disabled: !hasClass, onRun: () => setShowPublish(true) },
          { key: 'optimizer', label: t('optimizer_open'),    Icon: Wand2,       onRun: () => setShowOptimizer(true) },
          { key: 'sets',      label: t('sets_catalog_open'), Icon: Layers,      onRun: () => setShowSetsCatalog(true) },
          { key: 'compare',   label: t('compare'),           Icon: BarChart2,   onRun: toggleCompare },
          { key: 'undo',      label: t('undo'),               Icon: Undo2,      disabled: !canUndo, onRun: undo },
          { key: 'redo',      label: t('redo'),               Icon: Redo2,      disabled: !canRedo, onRun: redo },
          { key: 'reset',     label: t('reset_build'),        Icon: RotateCcw,  onRun: resetBuild },
          { key: 'how-to-use', label: t('nav_how_to_use'),    Icon: BookOpen,   onRun: () => navToLangPath('how-to-use') },
          { key: 'about',      label: t('nav_about'),         Icon: Info,       onRun: () => navToLangPath('about') },
          { key: 'settings',  label: t('settings_title'), Icon: Settings, onRun: () => setShowSettings(true) },
          { key: 'theme',     label: t('theme_label_dark') + ' / ' + t('theme_label_light'), Icon: SunMoon, onRun: toggleTheme },
          { key: 'sound',     label: t('sound_mute') + ' / ' + t('sound_unmute'), Icon: Volume2, onRun: toggleSound },
        ]}
      />

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />

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
        {/* Mobile: single active tab panel (< lg) */}
        <div className="lg:hidden">
          {activeTab === 'equipment' && (
            <section aria-label={t('equipment')} className="rounded-frame overflow-hidden" style={{ border: '1px solid var(--metal-edge)' }}>
              <EquipmentGrid />
            </section>
          )}
          {activeTab === 'character' && (
            <aside aria-label={`${t('class')} & ${t('characteristics')}`} className="space-y-4">
              <Frame><ClassPicker /></Frame>
              <Frame><CharacteristicsPanel /></Frame>
              {hasClass && <Frame><Suspense fallback={null}><SpellsPanel /></Suspense></Frame>}
            </aside>
          )}
          {activeTab === 'stats' && (
            <aside aria-label={t('stats')} aria-live="polite">
              <Frame><StatsPanel /></Frame>
            </aside>
          )}
        </div>

        {/* Desktop: 2-column grid (lg+) */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_360px] gap-5 items-start">

          {/* Left: Equipment + Spells stacked */}
          <div className="flex flex-col gap-5">
            <section
              aria-label={t('equipment')}
              className="rounded-xl overflow-hidden"
              style={{
                border:    '1px solid var(--metal-edge)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(0,0,0,0.4)',
                animation: 'col-rise 520ms var(--ease-out) 0ms both',
              }}
            >
              <EquipmentGrid />
            </section>
            {hasClass && (
              <div style={{ animation: 'col-rise 520ms var(--ease-out) 200ms both' }}>
                <Frame padding="lg"><Suspense fallback={null}><SpellsPanel /></Suspense></Frame>
              </div>
            )}
          </div>

          {/* Right sidebar: Class + Characteristics + Stats (sticky, scrollable) */}
          <aside
            aria-label={`${t('class')} & ${t('characteristics')} & ${t('stats')}`}
            aria-live="polite"
            className="sticky top-[58px] max-h-[calc(100vh-68px)] overflow-y-auto space-y-4 pb-4"
            style={{ animation: 'col-rise 520ms var(--ease-out) 60ms both' }}
          >
            <Frame><ClassPicker /></Frame>
            <Frame><CharacteristicsPanel /></Frame>
            <Frame material="parchment"><StatsPanel /></Frame>
          </aside>

        </div>
      </main>

      {/* Mobile bottom tab bar (< lg) */}
      <Tabs
        items={mobileTabItems}
        active={activeTab}
        onChange={id => setActiveTab(id as MobileTab)}
        variant="bottom-bar"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      />

      {/* Compare panel — full width below main grid */}
      {compareActive && (
        <div ref={comparePanelRef} className="px-4 pb-6">
          <Suspense fallback={null}>
            <ComparePanel />
          </Suspense>
        </div>
      )}

      <SiteFooter />
    </div>
  )
}

export function BuilderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-forge-bg flex items-center justify-center text-forge-muted text-sm">
        {i18next.t('loading_data')}
      </div>
    }>
      <BuilderContent />
    </Suspense>
  )
}
