import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Lock, Unlock, X, Flame, Hammer, Anvil, RotateCcw, Settings2 } from 'lucide-react'
import { Modal } from '@/ui/Modal.tsx'
import { useBuildStore, ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { ClassPicker } from '@/features/class-picker/ClassPicker.tsx'
import type { OptimizerConfig, BuildResult, ForgeReport, ForgeRequirement, ForgeIntensity, OptimizerStatKey } from './types.ts'
import type { OptimizerStatMeta } from './statList.ts'
import { BuildResultCard } from './BuildResultCard.tsx'
import { OPTIMIZER_STATS, POWER_BOOSTED, IMPORTANCE_LEVELS, DEFAULT_IMPORTANCE, requirementWeight, suggestedCap } from './statList.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { CHARACTERISTICS } from '@/engine/types.ts'

type Phase = 'locked' | 'order' | 'forging' | 'forged'

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
const TOTAL_ISLANDS = 96
const HW = Math.max(1, globalThis.navigator?.hardwareConcurrency || 4)

// How long and how wide the Forge searches. `stall` = generations without a
// better piece before it starts tempering; `capSec` = hard time limit.
const INTENSITY: Record<ForgeIntensity, { threads: number; stall: number; capSec: number; temperMs: number }> = {
  quick:    { threads: Math.min(2, HW),                              stall: 60,  capSec: 30,  temperMs: 1500 },
  standard: { threads: Math.min(8, Math.max(1, Math.floor(HW / 2))), stall: 150, capSec: 120, temperMs: 3000 },
  master:   { threads: Math.min(8, HW),                              stall: 400, capSec: 420, temperMs: 6000 },
}

const emptyReq = (stat: OptimizerStatKey): ForgeRequirement => ({ stat, minimum: 0, importance: 0, cap: null, strictCap: false })
const isActive = (r: ForgeRequirement) => r.minimum > 0 || r.importance > 0

function makeDefaultConfig(): OptimizerConfig {
  return {
    stats:               OPTIMIZER_STATS.map(s => emptyReq(s.key)),
    exo:                 { ap: true, mp: true, range: true, onlyOnRing: true, maxCount: 2 },
    transcendence:       true,
    maxLevel:            200,
    lockedSlots:         new Set(),
    assumeFullyScrolled: false,
    bannedItems:         [],
    intensity:           'standard',
  }
}

// Earlier saves stored { minVal, weight 1–10 } or { goal, weight, max, absolute }.
function migrateReq(stat: OptimizerStatKey, saved: Record<string, unknown> | undefined): ForgeRequirement {
  if (!saved) return emptyReq(stat)
  const num = (k: string) => (typeof saved[k] === 'number' ? saved[k] as number : 0)
  if (typeof saved.importance === 'number') {
    return { stat, minimum: num('minimum'), importance: num('importance'), cap: typeof saved.cap === 'number' ? saved.cap : null, strictCap: saved.strictCap === true }
  }
  const minimum = Math.max(num('goal'), num('minVal'))
  const weight = num('weight')
  if (minimum <= 0 && weight <= 0) return emptyReq(stat)
  return {
    stat,
    minimum,
    importance: DEFAULT_IMPORTANCE,
    cap:        typeof saved.max === 'number' ? saved.max : null,
    strictCap:  saved.absolute === true,
  }
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
      transcendence:       parsed.transcendence !== false,
      exo:                 { ...defaults.exo, ...(typeof parsed.exo?.onlyOnRing === 'boolean' ? parsed.exo : {}) },
      lockedSlots:         new Set<SlotId>(parsed.lockedSlots ?? []),
      bannedItems:         Array.isArray(parsed.bannedItems) ? parsed.bannedItems : [],
      intensity:           parsed.intensity in INTENSITY ? parsed.intensity : defaults.intensity,
      stats:               OPTIMIZER_STATS.map(s => migrateReq(s.key, savedStats.find(ss => ss.stat === s.key))),
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

function toWireConfig(config: OptimizerConfig, islands: number) {
  return {
    stats: config.stats.filter(isActive).map(r => ({
      stat:     r.stat,
      goal:     r.minimum,
      weight:   requirementWeight(r.stat, r.importance > 0 ? r.importance : DEFAULT_IMPORTANCE),
      max:      r.cap,
      absolute: r.strictCap && r.cap != null,
    })),
    exo:                 config.exo,
    maxLevel:            config.maxLevel,
    lockedSlots:         [...config.lockedSlots],
    assumeFullyScrolled: config.assumeFullyScrolled,
    bannedItems:         config.bannedItems,
    bannedTypes:         [],
    transcendence:       config.transcendence,
    islands,
  }
}

// Rings and Dofus slots are interchangeable, so they compare as sets.
function fingerprint(r: BuildResult): string {
  const rings = [r.equipped.ring1 ?? 0, r.equipped.ring2 ?? 0].sort((a, b) => a - b)
  const dofus = (['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6'] as SlotId[]).map(s => r.equipped[s] ?? 0).sort((a, b) => a - b)
  const rest = ALL_SLOTS.filter(s => !s.startsWith('ring') && !s.startsWith('dofus')).map(s => r.equipped[s] ?? 0)
  return [...rest, ...rings, ...dofus].join(',')
}

function mergeResults(reports: (ForgeReport | null)[]): { result: BuildResult; worker: number }[] {
  const merged = new Map<string, { result: BuildResult; worker: number }>()
  reports.forEach((r, w) => r?.results.forEach(result => {
    const fp = fingerprint(result)
    const existing = merged.get(fp)
    if (!existing || existing.result.score < result.score) merged.set(fp, { result, worker: w })
  }))
  // Equal quality = only filler items differ, not a real alternative.
  const ranked = [...merged.values()].sort((a, b) => b.result.score - a.result.score)
  return ranked.filter((r, i) => i === 0 || Math.abs(r.result.score - ranked[i - 1].result.score) > 1e-6)
}

function targetValue(result: BuildResult, stat: OptimizerStatKey): number {
  const own = (result.stats as unknown as Record<string, number>)[stat] ?? 0
  return POWER_BOOSTED.has(stat) ? own + result.stats.power : own
}

const fieldStyle = (active: boolean, color: string): CSSProperties => ({
  background: active ? `color-mix(in srgb, ${color} 10%, var(--surface-panel))` : 'var(--surface-panel)',
  border:     `1px solid ${active ? `color-mix(in srgb, ${color} 30%, var(--metal-edge))` : 'var(--metal-edge)'}`,
  color:      active ? color : 'var(--ink-muted)',
})

function NumberField({ value, placeholder, onCommit, color, active, title }: {
  value:       number | null
  placeholder: string
  onCommit:    (v: number | null) => void
  color:       string
  active:      boolean
  title:       string
}) {
  const [raw, setRaw] = useState(value == null || value === 0 ? '' : String(value))
  useEffect(() => { setRaw(value == null || value === 0 ? '' : String(value)) }, [value])
  return (
    <input
      type="text"
      inputMode="numeric"
      title={title}
      aria-label={title}
      placeholder={placeholder}
      value={raw}
      onClick={e => e.stopPropagation()}
      onChange={e => setRaw(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={() => {
        const n = parseInt(raw, 10)
        onCommit(isNaN(n) ? null : Math.min(100000, n))
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className="w-full min-w-0 text-[11px] font-mono text-right rounded px-1 py-0.5 outline-none"
      style={fieldStyle(active, color)}
    />
  )
}

// ── Requirement card ──────────────────────────────────────────────────────────
function RequirementCard({ meta, req, onChange }: {
  meta:     OptimizerStatMeta
  req:      ForgeRequirement
  onChange: (next: ForgeRequirement) => void
}) {
  const { t } = useTranslation()
  const active = isActive(req)

  function activate() {
    if (!active) onChange({ ...req, importance: DEFAULT_IMPORTANCE, cap: suggestedCap(meta.key) })
  }

  return (
    <div
      className="relative rounded-lg p-2 flex flex-col gap-1"
      style={{
        cursor:     active ? 'default' : 'pointer',
        background: active ? `color-mix(in srgb, ${meta.color} 8%, var(--surface-stone))` : 'var(--surface-stone)',
        border:     `1px solid ${active ? `color-mix(in srgb, ${meta.color} 50%, var(--metal-edge))` : 'var(--metal-edge)'}`,
      }}
      onClick={activate}
      title={active ? t(`${meta.tKey}_desc`) : t('optimizer_activate_hint')}
    >
      <div className="flex items-center gap-1 min-w-0">
        <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain flex-shrink-0" />
        <span className="text-[10px] font-semibold truncate leading-tight flex-1" style={{ color: active ? meta.color : 'var(--ink-faint)' }}>
          {t(meta.tKey)}
        </span>
        {active && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(emptyReq(meta.key)) }}
            className="flex-shrink-0 opacity-50 hover:opacity-100"
            title={t('optimizer_clear_condition')}
            aria-label={t('optimizer_clear_condition')}
          >
            <X size={10} style={{ color: 'var(--ink-faint)' }} />
          </button>
        )}
      </div>
      {active && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-[9px] w-3 text-center flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>≥</span>
            <NumberField
              value={req.minimum}
              placeholder="—"
              title={t('optimizer_minimum_hint')}
              color={meta.color}
              active
              onCommit={v => onChange({ ...req, minimum: v ?? 0 })}
            />
            <span className="text-[9px] w-3 text-center flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>≤</span>
            <NumberField
              value={req.cap}
              placeholder="∞"
              title={req.strictCap ? t('optimizer_cap_strict_hint') : t('optimizer_cap_soft_hint')}
              color={req.strictCap ? 'var(--negative)' : meta.color}
              active={req.cap != null}
              onCommit={v => onChange({ ...req, cap: v })}
            />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange({ ...req, strictCap: !req.strictCap }) }}
              title={req.strictCap ? t('optimizer_cap_strict_hint') : t('optimizer_cap_soft_hint')}
              aria-label={req.strictCap ? t('optimizer_cap_strict_hint') : t('optimizer_cap_soft_hint')}
              aria-pressed={req.strictCap}
              className="flex-shrink-0"
            >
              {req.strictCap ? <Lock size={9} style={{ color: 'var(--negative)' }} /> : <Unlock size={9} style={{ color: 'var(--ink-faint)' }} />}
            </button>
          </div>
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()} title={t('optimizer_importance_hint')}>
            <span className="text-[8px] uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_importance')}</span>
            <div className="flex gap-0.5">
              {IMPORTANCE_LEVELS.map(level => {
                const filled = req.importance >= level
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onChange({ ...req, importance: req.importance === level ? level - 1 : level })}
                    className="rounded-sm flex-shrink-0 transition-colors"
                    style={{ width: 8, height: 8, transform: 'rotate(45deg)', background: filled ? meta.color : 'var(--surface-panel)', border: `1px solid ${filled ? meta.color : 'var(--metal-edge)'}` }}
                    aria-label={t('optimizer_importance_level', { n: level })}
                  />
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Forge heat ────────────────────────────────────────────────────────────────
function ForgeHeat({ heat, stageKey }: { heat: number; stageKey: string }) {
  const { t } = useTranslation()
  const pct = Math.round(Math.max(0.04, Math.min(1, heat)) * 100)
  return (
    <div className="w-full max-w-md flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Flame size={16} style={{ color: heat > 0.5 ? 'var(--fire)' : 'var(--gold)' }} className={heat > 0.2 ? 'animate-pulse' : ''} />
        <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{t(stageKey)}</span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('optimizer_heat')}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--gold-deep), var(--gold), var(--fire))' }}
        />
      </div>
      <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_heat_hint')}</span>
    </div>
  )
}

function RequirementChecklist({ reqs, result }: { reqs: ForgeRequirement[]; result: BuildResult }) {
  const { t } = useTranslation()
  const withMinimum = reqs.filter(r => r.minimum > 0)
  if (withMinimum.length === 0) return null
  return (
    <div className="w-full grid gap-x-4 gap-y-1 grid-cols-2 sm:grid-cols-3">
      {withMinimum.map(r => {
        const meta = META_MAP.get(r.stat)
        if (!meta) return null
        const value = targetValue(result, r.stat)
        const ok = value >= r.minimum
        return (
          <div key={r.stat} className="flex items-center gap-1.5 text-[10px]">
            <span style={{ color: ok ? 'var(--positive, #5cb85c)' : 'var(--negative)' }}>{ok ? '✓' : '✗'}</span>
            <img src={statIconUrl(meta.icon)} alt="" width={11} height={11} className="object-contain" />
            <span className="truncate" style={{ color: 'var(--ink-muted)' }}>{t(meta.tKey)}</span>
            <span className="ml-auto font-mono" style={{ color: ok ? meta.color : 'var(--negative)' }}>
              {value}<span style={{ color: 'var(--ink-faint)' }}>/{r.minimum}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
type Props = { open: boolean; onClose: () => void }

export function OptimizerModal({ open, onClose }: Props) {
  const { t } = useTranslation()

  const selectedClass = useBuildStore(s => s.selectedClass)

  const [phase,          setPhase]          = useState<Phase>(() => selectedClass ? 'order' : 'locked')
  const [config,         setConfig]         = useState<OptimizerConfig>(loadSavedConfig)
  const [results,        setResults]        = useState<BuildResult[]>([])
  const [heat,           setHeat]           = useState(1)
  const [tempering,      setTempering]      = useState(false)
  const [elapsed,        setElapsed]        = useState(0)
  const [error,          setError]          = useState<string | null>(null)
  const [showSlots,      setShowSlots]      = useState(false)
  const [showAdvanced,   setShowAdvanced]   = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const cfg = loadSavedConfig()
    const activeKeys = new Set(cfg.stats.filter(isActive).map(s => s.stat))
    return new Set(STAT_GROUPS.filter(g => g.defaultOpen || g.statKeys.some(k => activeKeys.has(k))).map(g => g.key))
  })

  const workersRef   = useRef<Worker[]>([])
  const reportsRef   = useRef<(ForgeReport | null)[]>([])
  const temperedRef  = useRef(0)
  const bestRef      = useRef({ score: -Infinity, generation: 0 })
  const startRef     = useRef(0)
  const finishingRef = useRef(false)
  const presetRef    = useRef(INTENSITY.standard)

  useEffect(() => { persistConfig(config) }, [config])
  useEffect(() => () => terminateWorkers(), [])

  useEffect(() => {
    if (open && !selectedClass) setPhase('locked')
    else if (open && selectedClass) setPhase(p => p === 'locked' ? 'order' : p)
  }, [open, selectedClass])

  // Clock for the forging screen and the hard time limit.
  useEffect(() => {
    if (phase !== 'forging') return
    const id = setInterval(() => {
      const secs = (performance.now() - startRef.current) / 1000
      setElapsed(Math.floor(secs))
      if (secs >= presetRef.current.capSec) finishForging()
    }, 1000)
    return () => clearInterval(id)
  }, [phase])

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
  }

  function handleClose() {
    terminateWorkers()
    setPhase(selectedClass ? 'order' : 'locked')
    setResults([])
    onClose()
  }

  function updateReq(next: ForgeRequirement) {
    if (isActive(next)) {
      const group = STAT_GROUPS.find(g => g.statKeys.includes(next.stat))
      if (group) setExpandedGroups(s => new Set([...s, group.key]))
    }
    setConfig(c => ({ ...c, stats: c.stats.map(s => s.stat === next.stat ? next : s) }))
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

  function onReport(index: number, report: ForgeReport, emigrants?: Partial<Record<SlotId, number>>[]) {
    reportsRef.current[index] = report
    const ranked = mergeResults(reportsRef.current)
    setResults(ranked.map(r => r.result))
    const generation = Math.max(...reportsRef.current.map(r => r?.generation ?? 0))

    // Each new overall best is shared with every other Worker.
    const top = ranked[0]
    if (top && top.result.score > bestRef.current.score + 1e-9) {
      bestRef.current = { score: top.result.score, generation }
      workersRef.current.forEach((w, i) => { if (i !== top.worker) w.postMessage({ type: 'inject', builds: [top.result.equipped] }) })
    }
    // Ring migration: each Worker's emigrants go to the next one.
    if (emigrants?.length && workersRef.current.length > 1) {
      workersRef.current[(index + 1) % workersRef.current.length].postMessage({ type: 'inject', builds: emigrants })
    }

    const stall = generation - bestRef.current.generation
    const nextHeat = 1 - stall / presetRef.current.stall
    setHeat(nextHeat)
    if (nextHeat <= 0) finishForging()
  }

  function finishForging() {
    if (finishingRef.current || workersRef.current.length === 0) return
    finishingRef.current = true
    setTempering(true)
    temperedRef.current = 0
    workersRef.current.forEach(w => w.postMessage({ type: 'finish', temperMs: presetRef.current.temperMs }))
  }

  function onTempered(index: number, report: ForgeReport) {
    reportsRef.current[index] = report
    temperedRef.current++
    if (temperedRef.current < workersRef.current.length) return
    setResults(mergeResults(reportsRef.current).map(r => r.result))
    terminateWorkers()
    setTempering(false)
    setPhase('forged')
  }

  function lightForge() {
    if (!selectedClass) { setError(t('optimizer_no_class')); return }
    if (!equipment || !sets) return
    if (!config.stats.some(isActive)) { setError(t('optimizer_no_stats')); return }
    if (ALL_SLOTS.every(s => config.lockedSlots.has(s))) { setError(t('optimizer_no_slots')); return }
    setError(null)
    terminateWorkers()

    const preset = INTENSITY[config.intensity]
    presetRef.current = preset
    const count = preset.threads
    const wire = toWireConfig(config, Math.ceil(TOTAL_ISLANDS / count))
    const base = { selectedClass, level, allocated, scrolled, equipped, runes }
    reportsRef.current = Array(count).fill(null)
    bestRef.current = { score: -Infinity, generation: 0 }
    finishingRef.current = false
    startRef.current = performance.now()
    setResults([])
    setHeat(1)
    setElapsed(0)
    setTempering(false)
    let ready = 0

    for (let i = 0; i < count; i++) {
      const worker = new Worker(new URL('../../workers/optimizer.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data as { type: string; report?: ForgeReport; emigrants?: Partial<Record<SlotId, number>>[] }
        if (msg.type === 'ready') {
          ready++
          if (ready === count) workersRef.current.forEach(w => w.postMessage({ type: 'run' }))
        } else if (msg.type === 'report' && msg.report) {
          if (!finishingRef.current) onReport(i, msg.report, msg.emigrants)
        } else if (msg.type === 'tempered' && msg.report) {
          onTempered(i, msg.report)
        } else if (msg.type === 'error') {
          setError(t('optimizer_wasm_unavailable'))
          terminateWorkers()
          setPhase('order')
        }
      }
      const seed = crypto.getRandomValues(new Uint32Array(1))[0]
      worker.postMessage({ type: 'init', config: wire, items: equipment, sets, base, seed })
      workersRef.current.push(worker)
    }
    setPhase('forging')
  }

  function extinguish() {
    terminateWorkers()
    setPhase('order')
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
    for (const [slot, rune] of Object.entries(result.runes) as [SlotId, { stat: string; value: number }][]) {
      setRune(slot, rune.stat, rune.value)
    }
    handleClose()
  }

  const activeSlots = ALL_SLOTS.length - config.lockedSlots.size
  const itemNames = new Map((equipment ?? []).map(it => [it.ankama_id, it.name]))
  const activeReqs = config.stats.filter(isActive)

  // ── Locked (no class selected yet) ───────────────────────────────────────
  if (phase === 'locked') {
    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
        <div className="p-4 space-y-4">
          <div
            className="flex flex-col items-center gap-2 text-center py-5 rounded-xl"
            style={{ background: 'color-mix(in srgb, var(--gold) 6%, var(--surface-void))', border: '1px solid color-mix(in srgb, var(--gold) 35%, var(--metal-edge))' }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--gold) 18%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 55%, transparent)' }}
            >
              <Lock size={18} style={{ color: 'var(--gold)' }} />
            </div>
            <p className="text-[13px] font-bold tracking-wide" style={{ color: 'var(--gold)' }}>{t('optimizer_locked_title')}</p>
            <p className="text-[11px] max-w-sm" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_locked_hint')}</p>
          </div>
          <ClassPicker />
        </div>
      </Modal>
    )
  }

  // ── Forging ───────────────────────────────────────────────────────────────
  if (phase === 'forging') {
    const best = results[0]
    const stageKey = tempering
      ? 'optimizer_stage_tempering'
      : !best ? 'optimizer_stage_lighting'
      : !best.meetsRequired ? 'optimizer_stage_melting'
      : heat > 0.5 ? 'optimizer_stage_shaping'
      : 'optimizer_stage_cooling'

    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
        <div className="p-5 flex flex-col items-center gap-4 text-[11px]">
          <div
            className="dofus-aura w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--gold) 10%, var(--surface-stone))', border: '1px solid color-mix(in srgb, var(--gold) 45%, transparent)' }}
          >
            <Hammer size={24} className={tempering ? '' : 'animate-bounce'} style={{ color: 'var(--gold)' }} />
          </div>
          <ForgeHeat heat={tempering ? 0 : heat} stageKey={stageKey} />
          <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>
            {t('optimizer_elapsed', { s: elapsed })}
          </span>

          {best && <RequirementChecklist reqs={activeReqs} result={best} />}

          {best && (
            <div className="w-full text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 text-center" style={{ color: 'var(--ink-faint)' }}>
                {t('optimizer_on_the_anvil')}
              </p>
              <BuildResultCard
                result={best}
                rank={1}
                items={equipment ?? []}
                requirements={config.stats}
                runes={runes}
                lockedSlots={config.lockedSlots}
                onLoad={loadBuild}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={finishForging}
              disabled={!best || tempering}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-[11px] disabled:opacity-50"
              style={{ color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 45%, transparent)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)' }}
            >
              <Anvil size={12} /> {t('optimizer_temper_now')}
            </button>
            <button
              onClick={extinguish}
              className="px-3 py-1.5 rounded-lg text-[11px] border"
              style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
            >
              {t('optimizer_extinguish')}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  // ── Forged ────────────────────────────────────────────────────────────────
  if (phase === 'forged') {
    const [masterpiece, ...others] = results
    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
        <div className="p-4 space-y-3 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-bold font-display tracking-wider" style={{ color: 'var(--gold)' }}>
              {t('optimizer_forged_title')}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={lightForge}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border"
                style={{ color: 'var(--ink-muted)', borderColor: 'var(--metal-edge)' }}
              >
                <RotateCcw size={11} /> {t('optimizer_forge_again')}
              </button>
              <button
                onClick={() => setPhase('order')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border"
                style={{ color: 'var(--ink-muted)', borderColor: 'var(--metal-edge)' }}
              >
                <Settings2 size={11} /> {t('optimizer_adjust_order')}
              </button>
            </div>
          </div>

          {!masterpiece ? (
            <p className="text-center py-8" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_nothing_forged')}</p>
          ) : (
            <>
              {!masterpiece.meetsRequired && (
                <p className="px-3 py-2 rounded-lg text-[10px]" style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)' }}>
                  {t('optimizer_unmet_advice', { met: masterpiece.requirementsMet, total: masterpiece.requirementsTotal })}
                </p>
              )}
              <BuildResultCard
                result={masterpiece}
                rank={1}
                items={equipment ?? []}
                requirements={config.stats}
                runes={runes}
                lockedSlots={config.lockedSlots}
                onLoad={loadBuild}
                onBan={banItem}
                bannedItems={config.bannedItems}
              />
              {others.length > 0 && (
                <p className="text-[10px] font-semibold uppercase tracking-wide pt-1" style={{ color: 'var(--ink-faint)' }}>
                  {t('optimizer_other_pieces')}
                </p>
              )}
              {others.slice(0, 4).map((r, i) => (
                <BuildResultCard
                  key={fingerprint(r)}
                  result={r}
                  rank={i + 2}
                  items={equipment ?? []}
                  requirements={config.stats}
                  runes={runes}
                  lockedSlots={config.lockedSlots}
                  onLoad={loadBuild}
                  onBan={banItem}
                  bannedItems={config.bannedItems}
                />
              ))}
            </>
          )}
        </div>
      </Modal>
    )
  }

  // ── Order (what to forge) ─────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
      <div className="p-4 space-y-3 text-[11px]">

        {error && (
          <p className="px-3 py-2 rounded-lg" style={{ color: 'var(--negative)', background: 'color-mix(in srgb, var(--negative) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--negative) 30%, transparent)' }}>
            {error}
          </p>
        )}

        <p className="text-[10px] leading-snug" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_order_help')}</p>

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
              <span key={c} className="flex items-center gap-0.5" title={`${t(meta.tKey)} — ${t('optimizer_scrolled_hint')}`}>
                <img src={statIconUrl(meta.icon)} alt="" width={11} height={11} className="object-contain" />🧪
              </span>
            )
          })}
          <span className="text-[9px] italic" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_points_auto')}</span>
        </div>

        {/* Intensity */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>{t('optimizer_intensity')}</span>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--metal-edge)' }} role="radiogroup" aria-label={t('optimizer_intensity')}>
            {(Object.keys(INTENSITY) as ForgeIntensity[]).map(k => (
              <button
                key={k}
                role="radio"
                aria-checked={config.intensity === k}
                onClick={() => setConfig(c => ({ ...c, intensity: k }))}
                className="px-2.5 py-1 text-[10px] font-semibold"
                title={t(`optimizer_intensity_${k}_hint`)}
                style={{
                  color:      config.intensity === k ? 'var(--surface-void)' : 'var(--ink-muted)',
                  background: config.intensity === k ? 'var(--gold)' : 'var(--surface-stone)',
                }}
              >
                {t(`optimizer_intensity_${k}`)}
              </button>
            ))}
          </div>
          <span className="text-[9px] italic" style={{ color: 'var(--ink-faint)' }}>{t(`optimizer_intensity_${config.intensity}_hint`)}</span>
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
            {t('optimizer_banned_items')}: <span className="font-mono font-bold" style={{ color: 'var(--gold)' }}>{config.bannedItems.length}</span>
            <ChevronDown size={10} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          <label className="flex items-center gap-1.5 cursor-pointer select-none" title={t('optimizer_assume_scrolled_hint')}>
            <input type="checkbox" checked={config.assumeFullyScrolled} onChange={e => setConfig(c => ({ ...c, assumeFullyScrolled: e.target.checked }))} />
            <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>{t('optimizer_assume_scrolled')}</span>
          </label>
          <button
            onClick={() => setConfig(c => ({ ...c, stats: OPTIMIZER_STATS.map(s => emptyReq(s.key)) }))}
            className="ml-auto text-[10px] transition-opacity"
            style={{ color: 'var(--negative)', opacity: 0.55 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.55')}
          >
            {t('optimizer_clear_stats')}
          </button>
        </div>

        {/* Forgemagie */}
        <div className="rounded-lg p-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
          <span className="text-[10px] font-bold tracking-widest uppercase flex-shrink-0" style={{ color: 'var(--gold)' }}>🔨 {t('optimizer_forgemagie')}</span>
          <label className="flex items-center gap-1 cursor-pointer select-none" title={t('optimizer_transcendence_hint')}>
            <input type="checkbox" checked={config.transcendence} onChange={e => setConfig(c => ({ ...c, transcendence: e.target.checked }))} />
            <span className="font-semibold text-[10px]" style={{ color: 'var(--ink-muted)' }}>{t('optimizer_transcendence')}</span>
          </label>
          <div className="flex items-center gap-3">
            {(['ap', 'mp', 'range'] as const).map(k => (
              <label key={k} className="flex items-center gap-1 cursor-pointer select-none">
                <input type="checkbox" checked={config.exo[k]} onChange={e => setConfig(c => ({ ...c, exo: { ...c.exo, [k]: e.target.checked } }))} />
                <span className="font-semibold text-[10px]" style={{ color: 'var(--ink-muted)' }}>{t(`optimizer_exo_${k}`)}</span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" checked={config.exo.onlyOnRing} onChange={e => setConfig(c => ({ ...c, exo: { ...c.exo, onlyOnRing: e.target.checked } }))} />
            <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>{t('optimizer_exo_only_ring')}</span>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_exo_max')}</span>
            <select
              value={config.exo.maxCount}
              onChange={e => setConfig(c => ({ ...c, exo: { ...c.exo, maxCount: Number(e.target.value) } }))}
              className="rounded px-1 py-0.5 text-[10px] font-mono outline-none"
              style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
            >
              {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <span className="text-[9px] italic w-full" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_forgemagie_hint')}</span>
        </div>

        {/* Banned items */}
        {showAdvanced && (
          <div className="rounded-lg p-3 flex flex-wrap items-center gap-1" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
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
        )}

        {/* Slots panel */}
        {showSlots && (
          <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>{t('optimizer_slots')}</span>
              <div className="flex gap-1.5">
                <button onClick={() => setConfig(c => ({ ...c, lockedSlots: new Set<SlotId>() }))} className="text-[9px] px-1.5 py-0.5 rounded border" style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}>
                  {t('optimizer_slot_mark_all')}
                </button>
                <button onClick={() => setConfig(c => ({ ...c, lockedSlots: new Set(ALL_SLOTS) }))} className="text-[9px] px-1.5 py-0.5 rounded border" style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}>
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
            const activeCount = group.statKeys.filter(k => { const r = config.stats.find(s => s.stat === k); return r && isActive(r) }).length
            const isExpanded = expandedGroups.has(group.key)
            return (
              <div key={group.key}>
                <button className="w-full flex items-center gap-2 py-1 text-left" onClick={() => toggleGroup(group.key)}>
                  <span className="text-[10px] font-bold tracking-widest uppercase flex-shrink-0" style={{ color: 'var(--gold)' }}>{t(group.tKey)}</span>
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
                      const req = config.stats.find(s => s.stat === sk)
                      if (!meta || !req) return null
                      return <RequirementCard key={sk} meta={meta} req={req} onChange={updateReq} />
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
          <button onClick={handleClose} className="px-3 py-1.5 rounded-lg border text-[11px]" style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}>
            {t('optimizer_cancel')}
          </button>
          <button
            onClick={lightForge}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-[12px]"
            style={{ background: 'color-mix(in srgb, var(--gold) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 50%, transparent)', color: 'var(--gold)' }}
          >
            <Flame size={13} /> {t('optimizer_light_forge')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
