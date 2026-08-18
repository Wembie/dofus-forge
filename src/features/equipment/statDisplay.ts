const BASE = import.meta.env.BASE_URL

export type StatMeta = {
  icon:  string   // filename in data/stats/ (no .png)
  color: string   // CSS var token — style={{ color: meta.color }} works natively
  tKey:  string   // i18n key for display label
}

export const STAT_META: Record<string, StatMeta> = {
  'Vitality':            { icon: 'vitality',          color: 'var(--vitality)', tKey: 'stat_vitality'       },
  'Wisdom':              { icon: 'wisdom',             color: 'var(--wisdom)',   tKey: 'stat_wisdom'         },
  'Strength':            { icon: 'strength',           color: 'var(--earth)',    tKey: 'stat_strength'       },
  'Intelligence':        { icon: 'intelligence',       color: 'var(--fire)',     tKey: 'stat_intelligence'   },
  'Chance':              { icon: 'chance',             color: 'var(--water)',    tKey: 'stat_chance'         },
  'Agility':             { icon: 'agility',            color: 'var(--air)',      tKey: 'stat_agility'        },
  'AP':                  { icon: 'ap',                 color: 'var(--ap)',       tKey: 'stat_ap'             },
  'MP':                  { icon: 'mp',                 color: 'var(--mp)',       tKey: 'stat_mp'             },
  'Range':               { icon: 'range',              color: 'var(--water)',    tKey: 'stat_range'          },
  'Power':               { icon: 'power',              color: 'var(--gold)',     tKey: 'stat_power'          },
  'Power (traps)':       { icon: 'trap_power',         color: 'var(--gold)',     tKey: 'stat_trap_power'     },
  'Damage':              { icon: 'damage',             color: 'var(--neutral)',  tKey: 'stat_damage'         },
  'Earth Damage':        { icon: 'strength_damage',    color: 'var(--earth)',    tKey: 'stat_earth_damage'   },
  'Earth damage':        { icon: 'strength_damage',    color: 'var(--earth)',    tKey: 'stat_earth_damage'   },
  'Fire Damage':         { icon: 'intelligence_damage',color: 'var(--fire)',     tKey: 'stat_fire_damage'    },
  'Fire damage':         { icon: 'intelligence_damage',color: 'var(--fire)',     tKey: 'stat_fire_damage'    },
  'Water Damage':        { icon: 'chance_damage',      color: 'var(--water)',    tKey: 'stat_water_damage'   },
  'Water damage':        { icon: 'chance_damage',      color: 'var(--water)',    tKey: 'stat_water_damage'   },
  'Air Damage':          { icon: 'agility_damage',     color: 'var(--air)',      tKey: 'stat_air_damage'     },
  'Air damage':          { icon: 'agility_damage',     color: 'var(--air)',      tKey: 'stat_air_damage'     },
  'Neutral Damage':      { icon: 'neutral',            color: 'var(--neutral)',  tKey: 'stat_neutral_damage' },
  'Neutral damage':      { icon: 'neutral',            color: 'var(--neutral)',  tKey: 'stat_neutral_damage' },
  'Earth steal':         { icon: 'strength_damage',    color: 'var(--earth)',    tKey: 'stat_earth_steal'    },
  'Fire steal':          { icon: 'intelligence_damage',color: 'var(--fire)',     tKey: 'stat_fire_steal'     },
  'Fire heals':          { icon: 'intelligence_damage',color: 'var(--fire)',     tKey: 'stat_fire_steal'     },
  'Air steal':           { icon: 'agility_damage',     color: 'var(--air)',      tKey: 'stat_air_steal'      },
  'Water steal':         { icon: 'chance_damage',      color: 'var(--water)',    tKey: 'stat_water_steal'    },
  'Neutral steal':       { icon: 'neutral',            color: 'var(--neutral)',  tKey: 'stat_neutral_steal'  },
  'best-element damage': { icon: 'power',              color: 'var(--gold)',     tKey: 'stat_best_elem_dmg'  },
  'best-element steal':  { icon: 'power',              color: 'var(--gold)',     tKey: 'stat_best_elem_steal'},
  'Earth Resistance':    { icon: 'earth_resistance',   color: 'var(--earth)',    tKey: 'stat_earth_res'      },
  'Fire Resistance':     { icon: 'fire_resistance',    color: 'var(--fire)',     tKey: 'stat_fire_res'       },
  'Water Resistance':    { icon: 'water_resistance',   color: 'var(--water)',    tKey: 'stat_water_res'      },
  'Air Resistance':      { icon: 'air_resistance',     color: 'var(--air)',      tKey: 'stat_air_res'        },
  'Neutral Resistance':  { icon: 'neutral_resistance', color: 'var(--neutral)',  tKey: 'stat_neutral_res'    },
  '% Earth Resistance':  { icon: 'earth_resistance',   color: 'var(--earth)',    tKey: 'stat_pct_earth_res'  },
  '% Fire Resistance':   { icon: 'fire_resistance',    color: 'var(--fire)',     tKey: 'stat_pct_fire_res'   },
  '% Water Resistance':  { icon: 'water_resistance',   color: 'var(--water)',    tKey: 'stat_pct_water_res'  },
  '% Air Resistance':    { icon: 'air_resistance',     color: 'var(--air)',      tKey: 'stat_pct_air_res'    },
  '% Neutral Resistance':{ icon: 'neutral_resistance', color: 'var(--neutral)',  tKey: 'stat_pct_neutral_res'},
  '% Critical':          { icon: 'crit',               color: 'var(--crit)',     tKey: 'stat_crit_chance'    },
  'Critical Damage':     { icon: 'crit_damage',        color: 'var(--crit)',     tKey: 'stat_crit_damage'    },
  'Critical Resistance': { icon: 'crit_res',           color: 'var(--neutral)',  tKey: 'stat_crit_res'       },
  'Initiative':          { icon: 'initiative',         color: 'var(--crit)',     tKey: 'stat_initiative'     },
  'Lock':                { icon: 'lock',               color: 'var(--earth)',    tKey: 'stat_lock'           },
  'Dodge':               { icon: 'dodge',              color: 'var(--air)',      tKey: 'stat_dodge'          },
  'Prospecting':         { icon: 'prospecting',        color: 'var(--gold)',     tKey: 'stat_prospecting'    },
  'Summons':             { icon: 'summons',            color: 'var(--wisdom)',   tKey: 'stat_summons'        },
  'Heal':                { icon: 'heals',              color: 'var(--vitality)', tKey: 'stat_heals'          },
  'AP Reduction':        { icon: 'ap_reduction',       color: 'var(--wisdom)',   tKey: 'stat_ap_removal'     },
  'MP Reduction':        { icon: 'mp_reduction',       color: 'var(--wisdom)',   tKey: 'stat_mp_removal'     },
  'AP Parry':            { icon: 'ap_parry',           color: 'var(--water)',    tKey: 'stat_ap_parry'       },
  'MP Parry':            { icon: 'mp_parry',           color: 'var(--water)',    tKey: 'stat_mp_parry'       },
  'Steals MP':           { icon: 'mp_reduction',       color: 'var(--wisdom)',   tKey: 'stat_mp_steal'       },
  'Pushback Damage':     { icon: 'push_damage',        color: 'var(--earth)',    tKey: 'stat_push_damage'    },
  'Pushback Resistance': { icon: 'push_resistance',    color: 'var(--earth)',    tKey: 'stat_push_res'       },
  'Trap Damage':         { icon: 'trap_damage',        color: 'var(--earth)',    tKey: 'stat_trap_damage'    },
  'reflected damage':    { icon: 'damage_reflect',     color: 'var(--earth)',    tKey: 'stat_reflect_dmg'    },
  '% Melee Damage':      { icon: 'melee_damage',       color: 'var(--earth)',    tKey: 'stat_melee_dmg'      },
  '% Ranged Damage':     { icon: 'ranged_damage',      color: 'var(--water)',    tKey: 'stat_ranged_dmg'     },
  '% Spell Damage':      { icon: 'spell_damage',       color: 'var(--wisdom)',   tKey: 'stat_spell_dmg'      },
  '% Weapon Damage':     { icon: 'weapon_damage',      color: 'var(--gold)',     tKey: 'stat_weapon_dmg'     },
  '% Melee Resistance':  { icon: 'melee_resistance',   color: 'var(--earth)',    tKey: 'stat_melee_res'      },
  '% Ranged Resistance': { icon: 'ranged_resistance',  color: 'var(--water)',    tKey: 'stat_ranged_res'     },
  '% Spell Resistance':  { icon: 'spell_damage',       color: 'var(--wisdom)',   tKey: 'stat_spell_res'      },
  '% Weapon Resistance': { icon: 'weapon_damage',      color: 'var(--gold)',     tKey: 'stat_weapon_res'     },
  'Pod':                 { icon: 'pods',               color: 'var(--gold)',     tKey: 'stat_pods'           },
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

const PNG_ICONS = new Set(['strength_damage', 'intelligence_damage', 'chance_damage', 'agility_damage'])

export function statIconUrl(icon: string): string {
  const ext = PNG_ICONS.has(icon) ? 'png' : 'webp'
  return `${BASE}data/stats/${icon}.${ext}`
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
  'Power':                'Pow_Rune.webp',
  'Summons':              'Sum_Rune.webp',
  'Pod':                  'Pod_Rune.webp',
  'reflected damage':     'Dam_Ref_Rune.webp',
  // Weapon elemental transformation potions
  'transform_fire':       'weapons/Wildfire_Potion.webp',
  'transform_earth':      'weapons/Earthquake_Potion.webp',
  'transform_water':      'weapons/Tsunami_Potion.webp',
  'transform_air':        'weapons/Hurricane_Potion.webp',
}

export function runeIconUrl(stat: string): string | null {
  const file = RUNE_ICON[stat]
  return file ? `${BASE}data/runes/${file}` : null
}

export function signatureRuneUrl(): string {
  return `${BASE}data/runes/Signature_Rune.webp`
}
