import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Lock, Unlock, Play, Pause, RotateCcw, X, Settings2 } from 'lucide-react'
import { Modal } from '@/ui/Modal.tsx'
import { useBuildStore, ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { ClassPicker } from '@/features/class-picker/ClassPicker.tsx'
import type { OptimizerConfig, BuildResult, SolverReport, StatConfig, OptimizerStatKey } from './types.ts'
import type { OptimizerStatMeta } from './statList.ts'
import { BuildResultCard } from './BuildResultCard.tsx'
import { OPTIMIZER_STATS, conditionDefaults } from './statList.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { CHARACTERISTICS } from '@/engine/types.ts'

type Phase = 'locked' | 'config' | 'solving'
type RunState = 'starting' | 'running' | 'paused' | 'finished'

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

const STORAGE_KEY = 'dofus-forge:optimizer-config'
const MAX_THREADS = 8
const DEFAULT_THREADS = Math.min(MAX_THREADS, Math.max(1, Math.floor((globalThis.navigator?.hardwareConcurrency || 8) / 2)))
const HISTORY_POINTS = 240

const emptyStat = (stat: OptimizerStatKey): StatConfig => ({ stat, goal: 0, weight: 0, max: null, absolute: false })
const isActive = (s: StatConfig) => s.goal > 0 || s.weight > 0

function makeDefaultConfig(): OptimizerConfig {
  return {
    stats:               OPTIMIZER_STATS.map(s => emptyStat(s.key)),
    exo:                 { ap: true, mp: true, range: true, onlyOnRing: true, maxCount: 2 },
    maxLevel:            200,
    lockedSlots:         new Set(),
    assumeFullyScrolled: false,
    bannedItems:         [],
    threads:             DEFAULT_THREADS,
    maxGenerations:      2500,
  }
}

// Older saves stored { weight: 1–10, minVal }; the minimum becomes the goal.
function migrateStat(stat: OptimizerStatKey, saved: Record<string, unknown> | undefined): StatConfig {
  if (!saved) return emptyStat(stat)
  if (typeof saved.goal === 'number') {
    return {
      stat,
      goal:     saved.goal,
      weight:   typeof saved.weight === 'number' ? saved.weight : 0,
      max:      typeof saved.max === 'number' ? saved.max : null,
      absolute: saved.absolute === true,
    }
  }
  const minVal = typeof saved.minVal === 'number' ? saved.minVal : 0
  const weight = typeof saved.weight === 'number' ? saved.weight : 0
  if (minVal <= 0 && weight <= 0) return emptyStat(stat)
  return { ...emptyStat(stat), goal: Math.max(0, minVal), weight: conditionDefaults(stat).weight }
}

function loadSavedConfig(): OptimizerConfig {
  const defaults = makeDefaultConfig()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    const savedStats = (parsed.stats ?? []) as Record<string, unknown>[]
    return {
      ...defaults,
      maxLevel:            typeof parsed.maxLevel === 'number' ? parsed.maxLevel : defaults.maxLevel,
      assumeFullyScrolled: parsed.assumeFullyScrolled === true,
      exo:                 { ...defaults.exo, ...(typeof parsed.exo?.onlyOnRing === 'boolean' ? parsed.exo : {}) },
      lockedSlots:         new Set<SlotId>(parsed.lockedSlots ?? []),
      bannedItems:         Array.isArray(parsed.bannedItems) ? parsed.bannedItems : [],
      threads:             typeof parsed.threads === 'number' ? parsed.threads : defaults.threads,
      maxGenerations:      typeof parsed.maxGenerations === 'number' ? parsed.maxGenerations : defaults.maxGenerations,
      stats:               OPTIMIZER_STATS.map(s => migrateStat(s.key, savedStats.find(ss => ss.stat === s.key))),
    }
  } catch {
    return defaults
  }
}

function persistConfig(config: OptimizerConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, lockedSlots: [...config.lockedSlots] }))
  } catch { /* quota errors ignored */ }
}

