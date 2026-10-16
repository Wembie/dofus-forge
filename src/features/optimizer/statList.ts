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
  { key: 'trapDamage',       icon: 'trap_damage',          color: 'var(--earth)',    tKey: 'stat_trap_damage' },
  { key: 'trapPower',        icon: 'trap_power',           color: 'var(--gold)',     tKey: 'stat_trap_power' },
  { key: 'reflectedDamage',  icon: 'damage_reflect',       color: 'var(--neutral)',  tKey: 'stat_reflect_dmg' },
  { key: 'pushbackResist',   icon: 'push_resistance',      color: 'var(--earth)',    tKey: 'stat_push_res' },
  { key: 'meleeResistPercent',  icon: 'melee_resistance',  color: 'var(--earth)',    tKey: 'stat_melee_res' },
  { key: 'rangedResistPercent', icon: 'ranged_resistance', color: 'var(--water)',    tKey: 'stat_ranged_res' },
  { key: 'mpSteal',          icon: 'mp',                   color: 'var(--mp)',       tKey: 'stat_mp_steal' },
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
  prospecting: 3, pods: 1, heals: 10, pushbackDamage: 10, pushbackResist: 10,
  trapDamage: 10, trapPower: 3, reflectedDamage: 15, mpSteal: 35,
  meleeDamagePercent: 75, rangedDamagePercent: 75, spellDamagePercent: 75, weaponDamagePercent: 75,
  meleeResistPercent: 50, rangedResistPercent: 50,
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

// Quick presets for the ley: ¼×, ½×, 1×, 2× and 4× the stat's unit value.
export const LEY_PRESETS = [0.25, 0.5, 1, 2, 4] as const

export function leyPreset(key: OptimizerStatKey, level: number): number {
  return Math.max(1, Math.round(unitValue(key) * LEY_PRESETS[level]))
}

// Which preset a ley matches (within 15%), or -1 for a custom value.
export function matchingPreset(key: OptimizerStatKey, weight: number): number {
  return LEY_PRESETS.findIndex((_, i) => Math.abs(leyPreset(key, i) - weight) <= leyPreset(key, i) * 0.15)
}

// Sheet rune names (as the Forge reports them) back to stat keys, for labels.
const RUNE_STAT_KEY: Record<string, OptimizerStatKey> = {
  'Vitality': 'vitality', 'Strength': 'strength', 'Intelligence': 'intelligence', 'Chance': 'chance', 'Agility': 'agility',
  'Power': 'power', 'Earth Damage': 'earthDamage', 'Fire Damage': 'fireDamage', 'Water Damage': 'waterDamage',
  'Air Damage': 'airDamage', 'Neutral Damage': 'neutralDamage', '% Critical': 'critChance', 'Critical Damage': 'critDamage',
  'Critical Resistance': 'critResistance', 'Pushback Damage': 'pushbackDamage', 'Heal': 'heals', 'Initiative': 'initiative',
  'Pod': 'pods', 'Lock': 'lock', 'Dodge': 'dodge', 'AP Reduction': 'apReduction', 'MP Reduction': 'mpReduction',
  'AP Parry': 'apParry', 'MP Parry': 'mpParry', '% Earth Resistance': 'earthResPercent', '% Fire Resistance': 'fireResPercent',
  '% Water Resistance': 'waterResPercent', '% Air Resistance': 'airResPercent', '% Neutral Resistance': 'neutralResPercent',
  '% Melee Damage': 'meleeDamagePercent', '% Ranged Damage': 'rangedDamagePercent', '% Spell Damage': 'spellDamagePercent',
  '% Weapon Damage': 'weaponDamagePercent', 'Pushback Resistance': 'pushbackResist',
  '% Melee Resistance': 'meleeResistPercent', '% Ranged Resistance': 'rangedResistPercent',
}

// How the order form lays the stats out: every OPTIMIZER_STATS key sits in
// exactly one section (checked by a test). Damage and resistances each get
// one group with sub-sections, so nothing hides under a vague heading.
export type StatSection  = { tKey?: string; statKeys: OptimizerStatKey[] }
export type StatGroupDef = { key: string; tKey: string; defaultOpen: boolean; sections: StatSection[]; statKeys: OptimizerStatKey[] }

const group = (key: string, tKey: string, defaultOpen: boolean, sections: StatSection[]): StatGroupDef =>
  ({ key, tKey, defaultOpen, sections, statKeys: sections.flatMap(s => s.statKeys) })

export const STAT_GROUPS: StatGroupDef[] = [
  group('core', 'optimizer_group_core', true, [
    { statKeys: ['ap', 'mp', 'range', 'summons', 'critChance', 'maxHp'] },
  ]),
  group('chars', 'optimizer_group_chars', true, [
    { statKeys: ['vitality', 'wisdom', 'strength', 'intelligence', 'chance', 'agility', 'power'] },
  ]),
  group('damage', 'optimizer_group_damage', false, [
    { tKey: 'optimizer_sub_dmg_fixed',   statKeys: ['damage', 'fireDamage', 'earthDamage', 'waterDamage', 'airDamage', 'neutralDamage', 'bestElemDamage'] },
    { tKey: 'optimizer_sub_dmg_percent', statKeys: ['spellDamagePercent', 'weaponDamagePercent', 'meleeDamagePercent', 'rangedDamagePercent'] },
    { tKey: 'optimizer_sub_dmg_other',   statKeys: ['critDamage', 'pushbackDamage', 'trapDamage', 'trapPower', 'reflectedDamage'] },
    { tKey: 'optimizer_sub_dmg_steal',   statKeys: ['fireSteal', 'earthSteal', 'waterSteal', 'airSteal', 'neutralSteal', 'bestElemSteal'] },
  ]),
  group('res', 'optimizer_group_res', false, [
    { tKey: 'optimizer_sub_res_percent', statKeys: ['fireResPercent', 'earthResPercent', 'waterResPercent', 'airResPercent', 'neutralResPercent', 'meleeResistPercent', 'rangedResistPercent'] },
    { tKey: 'optimizer_sub_res_fixed',   statKeys: ['fireResFixed', 'earthResFixed', 'waterResFixed', 'airResFixed', 'neutralResFixed'] },
    { tKey: 'optimizer_sub_res_other',   statKeys: ['critResistance', 'pushbackResist'] },
  ]),
  group('combat', 'optimizer_group_combat', false, [
    { statKeys: ['initiative', 'heals', 'lock', 'dodge', 'apReduction', 'mpReduction', 'apParry', 'mpParry', 'mpSteal', 'prospecting', 'pods'] },
  ]),
]

export function runeStatLabelKey(runeStat: string): string | null {
  const key = RUNE_STAT_KEY[runeStat]
  return key ? OPTIMIZER_STATS.find(m => m.key === key)?.tKey ?? null : null
}
