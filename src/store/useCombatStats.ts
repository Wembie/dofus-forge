import { useMemo } from 'react'
import type { StatBlock } from '@/engine/types.ts'
import { passiveBonus, withPassives } from '@/engine/passives.ts'
import { legendaryStatBonus } from '@/engine/petLegendary.ts'
import { useBuildStore } from './buildStore.ts'

/** Gear stats plus the active passives of the equipped items (Dofus,
 * Prysmaradites, legendary gear) and the companion's legendary bonus, if any
 * and a companion is actually equipped: what damage and the PvP arena use. */
export function useCombatStats(): StatBlock | null {
  const stats     = useBuildStore(s => s.stats)
  const equipped  = useBuildStore(s => s.equipped)
  const passives  = useBuildStore(s => s.passives)
  const companion = useBuildStore(s => s.equipped.companion)
  const legendary = useBuildStore(s => s.legendaryBonus)
  return useMemo(() => {
    if (!stats) return null
    const withGear = withPassives(stats, passiveBonus(Object.values(equipped), passives))
    return companion ? withPassives(withGear, legendaryStatBonus(legendary)) : withGear
  }, [stats, equipped, passives, companion, legendary])
}
