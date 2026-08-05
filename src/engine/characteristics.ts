import type { Characteristic } from './types.ts'

// Dofus 3 characteristic point-cost brackets.
//
// TODO: Verify exact brackets in Dofus 3 Unity. Assumption carried from Dofus 2:
//   Vitality   — 1 pt/1 vit (no bracket limit)
//   Wisdom     — 3 pts/1 wis (no bracket limit)
//   Elemental  — brackets: 0–100 @ 1pt, 101–200 @ 2pt, 201–300 @ 3pt, 301+ @ 4pt
//   All elemental stats (Strength, Intelligence, Chance, Agility) share same table.
//   Per-class cost differences (if any in Dofus 3) are not yet confirmed.
const ELEMENTAL_BRACKETS: readonly [number, number][] = [
  [100, 1],
  [100, 2],
  [100, 3],
  [Infinity, 4],
]

/** Points spent to allocate `points` into characteristic `char`. */
export function pointCost(char: Characteristic, points: number): number {
  if (points < 0) throw new RangeError(`points must be >= 0, got ${points}`)
  if (char === 'vitality') return points
  if (char === 'wisdom')   return points * 3

  let remaining = points
  let total = 0
  for (const [bracket, cost] of ELEMENTAL_BRACKETS) {
    const inBracket = Math.min(remaining, bracket === Infinity ? remaining : bracket)
    total += inBracket * cost
    remaining -= inBracket
    if (remaining <= 0) break
  }
  return total
}

/** Max points allocatable in `char` given a point `budget`. */
export function maxPointsForBudget(char: Characteristic, budget: number): number {
  if (char === 'vitality') return budget
  if (char === 'wisdom')   return Math.floor(budget / 3)

  let points    = 0
  let remaining = budget
  for (const [bracket, cost] of ELEMENTAL_BRACKETS) {
    const maxInBracket = bracket === Infinity ? remaining : bracket
    const affordable   = Math.floor(remaining / cost)
    const inBracket    = Math.min(affordable, maxInBracket)
    points    += inBracket
    remaining -= inBracket * cost
    if (inBracket < maxInBracket || remaining < cost) break
  }
  return points
}

/**
 * Total stat point budget at a given level.
 * TODO: Verify in Dofus 3. Assumption: 5 pts/level from level 2 onward.
 */
export function statBudget(level: number): number {
  return Math.max(0, level - 1) * 5
}

/**
 * Scroll bonus added to a characteristic when fully scrolled.
 * TODO: Verify in Dofus 3. Assumption: +100 per characteristic (same as Dofus 2).
 */
export const SCROLL_BONUS = 100
