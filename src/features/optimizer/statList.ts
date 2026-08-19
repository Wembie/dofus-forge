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
