import { create } from 'zustand'
import type { DofusClass, Characteristic, AllocatedCharacteristics, ScrolledCharacteristics, ItemEffect } from '@/engine/types.ts'
import { CHARACTERISTICS } from '@/engine/types.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import { pointCost, statBudget } from '@/engine/characteristics.ts'
import { computeStats } from '@/engine/stats.ts'
import type { StatBlock } from '@/engine/types.ts'

export type RuneMap = Record<string, number>

export type SlotId =
  | 'hat' | 'cape' | 'amulet' | 'ring1' | 'ring2'
  | 'belt' | 'boots' | 'weapon' | 'shield' | 'companion'
  | 'sidekick'
  | 'dofus1' | 'dofus2' | 'dofus3' | 'dofus4' | 'dofus5' | 'dofus6'

export const ALL_SLOTS: SlotId[] = [
  'hat', 'cape', 'amulet', 'ring1', 'ring2',
  'belt', 'boots', 'weapon', 'shield', 'companion',
  'sidekick',
  'dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6',
]

const ZERO_ALLOC: AllocatedCharacteristics = {
  vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0,
}
const NO_SCROLLS: ScrolledCharacteristics = {
  vitality: false, wisdom: false, strength: false, intelligence: false, chance: false, agility: false,
}

export type Gender = 'male' | 'female'

export interface BuildState {
  selectedClass: DofusClass | null
  level:         number
  gender:        Gender
  allocated:     AllocatedCharacteristics
  scrolled:      ScrolledCharacteristics
  /** Stores only ankama_id per slot — decoupled from data load state */
  equipped:      Partial<Record<SlotId, number>>
  /** Magesmithy rune bonuses per slot: stat label → flat bonus amount */
  runes:          Partial<Record<SlotId, RuneMap>>
  /** Craftsman signature per slot (only meaningful when runes are present) */
  forjamagoNames: Partial<Record<SlotId, string>>

  stats: StatBlock | null

  // data refs — injected by dataStore after load
  _equipment: AppItem[]
  _sets:      AppSet[]

  // actions
  setClass:      (c: DofusClass) => void
  setLevel:      (l: number) => void
  setGender:     (g: Gender) => void
  addPoint:      (char: Characteristic) => void
  removePoint:   (char: Characteristic) => void
  addPoints:     (char: Characteristic, amount: number) => void
  removePoints:  (char: Characteristic, amount: number) => void
  toggleScroll:  (char: Characteristic) => void
  equipItem:     (slot: SlotId, ankama_id: number) => void
  unequipItem:   (slot: SlotId) => void
  setEquipment:  (equipment: AppItem[]) => void
  setSetsData:   (sets: AppSet[]) => void
  setRune:          (slot: SlotId, stat: string, value: number) => void
  clearRune:        (slot: SlotId, stat: string) => void
  setForjamagoName: (slot: SlotId, name: string) => void
  applySnapshot:    (snap: BuildSnapshot) => void
  reset:         () => void
}

export type BuildSnapshot = {
  v:  1
  c:  string    // class id ('' = none)
  l:  number    // level
  g?: 'm' | 'f' // gender (optional, default male)
  a:  number[]  // allocated per CHARACTERISTICS order
  s:  number    // scrolled bitmask (bit i = CHARACTERISTICS[i])
  e:  (number | null)[]  // equipped ankama_ids per ALL_SLOTS order
  r?: Record<string, Record<string, number>>  // runes: slot → stat → value (optional)
}

