import type { StatBlock } from '@/engine/types.ts'
import type { SlotId } from '@/store/buildStore.ts'
import type { DofusClass, AllocatedCharacteristics, ScrolledCharacteristics } from '@/engine/types.ts'

export type OptimizerStatKey = keyof Omit<StatBlock, 'unknownStats' | 'pointsBudget' | 'pointsSpent'>

export type StatConfig = {
  stat:   OptimizerStatKey
  weight: number   // 1–10 priority
  minVal: number   // 0 = no hard constraint
}

export type ExoConfig = {
  ap:    boolean
  mp:    boolean
  range: boolean
}

export type OptimizerConfig = {
  stats:       StatConfig[]
  exo:         ExoConfig
  maxLevel:    number
  lockedSlots: Set<SlotId>
}

export type OptimizerBuildBase = {
  selectedClass: DofusClass
  level:         number
  allocated:     AllocatedCharacteristics
  scrolled:      ScrolledCharacteristics
  equipped:      Partial<Record<SlotId, number>>
}

export type BuildResult = {
  equipped:      Partial<Record<SlotId, number>>
  stats:         StatBlock
  score:         number
  meetsRequired: boolean
}

export type OptimizerProgress = {
  phase:      'prefilter' | 'search' | 'evaluating'
  slotIndex:  number
  totalSlots: number
  percent:    number
}
