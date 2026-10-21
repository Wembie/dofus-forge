import { useMemo } from 'react'
import type { StatBlock } from '@/engine/types.ts'
import { passiveBonus, withPassives } from '@/engine/passives.ts'
import { useBuildStore } from './buildStore.ts'

/** Gear stats plus the active passives of the equipped items: what damage and the PvP arena use. */
export function useCombatStats(): StatBlock | null {
  const stats    = useBuildStore(s => s.stats)
  const equipped = useBuildStore(s => s.equipped)
  const passives = useBuildStore(s => s.passives)
  return useMemo(
    () => (stats ? withPassives(stats, passiveBonus(Object.values(equipped), passives)) : null),
    [stats, equipped, passives],
  )
}
