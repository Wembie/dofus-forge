import type { Entity, Layer } from './renderer'
import { loadGear, loadMounts, loadPets, loadSkin } from './assets'
import type { SlotRule } from './slots'

/**
 * What a character wears and rides, loaded the same way for every view that
 * draws one (the animated stage, the stills on build cards), so a look rule
 * added for one can't be missing from the other.
 */

export interface Worn {
  layer: Layer
  rules?: SlotRule[]
}

/** Equipped hat / cape / shield ids → their skins and slot rules. Gear without a known look is skipped. */
export async function loadWorn(ids: (number | string)[]): Promise<Worn[]> {
  const keys = ids.filter(Boolean).map(String)
  if (!keys.length) return []
  const gear = await loadGear()
  const skins = keys.map(id => gear.items[id]).filter((s): s is number => s != null)
  const worn = await Promise.all(skins.map(s => loadSkin(s).then(
    (layer): Worn => ({ layer: layer as Layer, rules: gear.rules[s] }),
    () => null,
  )))
  return worn.filter((w): w is Worn => w !== null)
}

export type CompanionLook =
  | { kind: 'mount'; bone: string; colors?: number[]; scale: number; skins: Layer[] }
  | { kind: 'pet'; bone: string; colors?: number[]; scale: number }

/** A companion item's model: a mount (with any armour skins) or a pet; null when it has none. */
export async function loadCompanionLook(id: number): Promise<CompanionLook | null> {
  const [pets, mounts] = await Promise.all([loadPets(), loadMounts()])
  const mount = mounts[id]
  if (mount) {
    const skins: Layer[] = await Promise.all((mount.skins ?? []).map(s => loadSkin(s)))
    return { kind: 'mount', bone: mount.bone, colors: mount.colors, scale: mount.scale ?? 100, skins }
  }
  const pet = pets[id]
  return pet ? { kind: 'pet', bone: pet.bone, colors: pet.colors, scale: pet.scale } : null
}

/** Entity fields of a companion drawn next to (or under) a character of the given look scale. */
export function companionProps(c: CompanionLook, lookScale: number): Partial<Entity> {
  const base = { colors: c.colors, scale: c.scale / lookScale }
  if (c.kind === 'pet' || !c.skins.length) return base
  // The armour replaces the bone's own sprites node by node.
  return { ...base, skins: c.skins, worn: c.skins, armoured: true }
}
