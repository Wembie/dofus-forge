const BASE = import.meta.env.BASE_URL

export type StatMeta = {
  icon:  string   // filename in data/stats/ (no .png)
  color: string   // hex color
  tKey:  string   // i18n key for display label
}

export const STAT_META: Record<string, StatMeta> = {
  'Vitality':            { icon: 'vitality',          color: '#e05252', tKey: 'stat_vitality'      },
  'Wisdom':              { icon: 'wisdom',             color: '#9b6dff', tKey: 'stat_wisdom'        },
  'Strength':            { icon: 'strength',           color: '#c49a2a', tKey: 'stat_strength'      },
  'Intelligence':        { icon: 'intelligence',       color: '#dc4e22', tKey: 'stat_intelligence'  },
  'Chance':              { icon: 'chance',             color: '#2a8fd4', tKey: 'stat_chance'        },
  'Agility':             { icon: 'agility',            color: '#6ab04c', tKey: 'stat_agility'       },
  'AP':                  { icon: 'ap',                 color: '#f5c518', tKey: 'stat_ap'            },
  'MP':                  { icon: 'mp',                 color: '#6ab04c', tKey: 'stat_mp'            },
  'Range':               { icon: 'range',              color: '#2a8fd4', tKey: 'stat_range'         },
  'Power':               { icon: 'power',              color: '#c9a84c', tKey: 'stat_power'         },
  'Power (traps)':       { icon: 'trap_power',         color: '#c9a84c', tKey: 'stat_trap_power'    },
  'Damage':              { icon: 'damage',             color: '#9b9b9b', tKey: 'stat_damage'        },
  'Earth Damage':        { icon: 'strength',           color: '#c49a2a', tKey: 'stat_earth_damage'  },
  'Earth damage':        { icon: 'strength',           color: '#c49a2a', tKey: 'stat_earth_damage'  },
  'Fire Damage':         { icon: 'intelligence',       color: '#dc4e22', tKey: 'stat_fire_damage'   },
  'Fire damage':         { icon: 'intelligence',       color: '#dc4e22', tKey: 'stat_fire_damage'   },
  'Water Damage':        { icon: 'chance',             color: '#2a8fd4', tKey: 'stat_water_damage'  },
  'Water damage':        { icon: 'chance',             color: '#2a8fd4', tKey: 'stat_water_damage'  },
  'Air Damage':          { icon: 'agility',            color: '#6ab04c', tKey: 'stat_air_damage'    },
  'Air damage':          { icon: 'agility',            color: '#6ab04c', tKey: 'stat_air_damage'    },
  'Neutral Damage':      { icon: 'neutral',            color: '#9b9b9b', tKey: 'stat_neutral_damage'},
  'Neutral damage':      { icon: 'neutral',            color: '#9b9b9b', tKey: 'stat_neutral_damage'},
  'Earth steal':         { icon: 'strength',           color: '#c49a2a', tKey: 'stat_earth_steal'   },
  'Fire steal':          { icon: 'intelligence',       color: '#dc4e22', tKey: 'stat_fire_steal'    },
  'Fire heals':          { icon: 'intelligence',       color: '#dc4e22', tKey: 'stat_fire_steal'    },
  'Air steal':           { icon: 'agility',            color: '#6ab04c', tKey: 'stat_air_steal'     },
  'Neutral steal':       { icon: 'neutral',            color: '#9b9b9b', tKey: 'stat_neutral_steal' },
  'best-element damage': { icon: 'power',              color: '#c9a84c', tKey: 'stat_best_elem_dmg' },
  'best-element steal':  { icon: 'power',              color: '#c9a84c', tKey: 'stat_best_elem_steal'},
  'Earth Resistance':    { icon: 'earth_resistance',   color: '#c49a2a', tKey: 'stat_earth_res'     },
  'Fire Resistance':     { icon: 'fire_resistance',    color: '#dc4e22', tKey: 'stat_fire_res'      },
  'Water Resistance':    { icon: 'water_resistance',   color: '#2a8fd4', tKey: 'stat_water_res'     },
  'Air Resistance':      { icon: 'air_resistance',     color: '#6ab04c', tKey: 'stat_air_res'       },
  'Neutral Resistance':  { icon: 'neutral_resistance', color: '#9b9b9b', tKey: 'stat_neutral_res'   },
  '% Earth Resistance':  { icon: 'earth_resistance',   color: '#c49a2a', tKey: 'stat_pct_earth_res' },
  '% Fire Resistance':   { icon: 'fire_resistance',    color: '#dc4e22', tKey: 'stat_pct_fire_res'  },
  '% Water Resistance':  { icon: 'water_resistance',   color: '#2a8fd4', tKey: 'stat_pct_water_res' },
  '% Air Resistance':    { icon: 'air_resistance',     color: '#6ab04c', tKey: 'stat_pct_air_res'   },
  '% Neutral Resistance':{ icon: 'neutral_resistance', color: '#9b9b9b', tKey: 'stat_pct_neutral_res'},
  '% Critical':          { icon: 'crit',               color: '#f5a623', tKey: 'stat_crit_chance'   },
  'Critical Damage':     { icon: 'crit_damage',        color: '#dc4e22', tKey: 'stat_crit_damage'   },
  'Critical Resistance': { icon: 'crit_res',           color: '#9b9b9b', tKey: 'stat_crit_res'      },
  'Initiative':          { icon: 'initiative',         color: '#c9a84c', tKey: 'stat_initiative'    },
  'Lock':                { icon: 'lock',               color: '#b8860b', tKey: 'stat_lock'          },
  'Dodge':               { icon: 'dodge',              color: '#6ab04c', tKey: 'stat_dodge'         },
  'Prospecting':         { icon: 'prospecting',        color: '#c9a84c', tKey: 'stat_prospecting'   },
  'Summons':             { icon: 'summons',            color: '#9b6dff', tKey: 'stat_summons'       },
  'Heal':                { icon: 'heals',              color: '#e05252', tKey: 'stat_heals'         },
  'AP Reduction':        { icon: 'ap_reduction',       color: '#9b6dff', tKey: 'stat_ap_removal'    },
  'MP Reduction':        { icon: 'mp_reduction',       color: '#9b6dff', tKey: 'stat_mp_removal'    },
  'AP Parry':            { icon: 'ap_parry',           color: '#2a8fd4', tKey: 'stat_ap_parry'      },
  'MP Parry':            { icon: 'mp_parry',           color: '#2a8fd4', tKey: 'stat_mp_parry'      },
  'Steals MP':           { icon: 'mp_reduction',       color: '#9b6dff', tKey: 'stat_mp_steal'      },
  'Pushback Damage':     { icon: 'push_damage',        color: '#b8860b', tKey: 'stat_push_damage'   },
  'Pushback Resistance': { icon: 'push_resistance',    color: '#b8860b', tKey: 'stat_push_res'      },
  'Trap Damage':         { icon: 'trap_damage',        color: '#b8860b', tKey: 'stat_trap_damage'   },
  'reflected damage':    { icon: 'damage_reflect',     color: '#b8860b', tKey: 'stat_reflect_dmg'   },
  '% Melee Damage':      { icon: 'melee_damage',       color: '#c49a2a', tKey: 'stat_melee_dmg'     },
  '% Ranged Damage':     { icon: 'ranged_damage',      color: '#2a8fd4', tKey: 'stat_ranged_dmg'    },
  '% Spell Damage':      { icon: 'spell_damage',       color: '#9b6dff', tKey: 'stat_spell_dmg'     },
  '% Weapon Damage':     { icon: 'weapon_damage',      color: '#c9a84c', tKey: 'stat_weapon_dmg'    },
  '% Melee Resistance':  { icon: 'melee_resistance',   color: '#c49a2a', tKey: 'stat_melee_res'     },
  '% Ranged Resistance': { icon: 'ranged_resistance',  color: '#2a8fd4', tKey: 'stat_ranged_res'    },
  'Pod':                 { icon: 'pods',               color: '#c9a84c', tKey: 'stat_pods'          },
}

