import { computeStats } from './stats.ts'
import { STAT_MAP, WEAPON_ATTACK_IDS } from './statMap.ts'
import type { EquippedItem, SetData } from './types.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { OptimizerConfig, OptimizerBuildBase, BuildResult, OptimizerProgress, OptimizerStatKey } from '@/features/optimizer/types.ts'
import { ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'

const WEAPON_ATK_STAT_NAMES = new Set([
  'Earth damage', 'Fire damage', 'Water damage', 'Air damage', 'Neutral damage',
])

// Items per slot kept in beam pre-filter
const TOP_K       = 50
// Max parallel builds tracked
const BEAM_WIDTH  = 120
// Base score weight for stats not explicitly in user config (ensures diverse high-level items rank high)
const BASE_WEIGHT = 0.3

const DOFUS_SLOT_IDS = ['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6'] as SlotId[]

// Companion types that can go in the companion slot
const COMPANION_TYPES = new Set(['Pet', 'Petsmount', 'Dragoturkey', 'Seemyool', 'Rhineetle'])

type BeamBuild = {
  equipped: Partial<Record<SlotId, number>>
  score:    number
}

// Map optimizer slot IDs to the item.slot + optional type filter used in the data
function filterItemsForSlot(items: AppItem[], slot: SlotId, maxLevel: number): AppItem[] {
  const leveled = items.filter(it => it.level <= maxLevel)
  if (slot === 'ring1' || slot === 'ring2') return leveled.filter(it => it.slot === 'ring')
  if (DOFUS_SLOT_IDS.includes(slot))        return leveled.filter(it => it.slot === 'dofus')
  if (slot === 'companion')                 return leveled.filter(it => it.slot === 'pet' || (it.slot === 'other' && COMPANION_TYPES.has(it.type)))
  if (slot === 'sidekick')                  return leveled.filter(it => it.slot === 'other' && it.type === 'Sidekick')
  return leveled.filter(it => it.slot === slot)
}

function itemPartialScore(item: AppItem, stats: OptimizerConfig['stats']): number {
  // Level bonus: prefer higher-level items when stat scores are similar
  let s = item.level * 0.1

  const userWeights = new Map(stats.map(c => [c.stat, c.weight]))

  for (const eff of item.effects) {
    if (eff.effect_id != null && WEAPON_ATTACK_IDS.has(eff.effect_id)) continue
    if (item.slot === 'weapon' && WEAPON_ATK_STAT_NAMES.has(eff.stat)) continue
    const val = (eff.max !== 0 && eff.max > eff.min) ? eff.max : eff.min
    const key = (STAT_MAP as Readonly<Record<string, string | undefined>>)[eff.stat] as OptimizerStatKey | undefined
    if (!key) continue
    const userWeight = userWeights.get(key)
    // All stats contribute: user-specified with their weight, rest with BASE_WEIGHT
    s += val * (userWeight != null ? userWeight : BASE_WEIGHT)
  }
  return s
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

  const slotsToOptimize = ALL_SLOTS.filter(s => !lockedSlots.has(s))
  const n = slotsToOptimize.length

  // Preserve locked items
  const lockedEquipped: Partial<Record<SlotId, number>> = {}
  for (const slot of ALL_SLOTS) {
    if (lockedSlots.has(slot) && base.equipped[slot] != null) {
      lockedEquipped[slot] = base.equipped[slot]
    }
  }

  // Pre-filter: top-K items per slot sorted by partial score
  const topPerSlot = new Map<SlotId, AppItem[]>()
  for (const slot of slotsToOptimize) {
    const filtered = filterItemsForSlot(items, slot, maxLevel)
    filtered.sort((a, b) => itemPartialScore(b, stats) - itemPartialScore(a, stats))
    topPerSlot.set(slot, filtered.slice(0, TOP_K))
  }

  onProgress({ phase: 'prefilter', slotIndex: 0, totalSlots: n, percent: 5 })

  // Beam search across all slots
  let beam: BeamBuild[] = [{ equipped: { ...lockedEquipped }, score: 0 }]

  for (let i = 0; i < slotsToOptimize.length; i++) {
    if (cancelRef.cancelled) return []

    const slot = slotsToOptimize[i]
    const candidates = topPerSlot.get(slot) ?? []
    const next: BeamBuild[] = []

    for (const build of beam) {
      for (const item of candidates) {
        // Ring uniqueness: ring1 and ring2 must be different items
        if (slot === 'ring2' && build.equipped.ring1 === item.ankama_id) continue
        // Dofus uniqueness: each of the 6 dofus slots must have a different dofus
        if (DOFUS_SLOT_IDS.includes(slot)) {
          if (DOFUS_SLOT_IDS.some(ds => ds !== slot && build.equipped[ds] === item.ankama_id)) continue
        }
        next.push({
          equipped: { ...build.equipped, [slot]: item.ankama_id },
          score:    build.score + itemPartialScore(item, stats),
        })
      }
      // No candidates for this slot → keep build as-is (slot stays empty)
      if (candidates.length === 0) next.push({ ...build })
    }

    next.sort((a, b) => b.score - a.score)
    beam = next.slice(0, BEAM_WIDTH)

    onProgress({
      phase:      'search',
      slotIndex:  i + 1,
      totalSlots: n,
      percent:    5 + Math.floor(((i + 1) / n) * 75),
    })
  }

  if (cancelRef.cancelled) return []
  onProgress({ phase: 'evaluating', slotIndex: n, totalSlots: n, percent: 80 })

  const itemMap = new Map(items.map(it => [it.ankama_id, it]))
  const setData: SetData[] = sets.map(s => ({
    ankama_id: s.ankama_id,
    items:     s.items,
    bonuses:   Object.fromEntries(
      Object.entries(s.bonuses).map(([k, v]) => [Number(k), v as EquippedItem['effects']]),
    ),
  }))

  const results: BuildResult[] = []

  for (const build of beam) {
    if (cancelRef.cancelled) return []

    const equippedItems: EquippedItem[] = []
    for (const slot of ALL_SLOTS) {
      const id = build.equipped[slot]
      if (id == null) continue
      const it = itemMap.get(id)
      if (it) equippedItems.push({ ankama_id: it.ankama_id, effects: it.effects, set_id: it.set_id, slot: it.slot })
    }

    // Full eval with computeStats — includes set bonuses
    const computedStats = computeStats({
      class:     base.selectedClass,
      level:     base.level,
      allocated: base.allocated,
      scrolled:  base.scrolled,
      items:     equippedItems,
      sets:      setData,
    })

    // Re-score using actual computed stats (set bonuses included)
    const statsNums = computedStats as unknown as Record<string, number>
    let score = 0
    for (const cfg of stats) score += (statsNums[cfg.stat] ?? 0) * cfg.weight

    const hardConstraints = stats.filter(cfg => cfg.minVal > 0)
    const meetsRequired = hardConstraints.every(cfg => (statsNums[cfg.stat] ?? 0) >= cfg.minVal)

    results.push({ equipped: build.equipped, stats: computedStats, score, meetsRequired })
  }

  // Builds meeting hard constraints rank first; within same bucket, higher score wins
  results.sort((a, b) => {
    if (a.meetsRequired !== b.meetsRequired) return a.meetsRequired ? -1 : 1
    return b.score - a.score
  })

  onProgress({ phase: 'evaluating', slotIndex: n, totalSlots: n, percent: 100 })

  return results.slice(0, 3)
}
