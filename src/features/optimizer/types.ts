import type { StatBlock } from '@/engine/types.ts'
import type { SlotId, RuneMap } from '@/store/buildStore.ts'
import type { DofusClass, AllocatedCharacteristics, ScrolledCharacteristics } from '@/engine/types.ts'

export type OptimizerStatKey = keyof Omit<StatBlock, 'unknownStats' | 'pointsBudget' | 'pointsSpent'>

// What the player asks La Forjadora for, per stat: a minimum to reach, its
// "ley" (exact value of each point: missing points cost it, surplus earns
// it) and an optional cap — strict caps reject any piece that goes over,
// soft ones just stop counting past it.
export type ForgeRequirement = {
  stat:      OptimizerStatKey
  minimum:   number
  weight:    number
  cap:       number | null
  strictCap: boolean
}

export type ExoConfig = {
  ap:         boolean
  mp:         boolean
  range:      boolean
  onlyOnRing: boolean
  maxCount:   number
}

export type ForgeIntensity = 'quick' | 'standard' | 'master' | 'eternal'

export type OptimizerConfig = {
  stats:               ForgeRequirement[]
  exo:                 ExoConfig
  transcendence:       boolean
  maxLevel:            number
  lockedSlots:         Set<SlotId>
  assumeFullyScrolled: boolean
  bannedItems:         number[]
  intensity:           ForgeIntensity
}

export type OptimizerBuildBase = {
  selectedClass: DofusClass
  level:         number
  allocated:     AllocatedCharacteristics
  scrolled:      ScrolledCharacteristics
  equipped:      Partial<Record<SlotId, number>>
  runes:         Partial<Record<SlotId, RuneMap>>
}

export type ExoKind = 'ap' | 'mp' | 'range'
export type RuneChoice = { stat: string; value: number }

export type BuildResult = {
  equipped:          Partial<Record<SlotId, number>>
  stats:             StatBlock
  score:             number
  meetsRequired:     boolean
  conditionsOk:      boolean
  allocated:         AllocatedCharacteristics
  scrolled:          ScrolledCharacteristics
  exo:               Partial<Record<SlotId, ExoKind>>
  runes:             Partial<Record<SlotId, RuneChoice>>
  requirementsMet:   number
  requirementsTotal: number
}

// Posted by each forge Worker after every step.
export type ForgeReport = {
  generation:  number
  evaluations: number
  bestScore:  number
  results:    BuildResult[]
}
