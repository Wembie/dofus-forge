import type { SlotId } from '@/store/buildStore.ts'
import type { StatBlock } from '@/engine/types.ts'
import type { AppItem } from '@/data/loaders.ts'
import { SLOT_CONFIGS, isDofusSlot } from '@/features/equipment/slotConfig.ts'
import { matchesSlot, catalogBlock } from '@/features/equipment/catalogFilters.ts'
import { CHARACTERISTIC, ELEMENT_DAMAGE, GUIDE_ELEMENTS, SHARED_WEIGHT, type GuideElement } from '@/data/setGuide.ts'

/** An element's own stats: its characteristic plus its damage (same shape setGuide.ts's
 * elementScore uses for ranking sets — kept separate because that one scores gear-only totals,
 * and telling which element a BUILD plays needs the full stat block: allocated points and
 * scrolls matter just as much as gear, and plenty of leveling gear grants none). */
function ownStats(stats: StatBlock, el: GuideElement): number {
  return stats[CHARACTERISTIC[el]] + 5 * stats[ELEMENT_DAMAGE[el]]
}

/** The element the build is actually playing, from real (gear + allocation + scrolls) stats —
 * null when there's no elemental investment yet to tell (a fresh, unallocated build). */
export function primaryElement(stats: StatBlock): GuideElement | null {
  let best: GuideElement | null = null
  let bestVal = 0
  for (const el of GUIDE_ELEMENTS) {
    const v = ownStats(stats, el)
    if (v > bestVal) { best = el; bestVal = v }
  }
  return best
}

/** The forgemagic rune weights (setGuide.ts's SHARED_WEIGHT), plus the build's own played
 * element's characteristic and elemental damage on top — the same two terms `ownStats` sums. */
function weightsFor(element: GuideElement | null): Partial<Record<keyof StatBlock, number>> {
  const w: Partial<Record<keyof StatBlock, number>> = { ...SHARED_WEIGHT }
  if (element) {
    w[CHARACTERISTIC[element]]  = (w[CHARACTERISTIC[element]]  ?? 0) + 1
    w[ELEMENT_DAMAGE[element]] = (w[ELEMENT_DAMAGE[element]] ?? 0) + 5
  }
  return w
}

function powerScore(stats: StatBlock, weights: Partial<Record<keyof StatBlock, number>>): number {
  let score = 0
  for (const [key, weight] of Object.entries(weights) as [keyof StatBlock, number][]) score += (stats[key] as number) * weight
  return score
}

/** The single stat that improved the most — shown to the player as the concrete "why", instead
 * of an opaque score. Only considers stats that got BETTER: the swap's net score is positive
 * (it wouldn't be suggested otherwise), so some gain always exists even when a trade-off stat
 * drops — showing that drop as "the reason" reads as a downgrade, not an upgrade. */
function topStatDiff(a: StatBlock, b: StatBlock, weights: Partial<Record<keyof StatBlock, number>>): { key: keyof StatBlock; delta: number } | null {
  let top: { key: keyof StatBlock; delta: number; weighted: number } | null = null
  for (const [key, weight] of Object.entries(weights) as [keyof StatBlock, number][]) {
    const delta = (b[key] as number) - (a[key] as number)
    if (delta <= 0) continue
    const weighted = delta * weight
    if (!top || weighted > top.weighted) top = { key, delta, weighted }
  }
  return top ? { key: top.key, delta: top.delta } : null
}

export type UpgradeSuggestion = {
  slot:       SlotId
  item:       AppItem
  scoreDelta: number
  topStat:    { key: keyof StatBlock; delta: number } | null
}

/** Only scan items within this many levels under the build's level per non-Dofus slot — the
 * catalog is thousands of items; a stronger lower-level item is rarely the right suggestion and
 * this keeps the scan instant. Dofus slots are never windowed (there are few Dofuses total). */
const LEVEL_WINDOW = 30

/**
 * For each equipped slot (including empty ones), the single catalog item of the same slot/type
 * that would raise the build's overall power the most if swapped in — everything else about the
 * build (allocation, scrolls, runes, other slots) held fixed. `recomputeWith` must return the
 * exact same engine the build store itself uses (see `recompute` in `store/buildStore.ts`), so
 * results track reality precisely, including any set bonus gained or lost by the swap.
 */
export function findUpgrades(
  equipped:      Partial<Record<SlotId, number>>,
  level:         number,
  catalog:       AppItem[],
  baseStats:     StatBlock,
  recomputeWith: (slot: SlotId, candidateId: number) => StatBlock | null,
): UpgradeSuggestion[] {
  const byId      = new Map(catalog.map(it => [it.ankama_id, it]))
  const weights   = weightsFor(primaryElement(baseStats))
  const baseScore = powerScore(baseStats, weights)
  const suggestions: UpgradeSuggestion[] = []
  // Claims a unique item (a Dofus can't be worn twice) across slots scanned so far, so e.g.
  // Dofus 3/4/5 don't all independently suggest the same single best Dofus — each slot's stat
  // comparison itself still uses the real `equipped` (recomputeWith), only this exclusion list
  // grows, so suggestions stay independent "change just this one slot" comparisons.
  const claimed: Partial<Record<SlotId, number>> = { ...equipped }

  for (const slotConfig of SLOT_CONFIGS) {
    const slot      = slotConfig.id
    const currentId = equipped[slot]
    let best: { item: AppItem; score: number; stats: StatBlock } | null = null

    for (const item of catalog) {
      if (item.ankama_id === currentId) continue
      if (item.level > level) continue
      if (!isDofusSlot(slot) && level - item.level > LEVEL_WINDOW) continue
      if (!matchesSlot(item, slotConfig)) continue
      if (catalogBlock(item, slot, claimed, byId)) continue

      const candidateStats = recomputeWith(slot, item.ankama_id)
      if (!candidateStats) continue
      // AP/PM are too precious in Dofus to trade away silently for a bigger weighted total
      // elsewhere — never recommend a swap that costs either, even if the net score is higher.
      if (candidateStats.ap < baseStats.ap || candidateStats.mp < baseStats.mp) continue
      const score = powerScore(candidateStats, weights)
      if (score > baseScore && (!best || score > best.score)) best = { item, score, stats: candidateStats }
    }

    if (best) {
      suggestions.push({
        slot, item: best.item, scoreDelta: best.score - baseScore,
        topStat: topStatDiff(baseStats, best.stats, weights),
      })
      claimed[slot] = best.item.ankama_id
    }
  }

  return suggestions.sort((a, b) => b.scoreDelta - a.scoreDelta)
}