// Rings and Dofus slots are interchangeable, so they compare as sets.
function fingerprint(r: BuildResult): string {
  const rings = [r.equipped.ring1 ?? 0, r.equipped.ring2 ?? 0].sort((a, b) => a - b)
  const dofus = (['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6'] as SlotId[]).map(s => r.equipped[s] ?? 0).sort((a, b) => a - b)
  const rest = ALL_SLOTS.filter(s => !s.startsWith('ring') && !s.startsWith('dofus')).map(s => r.equipped[s] ?? 0)
  return [...rest, ...rings, ...dofus].join(',')
}

function formatScore(n: number): string {
  return Math.round(n).toLocaleString()
}

const inputStyle = (active: boolean, color: string): CSSProperties => ({
  background: active ? `color-mix(in srgb, ${color} 10%, var(--surface-panel))` : 'var(--surface-panel)',
  border:     `1px solid ${active ? `color-mix(in srgb, ${color} 30%, var(--metal-edge))` : 'var(--metal-edge)'}`,
  color:      active ? color : 'var(--ink-muted)',
})

function NumberField({ value, placeholder, onCommit, color, active, title, max = 100000 }: {
  value:       number | null
  placeholder: string
  onCommit:    (v: number | null) => void
  color:       string
  active:      boolean
  title:       string
  max?:        number
}) {
  const [raw, setRaw] = useState(value == null ? '' : String(value))
  useEffect(() => { setRaw(value == null ? '' : String(value)) }, [value])
  return (
    <input
      type="text"
      inputMode="numeric"
      title={title}
      placeholder={placeholder}
      value={raw}
      onClick={e => e.stopPropagation()}
      onChange={e => setRaw(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={() => {
        const n = parseInt(raw, 10)
        onCommit(isNaN(n) ? null : Math.min(max, n))
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className="w-full min-w-0 text-[11px] font-mono text-right rounded px-1 py-0.5 outline-none"
      style={inputStyle(active, color)}
    />
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ meta, cfg, onChange }: {
  meta:     OptimizerStatMeta
  cfg:      StatConfig
  onChange: (next: StatConfig) => void
}) {
  const { t } = useTranslation()
  const active = isActive(cfg)

  function activate() {
    if (active) return
    const d = conditionDefaults(meta.key)
    onChange({ ...cfg, goal: d.goal, weight: d.weight, max: d.max ?? null, absolute: false })
  }

  return (
    <div
      className="relative group rounded-lg p-2 flex flex-col gap-1"
      style={{
        cursor:     active ? 'default' : 'pointer',
        background: active ? `color-mix(in srgb, ${meta.color} 8%, var(--surface-stone))` : 'var(--surface-stone)',
        border:     `1px solid ${active ? `color-mix(in srgb, ${meta.color} 50%, var(--metal-edge))` : 'var(--metal-edge)'}`,
      }}
      onClick={activate}
      title={active ? undefined : t('optimizer_activate_hint')}
    >
      <div className="flex items-center gap-1 min-w-0">
        <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain flex-shrink-0" />
        <span
          className="text-[10px] font-semibold truncate leading-tight flex-1"
          style={{ color: active ? meta.color : 'var(--ink-faint)' }}
          title={t(`${meta.tKey}_desc`)}
        >
          {t(meta.tKey)}
        </span>
        {active && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(emptyStat(meta.key)) }}
            className="flex-shrink-0 opacity-50 hover:opacity-100"
            title={t('optimizer_clear_condition')}
            aria-label={t('optimizer_clear_condition')}
          >
            <X size={10} style={{ color: 'var(--ink-faint)' }} />
          </button>
        )}
      </div>
      {active && (
        <div className="grid gap-1" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <label className="flex flex-col gap-0.5">
            <span className="text-[8px] uppercase tracking-wide" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_goal')}</span>
            <NumberField
              value={cfg.goal}
              placeholder="0"
              title={t('optimizer_goal_hint')}
              color={meta.color}
              active={active}
              onCommit={v => onChange({ ...cfg, goal: v ?? 0 })}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[8px] uppercase tracking-wide" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_weight')}</span>
            <NumberField
              value={cfg.weight}
              placeholder="0"
              title={t('optimizer_weight_hint')}
              color={meta.color}
              active={active}
              max={1000}
              onCommit={v => onChange({ ...cfg, weight: v ?? 0 })}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[8px] uppercase tracking-wide flex items-center gap-0.5" style={{ color: 'var(--ink-faint)' }}>
              {t('optimizer_max')}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onChange({ ...cfg, absolute: !cfg.absolute }) }}
                title={cfg.absolute ? t('optimizer_max_absolute_hint') : t('optimizer_max_soft_hint')}
                aria-label={cfg.absolute ? t('optimizer_max_absolute_hint') : t('optimizer_max_soft_hint')}
                aria-pressed={cfg.absolute}
              >
                {cfg.absolute
                  ? <Lock size={8} style={{ color: 'var(--negative)' }} />
                  : <Unlock size={8} style={{ color: 'var(--ink-faint)' }} />}
              </button>
            </span>
            <NumberField
              value={cfg.max}
              placeholder="∞"
              title={cfg.absolute ? t('optimizer_max_absolute_hint') : t('optimizer_max_soft_hint')}
              color={cfg.absolute ? 'var(--negative)' : meta.color}
              active={active && cfg.max != null}
              onCommit={v => onChange({ ...cfg, max: v })}
            />
          </label>
        </div>
      )}
    </div>
  )
}

