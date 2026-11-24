import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore, ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { OptimizerConfig, BuildResult, ForgeReport, ForgeRequirement, ForgePreset, OptimizerStatKey } from './types.ts'
import { startForgeRun, finishForgeRun } from '@/features/builds/api.ts'
import type { LogEntry } from './ForgeParts.tsx'
import { OPTIMIZER_STATS, STAT_GROUPS, POWER_BOOSTED, runeStatLabelKey } from './statList.ts'
import { isActive, loadSavedConfig, persistConfig, toWireConfig, loadForgeResult, withLegendaryBans } from './forgeConfig.ts'
import { flattenRunes } from '@/engine/runes.ts'
import { useForgePicks, planRequired } from './forgePicks.ts'
import { forgePassiveState, forgePassiveEffects, legendaryForgeEffects, passiveStateFor, rankLegendaryBonuses } from './forgePassives.ts'
import { track } from '@/lib/analytics.ts'
import { playForgeDone } from '@/lib/sound.ts'

// The Forge's search and order, shared by every presentation: phases, the
// order config and its persistence, the Workers and their reports, heat,
// tempering, bellows, the log, and loading a result into the planner.

export type ForgePhase = 'locked' | 'order' | 'forging' | 'forged'
export type Equipped = Partial<Record<SlotId, number>>

