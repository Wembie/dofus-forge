const BASE = import.meta.env.BASE_URL

export type StatMeta = {
  icon:  string   // filename in data/stats/ (no .png)
  color: string   // hex color
  tKey:  string   // i18n key for display label
}

export const STAT_META: Record<string, StatMeta> = {
  'Vitality':            { icon: 'vitality',      color: '#e05252', tKey: 'stat_vitality'      },
  'Wisdom':              { icon: 'wisdom',         color: '#9b6dff', tKey: 'stat_wisdom'        },
  'Strength':            { icon: 'strength',       color: '#c49a2a', tKey: 'stat_strength'      },
  'Intelligence':        { icon: 'intelligence',   color: '#dc4e22', tKey: 'stat_intelligence'  },
  'Chance':              { icon: 'chance',         color: '#2a8fd4', tKey: 'stat_chance'        },
  'Agility':             { icon: 'agility',        color: '#6ab04c', tKey: 'stat_agility'       },
  'AP':                  { icon: 'ap',             color: '#f5c518', tKey: 'stat_ap'            },
  'MP':                  { icon: 'mp',             color: '#6ab04c', tKey: 'stat_mp'            },
  'Range':               { icon: 'range',          color: '#2a8fd4', tKey: 'stat_range'         },
  'Power':               { icon: 'power',          color: '#c9a84c', tKey: 'stat_power'         },
  'Power (traps)':       { icon: 'power',          color: '#c9a84c', tKey: 'stat_trap_power'    },
  'Damage':              { icon: 'neutral_damage', color: '#9b9b9b', tKey: 'stat_damage'        },
  'Earth Damage':        { icon: 'strength',       color: '#c49a2a', tKey: 'stat_earth_damage'  },
  'Earth damage':        { icon: 'strength',       color: '#c49a2a', tKey: 'stat_earth_damage'  },
  'Fire Damage':         { icon: 'intelligence',   color: '#dc4e22', tKey: 'stat_fire_damage'   },
  'Fire damage':         { icon: 'intelligence',   color: '#dc4e22', tKey: 'stat_fire_damage'   },
  'Water Damage':        { icon: 'chance',         color: '#2a8fd4', tKey: 'stat_water_damage'  },
  'Water damage':        { icon: 'chance',         color: '#2a8fd4', tKey: 'stat_water_damage'  },
  'Air Damage':          { icon: 'agility',        color: '#6ab04c', tKey: 'stat_air_damage'    },
  'Air damage':          { icon: 'agility',        color: '#6ab04c', tKey: 'stat_air_damage'    },
  'Neutral Damage':      { icon: 'neutral_damage', color: '#9b9b9b', tKey: 'stat_neutral_damage'},
  'Neutral damage':      { icon: 'neutral_damage', color: '#9b9b9b', tKey: 'stat_neutral_damage'},
  'Earth steal':         { icon: 'strength',       color: '#c49a2a', tKey: 'stat_earth_steal'   },
  'Fire steal':          { icon: 'intelligence',   color: '#dc4e22', tKey: 'stat_fire_steal'    },
  'Fire heals':          { icon: 'intelligence',   color: '#dc4e22', tKey: 'stat_fire_steal'    },
  'Air steal':           { icon: 'agility',        color: '#6ab04c', tKey: 'stat_air_steal'     },
  'Neutral steal':       { icon: 'neutral_damage', color: '#9b9b9b', tKey: 'stat_neutral_steal' },
  'best-element damage': { icon: 'power',          color: '#c9a84c', tKey: 'stat_best_elem_dmg' },
  'best-element steal':  { icon: 'power',          color: '#c9a84c', tKey: 'stat_best_elem_steal'},
  'Earth Resistance':    { icon: 'strength',       color: '#c49a2a', tKey: 'stat_earth_res'     },
  'Fire Resistance':     { icon: 'intelligence',   color: '#dc4e22', tKey: 'stat_fire_res'      },
  'Water Resistance':    { icon: 'chance',         color: '#2a8fd4', tKey: 'stat_water_res'     },
  'Air Resistance':      { icon: 'agility',        color: '#6ab04c', tKey: 'stat_air_res'       },
  'Neutral Resistance':  { icon: 'neutral_damage', color: '#9b9b9b', tKey: 'stat_neutral_res'   },
  '% Earth Resistance':  { icon: 'strength',       color: '#c49a2a', tKey: 'stat_pct_earth_res' },
  '% Fire Resistance':   { icon: 'intelligence',   color: '#dc4e22', tKey: 'stat_pct_fire_res'  },
  '% Water Resistance':  { icon: 'chance',         color: '#2a8fd4', tKey: 'stat_pct_water_res' },
  '% Air Resistance':    { icon: 'agility',        color: '#6ab04c', tKey: 'stat_pct_air_res'   },
  '% Neutral Resistance':{ icon: 'neutral_damage', color: '#9b9b9b', tKey: 'stat_pct_neutral_res'},
  '% Critical':          { icon: 'crit',           color: '#f5a623', tKey: 'stat_crit_chance'   },
  'Critical Damage':     { icon: 'crit_damage',    color: '#dc4e22', tKey: 'stat_crit_damage'   },
  'Critical Resistance': { icon: 'crit_res',       color: '#9b9b9b', tKey: 'stat_crit_res'      },
  'Initiative':          { icon: 'initiative',     color: '#c9a84c', tKey: 'stat_initiative'    },
  'Lock':                { icon: 'lock',            color: '#b8860b', tKey: 'stat_lock'          },
  'Dodge':               { icon: 'dodge',           color: '#6ab04c', tKey: 'stat_dodge'         },
  'Prospecting':         { icon: 'prospecting',    color: '#c9a84c', tKey: 'stat_prospecting'   },
  'Summons':             { icon: 'summons',         color: '#9b6dff', tKey: 'stat_summons'       },
  'Heal':                { icon: 'heals',           color: '#e05252', tKey: 'stat_heals'         },
  'AP Reduction':        { icon: 'ap_reduction',   color: '#9b6dff', tKey: 'stat_ap_removal'    },
  'MP Reduction':        { icon: 'mp_reduction',   color: '#9b6dff', tKey: 'stat_mp_removal'    },
  'AP Parry':            { icon: 'ap_parry',       color: '#2a8fd4', tKey: 'stat_ap_parry'      },
  'MP Parry':            { icon: 'mp_parry',       color: '#2a8fd4', tKey: 'stat_mp_parry'      },
  'Steals MP':           { icon: 'mp_reduction',   color: '#9b6dff', tKey: 'stat_mp_steal'      },
  'Pushback Damage':     { icon: 'push_damage',    color: '#b8860b', tKey: 'stat_push_damage'   },
  'Pushback Resistance': { icon: 'push_res',       color: '#b8860b', tKey: 'stat_push_res'      },
  'Trap Damage':         { icon: 'push_damage',    color: '#b8860b', tKey: 'stat_trap_damage'   },
  'reflected damage':    { icon: 'push_damage',    color: '#b8860b', tKey: 'stat_reflect_dmg'   },
  '% Melee Damage':      { icon: 'melee_damage',   color: '#c49a2a', tKey: 'stat_melee_dmg'     },
  '% Ranged Damage':     { icon: 'ranged_damage',  color: '#2a8fd4', tKey: 'stat_ranged_dmg'    },
  '% Spell Damage':      { icon: 'spell_damage',   color: '#9b6dff', tKey: 'stat_spell_dmg'     },
  '% Weapon Damage':     { icon: 'weapon_damage',  color: '#c9a84c', tKey: 'stat_weapon_dmg'    },
  '% Melee Resistance':  { icon: 'melee_damage',   color: '#c49a2a', tKey: 'stat_melee_res'     },
  '% Ranged Resistance': { icon: 'ranged_damage',  color: '#2a8fd4', tKey: 'stat_ranged_res'    },
  'Pod':                 { icon: 'kamas',           color: '#c9a84c', tKey: 'stat_pods'          },
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
  return `${BASE}data/stats/${icon}.png`
}
