import type { StatBlock } from '@/engine/types.ts'

// Icon, label and color of each StatBlock key; shared by the comparator and the passives panel.
export type CompareStatDef = {
  key: keyof StatBlock
  icon: string
  tKey: string
  color: string
  suffix?: string
  section: string
  always?: boolean
}

export const COMPARE_STATS: CompareStatDef[] = [
  // core
  { key: 'ap',    icon: 'ap',       tKey: 'stat_ap',    color: 'var(--ap)',       section: 'core', always: true },
  { key: 'mp',    icon: 'mp',       tKey: 'stat_mp',    color: 'var(--mp)',       section: 'core', always: true },
  { key: 'range', icon: 'range',    tKey: 'stat_range', color: 'var(--water)',    section: 'core' },
  { key: 'maxHp', icon: 'vitality', tKey: 'badge_hp',   color: 'var(--vitality)', section: 'core', always: true },
  { key: 'critChance', icon: 'crit', tKey: 'stat_crit_chance', color: 'var(--crit)', suffix: '%', section: 'core' },
  // chars
  { key: 'vitality',     icon: 'vitality',     tKey: 'stat_vitality',     color: 'var(--vitality)', section: 'chars' },
  { key: 'wisdom',       icon: 'wisdom',       tKey: 'stat_wisdom',       color: 'var(--wisdom)',   section: 'chars' },
  { key: 'strength',     icon: 'strength',     tKey: 'stat_strength',     color: 'var(--earth)',    section: 'chars' },
  { key: 'intelligence', icon: 'intelligence', tKey: 'stat_intelligence', color: 'var(--fire)',     section: 'chars' },
  { key: 'chance',       icon: 'chance',       tKey: 'stat_chance',       color: 'var(--water)',    section: 'chars' },
  { key: 'agility',      icon: 'agility',      tKey: 'stat_agility',      color: 'var(--air)',      section: 'chars' },
  { key: 'power',        icon: 'power',        tKey: 'stat_power',        color: 'var(--gold)',     section: 'chars' },
  // damage
  { key: 'damage',        icon: 'damage',              tKey: 'stat_damage',        color: 'var(--neutral)',  section: 'damage' },
  { key: 'earthDamage',   icon: 'strength_damage',     tKey: 'stat_earth_damage',  color: 'var(--earth)',    section: 'damage' },
  { key: 'fireDamage',    icon: 'intelligence_damage', tKey: 'stat_fire_damage',   color: 'var(--fire)',     section: 'damage' },
  { key: 'waterDamage',   icon: 'chance_damage',       tKey: 'stat_water_damage',  color: 'var(--water)',    section: 'damage' },
  { key: 'airDamage',     icon: 'agility_damage',      tKey: 'stat_air_damage',    color: 'var(--air)',      section: 'damage' },
  { key: 'neutralDamage', icon: 'neutral',             tKey: 'stat_neutral_damage',color: 'var(--neutral)',  section: 'damage' },
  { key: 'critDamage',    icon: 'crit_damage',         tKey: 'stat_crit_damage',   color: 'var(--crit)',     section: 'damage' },
  // steal
  { key: 'earthSteal',   icon: 'strength_damage',     tKey: 'stat_earth_steal',   color: 'var(--earth)',    section: 'steal' },
  { key: 'fireSteal',    icon: 'intelligence_damage', tKey: 'stat_fire_steal',    color: 'var(--fire)',     section: 'steal' },
  { key: 'waterSteal',   icon: 'chance_damage',       tKey: 'stat_water_steal',   color: 'var(--water)',    section: 'steal' },
  { key: 'airSteal',     icon: 'agility_damage',      tKey: 'stat_air_steal',     color: 'var(--air)',      section: 'steal' },
  { key: 'neutralSteal', icon: 'neutral',             tKey: 'stat_neutral_steal', color: 'var(--neutral)',  section: 'steal' },
  // res fixed
  { key: 'earthResFixed',   icon: 'earth_resistance',   tKey: 'stat_earth_res',   color: 'var(--earth)',    section: 'res_fixed' },
  { key: 'fireResFixed',    icon: 'fire_resistance',    tKey: 'stat_fire_res',    color: 'var(--fire)',     section: 'res_fixed' },
  { key: 'waterResFixed',   icon: 'water_resistance',   tKey: 'stat_water_res',   color: 'var(--water)',    section: 'res_fixed' },
  { key: 'airResFixed',     icon: 'air_resistance',     tKey: 'stat_air_res',     color: 'var(--air)',      section: 'res_fixed' },
  { key: 'neutralResFixed', icon: 'neutral_resistance', tKey: 'stat_neutral_res', color: 'var(--neutral)',  section: 'res_fixed' },
  { key: 'critResistance',  icon: 'crit_res',           tKey: 'stat_crit_res',    color: 'var(--neutral)',  section: 'res_fixed' },
  // res pct
  { key: 'earthResPercent',   icon: 'earth_resistance',   tKey: 'stat_pct_earth_res',   color: 'var(--earth)',   suffix: '%', section: 'res_pct' },
  { key: 'fireResPercent',    icon: 'fire_resistance',    tKey: 'stat_pct_fire_res',    color: 'var(--fire)',    suffix: '%', section: 'res_pct' },
  { key: 'waterResPercent',   icon: 'water_resistance',   tKey: 'stat_pct_water_res',   color: 'var(--water)',   suffix: '%', section: 'res_pct' },
  { key: 'airResPercent',     icon: 'air_resistance',     tKey: 'stat_pct_air_res',     color: 'var(--air)',     suffix: '%', section: 'res_pct' },
  { key: 'neutralResPercent', icon: 'neutral_resistance', tKey: 'stat_pct_neutral_res', color: 'var(--neutral)', suffix: '%', section: 'res_pct' },
  // combat
  { key: 'initiative',  icon: 'initiative',   tKey: 'stat_initiative',  color: 'var(--gold)',     section: 'combat' },
  { key: 'heals',       icon: 'heals',        tKey: 'stat_heals',       color: 'var(--vitality)', section: 'combat' },
  { key: 'lock',        icon: 'lock',         tKey: 'stat_lock',        color: 'var(--earth)',    section: 'combat' },
  { key: 'dodge',       icon: 'dodge',        tKey: 'stat_dodge',       color: 'var(--air)',      section: 'combat' },
  { key: 'prospecting', icon: 'prospecting',  tKey: 'stat_prospecting', color: 'var(--gold)',     section: 'combat' },
  { key: 'summons',     icon: 'summons',      tKey: 'stat_summons',     color: 'var(--wisdom)',   section: 'combat' },
  { key: 'apReduction', icon: 'ap_reduction', tKey: 'stat_ap_removal',  color: 'var(--wisdom)',   section: 'combat' },
  { key: 'mpReduction', icon: 'mp_reduction', tKey: 'stat_mp_removal',  color: 'var(--wisdom)',   section: 'combat' },
  { key: 'apParry',     icon: 'ap_parry',     tKey: 'stat_ap_parry',    color: 'var(--water)',    section: 'combat' },
  { key: 'mpParry',     icon: 'mp_parry',     tKey: 'stat_mp_parry',    color: 'var(--water)',    section: 'combat' },
  { key: 'pushbackDamage', icon: 'push_damage',     tKey: 'stat_push_damage', color: 'var(--earth)',    section: 'combat' },
  { key: 'pushbackResist', icon: 'push_resistance', tKey: 'stat_push_res',    color: 'var(--earth)',    section: 'combat' },
  // mods
  { key: 'meleeDamagePercent',  icon: 'melee_damage',      tKey: 'stat_melee_dmg',  color: 'var(--earth)',   suffix: '%', section: 'mods' },
  { key: 'rangedDamagePercent', icon: 'ranged_damage',     tKey: 'stat_ranged_dmg', color: 'var(--water)',   suffix: '%', section: 'mods' },
  { key: 'spellDamagePercent',  icon: 'spell_damage',      tKey: 'stat_spell_dmg',  color: 'var(--wisdom)',  suffix: '%', section: 'mods' },
  { key: 'weaponDamagePercent', icon: 'weapon_damage',     tKey: 'stat_weapon_dmg', color: 'var(--gold)',    suffix: '%', section: 'mods' },
  { key: 'finalDamagePercent',  icon: 'damage',            tKey: 'stat_final_dmg',  color: 'var(--gold)',    suffix: '%', section: 'mods' },
  { key: 'meleeResistPercent',  icon: 'melee_resistance',  tKey: 'stat_melee_res',  color: 'var(--earth)',   suffix: '%', section: 'mods' },
  { key: 'rangedResistPercent', icon: 'ranged_resistance', tKey: 'stat_ranged_res', color: 'var(--water)',   suffix: '%', section: 'mods' },
]

export const STAT_DEF_BY_KEY = new Map(COMPARE_STATS.map(def => [def.key, def]))
