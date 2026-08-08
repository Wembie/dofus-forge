import { CHARACTERISTICS } from '@/engine/types.ts'
import { ALL_SLOTS, type BuildSnapshot } from '@/store/buildStore.ts'
import type { BuildState } from '@/store/buildStore.ts'

const PREFIX = 'v1:'

/** Encode build state to a URL-safe string (schema v1). */
export function encodeBuild(state: Pick<BuildState, 'selectedClass' | 'level' | 'gender' | 'allocated' | 'scrolled' | 'equipped' | 'runes'>): string {
  // Compact runes: only slots with at least one non-zero value
  const runeMap: Record<string, Record<string, number>> = {}
  for (const [slot, slotRunes] of Object.entries(state.runes ?? {})) {
    if (!slotRunes) continue
    const nonZero = Object.fromEntries(Object.entries(slotRunes).filter(([, v]) => v > 0))
    if (Object.keys(nonZero).length > 0) runeMap[slot] = nonZero
  }

  const snap: BuildSnapshot = {
    v: 1,
    c: state.selectedClass ?? '',
    l: state.level,
    g: state.gender === 'female' ? 'f' : 'm',
    a: CHARACTERISTICS.map(c => state.allocated[c]),
    s: CHARACTERISTICS.reduce((mask, c, i) => mask | (state.scrolled[c] ? 1 << i : 0), 0),
    e: ALL_SLOTS.map(slot => state.equipped[slot] ?? null),
    r: Object.keys(runeMap).length > 0 ? runeMap : undefined,
  }
  const json   = JSON.stringify(snap)
  const b64    = btoa(unescape(encodeURIComponent(json)))
  const urlSafe = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return PREFIX + urlSafe
}

/** Decode a URL-safe string back to a BuildSnapshot, or null on failure. */
export function decodeBuild(encoded: string): BuildSnapshot | null {
  try {
    if (!encoded.startsWith(PREFIX)) return null
    const urlSafe = encoded.slice(PREFIX.length)
    const b64     = urlSafe.replace(/-/g, '+').replace(/_/g, '/')
    const json    = decodeURIComponent(escape(atob(b64)))
    const snap    = JSON.parse(json) as BuildSnapshot
    if (snap.v !== 1) return null  // unknown schema version — do not apply
    return snap
  } catch {
    return null
  }
}
