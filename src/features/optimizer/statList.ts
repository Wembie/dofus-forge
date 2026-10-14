import type { OptimizerStatKey } from './types.ts'

export type OptimizerStatMeta = {
  key:   OptimizerStatKey
  icon:  string
  color: string
  tKey:  string
}

export const OPTIMIZER_STATS: OptimizerStatMeta[] = [
  // Core
  { key: 'ap',               icon: 'ap',                   color: 'var(--ap)',       tKey: 'stat_ap' },
  { key: 'mp',               icon: 'mp',                   color: 'var(--mp)',       tKey: 'stat_mp' },
  { key: 'range',            icon: 'range',                color: 'var(--water)',    tKey: 'stat_range' },
  { key: 'maxHp',            icon: 'vitality',             color: 'var(--vitality)', tKey: 'stat_hp' },
  // Characteristics
  { key: 'vitality',         icon: 'vitality',             color: 'var(--vitality)', tKey: 'stat_vitality' },
  { key: 'wisdom',           icon: 'wisdom',               color: 'var(--wisdom)',   tKey: 'stat_wisdom' },
  { key: 'strength',         icon: 'strength',             color: 'var(--earth)',    tKey: 'stat_strength' },
  { key: 'intelligence',     icon: 'intelligence',         color: 'var(--fire)',     tKey: 'stat_intelligence' },
  { key: 'chance',           icon: 'chance',               color: 'var(--water)',    tKey: 'stat_chance' },
  { key: 'agility',          icon: 'agility',              color: 'var(--air)',      tKey: 'stat_agility' },
  // Power / Generic damage
  { key: 'power',            icon: 'power',                color: 'var(--gold)',     tKey: 'stat_power' },
  { key: 'damage',           icon: 'damage',               color: 'var(--neutral)',  tKey: 'stat_damage' },
  // Elemental damage
  { key: 'fireDamage',       icon: 'intelligence_damage',  color: 'var(--fire)',     tKey: 'stat_fire_damage' },
  { key: 'earthDamage',      icon: 'strength_damage',      color: 'var(--earth)',    tKey: 'stat_earth_damage' },
  { key: 'waterDamage',      icon: 'chance_damage',        color: 'var(--water)',    tKey: 'stat_water_damage' },
  { key: 'airDamage',        icon: 'agility_damage',       color: 'var(--air)',      tKey: 'stat_air_damage' },
  { key: 'neutralDamage',    icon: 'neutral',              color: 'var(--neutral)',  tKey: 'stat_neutral_damage' },
  { key: 'bestElemDamage',   icon: 'power',                color: 'var(--gold)',     tKey: 'stat_best_elem_dmg' },
  // Steals
  { key: 'fireSteal',        icon: 'intelligence_damage',  color: 'var(--fire)',     tKey: 'stat_fire_steal' },
  { key: 'earthSteal',       icon: 'strength_damage',      color: 'var(--earth)',    tKey: 'stat_earth_steal' },
  { key: 'waterSteal',       icon: 'chance_damage',        color: 'var(--water)',    tKey: 'stat_water_steal' },
  { key: 'airSteal',         icon: 'agility_damage',       color: 'var(--air)',      tKey: 'stat_air_steal' },
  { key: 'neutralSteal',     icon: 'neutral',              color: 'var(--neutral)',  tKey: 'stat_neutral_steal' },
  { key: 'bestElemSteal',    icon: 'power',                color: 'var(--gold)',     tKey: 'stat_best_elem_steal' },
  // Crit
  { key: 'critChance',       icon: 'crit',                 color: 'var(--crit)',     tKey: 'stat_crit_chance' },
  { key: 'critDamage',       icon: 'crit_damage',          color: 'var(--crit)',     tKey: 'stat_crit_damage' },
  { key: 'critResistance',   icon: 'crit_res',             color: 'var(--neutral)',  tKey: 'stat_crit_res' },
  // % Damage modifiers
  { key: 'meleeDamagePercent',  icon: 'melee_damage',      color: 'var(--earth)',    tKey: 'stat_melee_dmg' },
  { key: 'rangedDamagePercent', icon: 'ranged_damage',     color: 'var(--water)',    tKey: 'stat_ranged_dmg' },
  { key: 'spellDamagePercent',  icon: 'spell_damage',      color: 'var(--wisdom)',   tKey: 'stat_spell_dmg' },
  { key: 'weaponDamagePercent', icon: 'weapon_damage',     color: 'var(--gold)',     tKey: 'stat_weapon_dmg' },
  // Resistances (fixed)
  { key: 'fireResFixed',     icon: 'fire_resistance',      color: 'var(--fire)',     tKey: 'stat_fire_res' },
  { key: 'earthResFixed',    icon: 'earth_resistance',     color: 'var(--earth)',    tKey: 'stat_earth_res' },
  { key: 'waterResFixed',    icon: 'water_resistance',     color: 'var(--water)',    tKey: 'stat_water_res' },
  { key: 'airResFixed',      icon: 'air_resistance',       color: 'var(--air)',      tKey: 'stat_air_res' },
  { key: 'neutralResFixed',  icon: 'neutral_resistance',   color: 'var(--neutral)',  tKey: 'stat_neutral_res' },
  // Resistances (%)
  { key: 'fireResPercent',    icon: 'fire_resistance',     color: 'var(--fire)',     tKey: 'stat_pct_fire_res' },
  { key: 'earthResPercent',   icon: 'earth_resistance',    color: 'var(--earth)',    tKey: 'stat_pct_earth_res' },
  { key: 'waterResPercent',   icon: 'water_resistance',    color: 'var(--water)',    tKey: 'stat_pct_water_res' },
  { key: 'airResPercent',     icon: 'air_resistance',      color: 'var(--air)',      tKey: 'stat_pct_air_res' },
  { key: 'neutralResPercent', icon: 'neutral_resistance',  color: 'var(--neutral)',  tKey: 'stat_pct_neutral_res' },
  // Combat
  { key: 'heals',            icon: 'heals',                color: 'var(--vitality)', tKey: 'stat_heals' },
  { key: 'initiative',       icon: 'initiative',           color: 'var(--crit)',     tKey: 'stat_initiative' },
  { key: 'lock',             icon: 'lock',                 color: 'var(--earth)',    tKey: 'stat_lock' },
  { key: 'dodge',            icon: 'dodge',                color: 'var(--air)',      tKey: 'stat_dodge' },
  { key: 'prospecting',      icon: 'prospecting',          color: 'var(--gold)',     tKey: 'stat_prospecting' },
  { key: 'summons',          icon: 'summons',              color: 'var(--wisdom)',   tKey: 'stat_summons' },
  { key: 'apReduction',      icon: 'ap_reduction',         color: 'var(--wisdom)',   tKey: 'stat_ap_removal' },
  { key: 'mpReduction',      icon: 'mp_reduction',         color: 'var(--wisdom)',   tKey: 'stat_mp_removal' },
  { key: 'apParry',          icon: 'ap_parry',             color: 'var(--water)',    tKey: 'stat_ap_parry' },
  { key: 'mpParry',          icon: 'mp_parry',             color: 'var(--water)',    tKey: 'stat_mp_parry' },
  { key: 'pushbackDamage',   icon: 'push_damage',          color: 'var(--earth)',    tKey: 'stat_push_damage' },
  { key: 'pods',             icon: 'pods',                 color: 'var(--gold)',     tKey: 'stat_pods' },
]

