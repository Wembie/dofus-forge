import { useState, useRef, useEffect, useMemo, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Lock, Unlock, X, Flame, Anvil, RotateCcw, Settings2, Wind, AlertTriangle, Pin, Infinity as InfinityIcon } from 'lucide-react'
import { Modal } from '@/ui/Modal.tsx'
import { useBuildStore, ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { ClassPicker } from '@/features/class-picker/ClassPicker.tsx'
import type { OptimizerConfig, BuildResult, ForgeReport, ForgeRequirement, ForgeIntensity, OptimizerStatKey } from './types.ts'
import type { OptimizerStatMeta } from './statList.ts'
import { BuildResultCard } from './BuildResultCard.tsx'
import { startForgeRun, finishForgeRun } from '@/features/builds/api.ts'
import { ForgeScene, HeatGauge, ForgeLog, LeyScale, LevelField, type LogEntry } from './ForgeParts.tsx'
import { OPTIMIZER_STATS, STAT_GROUPS, POWER_BOOSTED, LEY_PRESETS, leyPreset, matchingPreset, suggestedCap, runeStatLabelKey } from './statList.ts'
import { emptyReq, isActive, normalizeCap, loadSavedConfig, persistConfig, toWireConfig, loadForgeResult } from './forgeConfig.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { CHARACTERISTICS } from '@/engine/types.ts'
import { flattenRunes } from '@/engine/runes.ts'
import { useForgePicks, planRequired } from './forgePicks.ts'
import { ForgeItemsPanel } from './ForgeItemsPanel.tsx'

type Phase = 'locked' | 'order' | 'forging' | 'forged'
type Equipped = Partial<Record<SlotId, number>>

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

const META_MAP = new Map(OPTIMIZER_STATS.map(m => [m.key, m]))

// Measured on real multi-basin orders: every Worker keeps at least 24
// islands (fewer per Worker let one basin take them all over), and a run
// keeps at least 96 islands overall. 2 Workers x 24 found the best piece
// 3/8 times with runes; 4 x 24 and 8 x 24 found it 8/8.
const ISLANDS_PER_WORKER = 24
const MIN_TOTAL_ISLANDS = 96
const HW = Math.max(1, globalThis.navigator?.hardwareConcurrency || 4)
const BELLOWS_COOLDOWN_MS = 4000
const LOG_SIZE = 7

// How long and how wide the Forge searches. It tempers on its own only once
// `minSec` has passed, every minimum is met and `stall` generations went by
// without a significant gain (see PLATEAU_GAIN); `capSec` is the hard limit
// (Infinity: only the player tempers).
const INTENSITY: Record<ForgeIntensity, { threads: number; stall: number; minSec: number; capSec: number; temperMs: number }> = {
  quick:    { threads: Math.min(4, HW),                                  stall: 120,      minSec: 15,  capSec: 45,       temperMs: 1500 },
  standard: { threads: Math.min(HW, 8, Math.max(4, Math.floor(HW / 2))), stall: 300,      minSec: 45,  capSec: 180,      temperMs: 3000 },
  master:   { threads: Math.min(8, HW),                                  stall: 600,      minSec: 120, capSec: 480,      temperMs: 6000 },
  eternal:  { threads: Math.min(8, HW),                                  stall: Infinity, minSec: 0,   capSec: Infinity, temperMs: 6000 },
}
// Only a gain of at least this share of the quality (or 1 point) keeps the
// forge hot. With transcendence runes the hammer keeps finding +1/+2 rune
// swaps for a long time; those still show, but no longer stop the forge
// from settling once the piece is essentially done.
const PLATEAU_GAIN = 0.002
// Visual heat scale for the eternal forge, which never cools on its own.
const ETERNAL_HEAT_SCALE = 300

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

function formatCount(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`
  return String(n)
}

const fieldStyle = (active: boolean, color: string): CSSProperties => ({
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
        onCommit(isNaN(n) ? null : Math.min(max, n))
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className="w-full min-w-0 text-[11px] font-mono text-right rounded px-1 py-0.5 outline-none transition-colors"
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
  const preset = matchingPreset(meta.key, req.weight)
  const unpursued = req.minimum > 0 && req.weight === 0

  function activate() {
    if (!active) onChange({ ...req, weight: leyPreset(meta.key, 2), cap: suggestedCap(meta.key) })
  }

  return (
    <div
      className="relative rounded-lg p-2 flex flex-col gap-1 transition-all duration-200"
      style={{
        cursor:     active ? 'default' : 'pointer',
        background: active ? `color-mix(in srgb, ${meta.color} 8%, var(--surface-stone))` : 'var(--surface-stone)',
        border:     `1px solid ${active ? `color-mix(in srgb, ${meta.color} 50%, var(--metal-edge))` : 'var(--metal-edge)'}`,
        boxShadow:  active ? `0 0 14px -6px ${meta.color}` : 'none',
      }}
      onClick={activate}
      title={active ? t(`${meta.tKey}_desc`) : t('optimizer_activate_hint')}
    >
      <div className="flex items-center gap-1 min-w-0">
        <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain flex-shrink-0" />
        <span className="text-[10px] font-semibold truncate leading-tight flex-1" style={{ color: active ? meta.color : 'var(--ink-faint)' }}>
          {t(meta.tKey)}
        </span>
        {unpursued && (
          <span title={t('optimizer_unpursued_hint')}>
            <AlertTriangle size={10} style={{ color: 'var(--gold)' }} />
          </span>
        )}
        {active && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(emptyReq(meta.key)) }}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            title={t('optimizer_clear_condition')}
            aria-label={t('optimizer_clear_condition')}
          >
            <X size={10} style={{ color: 'var(--ink-faint)' }} />
          </button>
        )}
      </div>
      {active && (
        <div className="forge-log-in flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[9px] w-3 text-center flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>≥</span>
            <NumberField value={req.minimum} placeholder="—" title={t('optimizer_minimum_hint')} color={meta.color} active onCommit={v => onChange({ ...req, minimum: v ?? 0 })} />
            <span className="text-[9px] w-3 text-center flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>≤</span>
            <NumberField
              value={req.cap}
              placeholder="∞"
              title={req.strictCap ? t('optimizer_cap_strict_hint') : t('optimizer_cap_soft_hint')}
              color={req.strictCap ? 'var(--negative)' : meta.color}
              active={req.cap != null}
              onCommit={v => onChange({ ...req, cap: normalizeCap(v) })}
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
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <span className="text-[8px] uppercase tracking-wide flex-shrink-0 w-6" style={{ color: 'var(--ink-faint)' }} title={t('optimizer_ley_hint')}>{t('optimizer_ley')}</span>
            <div className="w-14 flex-shrink-0">
              <NumberField value={req.weight} placeholder="0" title={t('optimizer_ley_hint')} color={meta.color} active max={10000} onCommit={v => onChange({ ...req, weight: v ?? 0 })} />
            </div>
            <div className="flex gap-0.5 ml-auto" role="group" aria-label={t('optimizer_ley_presets')}>
              {LEY_PRESETS.map((_, level) => {
                const on = preset >= level && preset !== -1
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onChange({ ...req, weight: leyPreset(meta.key, level) })}
                    className="flex-shrink-0 transition-transform hover:scale-125"
                    style={{ width: 8, height: 8, transform: 'rotate(45deg)', borderRadius: 2, background: on ? meta.color : 'var(--surface-panel)', border: `1px solid ${on ? meta.color : 'var(--metal-edge)'}` }}
                    title={t('optimizer_ley_preset', { n: level + 1, value: leyPreset(meta.key, level) })}
                    aria-label={t('optimizer_ley_preset', { n: level + 1, value: leyPreset(meta.key, level) })}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
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
            <span key={String(ok)} className="forge-pop inline-block" style={{ color: ok ? 'var(--positive, #5cb85c)' : 'var(--negative)' }}>{ok ? '✓' : '✗'}</span>
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

// What the piece has beyond each minimum and what that is worth in ley, so
// the player knows how much room is left to ask for more.
function SurplusPanel({ reqs, result }: { reqs: ForgeRequirement[]; result: BuildResult }) {
  const { t } = useTranslation()
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
  if (rows.length === 0) return null
  const total = rows.reduce((sum, x) => sum + x.worth, 0)
  return (
    <div className="rounded-lg p-3 space-y-1.5 forge-log-in" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)', animationDelay: '200ms' }}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>⚖ {t('optimizer_surplus_title')}</p>
        <span className="text-[10px] font-mono" style={{ color: 'var(--gold)' }}>{t('optimizer_surplus_total', { n: Math.round(total).toLocaleString() })}</span>
      </div>
      <p className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_surplus_hint')}</p>
      <div className="grid gap-x-4 gap-y-1 grid-cols-1 sm:grid-cols-2">
        {rows.map(({ r, raw, extra, worth, capped }) => {
          const meta = META_MAP.get(r.stat)
          if (!meta) return null
          return (
            <div key={r.stat} className="flex items-center gap-1.5 text-[10px]">
              <img src={statIconUrl(meta.icon)} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
              <span className="truncate flex-1" style={{ color: 'var(--ink-muted)' }}>{t(meta.tKey)}</span>
              <span className="font-mono" style={{ color: meta.color }} title={t('optimizer_surplus_row', { value: raw, min: r.minimum })}>
                +{extra}{capped && <span style={{ color: 'var(--ink-faint)' }}> ({t('optimizer_surplus_capped')})</span>}
              </span>
              <span className="font-mono w-16 text-right" style={{ color: 'var(--ink-faint)' }} title={t('optimizer_ley_hint')}>
                ⚖ {Math.round(worth).toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
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
  const plateauRef   = useRef({ score: -Infinity, generation: 0 })
  const prevBestRef  = useRef<BuildResult | null>(null)
  const generationRef = useRef(0)
  const startRef     = useRef(0)
  const runRef       = useRef<Promise<number | null> | null>(null)
  const finishingRef = useRef(false)
  const presetRef    = useRef(INTENSITY.standard)
  const logIdRef     = useRef(0)

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
      if (significant) plateauRef.current = { score: top.result.score, generation }
    }
    // Ring migration: each Worker's emigrants go to the next one.
    if (emigrants?.length && workersRef.current.length > 1) {
      workersRef.current[(index + 1) % workersRef.current.length].postMessage({ type: 'inject', builds: emigrants })
    }

    const preset = presetRef.current
    const stall = generation - plateauRef.current.generation
    const eternal = !Number.isFinite(preset.stall)
    setHeat(1 - stall / (eternal ? ETERNAL_HEAT_SCALE : preset.stall))
    // The forge never cools off while minimums are still missing, nor
    // before its minimum time.
    const missing = top ? !top.result.meetsRequired : true
    setSettled(eternal && !missing && stall >= ETERNAL_HEAT_SCALE)
    const seconds = (performance.now() - startRef.current) / 1000
    if (!eternal && !missing && stall >= preset.stall && seconds >= preset.minSec) finishForging()
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
    void finishForgeRun(runRef.current, {
      allMet:  forged[0]?.meetsRequired ?? false,
      seconds: (performance.now() - startRef.current) / 1000,
    })
  }

  function stoke() {
    if (!bellowsReady || finishingRef.current) return
    workersRef.current.forEach(w => w.postMessage({ type: 'stoke' }))
    bestRef.current = { ...bestRef.current, generation: generationRef.current }
    plateauRef.current = { ...plateauRef.current, generation: generationRef.current }
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

    const preset = INTENSITY[config.intensity]
    presetRef.current = preset
    const count = preset.threads
    const picks = { required: placements.filter(p => p.status === 'placed').map(p => p.id), banned }
    const wire = toWireConfig(config, Math.max(ISLANDS_PER_WORKER, Math.ceil(MIN_TOTAL_ISLANDS / count)), level, picks)
    const base = { selectedClass, level, allocated, scrolled, equipped, runes: Object.fromEntries(Object.entries(runes).map(([slot, map]) => [slot, flattenRunes(map)])) }
    reportsRef.current = Array(count).fill(null)
    bestRef.current = { score: -Infinity, generation: 0 }
    plateauRef.current = { score: -Infinity, generation: 0 }
    setSettled(false)
    prevBestRef.current = null
    generationRef.current = 0
    finishingRef.current = false
    startRef.current = performance.now()
    // Usage stats only (shown on Explore); never blocks the forge.
    runRef.current = startForgeRun({
      intensity:     config.intensity,
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
    loadForgeResult(result, config.lockedSlots)
    handleClose()
  }

  const activeSlots = ALL_SLOTS.length - config.lockedSlots.size
  const pinnedSlots = new Map(placements.filter(p => p.status === 'placed' && p.slot).map(p => [p.slot!, p.item?.name ?? '']))
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
    const eternal = config.intensity === 'eternal'
    const stageKey = tempering
      ? 'optimizer_stage_tempering'
      : !best ? 'optimizer_stage_lighting'
      : !best.meetsRequired ? 'optimizer_stage_melting'
      : heat > 0.5 ? 'optimizer_stage_shaping'
      : 'optimizer_stage_cooling'

    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
        <div className="p-5 flex flex-col items-center gap-3 text-[11px]">
          <div
            className="w-full rounded-xl flex flex-col items-center gap-2 pt-3 pb-4 px-4"
            style={{
              background: `radial-gradient(ellipse at 50% 85%, color-mix(in srgb, var(--fire) ${Math.round(Math.max(0.1, tempering ? 0.15 : heat) * 18)}%, var(--surface-void)) 0%, var(--surface-void) 70%)`,
              border:     '1px solid color-mix(in srgb, var(--gold) 25%, var(--metal-edge))',
            }}
          >
            <ForgeScene heat={tempering ? 0.2 : Math.max(0.1, heat)} burst={burst} tempering={tempering} />
            <HeatGauge heat={tempering ? 0 : heat} label={t(stageKey)} eternal={eternal} />
            <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>
              <span>⏱ {t('optimizer_elapsed', { s: elapsed })}</span>
              <span title={t('optimizer_strikes_hint')}>🔨 {t('optimizer_strikes', { n: formatCount(strikes) })}</span>
              {best && (
                <span key={Math.round(best.score)} className="forge-flash inline-block" style={{ color: best.score < 0 ? 'var(--negative)' : 'var(--gold)' }} title={t('optimizer_quality_hint')}>
                  ✦ {t('optimizer_quality')} {Math.round(best.score).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {settled && !tempering && (
            <p className="w-full px-3 py-2 rounded-lg text-[10px] text-center forge-log-in" style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)' }}>
              ✦ {t('optimizer_plateau_hint')}
            </p>
          )}

          {best && <RequirementChecklist reqs={activeReqs} result={best} />}

          <ForgeLog entries={log} />

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
                requiredItems={required}
                onLoad={loadBuild}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={stoke}
              disabled={!bellowsReady || tempering || !best}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-all disabled:opacity-40 hover:brightness-125"
              style={{ color: 'var(--fire)', border: '1px solid color-mix(in srgb, var(--fire) 45%, transparent)', background: 'color-mix(in srgb, var(--fire) 10%, transparent)' }}
              title={t('optimizer_bellows_hint')}
            >
              <Wind size={12} className={bellowsReady ? '' : 'forge-bellows-pump'} /> {t('optimizer_bellows')}
            </button>
            <button
              onClick={finishForging}
              disabled={!best || tempering}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-all disabled:opacity-40 hover:brightness-125"
              style={{ color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 45%, transparent)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)' }}
            >
              <Anvil size={12} /> {t('optimizer_temper_now')}
            </button>
            <button
              onClick={extinguish}
              className="px-3 py-1.5 rounded-lg text-[11px] border transition-colors hover:text-[var(--ink)]"
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-bold font-display tracking-wider forge-log-in" style={{ color: 'var(--gold)' }}>
              ✦ {t('optimizer_forged_title')}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => lightForge(results.map(r => r.equipped))}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-colors hover:text-[var(--gold)]"
                style={{ color: 'var(--ink-muted)', borderColor: 'var(--metal-edge)' }}
                title={t('optimizer_reforge_hint')}
              >
                <Flame size={11} /> {t('optimizer_reforge')}
              </button>
              <button
                onClick={() => lightForge()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-colors hover:text-[var(--gold)]"
                style={{ color: 'var(--ink-muted)', borderColor: 'var(--metal-edge)' }}
              >
                <RotateCcw size={11} /> {t('optimizer_forge_again')}
              </button>
              <button
                onClick={() => setPhase('order')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-colors hover:text-[var(--gold)]"
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
              <div className="relative overflow-hidden rounded-xl" style={{ animation: 'col-rise 480ms var(--ease-out) both', boxShadow: masterpiece.meetsRequired ? '0 0 24px -8px var(--gold)' : 'none' }}>
                {masterpiece.meetsRequired && <span className="forge-shine" />}
                <BuildResultCard
                  result={masterpiece}
                  rank={1}
                  items={equipment ?? []}
                  requirements={config.stats}
                  runes={runes}
                  lockedSlots={config.lockedSlots}
                  onLoad={loadBuild}
                  onBan={banItem}
                  onPin={pinItem}
                  requiredItems={required}
                  bannedItems={banned}
                  ribbon={{ label: masterpiece.meetsRequired ? t('optimizer_masterpiece') : t('optimizer_best_piece'), gold: masterpiece.meetsRequired }}
                />
              </div>
              <SurplusPanel reqs={activeReqs} result={masterpiece} />
              {others.length > 0 && (
                <p className="text-[10px] font-semibold uppercase tracking-wide pt-1" style={{ color: 'var(--ink-faint)' }}>
                  {t('optimizer_other_pieces')}
                </p>
              )}
              {others.slice(0, 4).map((r, i) => (
                <div key={fingerprint(r)} style={{ animation: `col-rise 420ms var(--ease-out) ${120 + i * 90}ms both` }}>
                  <BuildResultCard
                    result={r}
                    rank={i + 2}
                    items={equipment ?? []}
                    requirements={config.stats}
                    runes={runes}
                    lockedSlots={config.lockedSlots}
                    onLoad={loadBuild}
                    onBan={banItem}
                    onPin={pinItem}
                    requiredItems={required}
                    bannedItems={banned}
                  />
                </div>
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
          <p className="px-3 py-2 rounded-lg forge-log-in" style={{ color: 'var(--negative)', background: 'color-mix(in srgb, var(--negative) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--negative) 30%, transparent)' }}>
            {error}
          </p>
        )}

        <p className="text-[10px] leading-snug" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_order_help')}</p>

        {/* Base build summary */}
        <div className="rounded-lg px-2.5 py-2 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
          <span className="text-[9px] uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_base_summary', { level })}</span>
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
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold transition-colors"
                title={t(`optimizer_intensity_${k}_hint`)}
                style={{
                  color:      config.intensity === k ? 'var(--surface-void)' : k === 'eternal' ? 'var(--fire)' : 'var(--ink-muted)',
                  background: config.intensity === k ? (k === 'eternal' ? 'var(--fire)' : 'var(--gold)') : 'var(--surface-stone)',
                }}
              >
                {k === 'eternal' && <InfinityIcon size={11} />}
                {t(`optimizer_intensity_${k}`)}
              </button>
            ))}
          </div>
          <span key={config.intensity} className="text-[9px] italic forge-log-in" style={{ color: 'var(--ink-faint)' }}>{t(`optimizer_intensity_${config.intensity}_hint`)}</span>
        </div>

        {/* Top config bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-1.5">
            <span style={{ color: 'var(--ink-faint)' }}>{t('optimizer_max_level')}:</span>
            <LevelField value={config.maxLevel} onCommit={v => setConfig(c => ({ ...c, maxLevel: v }))} />
          </label>
          <button onClick={() => setShowSlots(s => !s)} className="flex items-center gap-1.5 px-2 py-1 rounded border text-[10px]" style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}>
            {t('optimizer_slots')}:
            <span className="font-mono font-bold" style={{ color: 'var(--gold)' }}>{activeSlots}</span>
            <ChevronDown size={10} style={{ transform: showSlots ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
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

        <ForgeItemsPanel items={equipment ?? []} sets={sets ?? []} equipped={equipped} placements={placements} />

        {/* Slots panel */}
        {showSlots && (
          <div className="rounded-lg p-3 space-y-2 forge-log-in" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
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
                <label key={slot} className="flex items-center gap-1.5 cursor-pointer select-none" title={pinnedSlots.has(slot) ? t('optimizer_slot_pinned', { name: pinnedSlots.get(slot) }) : undefined}>
                  <input type="checkbox" checked={!config.lockedSlots.has(slot)} onChange={() => toggleSlot(slot)} className="flex-shrink-0" />
                  <span className="text-[10px] truncate" style={{ color: pinnedSlots.has(slot) ? 'var(--gold)' : 'var(--ink-muted)' }}>{t(SLOT_LABEL_KEY[slot])}</span>
                  {pinnedSlots.has(slot) && <Pin size={9} className="flex-shrink-0" style={{ color: 'var(--gold)' }} />}
                </label>
              ))}
            </div>
          </div>
        )}

        <LeyScale reqs={activeReqs} />

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
                    <span key={activeCount} className="forge-pop text-[9px] font-mono px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--gold) 15%, transparent)', color: 'var(--gold)' }}>
                      {activeCount}
                    </span>
                  )}
                  <ChevronDown size={11} style={{ color: 'var(--ink-faint)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                </button>
                {isExpanded && (
                  <div className="space-y-2 mt-1 forge-log-in">
                    {group.sections.map((section, i) => (
                      <div key={section.tKey ?? i}>
                        {section.tKey && (
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] mb-1 px-0.5" style={{ color: 'var(--ink-faint)' }}>{t(section.tKey)}</p>
                        )}
                        <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-4">
                          {section.statKeys.map(sk => {
                            const meta = META_MAP.get(sk)
                            const req = config.stats.find(s => s.stat === sk)
                            if (!meta || !req) return null
                            return <RequirementCard key={sk} meta={meta} req={req} onChange={updateReq} />
                          })}
                        </div>
                      </div>
                    ))}
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
            onClick={() => lightForge()}
            className="group flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-[12px] transition-all hover:brightness-125"
            style={{
              background: config.intensity === 'eternal' ? 'color-mix(in srgb, var(--fire) 22%, transparent)' : 'color-mix(in srgb, var(--gold) 20%, transparent)',
              border:     `1px solid color-mix(in srgb, ${config.intensity === 'eternal' ? 'var(--fire)' : 'var(--gold)'} 50%, transparent)`,
              color:      config.intensity === 'eternal' ? 'var(--fire)' : 'var(--gold)',
              boxShadow:  '0 0 18px -8px var(--fire)',
            }}
          >
            <Flame size={13} className="transition-transform group-hover:scale-125" /> {t('optimizer_light_forge')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
