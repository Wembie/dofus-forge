import type { ItemEffect } from './types.ts'

// An item takes one transcendence rune, on top of its normal runes. It lives
// in the slot's rune map under this prefix, so builds saved and shared
// before keep working unchanged.
export const EXOTIC_PREFIX = 'exo:'

export type RuneMapLike = Record<string, number> | undefined

export const isExoticKey = (key: string) => key.startsWith(EXOTIC_PREFIX)
export const runeStat = (key: string) => (isExoticKey(key) ? key.slice(EXOTIC_PREFIX.length) : key)
export const exoticKey = (stat: string) => EXOTIC_PREFIX + stat

export type Exotic = { key: string; stat: string; value: number }

/** The slot's transcendence rune, if any. */
export function exoticOf(runes: RuneMapLike): Exotic | null {
  for (const [key, value] of Object.entries(runes ?? {})) {
    if (value > 0 && isExoticKey(key)) return { key, stat: runeStat(key), value }
  }
  return null
}

/** Rune map without its transcendence rune. */
export function withoutExotic(runes: RuneMapLike): Record<string, number> {
  return Object.fromEntries(Object.entries(runes ?? {}).filter(([k]) => !isExoticKey(k)))
}

/** Plain stat → value: a transcendence and a normal rune on one stat add up. */
export function flattenRunes(runes: RuneMapLike): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(runes ?? {})) {
    if (value > 0) out[runeStat(key)] = (out[runeStat(key)] ?? 0) + value
  }
  return out
}

/** Rune effects of the slots that actually hold an item: runes left on an
 * empty slot (item missing after a data update, crafted link) add nothing. */
export function runeEffectsForSlots(runes: Record<string, RuneMapLike> | undefined, hasItem: (slot: string) => boolean): ItemEffect[] {
  return runeEffectsFrom(Object.entries(runes ?? {}).filter(([slot]) => hasItem(slot)).map(([, map]) => map))
}

export function runeEffectsFrom(maps: Iterable<RuneMapLike>): ItemEffect[] {
  const effects: ItemEffect[] = []
  for (const map of maps) {
    for (const [stat, value] of Object.entries(flattenRunes(map))) effects.push({ stat, min: value, max: value })
  }
  return effects
}