type ConditionDefaults = { goal: number; weight: number; max?: number }

// Starting point when a stat is first activated, tuned so one unit of each
// stat is weighed roughly by its real value (1 AP ≈ 100 Strength).
const CONDITION_DEFAULTS: Partial<Record<OptimizerStatKey, ConditionDefaults>> = {
  ap:                 { goal: 12,   weight: 500, max: 12 },
  mp:                 { goal: 6,    weight: 500, max: 6 },
  range:              { goal: 6,    weight: 250, max: 6 },
  summons:            { goal: 6,    weight: 125, max: 6 },
  maxHp:              { goal: 5000, weight: 1 },
  vitality:           { goal: 4000, weight: 1 },
  wisdom:             { goal: 300,  weight: 15 },
  strength:           { goal: 1000, weight: 5 },
  intelligence:       { goal: 1000, weight: 5 },
  chance:             { goal: 1000, weight: 5 },
  agility:            { goal: 1000, weight: 5 },
  power:              { goal: 0,    weight: 5 },
  damage:             { goal: 0,    weight: 25 },
  critChance:         { goal: 75,   weight: 50, max: 100 },
  critDamage:         { goal: 150,  weight: 25 },
  critResistance:     { goal: 100,  weight: 10 },
  initiative:         { goal: 2000, weight: 1 },
  lock:               { goal: 70,   weight: 20 },
  dodge:              { goal: 70,   weight: 20 },
  apReduction:        { goal: 80,   weight: 35 },
  mpReduction:        { goal: 80,   weight: 35 },
  apParry:            { goal: 80,   weight: 20 },
  mpParry:            { goal: 80,   weight: 20 },
  prospecting:        { goal: 200,  weight: 3 },
  pods:               { goal: 2000, weight: 1 },
  heals:              { goal: 50,   weight: 10 },
  pushbackDamage:     { goal: 100,  weight: 10 },
  meleeDamagePercent:  { goal: 10, weight: 75 },
  rangedDamagePercent: { goal: 10, weight: 75 },
  spellDamagePercent:  { goal: 10, weight: 75 },
  weaponDamagePercent: { goal: 10, weight: 75 },
}

const ELEMENTAL_DAMAGE = new Set<OptimizerStatKey>(['fireDamage', 'earthDamage', 'waterDamage', 'airDamage', 'neutralDamage', 'bestElemDamage'])
const STEALS = new Set<OptimizerStatKey>(['fireSteal', 'earthSteal', 'waterSteal', 'airSteal', 'neutralSteal', 'bestElemSteal'])
const RES_FIXED = new Set<OptimizerStatKey>(['fireResFixed', 'earthResFixed', 'waterResFixed', 'airResFixed', 'neutralResFixed'])
const RES_PCT = new Set<OptimizerStatKey>(['fireResPercent', 'earthResPercent', 'waterResPercent', 'airResPercent', 'neutralResPercent'])

// Power also counts toward these goals (it boosts damage the same way).
export const POWER_BOOSTED = new Set<OptimizerStatKey>(['strength', 'intelligence', 'chance', 'agility'])

export function conditionDefaults(key: OptimizerStatKey): ConditionDefaults {
  if (ELEMENTAL_DAMAGE.has(key)) return { goal: 150, weight: 25 }
  if (STEALS.has(key))           return { goal: 0,   weight: 10 }
  if (RES_FIXED.has(key))        return { goal: 100, weight: 10 }
  if (RES_PCT.has(key))          return { goal: 20,  weight: 30, max: 50 }
  return CONDITION_DEFAULTS[key] ?? { goal: 0, weight: 10 }
}
