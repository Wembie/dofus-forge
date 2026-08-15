export type AppEffect = {
  stat: string
  min: number
  max: number
}

export type AppItem = {
  ankama_id: number
  name: string
  level: number
  type: string
  slot: string
  effects: AppEffect[]
  set_id: number | null
  image_url: string | null
  description?: string
  ability?: string
  // Weapon combat stats (only present for weapon-slot items)
  ap_cost?: number
  crit_chance?: number
  crit_bonus?: number
  min_range?: number
  max_range?: number
  max_per_turn?: number
}

export type AppSet = {
  ankama_id: number
  name: string
  items: number[]
  bonuses: Record<number, AppEffect[]>
}

export type AppMount = {
  ankama_id: number
  name: string
  family: string
  image_url: string | null
}

export type RawEffect = {
  type?: { name?: string; is_meta?: boolean }
  int_minimum?: number
  int_maximum?: number
  formatted?: string
}

export type RawItem = {
  ankama_id?: number
  name?: string
  level?: number
  type?: { name?: string }
  effects?: RawEffect[]
  parent_set?: { id?: number }
  image_urls?: { icon?: string; sd?: string }
  description?: string
  is_weapon?: boolean
  ap_cost?: number
  critical_hit_probability?: number
  critical_hit_bonus?: number
  range?: { min?: number; max?: number }
  max_cast_per_turn?: number
}

export type RawSet = {
  ankama_id?: number
  name?: string
  equipment_ids?: number[]
  effects?: Record<string, RawEffect[]>
}

export type RawMount = {
  ankama_id?: number
  name?: string
  family?: { name?: string }
  image_urls?: { icon?: string; sd?: string }
}

const SLOT_MAP: Record<string, string> = {
  Hat: 'hat', Helmet: 'hat',
  Cape: 'cape', Cloak: 'cape',
  Amulet: 'amulet',
  Ring: 'ring',
  Belt: 'belt',
  Boots: 'boots',
  Sword: 'weapon', Wand: 'weapon', Bow: 'weapon',
  Dagger: 'weapon', Staff: 'weapon', Hammer: 'weapon',
  Shovel: 'weapon', Axe: 'weapon', Scythe: 'weapon',
  Lance: 'weapon', 'Magic weapon': 'weapon', Pickaxe: 'weapon',
  Shield: 'shield',
  Pet: 'pet', Petsmount: 'pet',
  Dofus: 'dofus', Trophy: 'dofus',
  Prysmaradite: 'dofus',
  Mount: 'mount',
}

function slotFromType(type: string): string {
  return SLOT_MAP[type] ?? 'other'
}

export function normalizeItem(raw: RawItem): AppItem {
  const abilityEffect = raw.effects?.find(e => e.type?.is_meta && e.formatted)
  const item: AppItem = {
    ankama_id: raw.ankama_id ?? 0,
    name:      raw.name ?? '',
    level:     raw.level ?? 1,
    type:      raw.type?.name ?? '',
    slot:      raw.is_weapon ? 'weapon' : slotFromType(raw.type?.name ?? ''),
    effects:   (raw.effects ?? []).map(e => ({
      stat: e.type?.name ?? '',
      min:  e.int_minimum ?? 0,
      max:  e.int_maximum ?? 0,
    })),
    set_id:    raw.parent_set?.id ?? null,
    image_url: raw.image_urls?.sd ?? raw.image_urls?.icon ?? null,
  }
  if (raw.description) item.description = raw.description
  if (abilityEffect?.formatted) item.ability = abilityEffect.formatted
  if (raw.is_weapon) {
    item.ap_cost     = raw.ap_cost                   ?? 0
    item.crit_chance = raw.critical_hit_probability  ?? 0
    item.crit_bonus  = raw.critical_hit_bonus         ?? 0
    item.min_range   = raw.range?.min                ?? 0
    item.max_range   = raw.range?.max                ?? 0
    item.max_per_turn = raw.max_cast_per_turn         ?? 0
  }
  return item
}

export function normalizeSet(raw: RawSet): AppSet {
  const bonuses: Record<number, AppEffect[]> = {}
  for (const [key, effects] of Object.entries(raw.effects ?? {})) {
    const pieces = Number(key)
    if (!Number.isNaN(pieces) && Array.isArray(effects)) {
      bonuses[pieces] = effects.map(e => ({
        stat: e.type?.name ?? '',
        min:  e.int_minimum ?? 0,
        max:  e.int_maximum ?? 0,
      }))
    }
  }
  return {
    ankama_id: raw.ankama_id ?? 0,
    name:      raw.name ?? '',
    items:     raw.equipment_ids ?? [],
    bonuses,
  }
}

export function normalizeMount(raw: RawMount): AppMount {
  return {
    ankama_id: raw.ankama_id ?? 0,
    name:      raw.name ?? '',
    family:    raw.family?.name ?? '',
    image_url: raw.image_urls?.sd ?? raw.image_urls?.icon ?? null,
  }
}
