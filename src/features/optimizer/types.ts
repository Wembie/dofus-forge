import type { StatBlock } from '@/engine/types.ts'
import type { SlotId, RuneMap } from '@/store/buildStore.ts'
import type { DofusClass, AllocatedCharacteristics, ScrolledCharacteristics } from '@/engine/types.ts'
import type { ForgePassiveMode } from './forgePassives.ts'

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

export type ForgeIntensity = 'quick' | 'standard' | 'master' | 'eternal' | 'custom'
/** An intensity with fixed settings (every one but the player's own). */
export type ForgePreset = Exclude<ForgeIntensity, 'custom'>

/** The player's own intensity: Workers, hard limit (0: none) and the seconds without a gain that end it. */
export type ForgeCustom = { threads: number; capSec: number; stallSec: number }

/** A line a pro exo can add; `resElemental` stands for the five elemental % resistances. */
export type ProLine =
  | 'resElemental' | 'meleeResistPercent' | 'rangedResistPercent'
  | 'spellDamagePercent' | 'weaponDamagePercent' | 'meleeDamagePercent' | 'rangedDamagePercent'

/** What a Dofus slot can hold, by item type. */
export type DofusKind = 'Dofus' | 'Trophy' | 'Prysmaradite'

export type OptimizerConfig = {
  stats:               ForgeRequirement[]
  exo:                 ExoConfig
  transcendence:       boolean
  maxLevel:            number
  lockedSlots:         Set<SlotId>
  assumeFullyScrolled: boolean
  /** Count item combat passives: not at all, at their best case, or as set in the planner. */
  passives:            ForgePassiveMode
  /** Passive items the player left out of the count. */
  passiveExcluded:     number[]
  /** The player's own setting of single passives (stacks, case, turn) on top of the mode. */
  passiveOverrides:    Record<string, number>
  /** Companion legendary bonuses the player is open to trying; when set, the
   * Forge picks whichever scores best for the order's current goals instead
   * of the planner's single saved pick. */
  companionBonusCandidates: string[]
  intensity:           ForgeIntensity
  custom:              ForgeCustom
  /** Pro forgemagie: exotic % res / % damage lines on up to `proExoMax` items. */
  proExo:              boolean
  /** Lines a pro exo may add (empty: none, the option does nothing). */
  proExoLines:         ProLine[]
  /** Most a pro exo may add on a line (e.g. 3% resistance); unset: what the weight buys. */
  proExoCaps:          Partial<Record<ProLine, number>>
  proExoMax:           number
  /** Whether the Forge may use legendary items (pinned and kept ones always count). */
  legendary:           boolean
  /** Dofus slot kinds the Forge may not use (pinned and kept items still count). */
  excludedKinds:       DofusKind[]
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
/** `exotic`: a pro forgemagie exo line rather than a transcendence rune. */
export type RuneChoice = { stat: string; value: number; exotic?: boolean }

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