const IGNORED = new Set([
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

export function isIgnored(stat: string): boolean {
  return IGNORED.has(stat) || (stat.includes(':') && !stat.startsWith('%'))
}

/** Show value for a stat effect. Handles fixed (min=max), range, and max=0 quirk. */
export function fmtValue(min: number, max: number, negSep = '–'): string {
  if (min === max || max === 0 || max < min) return `${min >= 0 ? '+' : ''}${min}`
  // Negative range: show less-negative (smaller absolute) first → -401 a -500 / -401 to -500
  if (max < 0) return `${max} ${negSep} ${min}`
  return `+${min}–${max}`
}

export function statIconUrl(icon: string): string {
  return `${BASE}data/stats/${icon}.webp`
}

export const RUNE_ICON: Record<string, string> = {
  'Vitality':             'Vit_Rune.webp',
  'Wisdom':               'Wis_Rune.webp',
  'Strength':             'Str_Rune.webp',
  'Intelligence':         'Int_Rune.webp',
  'Chance':               'Cha_Rune.webp',
  'Agility':              'Agi_Rune.webp',
  'AP':                   'Ap_Ga_Rune.webp',
  'MP':                   'Mp_Ga_Rune.webp',
  'Range':                'Range_Rune.webp',
  'Damage':               'Dam_Rune.webp',
  'Earth Damage':         'Earth_Dam_Rune.webp',
  'Fire Damage':          'Fire_Dam_Rune.webp',
  'Water Damage':         'Water_Dam_Rune.webp',
  'Air Damage':           'Air_Dam_Rune.webp',
  'Neutral Damage':       'Neutral_Dam_Rune.webp',
  '% Critical':           'Cri_Rune.webp',
  'Critical Damage':      'Cri_Dam_Rune.webp',
  'Critical Resistance':  'Cri_Res_Rune.webp',
  'Earth Resistance':     'Earth_Res_Rune.webp',
  'Fire Resistance':      'Fire_Res_Rune.webp',
  'Water Resistance':     'Water_Res_Rune.webp',
  'Air Resistance':       'Air_Res_Rune.webp',
  'Neutral Resistance':   'Neutral_Res_Rune.webp',
  '% Earth Resistance':   'Earth_Res_Per_Rune.webp',
  '% Fire Resistance':    'Fire_Res_Per_Rune.webp',
  '% Water Resistance':   'Water_Res_Per_Rune.webp',
  '% Air Resistance':     'Air_Res_Per_Rune.webp',
  '% Neutral Resistance': 'Neutral_Res_Per_Rune.webp',
  'Initiative':           'Ini_Rune.webp',
  'Lock':                 'Loc_Rune.webp',
  'Dodge':                'Dod_Rune.webp',
  'Heal':                 'Hea_Rune.webp',
  'Prospecting':          'Pp_Rune.webp',
  'AP Reduction':         'Ap_Red_Rune.webp',
  'MP Reduction':         'Mp_Red_Rune.webp',
  'AP Parry':             'Ap_Res_Rune.webp',
  'MP Parry':             'Mp_Res_Rune.webp',
  '% Ranged Damage':      'Dis_Dam_Per_Rune.webp',
  '% Ranged Resistance':  'Dis_Res_Per_Rune.webp',
  '% Melee Damage':       'Mel_Dam_Per_Rune.webp',
  '% Melee Resistance':   'Mel_Res_Per_Rune.webp',
  '% Spell Damage':       'Spe_Dam_Per_Rune.webp',
  '% Weapon Damage':      'Wep_Dam_Per_Rune.webp',
  'Pushback Damage':      'Psh_Dam_Rune.webp',
  'Pushback Resistance':  'Psh_Res_Rune.webp',
  'Trap Damage':          'Trp_Dam_Rune.webp',
  'Power (traps)':        'Trp_Per_Rune.webp',
  'Summons':              'Sum_Rune.webp',
  'Pod':                  'Pod_Rune.webp',
  'reflected damage':     'Dam_Ref_Rune.webp',
}

export function runeIconUrl(stat: string): string | null {
  const file = RUNE_ICON[stat]
  return file ? `${BASE}data/runes/${file}` : null
}

export function signatureRuneUrl(): string {
  return `${BASE}data/runes/Signature_Rune.webp`
}
