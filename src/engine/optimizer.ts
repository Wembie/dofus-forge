import { computeStats } from './stats.ts'
import { STAT_MAP, WEAPON_ATTACK_IDS } from './statMap.ts'
import type { EquippedItem, SetData } from './types.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { OptimizerConfig, OptimizerBuildBase, BuildResult, OptimizerProgress, OptimizerStatKey } from '@/features/optimizer/types.ts'
import { ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'

const WEAPON_ATK_STAT_NAMES = new Set([
  'Earth damage', 'Fire damage', 'Water damage', 'Air damage', 'Neutral damage',
])

// Items per slot kept in pre-filter (normal + constraint-extra merged)
const TOP_K              = 50
const TOP_K_CONSTRAINT   = 30   // extra items per slot biased toward constrained stats
// Beam widths per search pass
const BEAM_WIDTH         = 120  // primary beam
const CONSTRAINT_BEAM_W  = 120  // constraint-guided beam (only runs when minVal > 0 exists)
// Weight multiplier for constrained stats in the constraint beam / pre-filter
const CONSTRAINT_MULT    = 6
// Base weight for stats not in user config (keeps diverse high-level items competitive)
const BASE_WEIGHT        = 0.3

const DOFUS_SLOT_IDS = ['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6'] as SlotId[]
const COMPANION_TYPES = new Set(['Pet', 'Petsmount', 'Dragoturkey', 'Seemyool', 'Rhineetle'])

type BeamBuild = {
  equipped: Partial<Record<SlotId, number>>
  score:    number
}

function filterItemsForSlot(items: AppItem[], slot: SlotId, maxLevel: number): AppItem[] {
  const leveled = items.filter(it => it.level <= maxLevel)
  if (slot === 'ring1' || slot === 'ring2') return leveled.filter(it => it.slot === 'ring')
  if (DOFUS_SLOT_IDS.includes(slot))        return leveled.filter(it => it.slot === 'dofus')
  if (slot === 'companion')                 return leveled.filter(it => it.slot === 'pet' || (it.slot === 'other' && COMPANION_TYPES.has(it.type)))
  if (slot === 'sidekick')                  return leveled.filter(it => it.slot === 'other' && it.type === 'Sidekick')
  return leveled.filter(it => it.slot === slot)
}

// constraintBoost=true → multiply minVal-constrained stat weights by CONSTRAINT_MULT
function itemPartialScore(item: AppItem, stats: OptimizerConfig['stats'], constraintBoost = false): number {
  let s = item.level * 0.1
  const cfgMap = new Map(stats.map(c => [c.stat, c]))

  for (const eff of item.effects) {
    if (eff.effect_id != null && WEAPON_ATTACK_IDS.has(eff.effect_id)) continue
    if (item.slot === 'weapon' && WEAPON_ATK_STAT_NAMES.has(eff.stat)) continue
    const val = (eff.max !== 0 && eff.max > eff.min) ? eff.max : eff.min
    const key = (STAT_MAP as Readonly<Record<string, string | undefined>>)[eff.stat] as OptimizerStatKey | undefined
    if (!key) continue
    const cfg = cfgMap.get(key)
    let weight: number
    // weight=0 means not configured (all stats pre-initialized at 0) → use BASE_WEIGHT
    if (cfg && (cfg.weight > 0 || cfg.minVal > 0)) {
      const w = cfg.weight > 0 ? cfg.weight : 5
      weight = w * (constraintBoost && cfg.minVal > 0 ? CONSTRAINT_MULT : 1)
    } else {
      weight = BASE_WEIGHT
    }
    s += val * weight
  }
  return s
}

function buildFingerprint(b: BeamBuild): string {
  return ALL_SLOTS.map(s => b.equipped[s] ?? 0).join(',')
}

function runBeam(
  slotsToOptimize: SlotId[],
  topPerSlot:      Map<SlotId, AppItem[]>,
  lockedEquipped:  Partial<Record<SlotId, number>>,
  stats:           OptimizerConfig['stats'],
  beamWidth:       number,
  constraintBoost: boolean,
  cancelRef:       { cancelled: boolean },
): BeamBuild[] {
  let beam: BeamBuild[] = [{ equipped: { ...lockedEquipped }, score: 0 }]

  for (const slot of slotsToOptimize) {
    if (cancelRef.cancelled) return []
    const candidates = topPerSlot.get(slot) ?? []
    const next: BeamBuild[] = []

    for (const build of beam) {
      for (const item of candidates) {
        if (slot === 'ring2' && build.equipped.ring1 === item.ankama_id) continue
        if (DOFUS_SLOT_IDS.includes(slot)) {
          if (DOFUS_SLOT_IDS.some(ds => ds !== slot && build.equipped[ds] === item.ankama_id)) continue
        }
        next.push({
          equipped: { ...build.equipped, [slot]: item.ankama_id },
          score:    build.score + itemPartialScore(item, stats, constraintBoost),
        })
      }
      if (candidates.length === 0) next.push({ ...build })
    }

    next.sort((a, b) => b.score - a.score)
    beam = next.slice(0, beamWidth)
  }

  return beam
}

export function runOptimizer(
  config:     OptimizerConfig,
  items:      AppItem[],
  sets:       AppSet[],
  base:       OptimizerBuildBase,
  onProgress: (p: OptimizerProgress) => void,
  cancelRef:  { cancelled: boolean },
): BuildResult[] {
  const { stats, maxLevel, lockedSlots } = config
  const hasConstraints = stats.some(s => s.minVal > 0)

  const slotsToOptimize = ALL_SLOTS.filter(s => !lockedSlots.has(s))
  const n = slotsToOptimize.length

  const lockedEquipped: Partial<Record<SlotId, number>> = {}
  for (const slot of ALL_SLOTS) {
    if (lockedSlots.has(slot) && base.equipped[slot] != null) {
      lockedEquipped[slot] = base.equipped[slot]
    }
  }

  // Pre-filter: top-K by normal score + extra top-K by constraint score (merged, deduped)
  const topPerSlot = new Map<SlotId, AppItem[]>()
  for (const slot of slotsToOptimize) {
    const filtered = filterItemsForSlot(items, slot, maxLevel)

    const normalSorted = [...filtered].sort((a, b) => itemPartialScore(b, stats) - itemPartialScore(a, stats))
    const top = normalSorted.slice(0, TOP_K)

    if (hasConstraints) {
      const constraintSorted = [...filtered].sort((a, b) => itemPartialScore(b, stats, true) - itemPartialScore(a, stats, true))
      const seen = new Set(top.map(i => i.ankama_id))
      for (const it of constraintSorted.slice(0, TOP_K_CONSTRAINT)) {
        if (!seen.has(it.ankama_id)) {
          top.push(it)
          seen.add(it.ankama_id)
        }
      }
    }

    topPerSlot.set(slot, top)
  }

  onProgress({ phase: 'prefilter', slotIndex: 0, totalSlots: n, percent: 5 })

  // Primary beam: optimize for weighted score
  const primaryBeam = runBeam(slotsToOptimize, topPerSlot, lockedEquipped, stats, BEAM_WIDTH, false, cancelRef)
  if (cancelRef.cancelled) return []

  onProgress({ phase: 'search', slotIndex: n, totalSlots: n, percent: hasConstraints ? 45 : 80 })

  // Constraint beam: boosted weights for minVal stats — finds builds meeting requirements
  let constraintBeam: BeamBuild[] = []
  if (hasConstraints && !cancelRef.cancelled) {
    constraintBeam = runBeam(slotsToOptimize, topPerSlot, lockedEquipped, stats, CONSTRAINT_BEAM_W, true, cancelRef)
  }

  if (cancelRef.cancelled) return []
  onProgress({ phase: 'evaluating', slotIndex: n, totalSlots: n, percent: 80 })

  // Merge beams, deduplicate by slot fingerprint
  const seen = new Set<string>()
  const allBuilds: BeamBuild[] = []
  for (const build of [...primaryBeam, ...constraintBeam]) {
    const fp = buildFingerprint(build)
    if (!seen.has(fp)) {
      seen.add(fp)
      allBuilds.push(build)
    }
  }

  const itemMap = new Map(items.map(it => [it.ankama_id, it]))
  const setData: SetData[] = sets.map(s => ({
    ankama_id: s.ankama_id,
    items:     s.items,
    bonuses:   Object.fromEntries(
      Object.entries(s.bonuses).map(([k, v]) => [Number(k), v as EquippedItem['effects']]),
    ),
  }))

  const results: BuildResult[] = []

  for (const build of allBuilds) {
    if (cancelRef.cancelled) return []

    const equippedItems: EquippedItem[] = []
    for (const slot of ALL_SLOTS) {
      const id = build.equipped[slot]
      if (id == null) continue
      const it = itemMap.get(id)
      if (it) equippedItems.push({ ankama_id: it.ankama_id, effects: it.effects, set_id: it.set_id, slot: it.slot })
    }

    const computedStats = computeStats({
      class:     base.selectedClass,
      level:     base.level,
      allocated: base.allocated,
      scrolled:  base.scrolled,
      items:     equippedItems,
      sets:      setData,
    })

    const statsNums = computedStats as unknown as Record<string, number>
    let score = 0
    for (const cfg of stats) {
      if (cfg.weight > 0 || cfg.minVal > 0) {
        const w = cfg.weight > 0 ? cfg.weight : 5
        score += (statsNums[cfg.stat] ?? 0) * w
      }
    }

    const hardConstraints = stats.filter(cfg => cfg.minVal > 0)
    const meetsRequired = hardConstraints.every(cfg => (statsNums[cfg.stat] ?? 0) >= cfg.minVal)

    results.push({ equipped: build.equipped, stats: computedStats, score, meetsRequired })
  }

  // Constraint-meeting builds first; within same bucket, higher score wins
  results.sort((a, b) => {
    if (a.meetsRequired !== b.meetsRequired) return a.meetsRequired ? -1 : 1
    return b.score - a.score
  })

  onProgress({ phase: 'evaluating', slotIndex: n, totalSlots: n, percent: 100 })

  return results.slice(0, 3)
}
