import type { PvpResist } from '@/store/pvpStore.ts'

/**
 * Real Dofus PvP damage formula: flat resistance is subtracted first,
 * then the remainder is reduced by the % resistance. Never goes below 0
 * (resistance can fully block a hit, but can't turn it into healing).
 */
export function applyResist(damage: number, resist: PvpResist): number {
  if (damage <= 0) return damage
  const afterFixed = damage - resist.fixed
  if (afterFixed <= 0) return 0
  return Math.max(0, Math.round(afterFixed * (1 - resist.percent / 100)))
}
