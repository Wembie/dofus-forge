import { useEffect, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
        className="sticky top-0 z-40 backdrop-blur-sm"
        style={{
          background:   'color-mix(in srgb, var(--surface-panel) 92%, transparent)',
          borderBottom: '1px solid var(--gold-deep)',
          boxShadow:    '0 1px 0 var(--metal-edge), 0 4px 20px rgba(0,0,0,0.45)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 relative flex-wrap">
          <a href="#main-content" className="skip-link">{t('skip_to_main')}</a>

          <h1
            className="font-display text-xl font-bold tracking-wide"
            style={{
              color:      'var(--gold)',
              textShadow: '0 0 24px rgba(201,162,75,0.4), 0 1px 0 rgba(0,0,0,0.6)',
              letterSpacing: '0.06em',
            }}
          >
            {t('app_title')}
          </h1>
          <span className="text-ink-faint text-xs font-mono hidden sm:inline">
            v{__APP_VERSION__}
          </span>

          {loading && (
            <span className="text-forge-muted text-xs animate-pulse" role="status" aria-live="polite">
              {t('loading_data')}
            </span>
          )}
          {error && (
            <span className="text-red-400 text-xs" role="alert">{t('error_loading')}</span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <IconButton
              label="Undo"
              variant="subtle"
              size="md"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={14} />
            </IconButton>
            <IconButton
              label="Redo"
              variant="subtle"
              size="md"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 size={14} />
            </IconButton>
            <ShareBar />
          </div>
        </div>
      </header>

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

        {/* Desktop: 3-column grid (lg+) */}
        <div className="hidden lg:grid lg:grid-cols-[280px_1fr_240px] gap-6">
          {/* Left: Class + Characteristics */}
          <aside aria-label={`${t('class')} & ${t('characteristics')}`} className="space-y-4">
            <Frame><ClassPicker /></Frame>
            <Frame><CharacteristicsPanel /></Frame>
          </aside>

          {/* Center: Equipment */}
          <section aria-label={t('equipment')} className="rounded-frame overflow-hidden" style={{ border: '1px solid var(--metal-edge)' }}>
            <EquipmentGrid />
          </section>

          {/* Right: Stats */}
          <aside aria-label={t('stats')} aria-live="polite" className="overflow-y-auto max-h-[calc(100vh-120px)] sticky top-20">
            <Frame material="parchment"><StatsPanel /></Frame>
          </aside>
        </div>

        {/* Spells: full-width section below 3-col grid (desktop) */}
        {hasClass && (
          <div className="hidden lg:block mt-6">
            <Frame padding="lg"><SpellsPanel /></Frame>
          </div>
        )}
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
        Loading…
      </div>
    }>
      <BuilderContent />
    </Suspense>
  )
}
