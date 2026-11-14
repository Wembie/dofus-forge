import type { ItemEffect } from '../engine/types.ts'
import { itemStatEffects } from '../engine/stats.ts'
import { STAT_MAP, IGNORED_STATS, type StatKey } from '../engine/statMap.ts'
import { SPELL_ITEM_EFFECT_IDS } from './effectIds.ts'

// Relative imports only, and no browser code: react-router.config.ts reads
// the set slugs through this file while listing the pages to prerender,
// outside Vite's aliases. Hence the structural item/set types below, which
// AppItem and AppSet (data/loaders.ts) satisfy.
type GuideSet = { ankama_id: number; name: string; items: number[]; bonuses: Record<number, ItemEffect[]> }
type GuideItem = { ankama_id: number; level: number; slot: string; effects: ItemEffect[]; set_id: number | null }

export const GUIDE_ELEMENTS = ['earth', 'fire', 'water', 'air'] as const
export type GuideElement = (typeof GUIDE_ELEMENTS)[number]

const CHARACTERISTIC: Record<GuideElement, StatKey> = { earth: 'strength', fire: 'intelligence', water: 'chance', air: 'agility' }
const ELEMENT_DAMAGE: Record<GuideElement, StatKey> = { earth: 'earthDamage', fire: 'fireDamage', water: 'waterDamage', air: 'airDamage' }

/** What a link to a set page shows: enough for a card, nothing more. */
export type SetLink = {
  id:       number
  slug:     string
  name:     string
  level:    number
  pieces:   number
  icon:     string | null
  elements: GuideElement[]
  classId:  string | null
}

/** A community build as the guide pages list it: no snapshot, just what its card shows. */
export type GuideBuild = {
  id:        string
  name:      string
  classSlug: string
  gender:    'male' | 'female'
  level:     number
  rating:    number
  likes:     number
  author:    string | null
  elements:  GuideElement[]
}

/** Level brackets the class guides rank sets in, highest first. */
export const LEVEL_BRACKETS: readonly (readonly [number, number])[] = [[200, 200], [151, 199], [101, 150], [51, 100], [1, 50]]

/** ASCII, lowercase, dash-separated: "Panoplie du Bouftou Royal" -> "panoplie-du-bouftou-royal". */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * One URL slug per set that has at least one known item, from its English
 * name so a set keeps the same path in every language. Two sets with the
 * same name (the game has a few) are told apart by id; sets are walked in id
 * order so the older one keeps the bare slug across data updates.
 */
export function setSlugs(sets: readonly Pick<GuideSet, 'ankama_id' | 'name' | 'items'>[], knownItemIds: ReadonlySet<number>): Map<number, string> {
  const slugs = new Map<number, string>()
  const taken = new Set<string>()
  for (const set of [...sets].sort((a, b) => a.ankama_id - b.ankama_id)) {
    if (!set.items.some(id => knownItemIds.has(id))) continue
    const base = slugify(set.name) || 'set'
    const slug = taken.has(base) ? `${base}-${set.ankama_id}` : base
    taken.add(slug)
    slugs.set(set.ankama_id, slug)
  }
  return slugs
}

const effectValue = (e: Pick<ItemEffect, 'min' | 'max'>) => (e.max !== 0 && e.max > e.min ? e.max : e.min)

// StatBlock order (STAT_MAP lists them grouped: AP/MP/Range, characteristics, damage…).
const KEY_ORDER = new Map([...new Set(Object.values(STAT_MAP))].map((key, i) => [key, i]))

export type StatTotal = { stat: string; value: number }

/**
 * Sums effects the way the stats engine does (max of a range, weapon attack
 * lines excluded), keyed by stat so "Earth Damage" and "Earth damage" add up.
 * Each total keeps the English name of the first effect seen, which the UI
 * resolves to an icon and a label through STAT_META.
 */
export class StatTotals {
  private readonly totals = new Map<StatKey, StatTotal>()

  add(effects: readonly ItemEffect[]): this {
    for (const e of effects) {
      const key = STAT_MAP[e.stat]
      if (key === undefined || IGNORED_STATS.has(e.stat)) continue
      const total = this.totals.get(key)
      if (total) total.value += effectValue(e)
      else this.totals.set(key, { stat: e.stat, value: effectValue(e) })
    }
    return this
  }

  get(key: StatKey): number {
    return this.totals.get(key)?.value ?? 0
  }

