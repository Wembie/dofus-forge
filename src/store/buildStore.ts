import { create } from 'zustand'
import type { DofusClass, Characteristic, AllocatedCharacteristics, ScrolledCharacteristics } from '@/engine/types.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import { pointCost, statBudget } from '@/engine/characteristics.ts'
import { computeStats } from '@/engine/stats.ts'
import type { StatBlock } from '@/engine/types.ts'

export type SlotId =
  | 'hat' | 'cape' | 'amulet' | 'ring1' | 'ring2'
  | 'belt' | 'boots' | 'weapon' | 'shield' | 'pet'
  | 'dofus1' | 'dofus2' | 'dofus3' | 'dofus4' | 'dofus5' | 'dofus6'

export const ALL_SLOTS: SlotId[] = [
  'hat', 'cape', 'amulet', 'ring1', 'ring2',
  'belt', 'boots', 'weapon', 'shield', 'pet',
  'dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6',
]

const ZERO_ALLOC: AllocatedCharacteristics = {
  vitality: 0, wisdom: 0, strength: 0, intelligence: 0, chance: 0, agility: 0,
}
const NO_SCROLLS: ScrolledCharacteristics = {
  vitality: false, wisdom: false, strength: false, intelligence: false, chance: false, agility: false,
}

interface BuildState {
  selectedClass: DofusClass | null
  level:         number
  allocated:     AllocatedCharacteristics
  scrolled:      ScrolledCharacteristics
  equipped:      Partial<Record<SlotId, AppItem>>

  // live computed stats — null until a class is selected
  stats: StatBlock | null

  // data refs needed for stat computation
  _sets: AppSet[]

  // actions
  setClass:    (c: DofusClass) => void
  setLevel:    (l: number) => void
  addPoint:    (char: Characteristic) => void
  removePoint: (char: Characteristic) => void
  toggleScroll:(char: Characteristic) => void
  equipItem:   (slot: SlotId, item: AppItem) => void
  unequipItem: (slot: SlotId) => void
  setSetsData: (sets: AppSet[]) => void
  reset:       () => void
}

function recompute(state: Omit<BuildState, 'stats' | '_sets' | 'setClass' | 'setLevel' | 'addPoint' | 'removePoint' | 'toggleScroll' | 'equipItem' | 'unequipItem' | 'setSetsData' | 'reset'>, sets: AppSet[]): StatBlock | null {
  if (!state.selectedClass) return null
  const items = Object.values(state.equipped).filter(Boolean).map(item => ({
    ankama_id: item!.ankama_id,
    effects:   item!.effects,
    set_id:    item!.set_id,
  }))
  return computeStats({
    class:     state.selectedClass,
    level:     state.level,
    allocated: state.allocated,
    scrolled:  state.scrolled,
    items,
    sets,
  })
}

export const useBuildStore = create<BuildState>((set, _get) => ({
  selectedClass: null,
  level:         1,
  allocated:     { ...ZERO_ALLOC },
  scrolled:      { ...NO_SCROLLS },
  equipped:      {},
  stats:         null,
  _sets:         [],

  setClass: (c) => set(s => {
    const next = { ...s, selectedClass: c }
    return { ...next, stats: recompute(next, s._sets) }
  }),

  setLevel: (l) => set(s => {
    const level = Math.max(1, Math.min(200, l))
    const next  = { ...s, level }
    return { ...next, stats: recompute(next, s._sets) }
  }),

  addPoint: (char) => set(s => {
    const budget  = statBudget(s.level)
    const spent   = (Object.keys(s.allocated) as Characteristic[])
      .reduce((acc, c) => acc + pointCost(c, s.allocated[c]), 0)
    const current = s.allocated[char]
    const nextCost = pointCost(char, current + 1) - pointCost(char, current)
    if (spent + nextCost > budget) return s
    const allocated = { ...s.allocated, [char]: current + 1 }
    const next = { ...s, allocated }
    return { ...next, stats: recompute(next, s._sets) }
  }),

  removePoint: (char) => set(s => {
    if (s.allocated[char] <= 0) return s
    const allocated = { ...s.allocated, [char]: s.allocated[char] - 1 }
    const next = { ...s, allocated }
    return { ...next, stats: recompute(next, s._sets) }
  }),

  toggleScroll: (char) => set(s => {
    const scrolled = { ...s.scrolled, [char]: !s.scrolled[char] }
    const next = { ...s, scrolled }
    return { ...next, stats: recompute(next, s._sets) }
  }),

  equipItem: (slot, item) => set(s => {
    const equipped = { ...s.equipped, [slot]: item }
    const next = { ...s, equipped }
    return { ...next, stats: recompute(next, s._sets) }
  }),

  unequipItem: (slot) => set(s => {
    const equipped = { ...s.equipped }
    delete equipped[slot]
    const next = { ...s, equipped }
    return { ...next, stats: recompute(next, s._sets) }
  }),

  setSetsData: (sets) => set(s => {
    const next = { ...s, _sets: sets }
    return { ...next, stats: recompute(next, sets) }
  }),

  reset: () => set({
    selectedClass: null,
    level:         1,
    allocated:     { ...ZERO_ALLOC },
    scrolled:      { ...NO_SCROLLS },
    equipped:      {},
    stats:         null,
  }),
}))
