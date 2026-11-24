import { computeStats as baseComputeStats } from '../../src/engine/stats.ts'
import type { BuildInput, ItemEffect, StatBlock } from '../../src/engine/types.ts'

export type BetaCaps = { ap: number; mp: number; range: number; summons: number }
export type BetaStats = StatBlock & { betaCaps: BetaCaps }
export const CAP_KEYS = { 'AP Max.': 'ap', 'MP Max.': 'mp', 'Range Max.': 'range', 'Summons Max.': 'summons' } as const

export function effectCaps(effects: readonly ItemEffect[]): BetaCaps {
  const caps: BetaCaps = { ap: 12, mp: 6, range: 6, summons: 6 }
  for (const effect of effects) {
    const key = CAP_KEYS[effect.stat as keyof typeof CAP_KEYS]
    if (!key) continue
    const value = effect.max !== 0 && effect.max > effect.min ? effect.max : effect.min
    if (Number.isFinite(value) && value >= 0) caps[key] = Math.min(caps[key], value)
  }
  return caps
}

export function computeStats(input: BuildInput): BetaStats {
  const effects = input.items.flatMap(item => item.effects)
  const worn = new Map<number, Set<number>>()
  for (const item of input.items) if (item.set_id != null) {
    if (!worn.has(item.set_id)) worn.set(item.set_id, new Set())
    worn.get(item.set_id)!.add(item.ankama_id)
  }
  for (const set of input.sets) {
    const count = worn.get(set.ankama_id)?.size ?? 0
    const tier = Object.keys(set.bonuses).map(Number).filter(n => n <= count).sort((a, b) => b - a)[0]
    if (tier != null) effects.push(...set.bonuses[tier])
  }
  const betaCaps = effectCaps(effects)
  const result = baseComputeStats(input)
  for (const stat of Object.keys(CAP_KEYS)) delete result.unknownStats[stat]
  return { ...result, ap: Math.min(result.apRaw, betaCaps.ap), mp: Math.min(result.mpRaw, betaCaps.mp), range: Math.min(result.rangeRaw, betaCaps.range), summons: Math.min(result.summons, betaCaps.summons), betaCaps }
}
