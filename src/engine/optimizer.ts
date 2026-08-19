import { computeStats } from './stats.ts'
import { STAT_MAP, WEAPON_ATTACK_IDS } from './statMap.ts'
import type { EquippedItem, SetData } from './types.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { OptimizerConfig, OptimizerBuildBase, BuildResult, OptimizerProgress, OptimizerStatKey } from '@/features/optimizer/types.ts'
import { ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'

const WEAPON_ATK_STAT_NAMES = new Set([
  'Earth damage', 'Fire damage', 'Water damage', 'Air damage', 'Neutral damage',
])

const TOP_K       = 25
const BEAM_WIDTH  = 50
const DOFUS_SLOTS = ['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6'] as SlotId[]

type BeamBuild = {
  equipped: Partial<Record<SlotId, number>>
  score:    number
}

function itemPartialScore(item: AppItem, weights: OptimizerConfig['weights']): number {
  let s = 0
  for (const eff of item.effects) {
    if (eff.effect_id != null && WEAPON_ATTACK_IDS.has(eff.effect_id)) continue
    if (item.slot === 'weapon' && WEAPON_ATK_STAT_NAMES.has(eff.stat)) continue
    const val = (eff.max !== 0 && eff.max > eff.min) ? eff.max : eff.min
    const key = (STAT_MAP as Readonly<Record<string, string | undefined>>)[eff.stat] as OptimizerStatKey | undefined
    if (!key) continue
    for (const w of weights) {
      if (w.stat === key) { s += val * w.weight; break }
    }
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
  const { weights, required, maxLevel, lockedSlots } = config

  const slotsToOptimize = ALL_SLOTS.filter(s => !lockedSlots.has(s))
  const n = slotsToOptimize.length

  // Seed beam with locked-slot items already equipped
  const lockedEquipped: Partial<Record<SlotId, number>> = {}
  for (const slot of ALL_SLOTS) {
    if (lockedSlots.has(slot) && base.equipped[slot] != null) {
      lockedEquipped[slot] = base.equipped[slot]
    }
  }

  // Pre-filter and rank items per slot
  const topPerSlot = new Map<SlotId, AppItem[]>()
  for (const slot of slotsToOptimize) {
    const filtered = items.filter(it => it.slot === slot && it.level <= maxLevel)
    filtered.sort((a, b) => itemPartialScore(b, weights) - itemPartialScore(a, weights))
    topPerSlot.set(slot, filtered.slice(0, TOP_K))
  }

  onProgress({ phase: 'prefilter', slotIndex: 0, totalSlots: n, percent: 5 })

  // Beam search
  let beam: BeamBuild[] = [{ equipped: { ...lockedEquipped }, score: 0 }]

  for (let i = 0; i < slotsToOptimize.length; i++) {
    if (cancelRef.cancelled) return []

    const slot = slotsToOptimize[i]
    const candidates = topPerSlot.get(slot) ?? []
    const next: BeamBuild[] = []

    for (const build of beam) {
      for (const item of candidates) {
        if (slot === 'ring2' && build.equipped.ring1 === item.ankama_id) continue
        if (slot.startsWith('dofus')) {
          if (DOFUS_SLOTS.some(ds => ds !== slot && build.equipped[ds] === item.ankama_id)) continue
        }
        next.push({
          equipped: { ...build.equipped, [slot]: item.ankama_id },
          score:    build.score + itemPartialScore(item, weights),
        })
      }
      // If no candidates, preserve build without item in this slot
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

    const stats = computeStats({
      class:     base.selectedClass,
      level:     base.level,
      allocated: base.allocated,
      scrolled:  base.scrolled,
      items:     equippedItems,
      sets:      setData,
    })

    // Re-score using actual computed stats (includes set bonuses)
    const statsNums = stats as unknown as Record<string, number>
    let score = 0
    for (const w of weights) score += (statsNums[w.stat] ?? 0) * w.weight

    const meetsRequired = required.every(r => (statsNums[r.stat] ?? 0) >= r.minVal)

    results.push({ equipped: build.equipped, stats, score, meetsRequired })
  }

  // Builds meeting required constraints rank first, then by score
  results.sort((a, b) => {
    if (a.meetsRequired !== b.meetsRequired) return a.meetsRequired ? -1 : 1
    return b.score - a.score
  })

  onProgress({ phase: 'evaluating', slotIndex: n, totalSlots: n, percent: 100 })

  return results.slice(0, 3)
}
