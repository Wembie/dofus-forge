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
}

export type AppSet = {
  ankama_id: number
  name: string
  items: number[]
  bonuses: Record<number, AppEffect[]>
}

export type RawEffect = {
  type?: { name?: string }
  int_minimum?: number
  int_maximum?: number
}

export type RawItem = {
  ankama_id?: number
  name?: string
  level?: number
  type?: { name?: string }
  effects?: RawEffect[]
  parent_set?: { id?: number }
  image_urls?: { sd?: string; hd?: string }
}

export type RawSet = {
  ankama_id?: number
  name?: string
  equipment_ids?: number[]
  effects?: Record<string, RawEffect[]>
}

function slotFromType(type: string): string {
  const map: Record<string, string> = {
    Hat: 'hat', Helmet: 'hat',
    Cape: 'cape', Cloak: 'cape',
    Amulet: 'amulet',
    Ring: 'ring',
    Belt: 'belt',
    Boots: 'boots',
    Weapon: 'weapon', Sword: 'weapon', Wand: 'weapon',
    Shield: 'shield',
    Pet: 'pet', Petsmount: 'pet',
    Dofus: 'dofus', Trophy: 'dofus',
    Mount: 'mount',
  }
  return map[type] ?? 'other'
}

export function normalizeItem(raw: RawItem): AppItem {
  return {
    ankama_id: raw.ankama_id ?? 0,
    name: raw.name ?? '',
    level: raw.level ?? 1,
    type: raw.type?.name ?? '',
    slot: slotFromType(raw.type?.name ?? ''),
    effects: (raw.effects ?? []).map(e => ({
      stat: e.type?.name ?? '',
      min:  e.int_minimum ?? 0,
      max:  e.int_maximum ?? 0,
    })),
    set_id:    raw.parent_set?.id ?? null,
    image_url: raw.image_urls?.hd ?? raw.image_urls?.sd ?? null,
  }
}

export function normalizeSet(raw: RawSet): AppSet {
  const bonuses: Record<number, AppEffect[]> = {}
  for (const [key, effects] of Object.entries(raw.effects ?? {})) {
    bonuses[Number(key)] = effects.map(e => ({
      stat: e.type?.name ?? '',
      min:  e.int_minimum ?? 0,
      max:  e.int_maximum ?? 0,
    }))
  }
  return {
    ankama_id: raw.ankama_id ?? 0,
    name: raw.name ?? '',
    items: raw.equipment_ids ?? [],
    bonuses,
  }
}