  /** Non-zero totals in the stats panel's order. */
  list(): StatTotal[] {
    return [...this.totals.entries()]
      .filter(([, t]) => t.value !== 0)
      .sort(([a], [b]) => (KEY_ORDER.get(a) ?? 0) - (KEY_ORDER.get(b) ?? 0))
      .map(([, t]) => t)
  }
}

/** The bonus a set grants with `pieces` of its items worn: the highest tier reached (tiers are not cumulative). */
export function setBonusAt(set: Pick<GuideSet, 'bonuses'>, pieces: number): ItemEffect[] {
  const tier = Object.keys(set.bonuses).map(Number).filter(n => n <= pieces).sort((a, b) => b - a)[0]
  return tier === undefined ? [] : set.bonuses[tier]
}

/** Every item of the set worn at once, plus the full-set bonus. */
export function fullSetTotals(set: Pick<GuideSet, 'bonuses'>, items: readonly Pick<GuideItem, 'slot' | 'effects'>[]): StatTotals {
  const totals = new StatTotals()
  for (const item of items) totals.add(itemStatEffects(item))
  return totals.add(setBonusAt(set, items.length))
}

/** Gear stats of a list of equipped items, with the set bonuses they reach. */
export function gearTotals(items: readonly GuideItem[], setsById: ReadonlyMap<number, Pick<GuideSet, 'bonuses'>>): StatTotals {
  const totals = new StatTotals()
  const piecesBySet = new Map<number, Set<number>>()
  for (const item of items) {
    totals.add(itemStatEffects(item))
    if (item.set_id != null) piecesBySet.set(item.set_id, (piecesBySet.get(item.set_id) ?? new Set()).add(item.ankama_id))
  }
  for (const [setId, pieces] of piecesBySet) {
    const set = setsById.get(setId)
    if (set) totals.add(setBonusAt(set, pieces.size))
  }
  return totals
}

/** How much a stat line is worth to a damage dealer of an element (forgemagic rune weights). */
const SHARED_WEIGHT: Partial<Record<StatKey, number>> = {
  ap: 100, mp: 90, range: 51, summons: 30,
  power: 1, damage: 5, bestElemDamage: 5,
  critChance: 10, critDamage: 5,
  spellDamagePercent: 15, weaponDamagePercent: 15, meleeDamagePercent: 15, rangedDamagePercent: 15,
  vitality: 0.2, wisdom: 1,
}

/** An element's own stats: its characteristic plus its damage at rune weight. */
const ownStats = (totals: StatTotals, element: GuideElement) => totals.get(CHARACTERISTIC[element]) + 5 * totals.get(ELEMENT_DAMAGE[element])

/**
 * How good these stats are for an element, 0 when they don't play it at
 * all. Scaled by the element's share of all elemental stats: an omni set
 * splits its points four ways, so without that the same few omni sets top
 * every element's list.
 */
export function elementScore(totals: StatTotals, element: GuideElement): number {
  const own = ownStats(totals, element)
  if (own <= 0) return 0
  let shared = 0
  for (const [key, weight] of Object.entries(SHARED_WEIGHT) as [StatKey, number][]) shared += totals.get(key) * weight
  const allElements = GUIDE_ELEMENTS.reduce((sum, el) => sum + Math.max(0, ownStats(totals, el)), 0)
  return (own + shared) * (own / allElements)
}

/** The elements these stats are built for: any within 60% of the strongest one. */
export function statElements(totals: StatTotals): GuideElement[] {
  const own = GUIDE_ELEMENTS.map(el => [el, ownStats(totals, el)] as const)
  const best = Math.max(...own.map(([, v]) => v))
  if (best <= 0) return []
  return own.filter(([, v]) => v >= best * 0.6).map(([el]) => el)
}

/** A set's level: its highest-level item, which gates wearing the full set. */
export const setLevel = (items: readonly Pick<GuideItem, 'level'>[]) => Math.max(0, ...items.map(it => it.level))

/**
 * The class a set is made for, when its items modify that class's spells
 * (the effect's min holds the spell id). Null for a regular set.
 */
export function setClass(items: readonly Pick<GuideItem, 'effects'>[], classBySpellId: ReadonlyMap<number, string>): string | null {
  const votes = new Map<string, number>()
  for (const item of items) {
    for (const e of item.effects) {
      if (!SPELL_ITEM_EFFECT_IDS.has(e.effect_id ?? -1)) continue
      const cls = classBySpellId.get(e.min)
      if (cls) votes.set(cls, (votes.get(cls) ?? 0) + 1)
    }
  }
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}
