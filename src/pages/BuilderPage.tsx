import { useEffect, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      {/* Header */}
      <header className="border-b border-forge-border bg-forge-surface/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 relative flex-wrap">
          <a href="#main-content" className="skip-link">{t('skip_to_main')}</a>

          <h1 className="font-display text-forge-gold text-xl font-bold tracking-wide">
            {t('app_title')}
          </h1>
          <span className="text-forge-muted/40 text-xs font-mono hidden sm:inline">
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
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="w-7 h-7 rounded flex items-center justify-center text-sm border transition-colors disabled:opacity-20"
              style={{ background: 'var(--forge-surface)', borderColor: 'var(--forge-border)', color: 'var(--forge-muted)' }}
              onMouseEnter={e => { if (canUndo) (e.currentTarget as HTMLButtonElement).style.color = 'var(--forge-text)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--forge-muted)' }}
              aria-label="Undo"
            >↩</button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="w-7 h-7 rounded flex items-center justify-center text-sm border transition-colors disabled:opacity-20"
              style={{ background: 'var(--forge-surface)', borderColor: 'var(--forge-border)', color: 'var(--forge-muted)' }}
              onMouseEnter={e => { if (canRedo) (e.currentTarget as HTMLButtonElement).style.color = 'var(--forge-text)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--forge-muted)' }}
              aria-label="Redo"
            >↪</button>
            <ShareBar />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-6">
        {/* Mobile: single active tab panel (< lg) */}
        <div className="lg:hidden">
          {activeTab === 'equipment' && (
            <section aria-label={t('equipment')} className="rounded-xl border border-forge-border overflow-hidden">
              <EquipmentGrid />
            </section>
          )}
          {activeTab === 'character' && (
            <aside aria-label={`${t('class')} & ${t('characteristics')}`} className="space-y-4">
              <div className="bg-forge-surface rounded-xl border border-forge-border p-4">
                <ClassPicker />
              </div>
              <div className="bg-forge-surface rounded-xl border border-forge-border p-4">
                <CharacteristicsPanel />
              </div>
              {hasClass && (
                <div className="bg-forge-surface rounded-xl border border-forge-border p-4">
                  <SpellsPanel />
                </div>
              )}
            </aside>
          )}
          {activeTab === 'stats' && (
            <aside aria-label={t('stats')} aria-live="polite" className="bg-forge-surface rounded-xl border border-forge-border p-4">
              <StatsPanel />
            </aside>
          )}
        </div>

        {/* Desktop: 3-column grid (lg+) */}
        <div className="hidden lg:grid lg:grid-cols-[280px_1fr_240px] gap-6">
          {/* Left: Class + Characteristics */}
          <aside aria-label={`${t('class')} & ${t('characteristics')}`} className="space-y-4">
            <div className="bg-forge-surface rounded-xl border border-forge-border p-4">
              <ClassPicker />
            </div>
            <div className="bg-forge-surface rounded-xl border border-forge-border p-4">
              <CharacteristicsPanel />
            </div>
          </aside>

          {/* Center: Equipment — dark character screen, no inner padding */}
          <section aria-label={t('equipment')} className="rounded-xl border border-forge-border overflow-hidden">
            <EquipmentGrid />
          </section>

          {/* Right: Stats */}
          <aside
            aria-label={t('stats')}
            aria-live="polite"
            className="bg-forge-surface rounded-xl border border-forge-border p-4 overflow-y-auto max-h-[calc(100vh-120px)] sticky top-20"
          >
            <StatsPanel />
          </aside>
        </div>

        {/* Spells: full-width section below 3-col grid (desktop) */}
        {hasClass && (
          <div className="hidden lg:block mt-6">
            <div className="bg-forge-surface rounded-xl border border-forge-border p-5">
              <SpellsPanel />
            </div>
          </div>
        )}
      </main>

      {/* Mobile bottom tab bar (< lg) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-forge-border"
        style={{ background: 'var(--forge-surface)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Navigation"
      >
        {([ 'equipment', 'character', 'stats' ] as MobileTab[]).map(tab => {
          const label = tab === 'equipment' ? t('equipment') : tab === 'character' ? t('character') : t('stats')
          const icon  = tab === 'equipment' ? '⚔' : tab === 'character' ? '👤' : '📊'
          const active = tab === activeTab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors"
              style={{ color: active ? 'var(--forge-gold)' : 'var(--forge-muted)' }}
              aria-current={active ? 'page' : undefined}
            >
              <span className="text-base leading-none">{icon}</span>
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      <footer className="border-t border-forge-border mt-8 py-4 px-4 text-center space-y-1.5">
        <p className="text-[10px] text-forge-muted/40 max-w-xl mx-auto">
          {t('disclaimer')}
        </p>
        <p className="text-[10px] max-w-xl mx-auto flex flex-wrap justify-center gap-x-4 gap-y-0.5" style={{ color: '#3a4268' }}>
          <span><span style={{ color: '#4a5580' }}>{t('credits_server')}: </span>Tal Kasha</span>
          <span><span style={{ color: '#4a5580' }}>{t('credits_creator')}: </span>Juan / Wembie</span>
          <span><span style={{ color: '#4a5580' }}>{t('credits_ingame')}: </span>Raik-Luck</span>
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
