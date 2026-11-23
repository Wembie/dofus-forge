import { create } from 'zustand'
import { createBuildStore, ALL_SLOTS, type BuildState, type recompute as baseRecompute } from '../../src/store/buildStore.ts'
import { computeStats } from '../../src/engine/stats.ts'
import { runeEffectsForSlots } from '../../src/engine/runes.ts'
import { transformDracorune, type DracoruneMap, type Dracorune } from './dracorunes.ts'

export * from '../../src/store/buildStore.ts'

export const useDracorunes = create<{ applied: DracoruneMap }>(() => ({ applied: {} }))

export const recompute: typeof baseRecompute = (selectedClass, level, allocated, scrolled, equipped, equipment, sets, runes) => {
  if (!selectedClass) return null
  const byId = new Map(equipment.map(item => [item.ankama_id, item]))
  const transformed = new Set<string>()
  const items = ALL_SLOTS.flatMap(slot => {
    const item = byId.get(equipped[slot] ?? -1)
    if (!item) return []
    const selection = useDracorunes.getState().applied[slot]
    const effects = selection?.itemId === item.ankama_id ? transformDracorune(item, runes[slot] ?? {}, selection.rune) : null
    if (effects) transformed.add(slot)
    return [{ ...item, effects: effects ?? item.effects }]
  })
  const runeEffects = runeEffectsForSlots(runes, slot => !transformed.has(slot) && byId.has(equipped[slot as keyof typeof equipped] ?? -1))
  return computeStats({ class: selectedClass, level, allocated, scrolled, items, sets, runeEffects })
}

export const useBuildStore = createBuildStore(recompute)

export function applyDracorune(slot: string, rune: Dracorune | null) {
  const state = useBuildStore.getState()
  const itemId = state.equipped[slot as keyof typeof state.equipped]
  if (rune && itemId == null) return
  const applied = { ...useDracorunes.getState().applied }
  if (rune) {
    const item = state._equipment.find(it => it.ankama_id === itemId)
    if (!item || !transformDracorune(item, state.runes[slot as keyof typeof state.runes] ?? {}, rune)) return
    applied[slot] = { itemId: itemId!, rune }
  } else delete applied[slot]
  useDracorunes.setState({ applied })
  state.setEquipment(state._equipment)
}

const actions = useBuildStore.getState()
const guarded: Partial<BuildState> = {}
for (const key of ['setRune', 'clearRune', 'clearAllRunes', 'setExotic', 'clearExotic'] as const) {
  const original = actions[key] as (...args: unknown[]) => void
  Object.assign(guarded, { [key]: (...args: unknown[]) => {
    const slot = String(args[0])
    const applied = useDracorunes.getState().applied[slot]
    if (applied?.itemId === useBuildStore.getState().equipped[slot as keyof typeof actions.equipped]) return
    original(...args)
  } })
}
useBuildStore.setState(guarded)

useBuildStore.setState({
  swapSlots: (a, b) => {
    const applied = { ...useDracorunes.getState().applied }
    const first = applied[a], second = applied[b]
    delete applied[a]; delete applied[b]
    if (first) applied[b] = first
    if (second) applied[a] = second
    useDracorunes.setState({ applied })
    actions.swapSlots(a, b)
  },
  applyForgeResult: (result, locked) => {
    useDracorunes.setState({ applied: Object.fromEntries(Object.entries(useDracorunes.getState().applied).filter(([slot]) => locked.has(slot as keyof typeof result.equipped))) })
    actions.applyForgeResult(result, locked)
  },
})

useBuildStore.subscribe((state, previous) => {
  if (state.equipped === previous.equipped) return
  const applied = Object.fromEntries(Object.entries(useDracorunes.getState().applied).filter(([slot, value]) => state.equipped[slot as keyof typeof state.equipped] === value.itemId))
  useDracorunes.setState({ applied })
})
