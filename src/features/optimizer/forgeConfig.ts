import { useBuildStore, type SlotId } from '@/store/buildStore.ts'
import type { OptimizerConfig, BuildResult, ForgeRequirement, ForgeIntensity, ForgeCustom, OptimizerStatKey, DofusKind, ProLine } from './types.ts'
import { OPTIMIZER_STATS, leyPreset, suggestedCap, unitValue } from './statList.ts'
import { PASSIVE_MODES, sanitizeExcluded, type PassiveEffects } from './forgePassives.ts'
import type { PassiveState } from '@/engine/passives.ts'
import type { AppItem } from '@/data/loaders.ts'

export const STORAGE_KEY = 'dofus-forge:optimizer-config'
export const MAX_LEVEL = 200
const INTENSITIES: ForgeIntensity[] = ['quick', 'standard', 'master', 'eternal', 'custom']
// Choices the Advanced settings offer (a hard limit of 0 means none).
export const CUSTOM_CAPS = [30, 60, 90, 120, 180, 300, 480, 0] as const
export const CUSTOM_STALLS = [5, 10, 15, 20, 30, 45, 60, 90] as const
const DEFAULT_CUSTOM: ForgeCustom = { threads: 4, capSec: 120, stallSec: 20 }
function sanitizeCustom(raw: unknown): ForgeCustom {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const pick = <T extends number>(v: unknown, list: readonly T[], fallback: T): T => (list as readonly unknown[]).includes(v) ? (v as T) : fallback
  return {
    threads:  intIn(r.threads, 1, 32, DEFAULT_CUSTOM.threads),
    capSec:   pick(r.capSec, CUSTOM_CAPS, 120),
    stallSec: pick(r.stallSec, CUSTOM_STALLS, 20),
  }
}
export const DOFUS_KINDS: DofusKind[] = ['Trophy', 'Prysmaradite', 'Dofus']

// The weight an exo made with regular runes reaches in practice: 5% resistance
// (weight 6 a point) or 2% damage (weight 15).
export const PRO_WEIGHT = 30
export const PRO_LINES: { id: ProLine; stats: OptimizerStatKey[]; weight: number }[] = [
  { id: 'resElemental',        stats: ['neutralResPercent', 'earthResPercent', 'fireResPercent', 'waterResPercent', 'airResPercent'], weight: 6 },
  { id: 'meleeResistPercent',  stats: ['meleeResistPercent'],  weight: 15 },
  { id: 'rangedResistPercent', stats: ['rangedResistPercent'], weight: 15 },
  { id: 'spellDamagePercent',  stats: ['spellDamagePercent'],  weight: 15 },
  { id: 'weaponDamagePercent', stats: ['weaponDamagePercent'], weight: 15 },
  { id: 'meleeDamagePercent',  stats: ['meleeDamagePercent'],  weight: 15 },
  { id: 'rangedDamagePercent', stats: ['rangedDamagePercent'], weight: 15 },
]
const PRO_LINE_IDS = PRO_LINES.map(l => l.id)
/** The most a pro exo adds on a line weighing `lineWeight` per point. */
export const proValue = (lineWeight: number) => Math.floor(PRO_WEIGHT / lineWeight)
function sanitizeProCaps(raw: unknown): Partial<Record<ProLine, number>> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Partial<Record<ProLine, number>> = {}
  for (const id of PRO_LINE_IDS) {
    const v = (raw as Record<string, unknown>)[id]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 1) out[id] = Math.min(16, Math.floor(v))
  }
  return out
}
function sanitizeProLines(raw: unknown): ProLine[] {
  return Array.isArray(raw) ? PRO_LINE_IDS.filter(id => raw.includes(id)) : [...PRO_LINE_IDS]
}
const intIn = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : fallback

export function sanitizeKinds(raw: unknown): DofusKind[] {
  return Array.isArray(raw) ? DOFUS_KINDS.filter(k => raw.includes(k)) : []
}

export const emptyReq = (stat: OptimizerStatKey): ForgeRequirement => ({ stat, minimum: 0, weight: 0, cap: null, strictCap: false })
// A strict cap alone is an order too: "never more than X".
export const isActive = (r: ForgeRequirement) => r.minimum > 0 || r.weight > 0 || (r.strictCap && r.cap != null)
// An empty cap field shows "∞", so a cap of 0 means no cap.
export const normalizeCap = (cap: number | null | undefined): number | null => (cap ? cap : null)

