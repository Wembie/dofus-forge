import type { ItemEffect } from './types.ts'

// An item takes one exotic effect: an exo AP / MP / Range or a single
// transcendence rune. It lives in the slot's rune map under this prefix, so
// builds saved and shared before exotics existed keep working unchanged.
export const EXOTIC_PREFIX = 'exo:'
export const EXO_STATS = ['AP', 'MP', 'Range'] as const

export type RuneMapLike = Record<string, number> | undefined

export const isExoticKey = (key: string) => key.startsWith(EXOTIC_PREFIX)
export const runeStat = (key: string) => (isExoticKey(key) ? key.slice(EXOTIC_PREFIX.length) : key)
export const exoticKey = (stat: string) => EXOTIC_PREFIX + stat

// Before exotics, an exo was added as a plain AP / MP / Range rune.
const isLegacyExo = (key: string) => (EXO_STATS as readonly string[]).includes(key)

export type Exotic = { key: string; stat: string; value: number; isExo: boolean }

/** The slot's exotic effect, if any. */
export function exoticOf(runes: RuneMapLike): Exotic | null {
  for (const [key, value] of Object.entries(runes ?? {})) {
    if (value > 0 && (isExoticKey(key) || isLegacyExo(key))) {
      const stat = runeStat(key)
      return { key, stat, value, isExo: isLegacyExo(stat) }
    }
  }
  return null
}

/** Rune map without its exotic effect: replacing an exotic drops these keys. */
export function withoutExotic(runes: RuneMapLike): Record<string, number> {
  return Object.fromEntries(Object.entries(runes ?? {}).filter(([k]) => !isExoticKey(k) && !isLegacyExo(k)))
}

/** Plain stat → value: an exotic and a normal rune on one stat add up. */
export function flattenRunes(runes: RuneMapLike): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(runes ?? {})) {
    if (value > 0) out[runeStat(key)] = (out[runeStat(key)] ?? 0) + value
  }
  return out
}

export function runeEffectsFrom(maps: Iterable<RuneMapLike>): ItemEffect[] {
  const effects: ItemEffect[] = []
  for (const map of maps) {
    for (const [stat, value] of Object.entries(flattenRunes(map))) effects.push({ stat, min: value, max: value })
  }
  return effects
}
