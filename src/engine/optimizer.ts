import { computeStats } from './stats.ts'
import { STAT_MAP, WEAPON_ATTACK_IDS } from './statMap.ts'
import type { EquippedItem, SetData } from './types.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { OptimizerConfig, OptimizerBuildBase, BuildResult, OptimizerProgress, OptimizerStatKey } from '@/features/optimizer/types.ts'
import { ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'

const WEAPON_ATK_STAT_NAMES = new Set([
  'Earth damage', 'Fire damage', 'Water damage', 'Air damage', 'Neutral damage',
])

const TOP_K              = 50   // items per slot (normal sort)
const TOP_K_CONSTRAINT   = 30   // extra items biased toward constrained stats (merged in)
const BEAM_WIDTH         = 120
const CONSTRAINT_BEAM_W  = 120
const CONSTRAINT_MULT    = 6    // weight boost for constrained stats in constraint beam
const BASE_WEIGHT        = 0.3  // unconfigured stats still count to prefer diverse high-level items
const MAX_REPAIR_PASSES  = 25   // greedy repair iterations per build
const MAX_BUILDS_REPAIR  = 20   // how many beam results to attempt repairing
const REPAIR_TOP_K       = 60   // top items per constrained stat for the repair pool

const DOFUS_SLOT_IDS = ['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6'] as SlotId[]
const COMPANION_TYPES = new Set(['Pet', 'Petsmount', 'Dragoturkey', 'Seemyool', 'Rhineetle'])

type BeamBuild = { equipped: Partial<Record<SlotId, number>>; score: number }

function filterItemsForSlot(items: AppItem[], slot: SlotId, maxLevel: number): AppItem[] {
  const leveled = items.filter(it => it.level <= maxLevel && !it.name.includes('(MJ)'))
  if (slot === 'ring1' || slot === 'ring2') return leveled.filter(it => it.slot === 'ring')
  if (DOFUS_SLOT_IDS.includes(slot))        return leveled.filter(it => it.slot === 'dofus')
  if (slot === 'companion')                 return leveled.filter(it => it.slot === 'pet' || (it.slot === 'other' && COMPANION_TYPES.has(it.type)))
  if (slot === 'sidekick')                  return leveled.filter(it => it.slot === 'other' && it.type === 'Sidekick')
  return leveled.filter(it => it.slot === slot)
}

// Sum of item's contribution to a specific stat key (used in repair)
function getItemStatContrib(item: AppItem, statKey: OptimizerStatKey): number {
  let total = 0
  for (const eff of item.effects) {
    if (eff.effect_id != null && WEAPON_ATTACK_IDS.has(eff.effect_id)) continue
    if (item.slot === 'weapon' && WEAPON_ATK_STAT_NAMES.has(eff.stat)) continue
    const val = (eff.max !== 0 && eff.max > eff.min) ? eff.max : eff.min
    const key = (STAT_MAP as Readonly<Record<string, string | undefined>>)[eff.stat] as OptimizerStatKey | undefined
    if (key === statKey) total += val
  }
  return total
}

function canEquip(equipped: Partial<Record<SlotId, number>>, slot: SlotId, item: AppItem): boolean {
  if (slot === 'ring2' && equipped.ring1 === item.ankama_id) return false
  if (DOFUS_SLOT_IDS.includes(slot) && DOFUS_SLOT_IDS.some(ds => ds !== slot && equipped[ds] === item.ankama_id)) return false
  return true
}

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

function equippedFingerprint(eq: Partial<Record<SlotId, number>>): string {
  return ALL_SLOTS.map(s => eq[s] ?? 0).join(',')
}

function runBeam(
  slots:           SlotId[],
  topPerSlot:      Map<SlotId, AppItem[]>,
  locked:          Partial<Record<SlotId, number>>,
  stats:           OptimizerConfig['stats'],
  width:           number,
  constraintBoost: boolean,
  cancelRef:       { cancelled: boolean },
): BeamBuild[] {
  let beam: BeamBuild[] = [{ equipped: { ...locked }, score: 0 }]
  for (const slot of slots) {
    if (cancelRef.cancelled) return []
    const candidates = topPerSlot.get(slot) ?? []
    const next: BeamBuild[] = []
    for (const build of beam) {
      for (const item of candidates) {
        if (!canEquip(build.equipped, slot, item)) continue
        next.push({
          equipped: { ...build.equipped, [slot]: item.ankama_id },
          score:    build.score + itemPartialScore(item, stats, constraintBoost),
        })
      }
      if (candidates.length === 0) next.push({ ...build })
    }
    next.sort((a, b) => b.score - a.score)
    beam = next.slice(0, width)
  }
  return beam
}

function buildEquippedItems(equipped: Partial<Record<SlotId, number>>, itemMap: Map<number, AppItem>): EquippedItem[] {
  const out: EquippedItem[] = []
  for (const slot of ALL_SLOTS) {
    const id = equipped[slot]
    if (id == null) continue
    const it = itemMap.get(id)
    if (it) out.push({ ankama_id: it.ankama_id, effects: it.effects, set_id: it.set_id, slot: it.slot })
  }
  return out
}

// Expand the item pool for repair: for each constrained stat, add top-K items
// ranked by that specific stat (not by overall score), so repair can always find
// the best item per slot for each constraint regardless of its general score rank.
function buildRepairPools(
  slotsToOptimize: SlotId[],
  allItems:        AppItem[],
  maxLevel:        number,
  constraints:     { stat: OptimizerStatKey; needed: number }[],
  basePool:        Map<SlotId, AppItem[]>,
): Map<SlotId, AppItem[]> {
  const pools = new Map<SlotId, AppItem[]>()
  for (const slot of slotsToOptimize) {
    const slotItems = filterItemsForSlot(allItems, slot, maxLevel)
    const seen = new Set<number>()
    const combined: AppItem[] = []
    for (const it of basePool.get(slot) ?? []) { seen.add(it.ankama_id); combined.push(it) }
    for (const { stat } of constraints) {
      const ranked = [...slotItems]
        .sort((a, b) => getItemStatContrib(b, stat) - getItemStatContrib(a, stat))
        .slice(0, REPAIR_TOP_K)
      for (const it of ranked) {
        if (!seen.has(it.ankama_id)) { seen.add(it.ankama_id); combined.push(it) }
      }
    }
    pools.set(slot, combined)
  }
  return pools
}

// Greedy repair: iteratively swap items to reduce constraint violations.
// Uses item-level stat contributions + character base stats to estimate deficits.
// Tries ALL violated constraints each pass (not just the worst one) so it can
// make progress even when the most-violated stat has no single-swap improvement.
// Only calls computeStats (full eval) in the runOptimizer loop after repair — not here.
function repairConstraints(
  equipped:        Partial<Record<SlotId, number>>,
  constraints:     { stat: OptimizerStatKey; needed: number }[],
  repairPool:      Map<SlotId, AppItem[]>,
  slotsToOptimize: SlotId[],
  itemMap:         Map<number, AppItem>,
): Partial<Record<SlotId, number>> {
  let current = { ...equipped }

  for (let pass = 0; pass < MAX_REPAIR_PASSES; pass++) {
    const itemTotals: Partial<Record<OptimizerStatKey, number>> = {}
    for (const slot of ALL_SLOTS) {
      const id = current[slot]
      if (!id) continue
      const it = itemMap.get(id)
      if (!it) continue
      for (const { stat } of constraints) {
        itemTotals[stat] = (itemTotals[stat] ?? 0) + getItemStatContrib(it, stat)
      }
    }

    const violated = constraints
      .filter(c => (itemTotals[c.stat] ?? 0) < c.needed)
      .sort((a, b) => {
        const ra = (itemTotals[a.stat] ?? 0) / Math.max(1, a.needed)
        const rb = (itemTotals[b.stat] ?? 0) / Math.max(1, b.needed)
        return ra - rb
      })
    if (violated.length === 0) break

    let madeProgress = false

    // Try each violated constraint until one yields a slot swap
    for (const target of violated) {
      let bestSlot: SlotId | null = null
      let bestItem: AppItem | null = null
      let bestGain = 0

      for (const slot of slotsToOptimize) {
        const currentId = current[slot]
        const currentIt = currentId ? itemMap.get(currentId) : undefined
        const currentContrib = currentIt ? getItemStatContrib(currentIt, target.stat) : 0

        for (const cand of repairPool.get(slot) ?? []) {
          if (cand.ankama_id === currentId) continue
          if (!canEquip(current, slot, cand)) continue
          const gain = getItemStatContrib(cand, target.stat) - currentContrib
          if (gain > bestGain) {
            bestGain = gain
            bestSlot = slot
            bestItem = cand
          }
        }
      }

      if (bestSlot && bestItem && bestGain > 0) {
        current = { ...current, [bestSlot]: bestItem.ankama_id }
        madeProgress = true
        break
      }
    }

    if (!madeProgress) break
  }

  return current
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
  const hardConstraints = stats.filter(cfg => cfg.minVal > 0)
  const hasConstraints  = hardConstraints.length > 0

  const slotsToOptimize = ALL_SLOTS.filter(s => !lockedSlots.has(s))
  const n = slotsToOptimize.length

  const lockedEquipped: Partial<Record<SlotId, number>> = {}
  for (const slot of ALL_SLOTS) {
    if (lockedSlots.has(slot) && base.equipped[slot] != null) {
      lockedEquipped[slot] = base.equipped[slot]
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

  // Base stats without any equipment — used to compute how much MORE items must contribute
  const baseStatsComputed = computeStats({
    class:     base.selectedClass,
    level:     base.level,
    allocated: base.allocated,
    scrolled:  base.scrolled,
    items:     [],
    sets:      [],
  })
  const baseNums = baseStatsComputed as unknown as Record<string, number>

  // Adjusted constraints: items need to cover max(0, minVal - characterBaseValue)
  const adjustedConstraints = hardConstraints.map(cfg => ({
    stat:   cfg.stat,
    needed: Math.max(0, cfg.minVal - (baseNums[cfg.stat] ?? 0)),
  }))

  // Pre-filter: top-K by normal score + top-K by constraint score (merged, deduped per slot)
  const topPerSlot = new Map<SlotId, AppItem[]>()
  for (const slot of slotsToOptimize) {
    const filtered = filterItemsForSlot(items, slot, maxLevel)
    const normalSorted = [...filtered].sort((a, b) => itemPartialScore(b, stats) - itemPartialScore(a, stats))
    const top = normalSorted.slice(0, TOP_K)
    if (hasConstraints) {
      const constraintSorted = [...filtered].sort((a, b) => itemPartialScore(b, stats, true) - itemPartialScore(a, stats, true))
      const seen = new Set(top.map(i => i.ankama_id))
      for (const it of constraintSorted.slice(0, TOP_K_CONSTRAINT)) {
        if (!seen.has(it.ankama_id)) { top.push(it); seen.add(it.ankama_id) }
      }
    }
    topPerSlot.set(slot, top)
  }

  onProgress({ phase: 'prefilter', slotIndex: 0, totalSlots: n, percent: 5 })

  // Beam search passes
  const primaryBeam = runBeam(slotsToOptimize, topPerSlot, lockedEquipped, stats, BEAM_WIDTH, false, cancelRef)
  if (cancelRef.cancelled) return []

  onProgress({ phase: 'search', slotIndex: n, totalSlots: n, percent: hasConstraints ? 40 : 80 })

  let constraintBeam: BeamBuild[] = []
  if (hasConstraints && !cancelRef.cancelled) {
    constraintBeam = runBeam(slotsToOptimize, topPerSlot, lockedEquipped, stats, CONSTRAINT_BEAM_W, true, cancelRef)
  }

  if (cancelRef.cancelled) return []
  onProgress({ phase: 'evaluating', slotIndex: n, totalSlots: n, percent: 75 })

  // Merge + deduplicate
  const seen = new Set<string>()
  const allBuilds: BeamBuild[] = []
  for (const build of [...primaryBeam, ...constraintBeam]) {
    const fp = buildFingerprint(build)
    if (!seen.has(fp)) { seen.add(fp); allBuilds.push(build) }
  }

  // Full evaluation of all beam results
  function evalBuild(equipped: Partial<Record<SlotId, number>>): BuildResult {
    const equippedItems = buildEquippedItems(equipped, itemMap)
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
        score += (statsNums[cfg.stat] ?? 0) * (cfg.weight > 0 ? cfg.weight : 5)
      }
    }
    const meetsRequired = hardConstraints.every(cfg => (statsNums[cfg.stat] ?? 0) >= cfg.minVal)
    return { equipped, stats: computedStats, score, meetsRequired }
  }

  const results: BuildResult[] = []
  for (const build of allBuilds) {
    if (cancelRef.cancelled) return []
    results.push(evalBuild(build.equipped))
  }

  results.sort((a, b) => {
    if (a.meetsRequired !== b.meetsRequired) return a.meetsRequired ? -1 : 1
    return b.score - a.score
  })

  // ── Repair phase ────────────────────────────────────────────────────────────
  // If no beam result meets constraints, greedily repair the best-scoring builds
  // by swapping items slot-by-slot toward the most violated constraint.
  if (hasConstraints && !results.some(r => r.meetsRequired) && !cancelRef.cancelled) {
    onProgress({ phase: 'evaluating', slotIndex: n, totalSlots: n, percent: 85 })

    // Expanded pool: top-K items per constrained stat per slot, merged with beam pool
    const repairPools = buildRepairPools(slotsToOptimize, items, maxLevel, adjustedConstraints, topPerSlot)

    const repairSeenFps = new Set(results.map(r => equippedFingerprint(r.equipped)))
    const toRepair = allBuilds.slice(0, MAX_BUILDS_REPAIR)

    for (const build of toRepair) {
      if (cancelRef.cancelled) break

      const repaired = repairConstraints(
        build.equipped,
        adjustedConstraints,
        repairPools,
        slotsToOptimize,
        itemMap,
      )

      const fp = equippedFingerprint(repaired)
      if (repairSeenFps.has(fp)) continue
      repairSeenFps.add(fp)

      const result = evalBuild(repaired)
      results.push(result)
    }

    results.sort((a, b) => {
      if (a.meetsRequired !== b.meetsRequired) return a.meetsRequired ? -1 : 1
      return b.score - a.score
    })
  }

  onProgress({ phase: 'evaluating', slotIndex: n, totalSlots: n, percent: 100 })

  return results.slice(0, 3)
}