export function clampLevel(v: number | null | undefined, fallback = MAX_LEVEL): number {
  if (v == null || !Number.isFinite(v)) return fallback
  return Math.max(1, Math.min(MAX_LEVEL, Math.floor(v)))
}

// Bumped when a forgemagie/scroll default changes, so saves made under the
// previous defaults pick up the new ones once.
const DEFAULTS_REV = 2

// The minimum (and cap) a goal starts with when the player turns it on,
// e.g. 12 AP. Keys: OPTIMIZER_STATS in statList.ts. `cap` is optional:
// left out, the goal takes the stat's suggested cap (suggestedCap).
const DEFAULT_GOALS: Partial<Record<OptimizerStatKey, { minimum: number; cap?: number }>> = {
  ap: { minimum: 12, cap: 12 },
  mp: { minimum: 6, cap: 6 },
}

/** A goal as it starts when the player turns it on: default ley, minimum and cap. */
export function activatedReq(stat: OptimizerStatKey): ForgeRequirement {
  const goal = DEFAULT_GOALS[stat]
  return { stat, minimum: goal?.minimum ?? 0, weight: leyPreset(stat, 2), cap: goal?.cap ?? suggestedCap(stat), strictCap: false }
}

export function makeDefaultConfig(): OptimizerConfig {
  return {
    stats:               OPTIMIZER_STATS.map(s => emptyReq(s.key)),
    exo:                 { ap: true, mp: true, range: true, onlyOnRing: true, maxCount: 3 },
    transcendence:       true,
    maxLevel:            MAX_LEVEL,
    lockedSlots:         new Set(),
    assumeFullyScrolled: true,
    passives:            'off',
    passiveExcluded:     [],
    intensity:           'standard',
    custom:              { ...DEFAULT_CUSTOM },
    legendary:           true,
    excludedKinds:       [],
    proExo:              false,
    proExoLines:         [...PRO_LINE_IDS],
    proExoCaps:          {},
    proExoMax:           2,
  }
}

// Earlier saves: { minVal, weight 1–10 }, { goal, weight, max, absolute } or
// { minimum, importance 0–5, cap, strictCap }.
export function migrateReq(stat: OptimizerStatKey, saved: Record<string, unknown> | undefined): ForgeRequirement {
  if (!saved) return emptyReq(stat)
  const num = (k: string) => (typeof saved[k] === 'number' ? saved[k] as number : 0)
  const cap = normalizeCap(typeof saved.cap === 'number' ? saved.cap : typeof saved.max === 'number' ? saved.max : null)
  const strictCap = saved.strictCap === true || saved.absolute === true
  if (typeof saved.minimum === 'number' && typeof saved.weight === 'number') {
    return { stat, minimum: num('minimum'), weight: num('weight'), cap, strictCap }
  }
  if (typeof saved.importance === 'number') {
    const level = num('importance')
    const minimum = num('minimum')
    // Importance 0 on a minimum used to mean the default importance.
    const weight = level > 0 ? leyPreset(stat, level - 1) : minimum > 0 ? leyPreset(stat, 2) : 0
    return { stat, minimum, weight, cap, strictCap }
  }
  if (typeof saved.goal === 'number') {
    return { stat, minimum: num('goal'), weight: num('weight'), cap, strictCap }
  }
  const minimum = num('minVal')
  if (minimum <= 0 && num('weight') <= 0) return emptyReq(stat)
  return { stat, minimum, weight: unitValue(stat), cap, strictCap }
}

