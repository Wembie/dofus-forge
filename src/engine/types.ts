export const DOFUS_CLASSES = [
  'cra', 'ecaflip', 'eniripsa', 'eliotrope', 'feca', 'foggernaut',
  'huppermage', 'iop', 'masqueraider', 'osamodas', 'ouginak', 'pandawa',
  'rogue', 'sacrier', 'sadida', 'sram', 'xelor',
] as const

export type DofusClass = (typeof DOFUS_CLASSES)[number]

export const CHARACTERISTICS = [
  'vitality', 'wisdom', 'strength', 'intelligence', 'chance', 'agility',
] as const
export type Characteristic = (typeof CHARACTERISTICS)[number]

export type AllocatedCharacteristics = Record<Characteristic, number>
export type ScrolledCharacteristics  = Record<Characteristic, boolean>

export type ItemEffect = {
  stat: string
  min:  number
  max:  number
}

export type EquippedItem = {
  ankama_id: number
  effects:   ItemEffect[]
  set_id:    number | null
}

export type SetData = {
  ankama_id: number
  items:     number[]
  bonuses:   Record<number, ItemEffect[]>
}

export type BuildInput = {
  class:     DofusClass
  level:     number
  allocated: AllocatedCharacteristics
  scrolled:  ScrolledCharacteristics
  items:     EquippedItem[]
  sets:      SetData[]
}

export type StatBlock = {
  // AP/MP/Range
  ap:    number
  mp:    number
  range: number

  // Characteristics (total: gear + alloc + scrolls)
  vitality:     number
  wisdom:       number
  strength:     number
  intelligence: number
  chance:       number
  agility:      number

  // HP
  maxHp: number

  // Power (% bonus to all elemental dmg — tracked separately from elemental dmg)
  power: number

  // Elemental damage (flat bonus)
  damage:        number  // generic (all elements)
  neutralDamage: number
  earthDamage:   number
  fireDamage:    number
  waterDamage:   number
  airDamage:     number

  // Steal (dmg + heal) by element
  neutralSteal: number
  earthSteal:   number
  fireSteal:    number
  waterSteal:   number
  airSteal:     number
  bestElemSteal: number
  bestElemDamage: number

  // Resistances (flat)
  neutralResFixed: number
  earthResFixed:   number
  fireResFixed:    number
  waterResFixed:   number
  airResFixed:     number

  // Resistances (%)
  neutralResPercent: number
  earthResPercent:   number
  fireResPercent:    number
  waterResPercent:   number
  airResPercent:     number

  // Crit
  critChance:     number
  critDamage:     number
  critResistance: number

  // Damage modifiers (%)
  meleeDamagePercent:  number
  rangedDamagePercent: number
  spellDamagePercent:  number
  weaponDamagePercent: number
  meleeResistPercent:  number
  rangedResistPercent: number

  // Special damage
  trapDamage:       number
  trapPower:        number
  pushbackDamage:   number
  pushbackResist:   number
  reflectedDamage:  number

  // Utility
  heals:       number
  initiative:  number
  lock:        number
  dodge:       number
  prospecting: number
  summons:     number
  pods:        number

  // AP/MP mechanics
  apReduction: number
  mpReduction: number
  apParry:     number
  mpParry:     number
  mpSteal:     number

  // Misc
  unknownStats: Record<string, number>

  // Budget info (read-only, derived)
  pointsBudget: number
  pointsSpent:  number
}