function recompute(
  selectedClass: DofusClass | null,
  level: number,
  allocated: AllocatedCharacteristics,
  scrolled: ScrolledCharacteristics,
  equipped: Partial<Record<SlotId, number>>,
  equipment: AppItem[],
  sets: AppSet[],
  runes: Partial<Record<SlotId, RuneMap>>,
): StatBlock | null {
  if (!selectedClass) return null

  const equipMap = new Map(equipment.map(it => [it.ankama_id, it]))
  const items = ALL_SLOTS
    .map(slot => {
      const id = equipped[slot]
      if (id == null) return null
      const it = equipMap.get(id)
      return it ? { ankama_id: it.ankama_id, effects: it.effects, set_id: it.set_id, slot: it.slot } : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const runeEffects: ItemEffect[] = []
  for (const runeMap of Object.values(runes)) {
    if (!runeMap) continue
    for (const [stat, value] of Object.entries(runeMap)) {
      if (value > 0) runeEffects.push({ stat, min: value, max: value })
    }
  }

  return computeStats({ class: selectedClass, level, allocated, scrolled, items, sets, runeEffects })
}

export const useBuildStore = create<BuildState>((set) => {
  function update(patch: Partial<BuildState>, state: BuildState): Partial<BuildState> {
    const next = { ...state, ...patch }
    return {
      ...patch,
      stats: recompute(
        next.selectedClass, next.level, next.allocated, next.scrolled,
        next.equipped, next._equipment, next._sets, next.runes,
      ),
    }
  }

  return {
    selectedClass: null,
    level:         200,
    gender:        'male',
    allocated:     { ...ZERO_ALLOC },
    scrolled:      { ...NO_SCROLLS },
    equipped:       {},
    runes:          {},
    forjamagoNames: {},
    stats:          null,
    _equipment:     [],
    _sets:          [],

    setClass:  (c) => set(s => update({ selectedClass: c }, s)),
    setLevel:  (l) => set(s => update({ level: Math.max(1, Math.min(200, l)) }, s)),
    setGender: (g) => set(s => ({ ...s, gender: g })),

    addPoint: (char) => set(s => {
      const budget  = statBudget(s.level)
      const spent   = CHARACTERISTICS.reduce((acc, c) => acc + pointCost(c, s.allocated[c]), 0)
      const current = s.allocated[char]
      const nextCost = pointCost(char, current + 1) - pointCost(char, current)
      if (spent + nextCost > budget) return s
      return update({ allocated: { ...s.allocated, [char]: current + 1 } }, s)
    }),

    removePoint: (char) => set(s => {
      if (s.allocated[char] <= 0) return s
      return update({ allocated: { ...s.allocated, [char]: s.allocated[char] - 1 } }, s)
    }),

    addPoints: (char, amount) => set(s => {
      const budget = statBudget(s.level)
      let spent    = CHARACTERISTICS.reduce((acc, c) => acc + pointCost(c, s.allocated[c]), 0)
      let current  = s.allocated[char]
      let added    = 0
      while (added < amount) {
        const cost = pointCost(char, current + 1) - pointCost(char, current)
        if (spent + cost > budget) break
        spent += cost
        current++
        added++
      }
      if (added === 0) return s
      return update({ allocated: { ...s.allocated, [char]: current } }, s)
    }),

    removePoints: (char, amount) => set(s => {
      const current = s.allocated[char]
      if (current <= 0) return s
      return update({ allocated: { ...s.allocated, [char]: Math.max(0, current - amount) } }, s)
    }),

    toggleScroll: (char) => set(s =>
      update({ scrolled: { ...s.scrolled, [char]: !s.scrolled[char] } }, s)
    ),

    equipItem:   (slot, id) => set(s => update({ equipped: { ...s.equipped, [slot]: id } }, s)),
    unequipItem: (slot)     => set(s => {
      const equipped = { ...s.equipped }
      delete equipped[slot]
      return update({ equipped }, s)
    }),

    setRune: (slot, stat, value) => set(s => {
      const slotRunes = { ...(s.runes[slot] ?? {}), [stat]: value }
      return update({ runes: { ...s.runes, [slot]: slotRunes } }, s)
    }),

    clearRune: (slot, stat) => set(s => {
      const slotRunes = { ...(s.runes[slot] ?? {}) }
      delete slotRunes[stat]
      return update({ runes: { ...s.runes, [slot]: slotRunes } }, s)
    }),

    setForjamagoName: (slot, name) => set(s => ({ ...s, forjamagoNames: { ...s.forjamagoNames, [slot]: name } })),

    setEquipment: (equipment) => set(s =>
      update({ _equipment: equipment }, s)
    ),

    setSetsData: (sets) => set(s =>
      update({ _sets: sets }, s)
    ),

    applySnapshot: (snap) => set(s => {
      if (snap.v !== 1) return s
      const selectedClass = (snap.c || null) as DofusClass | null
      const level         = Math.max(1, Math.min(200, snap.l))
      const gender: Gender = snap.g === 'f' ? 'female' : 'male'
      const allocated     = Object.fromEntries(
        CHARACTERISTICS.map((c, i) => [c, snap.a[i] ?? 0])
      ) as AllocatedCharacteristics
      const scrolled      = Object.fromEntries(
        CHARACTERISTICS.map((c, i) => [c, Boolean(snap.s & (1 << i))])
      ) as ScrolledCharacteristics
      const equipped      = Object.fromEntries(
        ALL_SLOTS.map((slot, i) => [slot, snap.e[i] ?? undefined]).filter(([, v]) => v != null)
      ) as Partial<Record<SlotId, number>>
      const runes = snap.r
        ? (snap.r as Partial<Record<SlotId, RuneMap>>)
        : {}
      return update({ selectedClass, level, gender, allocated, scrolled, equipped, runes }, s)
    }),

    reset: () => set(s => ({
      selectedClass: null,
      level:         200,
      gender:        'male',
      allocated:     { ...ZERO_ALLOC },
      scrolled:      { ...NO_SCROLLS },
      equipped:       {},
      runes:          {},
      forjamagoNames: {},
      stats:          null,
      _equipment:    s._equipment,
      _sets:         s._sets,
    })),
  }
})
