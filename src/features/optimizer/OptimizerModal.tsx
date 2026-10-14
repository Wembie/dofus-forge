import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Lock, Hammer } from 'lucide-react'
import { Modal } from '@/ui/Modal.tsx'
import { useBuildStore, ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { ClassPicker } from '@/features/class-picker/ClassPicker.tsx'
import type { OptimizerConfig, BuildResult, OptimizerProgress, StatConfig } from './types.ts'
import type { OptimizerStatKey } from './types.ts'
import type { OptimizerStatMeta } from './statList.ts'
import { BuildResultCard } from './BuildResultCard.tsx'
import { OPTIMIZER_STATS } from './statList.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { CHARACTERISTICS } from '@/engine/types.ts'

type Phase = 'locked' | 'config' | 'running' | 'done'

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

type StatGroupDef = { key: string; tKey: string; defaultOpen: boolean; statKeys: OptimizerStatKey[] }

const STAT_GROUPS: StatGroupDef[] = [
  { key: 'core',       tKey: 'optimizer_group_core',       defaultOpen: true,  statKeys: ['ap', 'mp', 'range', 'maxHp'] },
  { key: 'chars',      tKey: 'optimizer_group_chars',      defaultOpen: true,  statKeys: ['vitality', 'wisdom', 'strength', 'intelligence', 'chance', 'agility', 'power', 'damage'] },
  { key: 'elem_dmg',   tKey: 'optimizer_group_elem_dmg',   defaultOpen: false, statKeys: ['fireDamage', 'earthDamage', 'waterDamage', 'airDamage', 'neutralDamage', 'bestElemDamage'] },
  { key: 'crit',       tKey: 'optimizer_group_crit',       defaultOpen: false, statKeys: ['critChance', 'critDamage', 'critResistance'] },
  { key: 'dmg_pct',    tKey: 'optimizer_group_dmg_pct',    defaultOpen: false, statKeys: ['meleeDamagePercent', 'rangedDamagePercent', 'spellDamagePercent', 'weaponDamagePercent'] },
  { key: 'elem_steal', tKey: 'optimizer_group_elem_steal', defaultOpen: false, statKeys: ['fireSteal', 'earthSteal', 'waterSteal', 'airSteal', 'neutralSteal', 'bestElemSteal'] },
  { key: 'res_fixed',  tKey: 'optimizer_group_res_fixed',  defaultOpen: false, statKeys: ['fireResFixed', 'earthResFixed', 'waterResFixed', 'airResFixed', 'neutralResFixed'] },
  { key: 'res_pct',    tKey: 'optimizer_group_res_pct',    defaultOpen: false, statKeys: ['fireResPercent', 'earthResPercent', 'waterResPercent', 'airResPercent', 'neutralResPercent'] },
  { key: 'combat',     tKey: 'optimizer_group_combat',     defaultOpen: false, statKeys: ['heals', 'initiative', 'lock', 'dodge', 'prospecting', 'summons', 'apReduction', 'mpReduction', 'apParry', 'mpParry', 'pushbackDamage', 'pods'] },
]

const META_MAP = new Map(OPTIMIZER_STATS.map(m => [m.key, m]))

// Rotating flavor text for the running phase - the WASM engine runs as one
// synchronous call with no real incremental progress to report (see
// optimizer.worker.ts), so without this the modal showed a bare spinner
// with zero sign of life for however long the search takes (now
// potentially a couple of minutes for very demanding requests, since the
// search got meaningfully deeper). Cycling through these, keyed off the
// same elapsedSeconds tick already driving the seconds counter, costs no
// extra timer and at least conveys "still working", even without a real
// percentage.
const RUNNING_TIP_KEYS = ['optimizer_tip_1', 'optimizer_tip_2', 'optimizer_tip_3', 'optimizer_tip_4'] as const

const STORAGE_KEY = 'dofus-forge:optimizer-config'

function makeDefaultConfig(): OptimizerConfig {
  return {
    stats:               OPTIMIZER_STATS.map(s => ({ stat: s.key, weight: 0, minVal: 0 })),
    exo:                 { ap: false, mp: false, range: false },
    maxLevel:            200,
    lockedSlots:         new Set(),
    assumeFullyScrolled: false,
  }
}

function loadSavedConfig(): OptimizerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return makeDefaultConfig()
    const parsed = JSON.parse(raw)
    return {
      ...makeDefaultConfig(),
      ...parsed,
      lockedSlots: new Set<SlotId>(parsed.lockedSlots ?? []),
      stats: OPTIMIZER_STATS.map(s => {
        const saved = (parsed.stats as StatConfig[] | undefined)?.find(ss => ss.stat === s.key)
        return saved ?? { stat: s.key, weight: 0, minVal: 0 }
      }),
    }
  } catch {
    return makeDefaultConfig()
  }
}