// ── Score history sparkline ───────────────────────────────────────────────────
function ScoreSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const w = 160, h = 32
  const min = Math.min(...points), max = Math.max(...points)
  const span = max - min || 1
  const coords = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / span) * (h - 4) - 2}`).join(' ')
  const zeroY = min < 0 && max > 0 ? h - ((0 - min) / span) * (h - 4) - 2 : null
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0" aria-hidden="true">
      {zeroY != null && <line x1={0} x2={w} y1={zeroY} y2={zeroY} stroke="var(--metal-edge)" strokeDasharray="2 3" />}
      <polyline points={coords} fill="none" stroke="var(--gold)" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
type Props = { open: boolean; onClose: () => void }

export function OptimizerModal({ open, onClose }: Props) {
  const { t } = useTranslation()

  const selectedClass = useBuildStore(s => s.selectedClass)

  const [phase,          setPhase]          = useState<Phase>(() => selectedClass ? 'config' : 'locked')
  const [runState,       setRunState]       = useState<RunState>('starting')
  const [config,         setConfig]         = useState<OptimizerConfig>(loadSavedConfig)
  const [results,        setResults]        = useState<BuildResult[]>([])
  const [selected,       setSelected]       = useState(0)
  const [generation,     setGeneration]     = useState(0)
  const [history,        setHistory]        = useState<number[]>([])
  const [error,          setError]          = useState<string | null>(null)
  const [showSlots,      setShowSlots]      = useState(false)
  const [showAdvanced,   setShowAdvanced]   = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const cfg = loadSavedConfig()
    const activeKeys = new Set(cfg.stats.filter(isActive).map(s => s.stat))
    return new Set(STAT_GROUPS.filter(g => g.defaultOpen || g.statKeys.some(k => activeKeys.has(k))).map(g => g.key))
  })

  const workersRef     = useRef<Worker[]>([])
  const reportsRef     = useRef<(SolverReport | null)[]>([])
  const pausedRef      = useRef<boolean[]>([])
  const initKeyRef     = useRef<string | null>(null)
  const lastInjectRef  = useRef<string | null>(null)

  useEffect(() => { persistConfig(config) }, [config])
  useEffect(() => () => terminateWorkers(), [])

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
  const setRune       = useBuildStore(s => s.setRune)
  const clearAllRunes = useBuildStore(s => s.clearAllRunes)
  const equipment     = useDataStore(s => s.equipment)
  const sets          = useDataStore(s => s.sets)

  function terminateWorkers() {
    workersRef.current.forEach(w => w.terminate())
    workersRef.current = []
    reportsRef.current = []
    pausedRef.current = []
    initKeyRef.current = null
  }

  function handleClose() {
    terminateWorkers()
    setPhase(selectedClass ? 'config' : 'locked')
    setResults([])
    setHistory([])
    setGeneration(0)
    onClose()
  }

  function updateStat(next: StatConfig) {
    if (isActive(next)) {
      const group = STAT_GROUPS.find(g => g.statKeys.includes(next.stat))
      if (group) setExpandedGroups(s => new Set([...s, group.key]))
    }
    setConfig(c => ({ ...c, stats: c.stats.map(s => s.stat === next.stat ? next : s) }))
  }

  function clearAllStats() {
    setConfig(c => ({ ...c, stats: OPTIMIZER_STATS.map(s => emptyStat(s.key)) }))
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

  function banItem(id: number) {
    setConfig(c => c.bannedItems.includes(id) ? c : { ...c, bannedItems: [...c.bannedItems, id] })
  }

  // Anything that changes what the solver searches forces a fresh start;
  // otherwise Start just resumes the paused population.
  function currentInitKey(): string {
    return JSON.stringify({
      ...config,
      lockedSlots: [...config.lockedSlots],
      base: { level, allocated, scrolled, equipped, runes },
    })
  }

  function onWorkerReport(index: number, report: SolverReport) {
    reportsRef.current[index] = report
    const merged = new Map<string, { result: BuildResult; worker: number }>()
    reportsRef.current.forEach((r, w) => r?.results.forEach(result => {
      const fp = fingerprint(result)
      const existing = merged.get(fp)
      if (!existing || existing.result.score < result.score) merged.set(fp, { result, worker: w })
    }))
    const ranked = [...merged.values()].sort((a, b) => b.result.score - a.result.score).slice(0, 10)
    setResults(ranked.map(r => r.result))
    setGeneration(Math.max(...reportsRef.current.map(r => r?.generation ?? 0)))
    if (index === 0 && ranked.length > 0) {
      const best = ranked[0].result.score
      setHistory(h => {
        const next = [...h, best]
        return next.length > HISTORY_POINTS ? next.filter((_, i) => i % 2 === 0) : next
      })
    }

    // Island migration across Workers: share each new overall best with the
    // other Workers' populations.
    const top = ranked[0]
    if (top) {
      const fp = fingerprint(top.result)
      if (fp !== lastInjectRef.current) {
        lastInjectRef.current = fp
        workersRef.current.forEach((w, i) => {
          if (i !== top.worker) w.postMessage({ type: 'inject', equipped: top.result.equipped })
        })
      }
    }
  }

  function spawnWorkers() {
    if (!equipment || !sets || !selectedClass) return
    terminateWorkers()
    setResults([])
    setHistory([])
    setGeneration(0)
    setSelected(0)
    lastInjectRef.current = null
    initKeyRef.current = currentInitKey()

    const count = Math.max(1, Math.min(MAX_THREADS, config.threads))
    const wireConfig = { ...config, lockedSlots: [...config.lockedSlots] }
    const base = { selectedClass, level, allocated, scrolled, equipped, runes }
    reportsRef.current = Array(count).fill(null)
    pausedRef.current = Array(count).fill(false)
    let ready = 0

    for (let i = 0; i < count; i++) {
      const worker = new Worker(new URL('../../workers/optimizer.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data as { type: string; report?: SolverReport; reachedLimit?: boolean }
        if (msg.type === 'ready') {
          ready++
          if (ready === count) {
            workersRef.current.forEach(w => w.postMessage({ type: 'start' }))
            setRunState('running')
          }
        } else if (msg.type === 'report' && msg.report) {
          onWorkerReport(i, msg.report)
        } else if (msg.type === 'paused') {
          pausedRef.current[i] = true
          if (pausedRef.current.every(Boolean)) setRunState(msg.reachedLimit ? 'finished' : 'paused')
        } else if (msg.type === 'error') {
          setError(t('optimizer_wasm_unavailable'))
          terminateWorkers()
          setPhase('config')
        }
      }
      const seed = crypto.getRandomValues(new Uint32Array(1))[0]
      worker.postMessage({ type: 'init', config: wireConfig, items: equipment, sets, base, seed })
      workersRef.current.push(worker)
    }
    setRunState('starting')
    setPhase('solving')
  }

  function startSolver() {
    if (!selectedClass) { setError(t('optimizer_no_class')); return }
    if (!equipment || !sets) return
    if (!config.stats.some(isActive)) { setError(t('optimizer_no_stats')); return }
    if (ALL_SLOTS.every(s => config.lockedSlots.has(s))) { setError(t('optimizer_no_slots')); return }
    setError(null)

    const canResume = workersRef.current.length > 0 && initKeyRef.current === currentInitKey() && runState !== 'finished'
    if (canResume) {
      pausedRef.current = pausedRef.current.map(() => false)
      workersRef.current.forEach(w => w.postMessage({ type: 'start' }))
      setRunState('running')
      setPhase('solving')
      return
    }
    spawnWorkers()
  }

  function pauseSolver() {
    workersRef.current.forEach(w => w.postMessage({ type: 'stop' }))
  }

  function editConditions() {
    pauseSolver()
    setPhase('config')
  }

  function loadBuild(result: BuildResult) {
    setEquipped(result.equipped)
    setAllocated(result.allocated)
    setScrolled(result.scrolled)
    for (const slot of ALL_SLOTS) {
      if (!config.lockedSlots.has(slot)) clearAllRunes(slot)
    }
    const exoStat = { ap: 'AP', mp: 'MP', range: 'Range' } as const
    for (const [slot, kind] of Object.entries(result.exo) as [SlotId, keyof typeof exoStat][]) {
      setRune(slot, exoStat[kind], 1)
    }
    handleClose()
  }

  const activeSlots = ALL_SLOTS.length - config.lockedSlots.size
  const itemNames = new Map((equipment ?? []).map(it => [it.ankama_id, it.name]))

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

  // ── Solving (running / paused / finished) ─────────────────────────────────
  if (phase === 'solving') {
    const best = results[0]
    const shown = results[Math.min(selected, results.length - 1)]
    const prev = history.length >= 2 ? history[history.length - 2] : null
    const delta = best && prev != null ? best.score - prev : 0
    const running = runState === 'running' || runState === 'starting'
    const statusKey = `optimizer_status_${runState}`

    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
        <div className="p-4 space-y-3 text-[11px]">
          {error && (
            <p className="px-3 py-2 rounded-lg" style={{ color: 'var(--negative)', background: 'color-mix(in srgb, var(--negative) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--negative) 30%, transparent)' }}>
              {error}
            </p>
          )}

          {/* Controls + live score */}
          <div
            className="rounded-lg px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2"
            style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
          >
            <div className="flex items-center gap-1.5">
              {running ? (
                <button
                  onClick={pauseSolver}
                  disabled={runState === 'starting'}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[11px] disabled:opacity-50"
                  style={{ color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 50%, transparent)', background: 'color-mix(in srgb, var(--gold) 15%, transparent)' }}
                >
                  <Pause size={12} /> {t('optimizer_pause')}
                </button>
              ) : (
                <button
                  onClick={runState === 'finished' ? spawnWorkers : startSolver}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[11px]"
                  style={{ color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 50%, transparent)', background: 'color-mix(in srgb, var(--gold) 15%, transparent)' }}
                >
                  <Play size={12} /> {runState === 'finished' ? t('optimizer_restart') : t('optimizer_resume')}
                </button>
              )}
              {runState !== 'finished' && !running && (
                <button
                  onClick={spawnWorkers}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] border"
                  style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)' }}
                  title={t('optimizer_restart')}
                >
                  <RotateCcw size={12} />
                </button>
              )}
              <button
                onClick={editConditions}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] border"
                style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)' }}
              >
                <Settings2 size={12} /> {t('optimizer_edit_conditions')}
              </button>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-mono" style={{ color: 'var(--ink-muted)' }}>
                {t('optimizer_generation', { gen: generation, max: config.maxGenerations })}
              </span>
              <span className="text-[9px]" style={{ color: running ? 'var(--gold)' : 'var(--ink-faint)' }}>
                {t(statusKey)}
              </span>
            </div>

            {best && (
              <div className="flex flex-col">
                <span className="text-[12px] font-mono font-bold" style={{ color: best.score < 0 ? 'var(--negative)' : 'var(--positive, #5cb85c)' }}>
                  {formatScore(best.score)}
                </span>
                <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>
                  {best.score < 0 ? t('optimizer_score_unmet') : t('optimizer_score_weighted')}
                  {delta > 0 && <span style={{ color: 'var(--positive, #5cb85c)' }}> · {t('optimizer_score_delta', { delta: formatScore(delta) })}</span>}
                </span>
              </div>
            )}

            <div className="ml-auto">
              <ScoreSparkline points={history} />
            </div>
          </div>

          {best && best.requirementsTotal > 0 && (
            <p className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>
              {t('optimizer_requirements_met', { met: best.requirementsMet, total: best.requirementsTotal })}
            </p>
          )}
          {generation > 0 && generation < 150 && (
            <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_gens_help')}</p>
          )}

          {/* Alternatives */}
          {results.length > 1 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] mr-1" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_alternatives')}:</span>
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  title={`${t('optimizer_score')}: ${formatScore(r.score)}`}
                  className="w-6 h-6 rounded text-[10px] font-mono font-bold"
                  style={{
                    color:      i === selected ? 'var(--surface-void)' : r.score < 0 ? 'var(--negative)' : 'var(--ink-muted)',
                    background: i === selected ? 'var(--gold)' : 'var(--surface-stone)',
                    border:     '1px solid var(--metal-edge)',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}

          {shown ? (
            <BuildResultCard
              result={shown}
              rank={Math.min(selected, results.length - 1) + 1}
              items={equipment ?? []}
              stats={config.stats}
              runes={runes}
              lockedSlots={config.lockedSlots}
              onLoad={loadBuild}
              onBan={banItem}
              bannedItems={config.bannedItems}
            />
          ) : (
            <p className="text-center py-8 text-[11px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_status_starting')}</p>
          )}
          {workersRef.current.length > 0 && initKeyRef.current !== currentInitKey() && (
            <p className="text-[10px]" style={{ color: 'var(--gold)' }}>{t('optimizer_restart_needed')}</p>
          )}
        </div>
      </Modal>
    )
  }

  // ── Config ────────────────────────────────────────────────────────────────
  const hasPausedRun = workersRef.current.length > 0 && results.length > 0
  return (
    <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
      <div className="p-4 space-y-3 text-[11px]">

        {error && (
          <p className="px-3 py-2 rounded-lg" style={{ color: 'var(--negative)', background: 'color-mix(in srgb, var(--negative) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--negative) 30%, transparent)' }}>
            {error}
          </p>
        )}

        <p className="text-[10px] leading-snug" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_score_help')}</p>

        {/* Base build summary */}
        <div
          className="rounded-lg px-2.5 py-2 flex flex-wrap items-center gap-x-3 gap-y-1"
          style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
        >
          <span className="text-[9px] uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>
            {t('optimizer_base_summary', { level })}
          </span>
          {CHARACTERISTICS.map(c => {
            const meta = META_MAP.get(c)
            if (!meta || !scrolled[c]) return null
            return (
              <span key={c} className="flex items-center gap-0.5" title={t(meta.tKey)}>
                <img src={statIconUrl(meta.icon)} alt="" width={11} height={11} className="object-contain" />
                <span title={t('optimizer_scrolled_hint')}>🧪</span>
              </span>
            )
          })}
          <span className="text-[9px] italic" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_points_auto')}</span>
        </div>

        {/* Top config bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-1.5">
            <span style={{ color: 'var(--ink-faint)' }}>{t('optimizer_max_level')}:</span>
            <input
              type="number"
              min={1}
              max={200}
              value={config.maxLevel}
              onChange={e => setConfig(c => ({ ...c, maxLevel: Math.max(1, Math.min(200, Number(e.target.value) || 200)) }))}
              className="w-14 text-right rounded px-1.5 py-0.5 outline-none font-mono text-[11px]"
              style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
            />
          </label>

          <button
            onClick={() => setShowSlots(s => !s)}
            className="flex items-center gap-1.5 px-2 py-1 rounded border text-[10px]"
            style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
          >
            {t('optimizer_slots')}:
            <span className="font-mono font-bold" style={{ color: 'var(--gold)' }}>{activeSlots}</span>
            <ChevronDown size={10} style={{ transform: showSlots ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          <button
            onClick={() => setShowAdvanced(s => !s)}
            className="flex items-center gap-1.5 px-2 py-1 rounded border text-[10px]"
            style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
          >
            {t('optimizer_advanced')}
            <ChevronDown size={10} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          <label className="flex items-center gap-1.5 cursor-pointer select-none" title={t('optimizer_assume_scrolled_hint')}>
            <input
              type="checkbox"
              checked={config.assumeFullyScrolled}
              onChange={e => setConfig(c => ({ ...c, assumeFullyScrolled: e.target.checked }))}
            />
            <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>{t('optimizer_assume_scrolled')}</span>
          </label>

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

        {/* Forgemagie (exo) */}
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
                <span className="font-semibold text-[10px]" style={{ color: 'var(--ink-muted)' }}>{t(`optimizer_exo_${k}`)}</span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.exo.onlyOnRing}
              onChange={e => setConfig(c => ({ ...c, exo: { ...c.exo, onlyOnRing: e.target.checked } }))}
            />
            <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>{t('optimizer_exo_only_ring')}</span>
          </label>
          <div className="flex items-center gap-1">
            <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_exo_max')}</span>
            {[0, 1, 2, 3].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setConfig(c => ({ ...c, exo: { ...c.exo, maxCount: n } }))}
                className="w-5 h-5 rounded text-[10px] font-mono"
                style={{
                  color:      config.exo.maxCount === n ? 'var(--surface-void)' : 'var(--ink-muted)',
                  background: config.exo.maxCount === n ? 'var(--gold)' : 'var(--surface-stone)',
                  border:     '1px solid var(--metal-edge)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="text-[9px] italic w-full" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_forgemagie_hint')}</span>
        </div>

        {/* Advanced: threads, generations, bans */}
        {showAdvanced && (
          <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label className="flex items-center gap-1.5" title={t('optimizer_threads_hint')}>
                <span style={{ color: 'var(--ink-faint)' }}>{t('optimizer_threads')}:</span>
                <input
                  type="range"
                  min={1}
                  max={MAX_THREADS}
                  value={config.threads}
                  onChange={e => setConfig(c => ({ ...c, threads: Number(e.target.value) }))}
                />
                <span className="font-mono font-bold w-4" style={{ color: 'var(--gold)' }}>{config.threads}</span>
              </label>
              <label className="flex items-center gap-1.5" title={t('optimizer_gens_help')}>
                <span style={{ color: 'var(--ink-faint)' }}>{t('optimizer_max_generations')}:</span>
                <input
                  type="number"
                  min={100}
                  max={10000}
                  step={100}
                  value={config.maxGenerations}
                  onChange={e => setConfig(c => ({ ...c, maxGenerations: Math.max(100, Math.min(10000, Number(e.target.value) || 2500)) }))}
                  className="w-20 text-right rounded px-1.5 py-0.5 outline-none font-mono text-[11px]"
                  style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] mr-1" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_banned_items')}:</span>
              {config.bannedItems.length === 0 && (
                <span className="text-[10px] italic" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_banned_empty')}</span>
              )}
              {config.bannedItems.map(id => (
                <button
                  key={id}
                  onClick={() => setConfig(c => ({ ...c, bannedItems: c.bannedItems.filter(b => b !== id) }))}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]"
                  style={{ background: 'var(--surface-stone)', border: '1px solid var(--metal-edge)', color: 'var(--ink-muted)' }}
                  title={t('optimizer_unban')}
                >
                  {itemNames.get(id) ?? id} <X size={9} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Slots panel */}
        {showSlots && (
          <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>{t('optimizer_slots')}</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setConfig(c => ({ ...c, lockedSlots: new Set<SlotId>() }))}
                  className="text-[9px] px-1.5 py-0.5 rounded border"
                  style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
                >
                  {t('optimizer_slot_mark_all')}
                </button>
                <button
                  onClick={() => setConfig(c => ({ ...c, lockedSlots: new Set(ALL_SLOTS) }))}
                  className="text-[9px] px-1.5 py-0.5 rounded border"
                  style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
                >
                  {t('optimizer_slot_clear_all')}
                </button>
              </div>
            </div>
            <p className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_slots_hint')}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-0.5">
              {ALL_SLOTS.map(slot => (
                <label key={slot} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" checked={!config.lockedSlots.has(slot)} onChange={() => toggleSlot(slot)} className="flex-shrink-0" />
                  <span className="text-[10px] truncate" style={{ color: 'var(--ink-muted)' }}>{t(SLOT_LABEL_KEY[slot])}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Stat groups */}
        <div className="space-y-2">
          {STAT_GROUPS.map(group => {
            const activeCount = group.statKeys.filter(k => { const c = config.stats.find(s => s.stat === k); return c && isActive(c) }).length
            const isExpanded = expandedGroups.has(group.key)
            return (
              <div key={group.key}>
                <button className="w-full flex items-center gap-2 py-1 text-left" onClick={() => toggleGroup(group.key)}>
                  <span className="text-[10px] font-bold tracking-widest uppercase flex-shrink-0" style={{ color: 'var(--gold)' }}>
                    {t(group.tKey)}
                  </span>
                  <span className="flex-1 h-px" style={{ background: 'var(--metal-edge)' }} />
                  {activeCount > 0 && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--gold) 15%, transparent)', color: 'var(--gold)' }}>
                      {activeCount}
                    </span>
                  )}
                  <ChevronDown size={11} style={{ color: 'var(--ink-faint)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                </button>
                {isExpanded && (
                  <div className="grid gap-1.5 mt-1 grid-cols-2 sm:grid-cols-4">
                    {group.statKeys.map(sk => {
                      const meta = META_MAP.get(sk)
                      const cfg = config.stats.find(s => s.stat === sk)
                      if (!meta || !cfg) return null
                      return <StatCard key={sk} meta={meta} cfg={cfg} onChange={updateStat} />
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
          <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>⏱ {t('optimizer_estimate')}</span>
          <div className="flex items-center gap-2">
            {hasPausedRun && (
              <button
                onClick={() => setPhase('solving')}
                className="px-3 py-1.5 rounded-lg border text-[11px]"
                style={{ color: 'var(--ink-muted)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
              >
                {t('optimizer_view_results')}
              </button>
            )}
            <button
              onClick={handleClose}
              className="px-3 py-1.5 rounded-lg border text-[11px]"
              style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
            >
              {t('optimizer_cancel')}
            </button>
            <button
              onClick={startSolver}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg font-bold text-[12px]"
              style={{ background: 'color-mix(in srgb, var(--gold) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 50%, transparent)', color: 'var(--gold)' }}
            >
              <Play size={12} /> {t('optimizer_run')}
            </button>
          </div>
        </div>

      </div>
    </Modal>
  )
}
