const BASE = import.meta.env.BASE_URL

export type StatMeta = {
  icon:  string   // filename in data/stats/ (no .png)
  color: string   // hex color
  label: string   // display name
}

export const STAT_META: Record<string, StatMeta> = {
  'Vitality':            { icon: 'vitality',      color: '#e05252', label: 'Vitality'      },
  'Wisdom':              { icon: 'wisdom',         color: '#9b6dff', label: 'Wisdom'        },
  'Strength':            { icon: 'strength',       color: '#c49a2a', label: 'Strength'      },
  'Intelligence':        { icon: 'intelligence',   color: '#dc4e22', label: 'Intelligence'  },
  'Chance':              { icon: 'chance',         color: '#2a8fd4', label: 'Chance'        },
  'Agility':             { icon: 'agility',        color: '#6ab04c', label: 'Agility'       },
  'AP':                  { icon: 'ap',             color: '#f5c518', label: 'AP'            },
  'MP':                  { icon: 'mp',             color: '#6ab04c', label: 'MP'            },
  'Range':               { icon: 'range',          color: '#2a8fd4', label: 'Range'         },
  'Power':               { icon: 'power',          color: '#c9a84c', label: 'Power'         },
  'Power (traps)':       { icon: 'power',          color: '#c9a84c', label: 'Trap Power'    },
  'Damage':              { icon: 'neutral_damage', color: '#9b9b9b', label: 'Damage'        },
  'Earth Damage':        { icon: 'strength',       color: '#c49a2a', label: 'Earth Damage'  },
  'Earth damage':        { icon: 'strength',       color: '#c49a2a', label: 'Earth Damage'  },
  'Fire Damage':         { icon: 'intelligence',   color: '#dc4e22', label: 'Fire Damage'   },
  'Fire damage':         { icon: 'intelligence',   color: '#dc4e22', label: 'Fire Damage'   },
  'Water Damage':        { icon: 'chance',         color: '#2a8fd4', label: 'Water Damage'  },
  'Water damage':        { icon: 'chance',         color: '#2a8fd4', label: 'Water Damage'  },
  'Air Damage':          { icon: 'agility',        color: '#6ab04c', label: 'Air Damage'    },
  'Air damage':          { icon: 'agility',        color: '#6ab04c', label: 'Air Damage'    },
  'Neutral Damage':      { icon: 'neutral_damage', color: '#9b9b9b', label: 'Neutral Damage'},
  'Neutral damage':      { icon: 'neutral_damage', color: '#9b9b9b', label: 'Neutral Damage'},
  'Earth steal':         { icon: 'strength',       color: '#c49a2a', label: 'Earth Steal'   },
  'Fire steal':          { icon: 'intelligence',   color: '#dc4e22', label: 'Fire Steal'    },
  'Fire heals':          { icon: 'intelligence',   color: '#dc4e22', label: 'Fire Steal'    },
  'Air steal':           { icon: 'agility',        color: '#6ab04c', label: 'Air Steal'     },
  'Neutral steal':       { icon: 'neutral_damage', color: '#9b9b9b', label: 'Neutral Steal' },
  'best-element damage': { icon: 'power',          color: '#c9a84c', label: 'Best Elem DMG' },
  'best-element steal':  { icon: 'power',          color: '#c9a84c', label: 'Best Elem Steal'},
  'Earth Resistance':    { icon: 'strength',       color: '#c49a2a', label: 'Earth Res'     },
  'Fire Resistance':     { icon: 'intelligence',   color: '#dc4e22', label: 'Fire Res'      },
  'Water Resistance':    { icon: 'chance',         color: '#2a8fd4', label: 'Water Res'     },
  'Air Resistance':      { icon: 'agility',        color: '#6ab04c', label: 'Air Res'       },
  'Neutral Resistance':  { icon: 'neutral_damage', color: '#9b9b9b', label: 'Neutral Res'   },
  '% Earth Resistance':  { icon: 'strength',       color: '#c49a2a', label: '% Earth Res'   },
  '% Fire Resistance':   { icon: 'intelligence',   color: '#dc4e22', label: '% Fire Res'    },
  '% Water Resistance':  { icon: 'chance',         color: '#2a8fd4', label: '% Water Res'   },
  '% Air Resistance':    { icon: 'agility',        color: '#6ab04c', label: '% Air Res'     },
  '% Neutral Resistance':{ icon: 'neutral_damage', color: '#9b9b9b', label: '% Neutral Res' },
  '% Critical':          { icon: 'crit',           color: '#f5a623', label: '% Critical'    },
  'Critical Damage':     { icon: 'crit_damage',    color: '#dc4e22', label: 'Crit Damage'   },
  'Critical Resistance': { icon: 'crit_res',       color: '#9b9b9b', label: 'Crit Res'      },
  'Initiative':          { icon: 'initiative',     color: '#c9a84c', label: 'Initiative'    },
  'Lock':                { icon: 'lock',            color: '#b8860b', label: 'Lock'          },
  'Dodge':               { icon: 'dodge',           color: '#6ab04c', label: 'Dodge'         },
  'Prospecting':         { icon: 'prospecting',    color: '#c9a84c', label: 'Prospecting'   },
  'Summons':             { icon: 'summons',         color: '#9b6dff', label: 'Summons'       },
  'Heal':                { icon: 'heals',           color: '#e05252', label: 'Heals'         },
  'AP Reduction':        { icon: 'ap_reduction',   color: '#9b6dff', label: 'AP Removal'    },
  'MP Reduction':        { icon: 'mp_reduction',   color: '#9b6dff', label: 'MP Removal'    },
  'AP Parry':            { icon: 'ap_parry',       color: '#2a8fd4', label: 'AP Parry'      },
  'MP Parry':            { icon: 'mp_parry',       color: '#2a8fd4', label: 'MP Parry'      },
  'Steals MP':           { icon: 'mp_reduction',   color: '#9b6dff', label: 'MP Steal'      },
  'Pushback Damage':     { icon: 'push_damage',    color: '#b8860b', label: 'Push Damage'   },
  'Pushback Resistance': { icon: 'push_res',       color: '#b8860b', label: 'Push Res'      },
  'Trap Damage':         { icon: 'push_damage',    color: '#b8860b', label: 'Trap Damage'   },
  'reflected damage':    { icon: 'push_damage',    color: '#b8860b', label: 'Reflect DMG'   },
  '% Melee Damage':      { icon: 'melee_damage',   color: '#c49a2a', label: '% Melee DMG'   },
  '% Ranged Damage':     { icon: 'ranged_damage',  color: '#2a8fd4', label: '% Ranged DMG'  },
  '% Spell Damage':      { icon: 'spell_damage',   color: '#9b6dff', label: '% Spell DMG'   },
  '% Weapon Damage':     { icon: 'weapon_damage',  color: '#c9a84c', label: '% Weapon DMG'  },
  '% Melee Resistance':  { icon: 'melee_damage',   color: '#c49a2a', label: '% Melee Res'   },
  '% Ranged Resistance': { icon: 'ranged_damage',  color: '#2a8fd4', label: '% Ranged Res'  },
  'Pod':                 { icon: 'kamas',           color: '#c9a84c', label: 'Pods'          },
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
export function fmtValue(min: number, max: number): string {
  const sign = min >= 0 ? '+' : ''
  if (min === max || max === 0 || max < min) return `${sign}${min}`
  return `${sign}${min}–${max}`
}

export function statIconUrl(icon: string): string {
  return `${BASE}data/stats/${icon}.png`
}
