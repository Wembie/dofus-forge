import type { StatBlock } from '@/engine/types.ts'
import type { SlotId, RuneMap } from '@/store/buildStore.ts'
import type { DofusClass, AllocatedCharacteristics, ScrolledCharacteristics } from '@/engine/types.ts'

export type OptimizerStatKey = keyof Omit<StatBlock, 'unknownStats' | 'pointsBudget' | 'pointsSpent'>

// One solver condition: reach `goal` (each missing unit costs `weight`), then
// keep earning `weight` per unit up to `max`. A soft max just stops counting
// past it; an absolute max rejects builds that go over it.
export type StatConfig = {
  stat:     OptimizerStatKey
  goal:     number
  weight:   number
  max:      number | null
  absolute: boolean
}

export type ExoConfig = {
  ap:         boolean
  mp:         boolean
  range:      boolean
  onlyOnRing: boolean
  maxCount:   number
}

export type OptimizerConfig = {
  stats:               StatConfig[]
  exo:                 ExoConfig
  maxLevel:            number
  lockedSlots:         Set<SlotId>
  assumeFullyScrolled: boolean
  bannedItems:         number[]
  threads:             number
  maxGenerations:      number
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

export type BuildResult = {
  equipped:          Partial<Record<SlotId, number>>
  stats:             StatBlock
  score:             number
  meetsRequired:     boolean
  conditionsOk:      boolean
  allocated:         AllocatedCharacteristics
  scrolled:          ScrolledCharacteristics
  exo:               Partial<Record<SlotId, ExoKind>>
  requirementsMet:   number
  requirementsTotal: number
}

// Posted by each solver Worker after every step (a batch of generations).
export type SolverReport = {
  generation: number
  bestScore:  number
  results:    BuildResult[]
}
