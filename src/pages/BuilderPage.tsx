import { useEffect, Suspense } from 'react'
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

function BuilderContent() {
  const { t, i18n } = useTranslation()
  const hasClass = useBuildStore(s => s.selectedClass !== null)
  const load     = useDataStore(s => s.load)
  const loading = useDataStore(s => s.loading)
  const error   = useDataStore(s => s.error)

  useBuildUrl()

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
            <ShareBar />
          </div>
        </div>
      </header>

      {/* Main 3-column layout */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_240px] gap-4 lg:gap-6">
          {/* Left: Class + Characteristics */}
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

          {/* Center: Equipment — dark character screen, no inner padding */}
          <section aria-label={t('equipment')} className="rounded-xl border border-forge-border overflow-hidden">
            <EquipmentGrid />
          </section>

          {/* Right: Stats */}
          <aside
            aria-label={t('stats')}
            aria-live="polite"
            className="bg-forge-surface rounded-xl border border-forge-border p-4 lg:overflow-y-auto lg:max-h-[calc(100vh-120px)] lg:sticky lg:top-20"
          >
            <StatsPanel />
          </aside>
        </div>
      </main>

      <footer className="border-t border-forge-border mt-8 py-4 px-4 text-center">
        <p className="text-[10px] text-forge-muted/40 max-w-xl mx-auto">
          {t('disclaimer')}
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
