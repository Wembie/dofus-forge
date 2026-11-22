import { useBuildStore, type SlotId } from '@/store/buildStore.ts'
import type { OptimizerConfig, BuildResult, ForgeRequirement, ForgeIntensity, OptimizerStatKey, DofusKind, ProLine } from './types.ts'
import { OPTIMIZER_STATS, leyPreset, unitValue } from './statList.ts'
import { PASSIVE_MODES, sanitizeExcluded, type PassiveEffects } from './forgePassives.ts'
import type { PassiveState } from '@/engine/passives.ts'
import type { AppItem } from '@/data/loaders.ts'

export const STORAGE_KEY = 'dofus-forge:optimizer-config'
export const MAX_LEVEL = 200
const INTENSITIES: ForgeIntensity[] = ['quick', 'standard', 'master', 'eternal']
export const DOFUS_KINDS: DofusKind[] = ['Trophy', 'Prysmaradite', 'Dofus']

// Pro exo weights offered: careful, pro, legend and the game's 101 limit.
export const PRO_WEIGHTS = [12, 30, 60, 101] as const
export const PRO_PRESET_KEY: Record<number, string> = { 12: 'careful', 30: 'pro', 60: 'legend', 101: 'max' }
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
/** What a pro exo of `weight` buys on a line weighing `lineWeight` per point. */
export const proValue = (weight: number, lineWeight: number) => Math.floor(Math.min(weight, 101) / lineWeight)
const nearestWeight = (w: number) => PRO_WEIGHTS.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a))
function sanitizeProWeight(parsed: Record<string, unknown>): number {
  if (typeof parsed.proExoWeight === 'number' && Number.isFinite(parsed.proExoWeight)) return nearestWeight(parsed.proExoWeight)
  // Saved as the % resistance it bought (1–5) before the weight presets.
  if (typeof parsed.proExoRes === 'number' && Number.isFinite(parsed.proExoRes)) return nearestWeight(parsed.proExoRes * 6)
  return 30
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
    legendary:           true,
    excludedKinds:       [],
    proExo:              false,
    proExoWeight:        30,
    proExoLines:         [...PRO_LINE_IDS],
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
      passives:            PASSIVE_MODES.includes(parsed.passives) ? parsed.passives : defaults.passives,
      passiveExcluded:     sanitizeExcluded(parsed.passiveExcluded),
      legendary:           parsed.legendary !== false,
      proExo:              parsed.proExo === true,
      proExoWeight:        sanitizeProWeight(parsed),
      proExoLines:         sanitizeProLines(parsed.proExoLines),
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
    proExoWeight:        config.proExoWeight,
    proExoLines:         PRO_LINES.filter(l => config.proExoLines.includes(l.id)).flatMap(l => l.stats),
    islands,
  }
}

// One store update, so loading a piece is a single undo step. `passives`:
// the passive settings the Forge counted for the piece's items, so the
// planner's combat view shows the same numbers.
export function loadForgeResult(result: BuildResult, lockedSlots: ReadonlySet<SlotId>, passives?: PassiveState) {
  useBuildStore.getState().applyForgeResult({ ...result, passives }, lockedSlots)
}
