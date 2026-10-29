import { useBuildStore, type SlotId } from '@/store/buildStore.ts'
import type { OptimizerConfig, BuildResult, ForgeRequirement, ForgeIntensity, OptimizerStatKey } from './types.ts'
import { OPTIMIZER_STATS, leyPreset, unitValue } from './statList.ts'
import { PASSIVE_MODES, type PassiveEffects } from './forgePassives.ts'
import type { PassiveState } from '@/engine/passives.ts'

export const STORAGE_KEY = 'dofus-forge:optimizer-config'
export const MAX_LEVEL = 200
const INTENSITIES: ForgeIntensity[] = ['quick', 'standard', 'master', 'eternal']

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

export function makeDefaultConfig(): OptimizerConfig {
  return {
    stats:               OPTIMIZER_STATS.map(s => emptyReq(s.key)),
    exo:                 { ap: true, mp: true, range: true, onlyOnRing: true, maxCount: 3 },
    transcendence:       true,
    maxLevel:            MAX_LEVEL,
    lockedSlots:         new Set(),
    assumeFullyScrolled: true,
    passives:            'off',
    intensity:           'standard',
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
      passives:            PASSIVE_MODES.includes(parsed.passives) ? parsed.passives : defaults.passives,
      stats:               OPTIMIZER_STATS.map(s => migrateReq(s.key, savedStats.find(ss => ss.stat === s.key))),
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
    bannedTypes:         [],
    requiredItems:       picks.required,
    passiveEffects:      config.passives === 'off' ? [] : passiveEffects,
    transcendence:       config.transcendence,
    islands,
  }
}

// One store update, so loading a piece is a single undo step. `passives`:
// the passive settings the Forge counted for the piece's items, so the
// planner's combat view shows the same numbers.
export function loadForgeResult(result: BuildResult, lockedSlots: ReadonlySet<SlotId>, passives?: PassiveState) {
  useBuildStore.getState().applyForgeResult({ ...result, passives }, lockedSlots)
}
