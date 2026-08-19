import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/ui/Modal.tsx'
import { useBuildStore, ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { OptimizerConfig, BuildResult, OptimizerProgress, StatConfig } from './types.ts'
import { StatConfigRow } from './StatConfigRow.tsx'
import { StatPicker } from './StatPicker.tsx'
import { BuildResultCard } from './BuildResultCard.tsx'
import { OPTIMIZER_STATS } from './statList.ts'

type Phase = 'config' | 'running' | 'done'

const SLOT_LABEL_KEY: Record<SlotId, string> = {
  hat:       'slot_hat',
  cape:      'slot_cape',
  amulet:    'slot_amulet',
  ring1:     'slot_ring1',
  ring2:     'slot_ring2',
  belt:      'slot_belt',
  boots:     'slot_boots',
  weapon:    'slot_weapon',
  shield:    'slot_shield',
  companion: 'slot_companion',
  sidekick:  'slot_sidekick',
  dofus1:    'slot_dofus1',
  dofus2:    'slot_dofus2',
  dofus3:    'slot_dofus3',
  dofus4:    'slot_dofus4',
  dofus5:    'slot_dofus5',
  dofus6:    'slot_dofus6',
}

function makeDefaultConfig(): OptimizerConfig {
  return {
    stats:       [],
    exo:         { ap: false, mp: false, range: false },
    maxLevel:    200,
    lockedSlots: new Set(),
  }
}

type Props = {
  open:    boolean
  onClose: () => void
}

export function OptimizerModal({ open, onClose }: Props) {
  const { t } = useTranslation()

  const [phase,    setPhase]    = useState<Phase>('config')
  const [config,   setConfig]   = useState<OptimizerConfig>(makeDefaultConfig)
  const [progress, setProgress] = useState<OptimizerProgress | null>(null)
  const [results,  setResults]  = useState<BuildResult[]>([])
  const [error,    setError]    = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)

  const selectedClass = useBuildStore(s => s.selectedClass)
  const level         = useBuildStore(s => s.level)
  const allocated     = useBuildStore(s => s.allocated)
  const scrolled      = useBuildStore(s => s.scrolled)
  const equipped      = useBuildStore(s => s.equipped)
  const setEquipped   = useBuildStore(s => s.setEquipped)
  const equipment     = useDataStore(s => s.equipment)
  const sets          = useDataStore(s => s.sets)

  function handleClose() {
    workerRef.current?.terminate()
    workerRef.current = null
    onClose()
  }

  function startOptimizer() {
    if (!selectedClass) { setError(t('optimizer_no_class')); return }
    if (!equipment || !sets) return
    if (config.stats.length === 0) { setError(t('optimizer_no_stats')); return }
    setError(null)

    const worker = new Worker(
      new URL('../../workers/optimizer.worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent) => {
      const { type } = e.data as { type: string }
      if (type === 'progress') {
        setProgress(e.data as OptimizerProgress)
      } else if (type === 'done') {
        setResults(e.data.results as BuildResult[])
        setPhase('done')
        worker.terminate()
        workerRef.current = null
      } else if (type === 'cancelled') {
        worker.terminate()
        workerRef.current = null
      }
    }

    worker.postMessage({
      type:   'run',
      config: { ...config, lockedSlots: [...config.lockedSlots] },
      items:  equipment,
      sets,
      base:   { selectedClass, level, allocated, scrolled, equipped },
    })

    setPhase('running')
  }

  function cancelOptimizer() {
    workerRef.current?.postMessage({ type: 'cancel' })
    workerRef.current?.terminate()
    workerRef.current = null
    setPhase('config')
    setProgress(null)
  }

  function loadBuild(eq: Partial<Record<SlotId, number>>) {
    setEquipped(eq)
    handleClose()
  }

  function addStat(stat: StatConfig['stat']) {
    setConfig(c => ({ ...c, stats: [...c.stats, { stat, weight: 5, minVal: 0 }] }))
  }
  function updateStat(i: number, updated: StatConfig) {
    setConfig(c => {
      const ss = [...c.stats]; ss[i] = updated; return { ...c, stats: ss }
    })
  }
  function removeStat(i: number) {
    setConfig(c => ({ ...c, stats: c.stats.filter((_, j) => j !== i) }))
  }

  function toggleSlot(slot: SlotId) {
    setConfig(c => {
      const ls = new Set(c.lockedSlots)
      ls.has(slot) ? ls.delete(slot) : ls.add(slot)
      return { ...c, lockedSlots: ls }
    })
  }

  function setAllSlotLock(lock: boolean) {
    setConfig(c => ({ ...c, lockedSlots: lock ? new Set(ALL_SLOTS) : new Set<SlotId>() }))
  }

  const selectedStatKeys = new Set(config.stats.map(s => s.stat))
  const progressPct = progress?.percent ?? 0

  // ── RUNNING ──────────────────────────────────────────────────────────────────
  if (phase === 'running') {
    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="xl">
        <div className="p-10 flex flex-col items-center gap-4 text-center">
          <div
            className="w-10 h-10 rounded-full border-[3px] animate-spin"
            style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
          />
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{t('optimizer_running')}</p>
          {progress && (
            <>
              <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                {t('optimizer_running_slots')}
                {progress.phase === 'search' && (
                  <> — {t('optimizer_search_progress', { current: progress.slotIndex, total: progress.totalSlots })}</>
                )}
              </p>
              <div
                className="w-full max-w-xs rounded-full overflow-hidden"
                style={{ height: 6, background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
              >
                <div
                  className="h-full transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, var(--gold-deep), var(--gold))' }}
                />
              </div>
              <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>{progressPct}%</span>
            </>
          )}
          <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_running_note')}</p>
          <button
            onClick={cancelOptimizer}
            className="mt-2 px-3 py-1.5 rounded-lg text-[11px] border"
            style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
          >
            {t('optimizer_cancel')}
          </button>
        </div>
      </Modal>
    )
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="xl">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
              {t('optimizer_results_found', { n: results.length })}
            </p>
            <button
              onClick={() => { setPhase('config'); setResults([]); setProgress(null) }}
              className="text-[11px] transition-colors"
              style={{ color: 'var(--ink-faint)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-faint)')}
            >
              {t('optimizer_back')}
            </button>
          </div>

          {results.length > 0 && (
            <button
              onClick={() => loadBuild(results[0].equipped)}
              className="w-full py-2.5 rounded-xl font-bold text-[13px] transition-colors"
              style={{
                background: 'color-mix(in srgb, var(--gold) 20%, transparent)',
                border:     '1px solid color-mix(in srgb, var(--gold) 55%, transparent)',
                color:      'var(--gold)',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--gold) 30%, transparent)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--gold) 20%, transparent)'}
            >
              ⚡ {t('optimizer_equip_best')}
            </button>
          )}

          {results.length === 0 ? (
            <p className="text-center py-8 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
              {t('optimizer_no_results')}
            </p>
          ) : (
            results.map((result, i) => (
              <BuildResultCard
                key={i}
                result={result}
                rank={(i + 1) as 1 | 2 | 3}
                items={equipment ?? []}
                stats={config.stats}
                onLoad={loadBuild}
              />
            ))
          )}
        </div>
      </Modal>
    )
  }

  // ── CONFIG ────────────────────────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="xl">
      <div className="p-4 space-y-5 text-[11px]">

        {error && (
          <p
            className="px-3 py-2 rounded-lg"
            style={{
              color:      'var(--negative)',
              background: 'color-mix(in srgb, var(--negative) 10%, transparent)',
              border:     '1px solid color-mix(in srgb, var(--negative) 30%, transparent)',
            }}
          >
            {error}
          </p>
        )}

        {/* ── STATS ── */}
        <section>
          <h3 className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: 'var(--gold)' }}>
            {t('optimizer_stats')}
          </h3>
          <p className="text-[10px] mb-2.5" style={{ color: 'var(--ink-faint)' }}>
            {t('optimizer_stats_hint')}
          </p>

          <div className="space-y-1.5">
            {config.stats.map((cfg, i) => {
              const meta = OPTIMIZER_STATS.find(s => s.key === cfg.stat)
              if (!meta) return null
              return (
                <StatConfigRow
                  key={cfg.stat}
                  meta={meta}
                  item={cfg}
                  onChange={updated => updateStat(i, updated)}
                  onRemove={() => removeStat(i)}
                />
              )
            })}
          </div>

          {config.stats.length === 0 && (
            <p className="text-[10px] italic text-center py-3" style={{ color: 'var(--ink-faint)' }}>
              {t('optimizer_stats_empty')}
            </p>
          )}

          <div className="mt-2.5">
            <StatPicker
              label={t('optimizer_add_stat')}
              excluded={selectedStatKeys}
              onSelect={addStat}
            />
          </div>
        </section>

        {/* ── CONSTRAINTS + SLOTS (two-column) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Left: level + exo */}
          <div className="space-y-4">
            <section>
              <h3 className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: 'var(--gold)' }}>
                {t('optimizer_max_level')}
              </h3>
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--ink-faint)' }}>{t('optimizer_max_level_hint')}</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={config.maxLevel}
                  onChange={e => setConfig(c => ({
                    ...c,
                    maxLevel: Math.max(1, Math.min(200, Number(e.target.value) || 200)),
                  }))}
                  className="w-16 text-right rounded-lg px-2 py-1 outline-none font-mono"
                  style={{
                    background: 'var(--surface-panel)',
                    border:     '1px solid var(--metal-edge)',
                    color:      'var(--ink)',
                  }}
                />
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: 'var(--gold)' }}>
                {t('optimizer_exo')}
              </h3>
              <div className="space-y-1">
                {(['ap', 'mp', 'range'] as const).map(k => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.exo[k]}
                      onChange={e => setConfig(c => ({ ...c, exo: { ...c.exo, [k]: e.target.checked } }))}
                      className="flex-shrink-0"
                    />
                    <span className="font-semibold" style={{ color: 'var(--ink-muted)' }}>
                      {t(`optimizer_exo_${k}`)}
                    </span>
                    <span style={{ color: 'var(--ink-faint)', fontSize: 9 }}>
                      {t(`optimizer_exo_${k}_hint`)}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* Right: slots */}
          <section>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>
                {t('optimizer_slots')}
              </h3>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setAllSlotLock(false)}
                  className="text-[9px] px-1.5 py-0.5 rounded border"
                  style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
                >
                  {t('optimizer_slot_mark_all')}
                </button>
                <button
                  onClick={() => setAllSlotLock(true)}
                  className="text-[9px] px-1.5 py-0.5 rounded border"
                  style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
                >
                  {t('optimizer_slot_clear_all')}
                </button>
              </div>
            </div>
            <p className="text-[9px] mb-1.5" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_slots_hint')}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {ALL_SLOTS.map(slot => (
                <label key={slot} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!config.lockedSlots.has(slot)}
                    onChange={() => toggleSlot(slot)}
                    className="flex-shrink-0"
                  />
                  <span className="text-[10px] truncate" style={{ color: 'var(--ink-muted)' }}>
                    {t(SLOT_LABEL_KEY[slot])}
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* ── FOOTER ── */}
        <div
          className="flex items-center justify-between gap-3 pt-3"
          style={{ borderTop: '1px solid var(--metal-edge)' }}
        >
          <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
            ⏱ {t('optimizer_estimate')}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 rounded-lg border text-[11px]"
              style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
            >
              {t('optimizer_cancel')}
            </button>
            <button
              onClick={startOptimizer}
              className="px-4 py-1.5 rounded-lg font-bold text-[12px]"
              style={{
                background: 'color-mix(in srgb, var(--gold) 20%, transparent)',
                border:     '1px solid color-mix(in srgb, var(--gold) 50%, transparent)',
                color:      'var(--gold)',
              }}
            >
              🔍 {t('optimizer_run')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
