import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/ui/Modal.tsx'
import { useBuildStore, ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { OptimizerConfig, BuildResult, OptimizerProgress, StatWeight, StatRequired } from './types.ts'
import { StatWeightRow } from './StatWeightRow.tsx'
import { StatRequiredRow } from './StatRequiredRow.tsx'
import { StatPicker } from './StatPicker.tsx'
import { BuildResultCard } from './BuildResultCard.tsx'

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
    weights:     [],
    required:    [],
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
    if (config.weights.length === 0) { setError(t('optimizer_no_weights')); return }
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

  // Config state helpers
  function addWeight(stat: StatWeight['stat']) {
    setConfig(c => ({ ...c, weights: [...c.weights, { stat, weight: 5 }] }))
  }
  function updateWeight(i: number, weight: number) {
    setConfig(c => {
      const ws = [...c.weights]; ws[i] = { ...ws[i], weight }; return { ...c, weights: ws }
    })
  }
  function removeWeight(i: number) {
    setConfig(c => ({ ...c, weights: c.weights.filter((_, j) => j !== i) }))
  }

  function addRequired(stat: StatRequired['stat']) {
    setConfig(c => ({ ...c, required: [...c.required, { stat, minVal: 0 }] }))
  }
  function updateRequired(i: number, minVal: number) {
    setConfig(c => {
      const rs = [...c.required]; rs[i] = { ...rs[i], minVal }; return { ...c, required: rs }
    })
  }
  function removeRequired(i: number) {
    setConfig(c => ({ ...c, required: c.required.filter((_, j) => j !== i) }))
  }

  function toggleSlot(slot: SlotId) {
    setConfig(c => {
      const ls = new Set(c.lockedSlots)
      if (ls.has(slot)) ls.delete(slot); else ls.add(slot)
      return { ...c, lockedSlots: ls }
    })
  }

  function setAllSlotLock(lock: boolean) {
    setConfig(c => ({ ...c, lockedSlots: lock ? new Set(ALL_SLOTS) : new Set<SlotId>() }))
  }

  const weightedKeys  = new Set(config.weights.map(w => w.stat))
  const requiredKeys  = new Set(config.required.map(r => r.stat))
  const progressPct   = progress?.percent ?? 0

  return (
    <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="xl">

      {/* ───── CONFIG ───── */}
      {phase === 'config' && (
        <div className="p-4 space-y-5 text-[11px]">

          {error && (
            <p
              className="px-3 py-2 rounded"
              style={{
                color:      'var(--negative)',
                background: 'color-mix(in srgb, var(--negative) 10%, transparent)',
                border:     '1px solid color-mix(in srgb, var(--negative) 30%, transparent)',
              }}
            >
              {error}
            </p>
          )}

          {/* MAXIMIZAR */}
          <section>
            <h3 className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: 'var(--gold)' }}>
              {t('optimizer_maximize')}
            </h3>
            <p className="text-[10px] mb-2" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_maximize_hint')}</p>
            <div className="space-y-1.5">
              {config.weights.map((w, i) => (
                <StatWeightRow
                  key={`w-${w.stat}-${i}`}
                  item={w}
                  onChange={v => updateWeight(i, v)}
                  onRemove={() => removeWeight(i)}
                />
              ))}
            </div>
            <div className="mt-2">
              <StatPicker label={t('optimizer_add_weight')} excluded={weightedKeys} onSelect={addWeight} />
            </div>
          </section>

          {/* REQUERIDOS */}
          <section>
            <h3 className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: 'var(--gold)' }}>
              {t('optimizer_required')}
            </h3>
            <p className="text-[10px] mb-2" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_required_hint')}</p>
            <div className="space-y-1.5">
              {config.required.map((r, i) => (
                <StatRequiredRow
                  key={`r-${r.stat}-${i}`}
                  item={r}
                  onChange={v => updateRequired(i, v)}
                  onRemove={() => removeRequired(i)}
                />
              ))}
            </div>
            <div className="mt-2">
              <StatPicker label={t('optimizer_add_required')} excluded={requiredKeys} onSelect={addRequired} />
            </div>
          </section>

          {/* EXO */}
          <section>
            <h3 className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: 'var(--gold)' }}>
              {t('optimizer_exo')}
            </h3>
            <p className="text-[10px] mb-2" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_exo_hint')}</p>
            <div className="space-y-1.5">
              {(['ap', 'mp', 'range'] as const).map(k => (
                <label key={k} className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.exo[k]}
                    onChange={e => setConfig(c => ({ ...c, exo: { ...c.exo, [k]: e.target.checked } }))}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <span className="font-semibold" style={{ color: 'var(--ink-muted)' }}>{t(`optimizer_exo_${k}`)}</span>
                    <span style={{ color: 'var(--ink-faint)' }}> — {t(`optimizer_exo_${k}_hint`)}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* NIVEL MÁXIMO */}
          <section>
            <h3 className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: 'var(--gold)' }}>
              {t('optimizer_max_level')}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span style={{ color: 'var(--ink-faint)' }}>{t('optimizer_max_level_hint')}</span>
              <input
                type="number"
                min={1}
                max={200}
                value={config.maxLevel}
                onChange={e => setConfig(c => ({ ...c, maxLevel: Math.max(1, Math.min(200, Number(e.target.value))) }))}
                className="w-16 text-right rounded px-1.5 py-0.5 outline-none"
                style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
              />
            </div>
          </section>

          {/* SLOTS */}
          <section>
            <h3 className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: 'var(--gold)' }}>
              {t('optimizer_slots')}
            </h3>
            <p className="text-[10px] mb-2" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_slots_hint')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mb-2">
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
            <div className="flex gap-2">
              <button
                onClick={() => setAllSlotLock(false)}
                className="text-[10px] px-2 py-0.5 rounded border"
                style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
              >
                {t('optimizer_slot_mark_all')}
              </button>
              <button
                onClick={() => setAllSlotLock(true)}
                className="text-[10px] px-2 py-0.5 rounded border"
                style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
              >
                {t('optimizer_slot_clear_all')}
              </button>
            </div>
          </section>

          {/* Footer: estimate + buttons */}
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
                className="px-3 py-1.5 rounded border"
                style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
              >
                {t('optimizer_cancel')}
              </button>
              <button
                onClick={startOptimizer}
                className="px-4 py-1.5 rounded font-bold"
                style={{
                  background:  'color-mix(in srgb, var(--gold) 18%, transparent)',
                  border:      '1px solid color-mix(in srgb, var(--gold) 45%, transparent)',
                  color:       'var(--gold)',
                }}
              >
                🔍 {t('optimizer_run')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── RUNNING ───── */}
      {phase === 'running' && (
        <div className="p-10 flex flex-col items-center gap-4 text-center">
          <div
            className="w-9 h-9 rounded-full border-[3px] animate-spin"
            style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
          />
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
            {t('optimizer_running')}
          </p>
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
                style={{ height: 5, background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
              >
                <div
                  className="h-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPct}%`, background: 'var(--gold)' }}
                />
              </div>
              <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>{progressPct}%</span>
            </>
          )}
          <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
            {t('optimizer_running_note')}
          </p>
          <button
            onClick={cancelOptimizer}
            className="mt-2 px-3 py-1.5 rounded text-[11px] border"
            style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
          >
            {t('optimizer_cancel')}
          </button>
        </div>
      )}

      {/* ───── DONE ───── */}
      {phase === 'done' && (
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
                weights={config.weights}
                onLoad={loadBuild}
              />
            ))
          )}
        </div>
      )}
    </Modal>
  )
}
