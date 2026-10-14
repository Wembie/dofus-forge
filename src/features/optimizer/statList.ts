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

// What one point of each stat is worth to the Forge, so importance levels
// mean the same thing across stats (1 AP ≈ 100 Strength).
const UNIT_VALUE: Partial<Record<OptimizerStatKey, number>> = {
  ap: 500, mp: 500, range: 250, summons: 125,
  maxHp: 1, vitality: 1, wisdom: 15,
  strength: 5, intelligence: 5, chance: 5, agility: 5, power: 5, damage: 25,
  critChance: 50, critDamage: 25, critResistance: 10,
  initiative: 1, lock: 20, dodge: 20, apReduction: 35, mpReduction: 35, apParry: 20, mpParry: 20,
  prospecting: 3, pods: 1, heals: 10, pushbackDamage: 10,
  meleeDamagePercent: 75, rangedDamagePercent: 75, spellDamagePercent: 75, weaponDamagePercent: 75,
}

const ELEMENTAL_DAMAGE = new Set<OptimizerStatKey>(['fireDamage', 'earthDamage', 'waterDamage', 'airDamage', 'neutralDamage', 'bestElemDamage'])
const STEALS = new Set<OptimizerStatKey>(['fireSteal', 'earthSteal', 'waterSteal', 'airSteal', 'neutralSteal', 'bestElemSteal'])
const RES_FIXED = new Set<OptimizerStatKey>(['fireResFixed', 'earthResFixed', 'waterResFixed', 'airResFixed', 'neutralResFixed'])
const RES_PCT = new Set<OptimizerStatKey>(['fireResPercent', 'earthResPercent', 'waterResPercent', 'airResPercent', 'neutralResPercent'])

// Power also counts toward these minimums (it boosts damage the same way).
export const POWER_BOOSTED = new Set<OptimizerStatKey>(['strength', 'intelligence', 'chance', 'agility'])

export function unitValue(key: OptimizerStatKey): number {
  if (ELEMENTAL_DAMAGE.has(key)) return 25
  if (STEALS.has(key))           return 10
  if (RES_FIXED.has(key))        return 10
  if (RES_PCT.has(key))          return 30
  return UNIT_VALUE[key] ?? 10
}

// Game caps worth pre-filling as a soft cap when a stat is first activated.
export function suggestedCap(key: OptimizerStatKey): number | null {
  if (key === 'ap') return 12
  if (key === 'mp' || key === 'range' || key === 'summons') return 6
  if (RES_PCT.has(key)) return 50
  if (key === 'critChance') return 100
  return null
}

export const IMPORTANCE_LEVELS = [1, 2, 3, 4, 5] as const
export const DEFAULT_IMPORTANCE = 3
const IMPORTANCE_FACTOR = [0, 0.25, 0.5, 1, 2, 4]

export function requirementWeight(key: OptimizerStatKey, importance: number): number {
  return Math.round(unitValue(key) * IMPORTANCE_FACTOR[Math.max(0, Math.min(5, importance))] * 4)
}
