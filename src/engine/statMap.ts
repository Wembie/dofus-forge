import type { StatBlock } from './types.ts'

// Maps API stat name strings (English) to StatBlock keys.
// Stat names verified against live DofusDude EN equipment data (2026-08-05).
// "max" value is used when valid (max > min && max !== 0); otherwise "min" is used.
// Range effects (e.g., "+16 to +20 Strength") use max for optimistic stat totals.
//
// Note: "Earth damage" (lowercase d) and "Earth Damage" (uppercase D) both appear
// in the data. The lowercase variant seems to be weapon-specific display.
// TODO: Confirm if lowercase variants differ semantically from uppercase.

export type StatKey = keyof Omit<StatBlock, 'unknownStats' | 'pointsBudget' | 'pointsSpent' | 'maxHp'>

export const STAT_MAP: Readonly<Record<string, StatKey>> = {
  // AP / MP / Range
  'AP':    'ap',
  'MP':    'mp',
  'Range': 'range',

  // Characteristics
  'Vitality':     'vitality',
  'Wisdom':       'wisdom',
  'Strength':     'strength',
  'Intelligence': 'intelligence',
  'Chance':       'chance',
  'Agility':      'agility',

  // Power
  'Power':        'power',
  'Power (traps)': 'trapPower',

  // Generic damage (all elements)
  'Damage': 'damage',

  // Elemental damage (flat passive bonus)
  // Both casings appear in the API: uppercase on all item types, lowercase on non-weapons too.
  // Weapon items filter their own lowercase attack-base effects out in computeStats.
  'Earth Damage':   'earthDamage',
  'Fire Damage':    'fireDamage',
  'Water Damage':   'waterDamage',
  'Air Damage':     'airDamage',
  'Neutral Damage': 'neutralDamage',
  'Earth damage':   'earthDamage',
  'Fire damage':    'fireDamage',
  'Water damage':   'waterDamage',
  'Air damage':     'airDamage',
  'Neutral damage': 'neutralDamage',

  // Steals
  'Earth steal':        'earthSteal',
  'Fire steal':         'fireSteal',
  'Air steal':          'airSteal',
  'Neutral steal':      'neutralSteal',
  'Fire heals':         'fireSteal',  // fire heal = fire steal variant
  'best-element damage': 'bestElemDamage',
  'best-element steal':  'bestElemSteal',

  // Fixed resistances
  'Earth Resistance':   'earthResFixed',
  'Fire Resistance':    'fireResFixed',
  'Water Resistance':   'waterResFixed',
  'Air Resistance':     'airResFixed',
  'Neutral Resistance': 'neutralResFixed',

  // Percent resistances
  '% Earth Resistance':   'earthResPercent',
  '% Fire Resistance':    'fireResPercent',
  '% Water Resistance':   'waterResPercent',
  '% Air Resistance':     'airResPercent',
  '% Neutral Resistance': 'neutralResPercent',

  // Crit
  '% Critical':       'critChance',
  'Critical Damage':  'critDamage',
  'Critical Resistance': 'critResistance',

  // Damage % modifiers
  '% Melee Damage':    'meleeDamagePercent',
  '% Ranged Damage':   'rangedDamagePercent',
  '% Spell Damage':    'spellDamagePercent',
  '% Weapon Damage':   'weaponDamagePercent',
  '% Melee Resistance': 'meleeResistPercent',
  '% Ranged Resistance': 'rangedResistPercent',

  // Special damage
  'Trap Damage':         'trapDamage',
  'Pushback Damage':     'pushbackDamage',
  'Pushback Resistance': 'pushbackResist',
  'reflected damage':    'reflectedDamage',

  // Utility
  'Heal':        'heals',
  'Initiative':  'initiative',
  'Lock':        'lock',
  'Dodge':       'dodge',
  'Prospecting': 'prospecting',
  'Summons':     'summons',
  'Pod':         'pods',

  // AP/MP mechanics
  'AP Reduction': 'apReduction',
  'MP Reduction': 'mpReduction',
  'AP Parry':     'apParry',
  'MP Parry':     'mpParry',
  'Steals MP':    'mpSteal',
}

// Stats we intentionally ignore (cosmetic, quest flags, spell-specific notation)
export const IGNORED_STATS = new Set([
  '-special spell-', '/', 'Emote', 'Title:', 'Exchangeable:',
  'Received on', 'Size: %', "Someone's following you!",
  'Changes appearance', 'Changes speech', 'Cooperative crafting impossible',
  'Linked to the character', 'Fertile', 'Hunting weapon',
  'Number of victims:', 'Add a temporary spell',
  'Advances by cell', 'Attracts by cell', 'Pushes back cell',
  ': + Damage', ': + Maximum Range', ': + base damage',
  ': + cast(s) per target', ': + cast(s) per turn', ': +% Critical',
  ': - AP', ': - Minimum Range', ': - cooldown',
  ': line of sight off', ': modifiable Range',
  ': occupied cell needed off', ': straight-line casting off',
  'Steals kamas',
])
