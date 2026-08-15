import { useEffect, Suspense, useState, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import i18next from 'i18next'
import { Swords, User, BarChart2, Undo2, Redo2 } from 'lucide-react'
import { useDataStore } from '@/store/dataStore.ts'
import { ClassPicker } from '@/features/class-picker/ClassPicker.tsx'
import { CharacteristicsPanel } from '@/features/characteristics/CharacteristicsPanel.tsx'
import { EquipmentGrid } from '@/features/equipment/EquipmentGrid.tsx'
import { StatsPanel } from '@/features/stats-panel/StatsPanel.tsx'
import { ShareBar } from '@/features/share/ShareBar.tsx'
import { useBuildUrl } from '@/features/share/useBuildUrl.ts'
import { ThemeToggle } from '@/ui/ThemeToggle.tsx'
import { LanguageSwitcher } from '@/ui/LanguageSwitcher.tsx'
import { SpellsPanel } from '@/features/spells/SpellsPanel.tsx'
import { useBuildStore } from '@/store/buildStore.ts'
import { useHistoryStore } from '@/store/historyStore.ts'
import { useHistory } from '@/store/useHistory.ts'
import { IconButton, Tabs, Frame, type TabItem } from '@/ui'
import { DOFUS_GAME_VERSION } from '@/data/changelog.ts'
const ChangelogModal = lazy(() => import('@/features/changelog/ChangelogModal.tsx').then(m => ({ default: m.ChangelogModal })))

type MobileTab = 'equipment' | 'character' | 'stats'

function BuilderContent() {
  const { t, i18n } = useTranslation()
  const hasClass  = useBuildStore(s => s.selectedClass !== null)
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
  const [showChangelog, setShowChangelog] = useState(false)

  useBuildUrl()
  useHistory()

  useEffect(() => {
    const lang = i18n.language.slice(0, 2)
    const supported = ['en', 'es', 'fr', 'pt']
    load(supported.includes(lang) ? lang : 'en')
  }, [load, i18n.language])

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
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center gap-4">
          <a href="#main-content" className="skip-link">{t('skip_to_main')}</a>

          {/* Brand — click to reset build */}
          <button
            className="flex items-center gap-2 flex-shrink-0"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            onClick={() => { reset(); clearHistory() }}
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
          </button>
          <button
            onClick={() => setShowChangelog(true)}
            className="font-mono text-[9px] hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors"
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
            <span className="text-[11px] font-mono animate-pulse hidden sm:inline" style={{ color: 'var(--ink-faint)' }} role="status" aria-live="polite">
              {t('loading_data')}
            </span>
          )}
          {error && (
            <span className="text-[11px]" role="alert" style={{ color: 'var(--negative)' }}>{t('error_loading')}</span>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
            {/* Divider */}
            <div className="w-px h-5 mx-1" style={{ background: 'var(--metal-edge)' }} />
            <IconButton
              label={t('undo')}
              variant="subtle"
              size="md"
              onClick={undo}
              disabled={!canUndo}
              title={t('undo_title')}
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
            >
              <Redo2 size={14} />
            </IconButton>
            {/* Divider */}
            <div className="w-px h-5 mx-1" style={{ background: 'var(--metal-edge)' }} />
            <ShareBar />
          </div>
        </div>
      </header>

      {/* Changelog modal */}
      {showChangelog && (
        <Suspense fallback={null}>
          <ChangelogModal onClose={() => setShowChangelog(false)} />
        </Suspense>
      )}

      {/* Main content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-6">
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
              {hasClass && <Frame><SpellsPanel /></Frame>}
            </aside>
          )}
          {activeTab === 'stats' && (
            <aside aria-label={t('stats')} aria-live="polite">
              <Frame><StatsPanel /></Frame>
            </aside>
          )}
        </div>

        {/* Desktop: 2-column grid (lg+) */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_300px] gap-5 items-start">

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
                <Frame padding="lg"><SpellsPanel /></Frame>
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

      <footer className="border-t border-forge-border mt-8 py-4 px-4 text-center space-y-1.5">
        <p className="text-[10px] text-ink-faint max-w-xl mx-auto">
          {t('disclaimer')}
        </p>
        <p className="text-[10px] max-w-xl mx-auto flex flex-wrap justify-center gap-x-4 gap-y-0.5" style={{ color: 'var(--ink-faint)' }}>
          <span><span style={{ color: 'var(--ink-muted)' }}>{t('credits_server')}: </span>Tal Kasha</span>
          <span><span style={{ color: 'var(--ink-muted)' }}>{t('credits_creator')}: </span>Juan / Wembie</span>
          <span><span style={{ color: 'var(--ink-muted)' }}>{t('credits_ingame')}: </span>Raik-Luck</span>
        </p>
      </footer>
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
