import type { StatBlock } from '@/engine/types.ts'
import type { SlotId } from '@/store/buildStore.ts'

export type GapSeverity = 'critical' | 'warning' | 'info'

export type GapFinding =
  | { id: string; severity: GapSeverity; kind: 'empty_slot'; slot: SlotId }
  | { id: string; severity: GapSeverity; kind: 'empty_dofus'; count: number }
  | { id: string; severity: GapSeverity; kind: 'low_ap'; value: number; target: number; level: number }
  | { id: string; severity: GapSeverity; kind: 'low_mp'; value: number; target: number; level: number }
  | { id: string; severity: GapSeverity; kind: 'negative_res'; statTKey: string }
  | { id: string; severity: GapSeverity; kind: 'no_crit' }
  | { id: string; severity: GapSeverity; kind: 'low_hp'; value: number; level: number }

// Always-equippable regardless of class/weapon choice — unlike shield (2H
// weapons preclude it) or companion/sidekick (genuinely optional), an empty
// one of these is never a deliberate build choice.
const CORE_SLOTS: SlotId[] = ['hat', 'cape', 'amulet', 'ring1', 'ring2', 'belt', 'boots', 'weapon']
const DOFUS_SLOTS: SlotId[] = ['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6']

// Rough AP/MP breakpoints most meta builds converge on by level bracket.
// Intentionally coarse — this is a nudge, not a simulator.
const AP_MP_TIERS: { minLevel: number; ap: number; mp: number }[] = [
  { minLevel: 200, ap: 12, mp: 6 },
  { minLevel: 140, ap: 10, mp: 5 },
  { minLevel: 80,  ap: 8,  mp: 4 },
  { minLevel: 35,  ap: 7,  mp: 3 },
]

const RES_KEYS: { fixed: keyof StatBlock; pct: keyof StatBlock; statTKey: string }[] = [
  { fixed: 'neutralResFixed', pct: 'neutralResPercent', statTKey: 'stat_neutral_res' },
  { fixed: 'earthResFixed',   pct: 'earthResPercent',   statTKey: 'stat_earth_res' },
  { fixed: 'fireResFixed',    pct: 'fireResPercent',    statTKey: 'stat_fire_res' },
  { fixed: 'waterResFixed',   pct: 'waterResPercent',   statTKey: 'stat_water_res' },
  { fixed: 'airResFixed',     pct: 'airResPercent',     statTKey: 'stat_air_res' },
]

const SEVERITY_ORDER: Record<GapSeverity, number> = { critical: 0, warning: 1, info: 2 }

export function analyzeGaps(
  stats: StatBlock,
  level: number,
  equipped: Partial<Record<SlotId, number>>,
): GapFinding[] {
  const findings: GapFinding[] = []

  for (const slot of CORE_SLOTS) {
    if (!equipped[slot]) findings.push({ id: `empty_${slot}`, severity: 'warning', kind: 'empty_slot', slot })
  }

  const emptyDofus = DOFUS_SLOTS.filter(slot => !equipped[slot]).length
  if (emptyDofus > 0 && level >= 20) {
    findings.push({ id: 'empty_dofus', severity: 'info', kind: 'empty_dofus', count: emptyDofus })
  }

  const tier = AP_MP_TIERS.find(t => level >= t.minLevel)
  if (tier) {
    if (stats.ap < tier.ap) findings.push({ id: 'low_ap', severity: 'warning', kind: 'low_ap', value: stats.ap, target: tier.ap, level })
    if (stats.mp < tier.mp) findings.push({ id: 'low_mp', severity: 'warning', kind: 'low_mp', value: stats.mp, target: tier.mp, level })
  }

  for (const res of RES_KEYS) {
    if ((stats[res.fixed] as number) < 0 || (stats[res.pct] as number) < 0) {
      findings.push({ id: `neg_res_${res.fixed}`, severity: 'critical', kind: 'negative_res', statTKey: res.statTKey })
    }
  }

  if (stats.critChance === 0) findings.push({ id: 'no_crit', severity: 'info', kind: 'no_crit' })

  if (level >= 20 && stats.maxHp < level * 20 * 0.6) {
    findings.push({ id: 'low_hp', severity: 'info', kind: 'low_hp', value: stats.maxHp, level })
  }

  return findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
