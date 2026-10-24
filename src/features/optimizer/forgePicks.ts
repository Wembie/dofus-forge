import { create } from 'zustand'
import { ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import { SLOT_CONFIGS } from '@/features/equipment/slotConfig.ts'
import type { AppItem } from '@/data/loaders.ts'

// Items La Forjadora must wear (required) or must never pick (banned). A
// store of its own, not part of the order config, because the planner sets
// them too (the pin on an equipped slot) while the Forge's modal is closed.
export const PICKS_KEY = 'dofus-forge:forge-picks'
// forgeConfig.ts STORAGE_KEY, not imported: the planner loads this file and
// the order config stays in the Forge's own chunk.
const CONFIG_KEY = 'dofus-forge:optimizer-config'

export type ForgePicks = { required: number[]; banned: number[] }

const ids = (v: unknown): number[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is number => Number.isSafeInteger(x) && x > 0))] : []

export function readPicks(): ForgePicks {
  try {
    const raw = localStorage.getItem(PICKS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ForgePicks>
      const banned = ids(parsed.banned)
      return { required: ids(parsed.required).filter(id => !banned.includes(id)), banned }
    }
    // Bans used to live in the order config, which no longer saves them:
    // move them over now, before the next config save drops them.
    const legacy = localStorage.getItem(CONFIG_KEY)
    const picks = { required: [], banned: legacy ? ids((JSON.parse(legacy) as { bannedItems?: unknown }).bannedItems) : [] }
    if (picks.banned.length) localStorage.setItem(PICKS_KEY, JSON.stringify(picks))
    return picks
  } catch {
    return { required: [], banned: [] }
  }
}

type PicksStore = ForgePicks & {
  /** Must be in every build (and is no longer banned). */
  require:       (id: number) => void
  /** Never picked (and no longer required). */
  ban:           (id: number) => void
  /** Neither required nor banned. */
  release:       (id: number) => void
  toggleRequired: (id: number) => void
  clearRequired: () => void
  clearBanned:   () => void
  /** Re-reads storage (tests, other tabs). */
  reload:        () => void
}

export const useForgePicks = create<PicksStore>((set, get) => ({
  ...readPicks(),
  require: id => set(s => ({ required: s.required.includes(id) ? s.required : [...s.required, id], banned: s.banned.filter(b => b !== id) })),
  ban: id => set(s => ({ banned: s.banned.includes(id) ? s.banned : [...s.banned, id], required: s.required.filter(r => r !== id) })),
  release: id => set(s => ({ required: s.required.filter(r => r !== id), banned: s.banned.filter(b => b !== id) })),
  toggleRequired: id => (get().required.includes(id) ? get().release(id) : get().require(id)),
  clearRequired: () => set({ required: [] }),
  clearBanned: () => set({ banned: [] }),
  reload: () => set(readPicks()),
}))

useForgePicks.subscribe((s, prev) => {
  if (s.required === prev.required && s.banned === prev.banned) return
  try { localStorage.setItem(PICKS_KEY, JSON.stringify({ required: s.required, banned: s.banned })) } catch { /* picks still apply this session */ }
})

/** Sheet slots an item can be worn in (rings and Dofus: several). */
export function slotsFor(item: AppItem): SlotId[] {
  return SLOT_CONFIGS.filter(c => {
    const slots = Array.isArray(c.apiSlot) ? c.apiSlot : [c.apiSlot]
    return slots.includes(item.slot) && (!c.apiTypes || c.apiTypes.includes(item.type))
  }).map(c => c.id)
}

export const isPrysmaradite = (item: AppItem) => item.type === 'Prysmaradite'

export type RequiredStatus =
  | 'placed'       // takes `slot`; the Forge searches the rest around it
  | 'kept'         // already worn in a slot the Forge keeps as is
  | 'no_slot'      // every slot it fits is locked or taken by another required item
  | 'prysmaradite' // a second Prysmaradite: the game allows only one
  | 'unknown'      // not in the current catalog

export type RequiredPlacement = { id: number; item?: AppItem; slot: SlotId | null; status: RequiredStatus; overLevel: boolean }

/**
 * Where each required item goes, exactly as the engine places them
 * (rust-optimizer/src/forge.rs, place_required): the first free slot it fits,
 * a Dofus other than a Prysmaradite from the last free Dofus slot. Only
 * `placed` ones are sent; the others are shown as conflicts.
 */
export function planRequired(
  required: number[],
  itemsById: ReadonlyMap<number, AppItem>,
  lockedSlots: ReadonlySet<SlotId>,
  equipped: Partial<Record<SlotId, number>>,
  characterLevel: number,
): RequiredPlacement[] {
  let free = ALL_SLOTS.filter(s => !lockedSlots.has(s))
  const kept = new Set(ALL_SLOTS.filter(s => lockedSlots.has(s)).map(s => equipped[s]).filter((id): id is number => id != null))
  let prysma = ALL_SLOTS.some(s => lockedSlots.has(s) && equipped[s] != null && itemsById.get(equipped[s]!)?.type === 'Prysmaradite')
  return required.map(id => {
    const item = itemsById.get(id)
    if (!item) return { id, slot: null, status: 'unknown', overLevel: false }
    const overLevel = item.level > characterLevel
    if (kept.has(id)) return { id, item, slot: ALL_SLOTS.find(s => lockedSlots.has(s) && equipped[s] === id) ?? null, status: 'kept', overLevel }
    if (isPrysmaradite(item) && prysma) return { id, item, slot: null, status: 'prysmaradite', overLevel }
    const fits = slotsFor(item)
    const candidates = free.filter(s => fits.includes(s))
    const fromLast = item.slot === 'dofus' && !isPrysmaradite(item)
    const slot = (fromLast ? candidates.at(-1) : candidates[0]) ?? null
    if (!slot) return { id, item, slot: null, status: 'no_slot', overLevel }
    free = free.filter(s => s !== slot)
    if (isPrysmaradite(item)) prysma = true
    return { id, item, slot, status: 'placed', overLevel }
  })
}

const MAX_RESULTS = 8

/** Generic slot name: "Ring", not "Ring 1" (the Forge may use either). */
export function slotNameKey(slot: SlotId): string {
  if (slot.startsWith('ring')) return 'slot_ring'
  if (slot.startsWith('dofus')) return 'slot_dofus'
  return `slot_${slot}`
}

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/**
 * Items whose name (or set name) contains every word of the query. Best
 * first: the query as a whole word ("wand" → "Brutatax Wand"), then names
 * starting with it ("Wanderelle"), then any word starting with it, then the
 * rest; highest level first within each.
 */
export function searchItems(items: AppItem[], setNames: ReadonlyMap<number, string>, query: string, limit = MAX_RESULTS): AppItem[] {
  const q = fold(query.trim())
  if (q.length < 2) return []
  const words = q.split(/\s+/)
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const wholeWord = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`)
  const wordStart = new RegExp(`(^|[^a-z0-9])${escaped}`)
  const hits: { item: AppItem; rank: number }[] = []
  for (const item of items) {
    if (slotsFor(item).length === 0) continue
    const name = fold(item.name)
    const set = item.set_id != null ? fold(setNames.get(item.set_id) ?? '') : ''
    if (!words.every(w => name.includes(w) || set.includes(w))) continue
    hits.push({ item, rank: wholeWord.test(name) ? 0 : name.startsWith(q) ? 1 : wordStart.test(name) ? 2 : 3 })
  }
  hits.sort((a, b) => a.rank - b.rank || b.item.level - a.item.level || a.item.name.localeCompare(b.item.name))
  return hits.slice(0, limit).map(h => h.item)
}
