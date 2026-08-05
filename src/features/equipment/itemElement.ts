import type { AppItem } from '@/data/loaders.ts'

export type ElemFilter = 'all' | 'earth' | 'fire' | 'water' | 'air' | 'omni'

const EARTH = new Set(['Strength', 'Earth Damage', 'Earth damage', 'Earth Resistance', '% Earth Resistance', 'Earth steal'])
const FIRE  = new Set(['Intelligence', 'Fire Damage', 'Fire damage', 'Fire Resistance', '% Fire Resistance', 'Fire steal', 'Fire heals'])
const WATER = new Set(['Chance', 'Water Damage', 'Water damage', 'Water Resistance', '% Water Resistance'])
const AIR   = new Set(['Agility', 'Air Damage', 'Air damage', 'Air Resistance', '% Air Resistance', 'Air steal'])
const BEST  = new Set(['best-element damage', 'best-element steal'])

function has(item: AppItem, set: Set<string>): boolean {
  return item.effects.some(e => set.has(e.stat))
}

export function itemMatchesElement(item: AppItem, filter: ElemFilter): boolean {
  if (filter === 'all') return true
  const e = has(item, EARTH)
  const f = has(item, FIRE)
  const w = has(item, WATER)
  const a = has(item, AIR)
  const b = has(item, BEST)
  if (filter === 'omni')  return b || [e, f, w, a].filter(Boolean).length >= 3
  if (filter === 'earth') return e
  if (filter === 'fire')  return f
  if (filter === 'water') return w
  if (filter === 'air')   return a
  return true
}

type ElemMeta = { filter: ElemFilter; i18nKey: string; activeClass: string }

export const ELEM_FILTERS: readonly ElemMeta[] = [
  { filter: 'all',   i18nKey: 'elem_all',   activeClass: 'border-forge-gold  text-forge-gold'  },
  { filter: 'earth', i18nKey: 'elem_earth', activeClass: 'border-forge-earth text-forge-earth' },
  { filter: 'fire',  i18nKey: 'elem_fire',  activeClass: 'border-forge-fire  text-forge-fire'  },
  { filter: 'water', i18nKey: 'elem_water', activeClass: 'border-forge-water text-forge-water' },
  { filter: 'air',   i18nKey: 'elem_air',   activeClass: 'border-forge-air   text-forge-air'   },
  { filter: 'omni',  i18nKey: 'elem_omni',  activeClass: 'border-forge-gold  text-forge-gold'  },
]
