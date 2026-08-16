import { create } from 'zustand'
import { CHARACTERISTICS } from '@/engine/types.ts'
import { DOFUS_CLASSES } from '@/engine/types.ts'
import type { DofusClass, AllocatedCharacteristics, ScrolledCharacteristics, ItemEffect } from '@/engine/types.ts'
import { ALL_SLOTS, type BuildSnapshot, type SlotId, type RuneMap } from '@/store/buildStore.ts'
import { computeStats } from '@/engine/stats.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { StatBlock } from '@/engine/types.ts'

function snapshotToStats(snap: BuildSnapshot, equipment: AppItem[], sets: AppSet[]): StatBlock | null {
  if (!snap.c || !(DOFUS_CLASSES as readonly string[]).includes(snap.c)) return null

  const allocated = Object.fromEntries(
    CHARACTERISTICS.map((c, i) => [c, snap.a[i] ?? 0])
  ) as AllocatedCharacteristics

  const scrolled = Object.fromEntries(
    CHARACTERISTICS.map((c, i) => [c, Boolean(snap.s & (1 << i))])
  ) as ScrolledCharacteristics

  const equippedMap = Object.fromEntries(
    ALL_SLOTS.map((slot, i) => [slot, snap.e[i] ?? undefined]).filter(([, v]) => v != null)
  ) as Partial<Record<SlotId, number>>

  const runes = (snap.r ?? {}) as Partial<Record<SlotId, RuneMap>>

  const equipMap = new Map(equipment.map(it => [it.ankama_id, it]))
  const items = ALL_SLOTS
    .map(slot => {
      const id = equippedMap[slot]
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

  return computeStats({
    class:     snap.c as DofusClass,
    level:     Math.max(1, Math.min(200, snap.l)),
    allocated,
    scrolled,
    items,
    sets,
    runeEffects,
  })
}

interface CompareState {
  active:    boolean
  nameB:     string
  snapshotB: BuildSnapshot | null
  statsB:    StatBlock | null
  equippedB: Partial<Record<SlotId, number>>
  classB:    string
  levelB:    number
  genderB:   string

  toggle:       () => void
  loadBuild:    (snap: BuildSnapshot, name: string, equipment: AppItem[], sets: AppSet[]) => void
  clearB:       () => void
  refreshStats: (equipment: AppItem[], sets: AppSet[]) => void
}

export const useCompareStore = create<CompareState>((set, get) => ({
  active:    false,
  nameB:     '',
  snapshotB: null,
  statsB:    null,
  equippedB: {},
  classB:    '',
  levelB:    1,
  genderB:   'male',

  toggle: () => set(s => ({ active: !s.active })),

  loadBuild: (snap, name, equipment, sets) => {
    const statsB    = snapshotToStats(snap, equipment, sets)
    const equippedB = Object.fromEntries(
      ALL_SLOTS.map((slot, i) => [slot, snap.e[i] ?? undefined]).filter(([, v]) => v != null)
    ) as Partial<Record<SlotId, number>>
    set({ snapshotB: snap, nameB: name, statsB, equippedB, classB: snap.c, levelB: snap.l, genderB: snap.g === 'f' ? 'female' : 'male', active: true })
  },

  clearB: () => set({ snapshotB: null, nameB: '', statsB: null, equippedB: {}, classB: '', levelB: 1, genderB: 'male' }),

  refreshStats: (equipment, sets) => {
    const { snapshotB } = get()
    if (!snapshotB) return
    set({ statsB: snapshotToStats(snapshotB, equipment, sets) })
  },
}))