export function loadSavedConfig(): OptimizerConfig {
  const defaults = makeDefaultConfig()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    const savedStats = (parsed.stats ?? []) as Record<string, unknown>[]
    const current = parsed.defaultsRev === DEFAULTS_REV
    return {
      ...defaults,
      maxLevel:            typeof parsed.maxLevel === 'number' ? clampLevel(parsed.maxLevel) : defaults.maxLevel,
      assumeFullyScrolled: current && typeof parsed.assumeFullyScrolled === 'boolean' ? parsed.assumeFullyScrolled : defaults.assumeFullyScrolled,
      transcendence:       parsed.transcendence !== false,
      exo:                 { ...defaults.exo, ...(current && typeof parsed.exo?.onlyOnRing === 'boolean' ? parsed.exo : {}) },
      lockedSlots:         new Set<SlotId>(parsed.lockedSlots ?? []),
      intensity:           INTENSITIES.includes(parsed.intensity) ? parsed.intensity : defaults.intensity,
      custom:              sanitizeCustom(parsed.custom),
      passives:            PASSIVE_MODES.includes(parsed.passives) ? parsed.passives : defaults.passives,
      passiveExcluded:     sanitizeExcluded(parsed.passiveExcluded),
      legendary:           parsed.legendary !== false,
      proExo:              parsed.proExo === true,
      proExoLines:         sanitizeProLines(parsed.proExoLines),
      proExoCaps:          sanitizeProCaps(parsed.proExoCaps),
      proExoMax:           intIn(parsed.proExoMax, 1, 9, defaults.proExoMax),
      excludedKinds:       sanitizeKinds(parsed.excludedKinds),
      // Vitality is no longer offered as a goal (HP covers it); an old order drops it.
      stats:               OPTIMIZER_STATS.map(s => s.key === 'vitality' ? emptyReq(s.key) : migrateReq(s.key, savedStats.find(ss => ss.stat === s.key))),
    }
  } catch {
    return defaults
  }
}

export function persistConfig(config: OptimizerConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, lockedSlots: [...config.lockedSlots], defaultsRev: DEFAULTS_REV }))
  } catch { /* quota errors ignored */ }
}

// Equipping a piece from the catalogue can lock its slot for the next Forge
// run, without the Forge modal ever mounting. Reads and writes the same
// saved config the modal itself loads into state, so the lock is there
// whenever it opens next.
export function pinSlotForForge(slot: SlotId) {
  const config = loadSavedConfig()
  if (config.lockedSlots.has(slot)) return
  persistConfig({ ...config, lockedSlots: new Set([...config.lockedSlots, slot]) })
}

// With legendary items off, every one of them is banned except the pinned ones.
export function withLegendaryBans(
  config: OptimizerConfig, picks: { required: number[]; banned: number[] }, items: readonly AppItem[],
) {
  if (config.legendary) return picks
  const extra = items.filter(it => it.legendary && !picks.required.includes(it.ankama_id) && !picks.banned.includes(it.ankama_id))
  return { ...picks, banned: [...picks.banned, ...extra.map(it => it.ankama_id)] }
}

// `picks.required` holds only the items planRequired() could place.
export function toWireConfig(
  config: OptimizerConfig, islands: number, characterLevel: number,
  picks: { required: number[]; banned: number[] } = { required: [], banned: [] },
  passiveEffects: PassiveEffects[] = [],
) {
  return {
    stats: config.stats.filter(isActive).map(r => {
      const cap = normalizeCap(r.cap)
      return {
        stat:     r.stat,
        goal:     r.minimum,
        weight:   r.weight,
        max:      cap,
        absolute: r.strictCap && cap != null,
      }
    }),
    exo:                 config.exo,
    maxLevel:            Math.min(clampLevel(config.maxLevel), clampLevel(characterLevel)),
    lockedSlots:         [...config.lockedSlots],
    assumeFullyScrolled: config.assumeFullyScrolled,
    bannedItems:         picks.banned,
    bannedTypes:         config.excludedKinds,
    requiredItems:       picks.required,
    passiveEffects:      config.passives === 'off' ? [] : passiveEffects,
    transcendence:       config.transcendence,
    proExoMax:           config.proExo && config.proExoLines.length ? config.proExoMax : 0,
    proExoWeight:        PRO_WEIGHT,
    proExoLines:         PRO_LINES.filter(l => config.proExoLines.includes(l.id)).flatMap(l => l.stats),
    proExoCaps:          Object.fromEntries(PRO_LINES.filter(l => config.proExoCaps[l.id]).flatMap(l => l.stats.map(s => [s, config.proExoCaps[l.id]]))),
    islands,
  }
}

// One store update, so loading a piece is a single undo step. `passives`:
// the passive settings the Forge counted for the piece's items, so the
// planner's combat view shows the same numbers.
export function loadForgeResult(result: BuildResult, lockedSlots: ReadonlySet<SlotId>, passives?: PassiveState) {
  useBuildStore.getState().applyForgeResult({ ...result, passives }, lockedSlots)
}
