import { withPassives as baseWithPassives, type PassiveBonus } from '../../src/engine/passives.ts'
import type { StatBlock } from '../../src/engine/types.ts'
import type { BetaStats } from './stats.ts'

export * from '../../src/engine/passives.ts'

export function withPassives(stats: StatBlock, bonus: PassiveBonus): StatBlock {
  const result = baseWithPassives(stats, bonus)
  const caps = (stats as Partial<BetaStats>).betaCaps
  if (!caps) return result
  const apRaw = stats.apRaw + (bonus.ap ?? 0), mpRaw = stats.mpRaw + (bonus.mp ?? 0)
  return { ...result, apRaw, mpRaw, ap: Math.min(apRaw, caps.ap), mp: Math.min(mpRaw, caps.mp), range: Math.min(result.range, caps.range), summons: Math.min(result.summons, caps.summons) }
}
