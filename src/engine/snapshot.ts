import type { BuildSnapshot } from '../store/buildStore.ts'

// Relative imports only: the Cloudflare Worker bundles this file too.

/** Slot ids in the order of a snapshot's `e` array (= ALL_SLOTS in buildStore.ts). */
export const SNAPSHOT_SLOT_IDS: readonly string[] = [
  'hat', 'cape', 'amulet', 'ring1', 'ring2',
  'belt', 'boots', 'weapon', 'shield', 'companion',
  'sidekick',
  'dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6',
]
export const SNAPSHOT_SLOTS = SNAPSHOT_SLOT_IDS.length
const SLOT_ID_SET = new Set(SNAPSHOT_SLOT_IDS)
const CHARACTERISTIC_COUNT = 6
// Far above any real allocation (the level-200 budget is ~1000 points), low
// enough that the point-cost loop stays instant on a crafted value.
const MAX_ALLOCATED = 5000

function int(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : fallback
}

const isRecord = (v: unknown): v is Record<string, unknown> => v != null && typeof v === 'object' && !Array.isArray(v)

// Per-slot maps keep only real slot ids (never `__proto__` or other junk keys)
// and are built with Object.fromEntries, so no key from the input is assigned.
function slotEntries<T>(raw: Record<string, unknown>, pick: (v: unknown) => T | null): Record<string, T> {
  return Object.fromEntries(Object.entries(raw).flatMap(([slot, v]) => {
    if (!SLOT_ID_SET.has(slot)) return []
    const picked = pick(v)
    return picked == null ? [] : [[slot, picked] as const]
  }))
}

/**
 * Normalizes a snapshot from an untrusted source (share link, database row):
 * missing or malformed fields get safe defaults instead of crashing the page
 * (`snap.a[i]` on a missing array, negative points in pointCost…). Returns
 * null only when it isn't a v1 snapshot at all.
 */
export function sanitizeSnapshot(raw: unknown): BuildSnapshot | null {
  if (!isRecord(raw) || raw.v !== 1) return null
  const a = Array.isArray(raw.a) ? raw.a : []
  const e = Array.isArray(raw.e) ? raw.e : []
  const snap: BuildSnapshot = {
    v: 1,
    c: typeof raw.c === 'string' ? raw.c : '',
    l: int(raw.l, 1, 200, 200),
    a: Array.from({ length: CHARACTERISTIC_COUNT }, (_, i) => int(a[i], 0, MAX_ALLOCATED, 0)),
    s: int(raw.s, 0, (1 << CHARACTERISTIC_COUNT) - 1, 0),
    e: Array.from({ length: SNAPSHOT_SLOTS }, (_, i) => {
      const id = e[i]
      return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null
    }),
  }
  if (typeof raw.n === 'string' && raw.n) snap.n = raw.n
  if (raw.g === 'm' || raw.g === 'f') snap.g = raw.g
  if (isRecord(raw.r)) {
    const runes = slotEntries(raw.r, map => {
      if (!isRecord(map)) return null
      const clean = Object.fromEntries(Object.entries(map).filter(([, v]) => typeof v === 'number' && Number.isFinite(v) && v > 0)) as Record<string, number>
      return Object.keys(clean).length > 0 ? clean : null
    })
    if (Object.keys(runes).length > 0) snap.r = runes
  }
  if (isRecord(raw.fn)) {
    const names = slotEntries(raw.fn, v => (typeof v === 'string' && v ? v : null))
    if (Object.keys(names).length > 0) snap.fn = names
  }
  if (isRecord(raw.wt)) {
    const transforms = slotEntries(raw.wt, v => (isRecord(v) && typeof v.el === 'string' && typeof v.r === 'number' ? { el: v.el, r: v.r } : null))
    if (Object.keys(transforms).length > 0) snap.wt = transforms
  }
  return snap
}
