import type { PassiveBonus, PassiveStat } from '@/engine/passives.ts'
import { STAT_DEF_BY_KEY } from '@/features/compare/compareStats.ts'

const RES_KEYS: PassiveStat[] = ['neutralResPercent', 'earthResPercent', 'fireResPercent', 'waterResPercent', 'airResPercent']

/** One displayable line of a bonus: the stat's icon/label/color and its signed value. */
export type BonusPart = { key: string; icon: string; tKey: string; color: string; value: string; negative: boolean }

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`

/**
 * Splits a bonus into labelled parts, in a stable order. The same % on all
 * five elements reads as one "% Resistance (all)" line.
 */
export function bonusParts(bonus: PassiveBonus): BonusPart[] {
  const entries = Object.entries(bonus).filter(([, v]) => v) as [PassiveStat, number][]
  const res = RES_KEYS.map(k => bonus[k] ?? 0)
  const allRes = res[0] !== 0 && res.every(v => v === res[0])
  const parts: BonusPart[] = []
  if (allRes) {
    parts.push({ key: 'resAll', icon: 'neutral_resistance', tKey: 'passive_res_all', color: 'var(--neutral)', value: signed(res[0]), negative: res[0] < 0 })
  }
  for (const [k, v] of entries) {
    if (allRes && RES_KEYS.includes(k)) continue
    const def = STAT_DEF_BY_KEY.get(k)
    parts.push({
      key: k,
      icon: def?.icon ?? 'damage',
      // % stats carry the "%" in their label ("% Crítico"), like the stats sheet.
      tKey: def?.tKey ?? k,
      color: def?.color ?? 'var(--gold)',
      value: signed(v),
      negative: v < 0,
    })
  }
  return parts
}