function persistConfig(config: OptimizerConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...config,
      lockedSlots: [...config.lockedSlots],
    }))
  } catch { /* quota errors ignored */ }
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ meta, cfg, onChange, onWeightChange }: {
  meta:           OptimizerStatMeta
  cfg:            StatConfig
  onChange:       (minVal: number) => void
  onWeightChange: (weight: number) => void
}) {
  const { t } = useTranslation()
  const [raw, setRaw] = useState(cfg.minVal > 0 ? String(cfg.minVal) : '')
  const inputRef = useRef<HTMLInputElement>(null)
  // "Active" (drawn in color) whenever the optimizer cares about this stat at
  // all — a hard minimum, a priority weight, or both; these are independent:
  // weight says how hard to maximize it, minVal is an optional hard floor on
  // top (e.g. "AP, priority 8" vs "AP must be at least 12").
  const isActive = cfg.minVal > 0 || cfg.weight > 0

  const descKey = `${meta.tKey}_desc`

  return (
    <div
      className="relative group rounded-lg p-2 flex flex-col gap-1 cursor-text"
      style={{
        background: isActive
          ? `color-mix(in srgb, ${meta.color} 8%, var(--surface-stone))`
          : 'var(--surface-stone)',
        border: `1px solid ${isActive
          ? `color-mix(in srgb, ${meta.color} 50%, var(--metal-edge))`
          : 'var(--metal-edge)'}`,
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Tooltip */}
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50
                   opacity-0 group-hover:opacity-100 pointer-events-none
                   transition-opacity duration-150 delay-300
                   px-2 py-1.5 rounded text-[10px] leading-snug text-center"
        style={{
          background:  'var(--surface-void)',
          border:      '1px solid var(--metal-edge-strong)',
          color:       'var(--ink-muted)',
          boxShadow:   'var(--shadow-frame)',
          width:       '11rem',
          whiteSpace:  'normal',
        }}
      >
        {t(descKey)}
      </div>

      <div className="flex items-center gap-1 min-w-0">
        <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain flex-shrink-0" />
        <span
          className="text-[10px] font-semibold truncate leading-tight"
          style={{ color: isActive ? meta.color : 'var(--ink-faint)' }}
        >
          {t(meta.tKey)}
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <span className="text-[9px] w-3 text-center flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>≥</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="—"
          value={raw}
          onChange={e => {
            const r = e.target.value.replace(/[^0-9]/g, '')
            setRaw(r)
            onChange(r === '' ? 0 : parseInt(r, 10) || 0)
          }}
          onBlur={() => {
            const n = parseInt(raw, 10)
            if (isNaN(n) || n <= 0) { setRaw(''); onChange(0) }
            else setRaw(String(n))
          }}
          className="flex-1 min-w-0 text-[11px] font-mono text-right rounded px-1 py-0.5 outline-none"
          style={{
            background: isActive
              ? `color-mix(in srgb, ${meta.color} 10%, var(--surface-panel))`
              : 'var(--surface-panel)',
            border: `1px solid ${isActive
              ? `color-mix(in srgb, ${meta.color} 30%, var(--metal-edge))`
              : 'var(--metal-edge)'}`,
            color: isActive ? meta.color : 'var(--ink-muted)',
          }}
          onClick={e => e.stopPropagation()}
        />
      </div>
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()} title={t('optimizer_priority_hint')}>
        <span className="text-[8px] uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>
          {t('optimizer_priority')}
        </span>
        <div className="flex gap-0.5">
          {[2, 4, 6, 8, 10].map(level => {
            const filled = cfg.weight >= level
            return (
              <button
                key={level}
                type="button"
                onClick={() => onWeightChange(cfg.weight === level ? 0 : level)}
                className="rounded-full flex-shrink-0 transition-colors"
                style={{
                  width: 7, height: 7,
                  background: filled ? meta.color : 'var(--surface-panel)',
                  border: `1px solid ${filled ? meta.color : 'var(--metal-edge)'}`,
                }}
                aria-label={t('optimizer_priority_level', { n: level / 2 })}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
type Props = { open: boolean; onClose: () => void }

export function OptimizerModal({ open, onClose }: Props) {
  const { t } = useTranslation()

  const selectedClass = useBuildStore(s => s.selectedClass)

  const [phase,          setPhase]          = useState<Phase>(() => selectedClass ? 'config' : 'locked')
  const [config,         setConfig]         = useState<OptimizerConfig>(loadSavedConfig)
  const [progress,       setProgress]       = useState<OptimizerProgress | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [results,        setResults]        = useState<BuildResult[]>([])
  const [error,          setError]          = useState<string | null>(null)
  const [showSlots,      setShowSlots]      = useState(false)
  const [statResetKey,   setStatResetKey]   = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const cfg = loadSavedConfig()
    const activeStatKeys = new Set(cfg.stats.filter(s => s.minVal > 0 || s.weight > 0).map(s => s.stat))
    return new Set(STAT_GROUPS
      .filter(g => g.defaultOpen || g.statKeys.some(sk => activeStatKeys.has(sk as OptimizerStatKey)))
      .map(g => g.key))
  })
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => { persistConfig(config) }, [config])

  // The WASM engine's deeper search (added after a report that very
  // demanding multi-requirement combos weren't being fully satisfied) can
  // now genuinely take a couple of minutes on a hard request - WASM runs as
  // one synchronous call with no incremental progress (see
  // optimizer.worker.ts), so without this a long wait looked identical to a
  // frozen/crashed tab. A plain ticking counter is enough to signal "still
  // working", independent of whether real progress events ever arrive.
  useEffect(() => {
    if (phase !== 'running') { setElapsedSeconds(0); return }
    const id = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  // Re-lock on every fresh open if the class got cleared since; auto-advance
  // the moment a class is picked from the embedded ClassPicker below so the
  // gate never has to be dismissed manually.
  useEffect(() => {
    if (open && !selectedClass) setPhase('locked')
    else if (open && selectedClass) setPhase(p => p === 'locked' ? 'config' : p)
  }, [open, selectedClass])

  const level         = useBuildStore(s => s.level)
  const allocated     = useBuildStore(s => s.allocated)
  const scrolled      = useBuildStore(s => s.scrolled)
  const equipped      = useBuildStore(s => s.equipped)
  const runes         = useBuildStore(s => s.runes)
  const setEquipped   = useBuildStore(s => s.setEquipped)
  const setAllocated  = useBuildStore(s => s.setAllocated)
  const setScrolled   = useBuildStore(s => s.setScrolled)
  const clearAllRunes = useBuildStore(s => s.clearAllRunes)
  const equipment     = useDataStore(s => s.equipment)
  const sets          = useDataStore(s => s.sets)

  function handleClose() {
    workerRef.current?.terminate()
    workerRef.current = null
    onClose()
  }

  function updateStatMin(statKey: OptimizerStatKey, minVal: number) {
    if (minVal > 0) {
      const group = STAT_GROUPS.find(g => g.statKeys.includes(statKey))
      if (group) setExpandedGroups(s => new Set([...s, group.key]))
    }
    setConfig(c => ({
      ...c,
      // Setting a hard minimum implies "I care about this stat" even before
      // its priority dots are touched, so it defaults weight to a middle
      // value (but stays independently editable afterward — priority and
      // minimum are two different knobs: "maximize this" vs "never go below
      // this"). Clearing the minimum back to empty, though, means "I don't
      // want this stat anymore" — leaving a stale weight behind would show
      // the card as still active with no way to tell why, so it resets too.
      stats: c.stats.map(s => s.stat === statKey
        ? { ...s, minVal, weight: minVal > 0 ? (s.weight === 0 ? 6 : s.weight) : 0 }
        : s
      ),
    }))
  }

  function updateStatWeight(statKey: OptimizerStatKey, weight: number) {
    if (weight > 0) {
      const group = STAT_GROUPS.find(g => g.statKeys.includes(statKey))
      if (group) setExpandedGroups(s => new Set([...s, group.key]))
    }
    setConfig(c => ({ ...c, stats: c.stats.map(s => s.stat === statKey ? { ...s, weight } : s) }))
  }

  function clearAllStats() {
    setConfig(c => ({ ...c, stats: OPTIMIZER_STATS.map(s => ({ stat: s.key, weight: 0, minVal: 0 })) }))
    setStatResetKey(k => k + 1)
    setError(null)
  }

  function toggleGroup(key: string) {
    setExpandedGroups(s => {
      const n = new Set(s)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }

  function toggleSlot(slot: SlotId) {
    setConfig(c => {
      const ls = new Set(c.lockedSlots)
      if (ls.has(slot)) ls.delete(slot)
      else ls.add(slot)
      return { ...c, lockedSlots: ls }
    })
  }

  function setAllSlotLock(lock: boolean) {
    setConfig(c => ({ ...c, lockedSlots: lock ? new Set(ALL_SLOTS) : new Set<SlotId>() }))
  }

  function startOptimizer() {
    if (!selectedClass) { setError(t('optimizer_no_class')); return }
    if (!equipment || !sets) return
    const activeStats = config.stats.filter(s => s.minVal > 0 || s.weight > 0)
    if (activeStats.length === 0) { setError(t('optimizer_no_stats')); return }
    const freeSlots = ALL_SLOTS.filter(s => !config.lockedSlots.has(s))
    if (freeSlots.length === 0) { setError(t('optimizer_no_slots')); return }
    setError(null)
    setProgress(null)

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
      } else if (type === 'error') {
        setError(t('optimizer_wasm_unavailable'))
        setPhase('config')
        worker.terminate()
        workerRef.current = null
      }
    }

    worker.postMessage({
      type:   'run',
      config: { ...config, lockedSlots: [...config.lockedSlots] },
      items:  equipment,
      sets,
      base:   { selectedClass, level, allocated, scrolled, equipped, runes },
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

  function loadBuild(result: BuildResult) {
    setEquipped(result.equipped)
    setAllocated(result.allocated)
    // The optimizer only ever credits LOCKED slots' existing scrolls/runes
    // in what it computed (see runOptimizer's lockedRuneEffects comment) —
    // loading used to leave the sheet's real `scrolled` state and any
    // stale per-slot runes untouched, so the loaded build silently stopped
    // matching the numbers the Forge just promised: "Assume fully scrolled"
    // never actually got applied, and a newly-chosen item for a slot that
    // used to carry forged runes inherited those old runes even though
    // they were never counted for it. Apply the scrolled state the search
    // actually used, and clear runes on every slot that wasn't locked
    // (locked slots keep theirs — same item, same runes, untouched).
    setScrolled(result.scrolled)
    for (const slot of ALL_SLOTS) {
      if (!config.lockedSlots.has(slot)) clearAllRunes(slot)
    }
    handleClose()
  }

  const activeSlots = ALL_SLOTS.length - config.lockedSlots.size
  const progressPct = progress && progress.requirementsTotal > 0
    ? Math.round((progress.requirementsMet / progress.requirementsTotal) * 100)
    : 0

  // "Use this result now": asks the Worker to stop the search at the next
  // opportunity (the WASM callback checks this on its next periodic call,
  // see optimizer.worker.ts) WITHOUT killing the Worker — the search still
  // runs its guaranteed final polish and returns a fully legal result
  // through the normal 'done' path, so this reaches the exact same results
  // screen a completed search would, just earlier.
  function useResultSoFar() {
    workerRef.current?.postMessage({ type: 'cancel' })
  }

  // ── Locked (no class selected yet) ───────────────────────────────────────
  if (phase === 'locked') {
    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
        <div className="p-4 space-y-4">
          <div
            className="flex flex-col items-center gap-2 text-center py-5 rounded-xl"
            style={{
              background: 'color-mix(in srgb, var(--gold) 6%, var(--surface-void))',
              border:     '1px solid color-mix(in srgb, var(--gold) 35%, var(--metal-edge))',
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background: 'color-mix(in srgb, var(--gold) 18%, transparent)',
                border:     '1px solid color-mix(in srgb, var(--gold) 55%, transparent)',
              }}
            >
              <Lock size={18} style={{ color: 'var(--gold)' }} />
            </div>
            <p className="text-[13px] font-bold tracking-wide" style={{ color: 'var(--gold)' }}>
              {t('optimizer_locked_title')}
            </p>
            <p className="text-[11px] max-w-sm" style={{ color: 'var(--ink-faint)' }}>
              {t('optimizer_locked_hint')}
            </p>
          </div>
          <ClassPicker />
        </div>
      </Modal>
    )
  }

  // ── Running ───────────────────────────────────────────────────────────────
  if (phase === 'running') {
    const tipKey = RUNNING_TIP_KEYS[Math.floor(elapsedSeconds / 4) % RUNNING_TIP_KEYS.length]
    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
        <div className="p-6 sm:p-10 flex flex-col items-center gap-4 text-center">
          <div
            className="dofus-aura w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--gold) 10%, var(--surface-stone))', border: '1px solid color-mix(in srgb, var(--gold) 45%, transparent)' }}
          >
            <Hammer size={26} className="animate-bounce" style={{ color: 'var(--gold)' }} />
          </div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
            {t('optimizer_running')} {elapsedSeconds > 0 && `(${elapsedSeconds}s)`}
          </p>
          <p key={tipKey} className="text-[11px]" style={{ color: 'var(--ink-faint)', animation: 'col-rise 420ms var(--ease-out) both' }}>
            {t(tipKey)}
          </p>
          <div
            className="w-full max-w-xs rounded-full overflow-hidden relative"
            style={{ height: 6, background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
          >
            {progress && progress.requirementsTotal > 0 ? (
              <div
                className="h-full transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, var(--gold-deep), var(--gold))' }}
              />
            ) : (
              <div
                className="h-full rounded-full absolute optimizer-indeterminate-bar"
                style={{ width: '40%', background: 'linear-gradient(90deg, var(--gold-deep), var(--gold))' }}
              />
            )}
          </div>
          {progress && progress.requirementsTotal > 0 && (
            <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>
              {t('optimizer_requirements_met', { met: progress.requirementsMet, total: progress.requirementsTotal })}
            </span>
          )}
          {elapsedSeconds > 20 && (
            <p className="text-[10px]" style={{ color: 'var(--gold)' }}>{t('optimizer_running_long_note')}</p>
          )}
          <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_running_note')}</p>

          {progress && (
            <div className="w-full max-w-sm text-left" style={{ animation: 'col-rise 300ms var(--ease-out) both' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 text-center" style={{ color: 'var(--ink-faint)' }}>
                {t('optimizer_live_preview')}
              </p>
              <BuildResultCard
                result={progress.best}
                rank={1}
                items={equipment ?? []}
                stats={config.stats}
                runes={runes}
                lockedSlots={config.lockedSlots}
                onLoad={useResultSoFar}
              />
            </div>
          )}

          <div className="flex items-center gap-2 mt-1">
            {progress && (
              <button
                onClick={useResultSoFar}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                style={{ color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 45%, transparent)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)' }}
              >
                {t('optimizer_use_now')}
              </button>
            )}
            <button
              onClick={cancelOptimizer}
              className="px-3 py-1.5 rounded-lg text-[11px] border"
              style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
            >
              {t('optimizer_cancel')}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
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
              onClick={() => loadBuild(results[0])}
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
                rank={i + 1}
                items={equipment ?? []}
                stats={config.stats}
                runes={runes}
                lockedSlots={config.lockedSlots}
                onLoad={loadBuild}
              />
            ))
          )}
        </div>
      </Modal>
    )
  }

  // ── Config ────────────────────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
      <div className="p-4 space-y-3 text-[11px]">

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

        {/* ── Base build summary — confirms level/points/scrolls are already
             pulled in automatically from the sheet, nothing to configure here ── */}
        <div
          className="rounded-lg px-2.5 py-2 flex flex-wrap items-center gap-x-3 gap-y-1"
          style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
        >
          <span className="text-[9px] uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>
            {t('optimizer_base_summary', { level })}
          </span>
          {CHARACTERISTICS.map(c => {
            const meta = META_MAP.get(c)
            if (!meta) return null
            const value = allocated[c]
            const isScrolled = scrolled[c]
            if (value === 0 && !isScrolled) return null
            return (
              <span key={c} className="flex items-center gap-0.5" title={t(meta.tKey)}>
                <img src={statIconUrl(meta.icon)} alt="" width={11} height={11} className="object-contain" />
                <span className="text-[10px] font-mono font-semibold" style={{ color: meta.color }}>
                  {value}{isScrolled && <span title={t('optimizer_scrolled_hint')}>🧪</span>}
                </span>
              </span>
            )
          })}
        </div>

        {/* ── Top config bar ── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span style={{ color: 'var(--ink-faint)' }}>{t('optimizer_max_level')}:</span>
            <input
              type="number"
              min={1}
              max={200}
              value={config.maxLevel}
              onChange={e => setConfig(c => ({
                ...c,
                maxLevel: Math.max(1, Math.min(200, Number(e.target.value) || 200)),
              }))}
              className="w-14 text-right rounded px-1.5 py-0.5 outline-none font-mono text-[11px]"
              style={{
                background: 'var(--surface-panel)',
                border:     '1px solid var(--metal-edge)',
                color:      'var(--ink)',
              }}
            />
          </div>

          <button
            onClick={() => setShowSlots(s => !s)}
            className="flex items-center gap-1.5 px-2 py-1 rounded border text-[10px]"
            style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
          >
            {t('optimizer_slots')}:
            <span className="font-mono font-bold" style={{ color: 'var(--gold)' }}>{activeSlots}</span>
            <ChevronDown
              size={10}
              style={{
                transform:  showSlots ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s',
              }}
            />
          </button>

          <button
            onClick={clearAllStats}
            className="ml-auto text-[10px] transition-opacity"
            style={{ color: 'var(--negative)', opacity: 0.55 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.55')}
          >
            {t('optimizer_clear_stats')}
          </button>
        </div>

        {/* ── Forgemagia (EXO) ── */}
        <div
          className="rounded-lg p-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5"
          style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
        >
          <span className="text-[10px] font-bold tracking-widest uppercase flex-shrink-0" style={{ color: 'var(--gold)' }}>
            🔨 {t('optimizer_forgemagie')}
          </span>
          <div className="flex items-center gap-3">
            {(['ap', 'mp', 'range'] as const).map(k => (
              <label key={k} className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.exo[k]}
                  onChange={e => setConfig(c => ({ ...c, exo: { ...c.exo, [k]: e.target.checked } }))}
                />
                <span className="font-semibold text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                  {t(`optimizer_exo_${k}`)}
                </span>
              </label>
            ))}
          </div>
          <span className="text-[9px] italic" style={{ color: 'var(--ink-faint)' }}>
            {t('optimizer_forgemagie_hint')}
          </span>
        </div>

        {/* ── Other build assumptions ── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <label className="flex items-center gap-1.5 cursor-pointer select-none" title={t('optimizer_assume_scrolled_hint')}>
            <input
              type="checkbox"
              checked={config.assumeFullyScrolled}
              onChange={e => setConfig(c => ({ ...c, assumeFullyScrolled: e.target.checked }))}
            />
            <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>
              {t('optimizer_assume_scrolled')}
            </span>
          </label>
        </div>

        {/* ── Slots panel ── */}
        {showSlots && (
          <div
            className="rounded-lg p-3 space-y-2"
            style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>
                {t('optimizer_slots')}
              </span>
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
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-0.5">
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
          </div>
        )}

        {/* ── Stat groups ── */}
        <div className="space-y-2">
          {STAT_GROUPS.map(group => {
            const groupCfgs   = group.statKeys.map(k => config.stats.find(s => s.stat === k))
            const activeCount = groupCfgs.filter(c => c && (c.minVal > 0 || c.weight > 0)).length
            const isExpanded  = expandedGroups.has(group.key)

            return (
              <div key={group.key}>
                <button
                  className="w-full flex items-center gap-2 py-1 text-left"
                  onClick={() => toggleGroup(group.key)}
                >
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase flex-shrink-0"
                    style={{ color: 'var(--gold)' }}
                  >
                    {t(group.tKey)}
                  </span>
                  <span className="flex-1 h-px" style={{ background: 'var(--metal-edge)' }} />
                  {activeCount > 0 && (
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                      style={{
                        background: 'color-mix(in srgb, var(--gold) 15%, transparent)',
                        color:      'var(--gold)',
                      }}
                    >
                      {activeCount}
                    </span>
                  )}
                  <ChevronDown
                    size={11}
                    style={{
                      color:      'var(--ink-faint)',
                      transform:  isExpanded ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s',
                      flexShrink: 0,
                    }}
                  />
                </button>

                {isExpanded && (
                  <div
                    className="grid gap-1.5 mt-1"
                    style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
                  >
                    {group.statKeys.map(sk => {
                      const meta = META_MAP.get(sk)
                      const cfg  = config.stats.find(s => s.stat === sk)
                      if (!meta || !cfg) return null
                      return (
                        <StatCard
                          key={`${sk}-${statResetKey}`}
                          meta={meta}
                          cfg={cfg}
                          onChange={minVal => updateStatMin(sk, minVal)}
                          onWeightChange={weight => updateStatWeight(sk, weight)}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between gap-3 pt-2"
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