export const SLOT_LABEL_KEY: Record<SlotId, string> = {
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

export const META_MAP = new Map(OPTIMIZER_STATS.map(m => [m.key, m]))
// Goals read in the order the picker lists them; the engine keeps OPTIMIZER_STATS order.
const GOAL_ORDER = new Map(STAT_GROUPS.flatMap(g => g.statKeys).map((k, i) => [k, i]))
const goalOrder = (k: OptimizerStatKey) => GOAL_ORDER.get(k) ?? GOAL_ORDER.size

// Measured on real multi-basin orders: every Worker keeps at least 24
// islands (fewer per Worker let one basin take them all over), and a run
// keeps at least 96 islands overall. 2 Workers x 24 found the best piece
// 3/8 times with runes; 4 x 24 and 8 x 24 found it 8/8.
const ISLANDS_PER_WORKER = 24
const MIN_TOTAL_ISLANDS = 96
export const HW = Math.max(1, globalThis.navigator?.hardwareConcurrency || 4)
const BELLOWS_COOLDOWN_MS = 4000
const LOG_SIZE = 7

// How long and how wide the Forge searches. It tempers on its own once
// `stallSec` seconds went by without a significant gain (see PLATEAU_GAIN),
// MISSING_STALL_FACTOR times longer while a minimum is still missing;
// `capSec` is the hard limit (Infinity: only the player tempers).
// Calibrated with the plateau_profile bench (8 orders, 30 browser-like runs,
// 8 Workers): the longest wait before a last gain was under 8 s on most
// orders and up to 22 s on two; a 30 s window lost something in 1 run of 30
// (0.4%), 15 s in 5, 10 s in 7.
export type ForgeSettings = { threads: number; stallSec: number; capSec: number; temperMs: number }
export const INTENSITY: Record<ForgePreset, ForgeSettings> = {
  quick:    { threads: Math.min(4, HW),                                  stallSec: 15,       capSec: 45,       temperMs: 1500 },
  standard: { threads: Math.min(HW, 8, Math.max(4, Math.floor(HW / 2))), stallSec: 30,       capSec: 120,      temperMs: 3000 },
  master:   { threads: Math.min(8, HW),                                  stallSec: 60,       capSec: 300,      temperMs: 6000 },
  eternal:  { threads: Math.min(8, HW),                                  stallSec: Infinity, capSec: Infinity, temperMs: 6000 },
}
const MISSING_STALL_FACTOR = 1.5

/** What a forge runs with: a preset, or the player's own settings. */
export function forgeSettings(config: Pick<OptimizerConfig, 'intensity' | 'custom'>): ForgeSettings {
  if (config.intensity !== 'custom') return INTENSITY[config.intensity]
  const { threads, capSec, stallSec } = config.custom
  return { threads: Math.max(1, Math.min(HW, threads)), stallSec, capSec: capSec > 0 ? capSec : Infinity, temperMs: 3000 }
}

/** The preset a custom run is filed under in the usage stats (they only know the presets). */
export function statsIntensity(config: Pick<OptimizerConfig, 'intensity' | 'custom'>): ForgePreset {
  if (config.intensity !== 'custom') return config.intensity
  const cap = config.custom.capSec
  return cap <= 0 ? 'eternal' : cap <= 45 ? 'quick' : cap <= 180 ? 'standard' : 'master'
}
// Only a gain of at least this share of the quality (or 1 point) keeps the
// forge hot. With transcendence runes the hammer keeps finding +1/+2 rune
// swaps for a long time; those still show, but no longer stop the forge
// from settling once the piece is essentially done.
const PLATEAU_GAIN = 0.002
// Visual heat scale for the eternal forge, which never cools on its own:
// seconds without a significant gain until it shows as settled.
const ETERNAL_HEAT_SCALE = 60

// Rings and Dofus slots are interchangeable, so they compare as sets.
export function fingerprint(r: BuildResult): string {
  const rings = [r.equipped.ring1 ?? 0, r.equipped.ring2 ?? 0].sort((a, b) => a - b)
  const dofus = (['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6'] as SlotId[]).map(s => r.equipped[s] ?? 0).sort((a, b) => a - b)
  const rest = ALL_SLOTS.filter(s => !s.startsWith('ring') && !s.startsWith('dofus')).map(s => r.equipped[s] ?? 0)
  return [...rest, ...rings, ...dofus].join(',')
}

export function mergeResults(reports: (ForgeReport | null)[]): { result: BuildResult; worker: number }[] {
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

export function targetValue(result: BuildResult, stat: OptimizerStatKey): number {
  const own = (result.stats as unknown as Record<string, number>)[stat] ?? 0
  return POWER_BOOSTED.has(stat) ? own + result.stats.power : own
}

export function formatCount(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`
  return String(n)
}

/** One minimum of the order against a forged piece: reached or not. */
export function requirementChecks(reqs: ForgeRequirement[], result: BuildResult) {
  return reqs
    .filter(r => r.minimum > 0)
    .flatMap(r => {
      const meta = META_MAP.get(r.stat)
      if (!meta) return []
      const value = targetValue(result, r.stat)
      return [{ requirement: r, meta, value, ok: value >= r.minimum }]
    })
}

/**
 * What the piece has beyond each minimum and what that is worth in ley, so
 * the player knows how much room is left to ask for more.
 */
export function surplusRows(reqs: ForgeRequirement[], result: BuildResult) {
  const rows = reqs
    .filter(r => r.weight > 0)
    .map(r => {
      const raw = targetValue(result, r.stat)
      const counted = r.cap != null ? Math.min(raw, r.cap) : raw
      const extra = counted - r.minimum
      return { r, raw, extra, worth: extra * r.weight, capped: r.cap != null && raw >= r.cap }
    })
    .filter(x => x.extra > 0)
    .sort((a, b) => b.worth - a.worth)
  return { rows, total: rows.reduce((sum, x) => sum + x.worth, 0) }
}

/** State and actions of La Forjadora while its dialog is open. */
export function useForge({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()

  const selectedClass = useBuildStore(s => s.selectedClass)

  const [phase,          setPhase]          = useState<ForgePhase>(() => selectedClass ? 'order' : 'locked')
  const [config,         setConfig]         = useState<OptimizerConfig>(loadSavedConfig)
  const [results,        setResults]        = useState<BuildResult[]>([])
  const [heat,           setHeat]           = useState(1)
  const [tempering,      setTempering]      = useState(false)
  const [elapsed,        setElapsed]        = useState(0)
  const [strikes,        setStrikes]        = useState(0)
  const [burst,          setBurst]          = useState(0)
  const [log,            setLog]            = useState<LogEntry[]>([])
  const [bellowsReady,   setBellowsReady]   = useState(true)
  const [settled,        setSettled]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [showSlots,      setShowSlots]      = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const cfg = loadSavedConfig()
    const activeKeys = new Set(cfg.stats.filter(isActive).map(s => s.stat))
    return new Set(STAT_GROUPS.filter(g => g.defaultOpen || g.statKeys.some(k => activeKeys.has(k))).map(g => g.key))
  })

  const workersRef   = useRef<Worker[]>([])
  const reportsRef   = useRef<(ForgeReport | null)[]>([])
  const temperedRef  = useRef(0)
  const bestRef      = useRef({ score: -Infinity, generation: 0 })
  const plateauRef   = useRef({ score: -Infinity, at: 0 })
  const prevBestRef  = useRef<BuildResult | null>(null)
  const generationRef = useRef(0)
  const startRef     = useRef(0)
  const runRef       = useRef<Promise<number | null> | null>(null)
  const finishingRef = useRef(false)
  const presetRef    = useRef<ForgeSettings>(INTENSITY.standard)
  const logIdRef     = useRef(0)
  // Items whose passive the current forge counts (marked on the result cards).
  const countedPassivesRef = useRef<ReadonlySet<number>>(new Set())

  // Debounced: every keystroke in a minimum / ley / cap field is a config
  // change. The unmount flush keeps the last edit when the modal closes
  // inside the debounce window.
  const latestConfigRef = useRef(config)
  latestConfigRef.current = config
  useEffect(() => {
    const id = setTimeout(() => persistConfig(config), 400)
    return () => clearTimeout(id)
  }, [config])
  useEffect(() => () => persistConfig(latestConfigRef.current), [])
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
  const plannerPassives = useBuildStore(s => s.passives)
  const legendaryBonus  = useBuildStore(s => s.legendaryBonus)
  const equipment     = useDataStore(s => s.equipment)
  const sets          = useDataStore(s => s.sets)
  const required      = useForgePicks(s => s.required)
  const banned        = useForgePicks(s => s.banned)
  const { require: pinItem, ban: banItem } = useForgePicks.getState()
  const itemsById     = useMemo(() => new Map((equipment ?? []).map(it => [it.ankama_id, it])), [equipment])
  const placements    = useMemo(
    () => planRequired(required, itemsById, config.lockedSlots, equipped, level),
    [required, itemsById, config.lockedSlots, equipped, level],
  )

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

  function addLog(text: string, tone: LogEntry['tone']) {
    setLog(l => [{ id: logIdRef.current++, text, tone }, ...l].slice(0, LOG_SIZE))
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

  // Narrates what changed between the previous best piece and the new one.
  function narrate(next: BuildResult) {
    const prev = prevBestRef.current
    prevBestRef.current = next
    if (!prev) {
      addLog(t('optimizer_log_first', { q: Math.round(next.score).toLocaleString() }), 'gold')
      return
    }
    addLog(t('optimizer_log_better', { q: Math.round(next.score).toLocaleString(), d: Math.round(next.score - prev.score).toLocaleString() }), 'gold')
    for (const r of config.stats.filter(x => x.minimum > 0)) {
      const before = targetValue(prev, r.stat) >= r.minimum
      const now = targetValue(next, r.stat) >= r.minimum
      const meta = META_MAP.get(r.stat)
      if (!before && now && meta) addLog(t('optimizer_log_minimum', { stat: t(meta.tKey), value: targetValue(next, r.stat) }), 'good')
    }
    let runesLogged = 0
    for (const [slot, rune] of Object.entries(next.runes) as [SlotId, { stat: string; value: number }][]) {
      const old = prev.runes[slot]
      if (runesLogged < 2 && (!old || old.stat !== rune.stat)) {
        const labelKey = runeStatLabelKey(rune.stat)
        addLog(t('optimizer_log_rune', { value: rune.value, stat: labelKey ? t(labelKey) : rune.stat, slot: t(SLOT_LABEL_KEY[slot]) }), 'muted')
        runesLogged++
      }
    }
    if (next.meetsRequired && !prev.meetsRequired) addLog(t('optimizer_log_all_met'), 'good')
  }

  function onReport(index: number, report: ForgeReport, emigrants?: Equipped[]) {
    reportsRef.current[index] = report
    const ranked = mergeResults(reportsRef.current)
    setResults(ranked.map(r => r.result))
    const generation = Math.max(...reportsRef.current.map(r => r?.generation ?? 0))
    generationRef.current = generation
    setStrikes(reportsRef.current.reduce((sum, r) => sum + (r?.evaluations ?? 0), 0))

    // Workers deliberately do not share each new best right away: that
    // pulled every island into the first good basin found. They only trade
    // pieces through the slow ring migration below.
    const top = ranked[0]
    if (top && top.result.score > bestRef.current.score + 1e-9) {
      bestRef.current = { score: top.result.score, generation }
      setBurst(b => b + 1)
      narrate(top.result)
      const last = plateauRef.current.score
      const significant = !Number.isFinite(last)
        || (last < 0 && top.result.score >= 0)
        || top.result.score - last >= Math.max(1, Math.abs(last) * PLATEAU_GAIN)
      if (significant) plateauRef.current = { score: top.result.score, at: performance.now() }
    }
    // Ring migration: each Worker's emigrants go to the next one.
    if (emigrants?.length && workersRef.current.length > 1) {
      workersRef.current[(index + 1) % workersRef.current.length].postMessage({ type: 'inject', builds: emigrants })
    }

    coolDown(top ? !top.result.meetsRequired : true)
  }

  // Seconds since the last significant gain decide when the forge settles.
  // A minimum still missing gives it longer, but it does stop: those
  // orders used to run to the hard limit long after their best piece.
  function coolDown(missing: boolean) {
    const preset = presetRef.current
    const stall = (performance.now() - plateauRef.current.at) / 1000
    const eternal = !Number.isFinite(preset.stallSec)
    const limit = eternal ? ETERNAL_HEAT_SCALE : preset.stallSec * (missing ? MISSING_STALL_FACTOR : 1)
    setHeat(Math.max(0, 1 - stall / limit))
    setSettled(eternal && !missing && stall >= ETERNAL_HEAT_SCALE)
    if (!eternal && stall >= limit) finishForging()
  }

  function finishForging() {
    if (finishingRef.current || workersRef.current.length === 0) return
    finishingRef.current = true
    setTempering(true)
    addLog(t('optimizer_log_tempering'), 'fire')
    temperedRef.current = 0
    workersRef.current.forEach(w => w.postMessage({ type: 'finish', temperMs: presetRef.current.temperMs }))
  }

  function onTempered(index: number, report: ForgeReport) {
    reportsRef.current[index] = report
    temperedRef.current++
    if (temperedRef.current < workersRef.current.length) return
    const forged = mergeResults(reportsRef.current).map(r => r.result)
    setResults(forged)
    terminateWorkers()
    setTempering(false)
    setPhase('forged')
    playForgeDone()
    void finishForgeRun(runRef.current, {
      allMet:  forged[0]?.meetsRequired ?? false,
      seconds: (performance.now() - startRef.current) / 1000,
    })
  }

  function stoke() {
    if (!bellowsReady || finishingRef.current) return
    workersRef.current.forEach(w => w.postMessage({ type: 'stoke' }))
    bestRef.current = { ...bestRef.current, generation: generationRef.current }
    plateauRef.current = { ...plateauRef.current, at: performance.now() }
    setSettled(false)
    setHeat(1)
    setBurst(b => b + 1)
    addLog(t('optimizer_log_stoked'), 'fire')
    setBellowsReady(false)
    setTimeout(() => setBellowsReady(true), BELLOWS_COOLDOWN_MS)
  }

  function lightForge(seedBuilds: Equipped[] = []) {
    if (!selectedClass) { setError(t('optimizer_no_class')); return }
    if (!equipment || !sets) return
    if (!config.stats.some(isActive)) { setError(t('optimizer_no_stats')); return }
    if (ALL_SLOTS.every(s => config.lockedSlots.has(s))) { setError(t('optimizer_no_slots')); return }
    if (placements.some(p => p.status === 'no_slot' || p.status === 'prysmaradite')) { setError(t('optimizer_items_conflicts')); return }
    setError(null)
    terminateWorkers()
    track('forge_run', { intensity: config.intensity })

    const preset = forgeSettings(config)
    presetRef.current = preset
    const count = preset.threads
    const picks = withLegendaryBans(config, { required: placements.filter(p => p.status === 'placed').map(p => p.id), banned }, equipment)
    // Resolved once per forge; the engine folds them into each item's stats.
    const excludedIds = new Set(config.passiveExcluded)
    // Open to trying several: use whichever of those scores best for this order's
    // own weighted goals instead of the planner's single saved pick.
    const bestCandidate = config.companionBonusCandidates.length
      ? rankLegendaryBonuses(config.stats.filter(isActive)).find(r => config.companionBonusCandidates.includes(r.bonus.id))
      : undefined
    const effectiveLegendary = bestCandidate ? { id: bestCandidate.bonus.id, value: bestCandidate.value } : legendaryBonus
    const passiveEffects = [
      ...(config.passives === 'off' ? [] : forgePassiveEffects(forgePassiveState(config.passives, plannerPassives), excludedIds)),
      ...(equipped.companion != null && excludedIds.has(equipped.companion) ? [] : legendaryForgeEffects(equipped.companion, effectiveLegendary)),
    ]
    countedPassivesRef.current = new Set(passiveEffects.map(p => p.id))
    const wire = toWireConfig(config, Math.max(ISLANDS_PER_WORKER, Math.ceil(MIN_TOTAL_ISLANDS / count)), level, picks, passiveEffects)
    const base = { selectedClass, level, allocated, scrolled, equipped, runes: Object.fromEntries(Object.entries(runes).map(([slot, map]) => [slot, flattenRunes(map)])) }
    reportsRef.current = Array(count).fill(null)
    bestRef.current = { score: -Infinity, generation: 0 }
    plateauRef.current = { score: -Infinity, at: performance.now() }
    setSettled(false)
    prevBestRef.current = null
    generationRef.current = 0
    finishingRef.current = false
    startRef.current = performance.now()
    // Usage stats only (shown on Explore); never blocks the forge.
    runRef.current = startForgeRun({
      intensity:     statsIntensity(config),
      transcendence: config.transcendence,
      requirements:  config.stats.filter(r => r.minimum > 0).length,
    })
    setResults([])
    setHeat(1)
    setElapsed(0)
    setStrikes(0)
    setBurst(0)
    setTempering(false)
    setLog([])
    addLog(t(seedBuilds.length ? 'optimizer_log_relit' : 'optimizer_log_lit'), 'fire')
    if (passiveEffects.length) addLog(t(`optimizer_log_passives_${config.passives}`, { n: passiveEffects.length }), 'muted')
    if (bestCandidate) addLog(t('optimizer_log_companion_bonus', { name: t(bestCandidate.bonus.nameKey) }), 'muted')
    let ready = 0

    for (let i = 0; i < count; i++) {
      const worker = new Worker(new URL('../../workers/optimizer.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data as { type: string; report?: ForgeReport; emigrants?: Equipped[] }
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
      worker.postMessage({ type: 'init', config: wire, items: equipment, sets, base, seed, seedBuilds })
      workersRef.current.push(worker)
    }
    setPhase('forging')
  }

  function extinguish() {
    terminateWorkers()
    setPhase('order')
  }

  function loadBuild(result: BuildResult) {
    const counted = config.passives === 'max'
      ? passiveStateFor(forgePassiveState('max', {}), Object.values(result.equipped).filter(id => countedPassivesRef.current.has(id)))
      : undefined
    loadForgeResult(result, config.lockedSlots, counted)
    handleClose()
  }

  const activeSlots = ALL_SLOTS.length - config.lockedSlots.size
  const pinnedSlots = new Map(placements.filter(p => p.status === 'placed' && p.slot).map(p => [p.slot!, p.item?.name ?? '']))
  const activeReqs = config.stats.filter(isActive).sort((a, b) => goalOrder(a.stat) - goalOrder(b.stat))


  return {
    selectedClass,
    phase,
    setPhase,
    config,
    setConfig,
    results,
    heat,
    tempering,
    elapsed,
    strikes,
    burst,
    log,
    bellowsReady,
    settled,
    error,
    showSlots,
    setShowSlots,
    expandedGroups,
    toggleGroup,
    updateReq,
    toggleSlot,
    lightForge,
    extinguish,
    loadBuild,
    stoke,
    finishForging,
    handleClose,
    activeSlots,
    pinnedSlots,
    activeReqs,
    placements,
    required,
    banned,
    pinItem,
    banItem,
    countedPassivesRef,
    equipment,
    sets,
    runes,
    level,
    scrolled,
    equipped,
    plannerPassives,
    legendaryBonus,
    itemsById,
  }
}

export type Forge = ReturnType<typeof useForge>
