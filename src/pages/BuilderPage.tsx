import { useEffect } from 'react'
import { useDataStore } from '@/store/dataStore.ts'
import { ClassPicker } from '@/features/class-picker/ClassPicker.tsx'
import { CharacteristicsPanel } from '@/features/characteristics/CharacteristicsPanel.tsx'
import { EquipmentGrid } from '@/features/equipment/EquipmentGrid.tsx'
import { StatsPanel } from '@/features/stats-panel/StatsPanel.tsx'

export function BuilderPage() {
  const load    = useDataStore(s => s.load)
  const loading = useDataStore(s => s.loading)
  const error   = useDataStore(s => s.error)

  useEffect(() => {
    load('en')
  }, [load])

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      {/* Header */}
      <header className="border-b border-forge-border bg-forge-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="font-display text-forge-gold text-xl font-bold tracking-wide">Dofus Forge</h1>
          <span className="text-forge-muted/40 text-xs font-mono">v{__APP_VERSION__}</span>
          {loading && (
            <span className="ml-auto text-forge-muted text-xs animate-pulse">Loading data…</span>
          )}
          {error && (
            <span className="ml-auto text-red-400 text-xs">Error loading data</span>
          )}
        </div>
      </header>

      {/* Main 3-column layout */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_240px] gap-6">
          {/* Left: Class + Characteristics */}
          <aside className="space-y-6">
            <div className="bg-forge-surface rounded-xl border border-forge-border p-4">
              <ClassPicker />
            </div>
            <div className="bg-forge-surface rounded-xl border border-forge-border p-4">
              <CharacteristicsPanel />
            </div>
          </aside>

          {/* Center: Equipment */}
          <section className="bg-forge-surface rounded-xl border border-forge-border p-4">
            <EquipmentGrid />
          </section>

          {/* Right: Stats */}
          <aside className="bg-forge-surface rounded-xl border border-forge-border p-4 overflow-y-auto max-h-[calc(100vh-120px)] sticky top-20">
            <StatsPanel />
          </aside>
        </div>
      </main>

      {/* Footer disclaimer */}
      <footer className="border-t border-forge-border mt-8 py-4 px-4 text-center">
        <p className="text-[10px] text-forge-muted/40 max-w-xl mx-auto">
          Unofficial fan tool. Dofus and all related assets are property of Ankama Games.
          No affiliation with Ankama.
        </p>
      </footer>
    </div>
  )
}
