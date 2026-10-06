/**
 * ETL: dofus3-main GitHub release raw Unity data -> equipment + sets
 *
 * Why this exists: api.dofusdu.de's REST API (items/equipment/all,
 * items/consumables/all, sets/all) stopped returning any `effects` at all for
 * any item as of the Dofus 3.7 rollout (verified directly against the live
 * API — every item/set effect field came back empty, on both the bulk and
 * single-item endpoints, with no query param restoring it). That's an outage
 * on the third-party provider's side, not something fixable by calling their
 * API differently.
 *
 * This module sources equipment + sets directly from the same raw Unity game
 * data dump already used for spells (scripts/fetch-spells.ts) — GitHub
 * releases, not the REST API — so it doesn't depend on dofusdu.de's broken
 * effects-resolution layer at all. Mounts and consumables still come from the
 * REST API in fetch-data.ts (mounts never carried effects to begin with;
 * consumables aren't used anywhere in the app, see src/data/loaders.ts).
 *
 * Known gaps vs. the old REST-API-sourced data (not attempted here — scoped
 * out to ship the actual regression fix, which was items showing zero
 * stats): item "ability" flavor-text boxes (special passive text, e.g. a
 * ring with "Auto-steals X PA on crit" rendered text) and equip conditions
 * ("requires level X in subclass Y") are not populated. Both are rare and
 * display-only — they don't affect stat totals or whether an item can be
 * equipped in the planner.
 */

import type { AppItem, AppSet, AppEffect } from './normalize.ts'

const GH_BASE = 'https://github.com/dofusdude/dofus3-main/releases/download'

// Same slot/type mapping normalize.ts already uses for the REST-API path —
// item_types.json's canonical EN names line up with these exactly (verified:
// typeId 6 -> "Sword", typeId 9 -> "Ring", etc.)
const SLOT_MAP: Record<string, string> = {
  Hat: 'hat', Helmet: 'hat',
  Cape: 'cape', Cloak: 'cape',
  Amulet: 'amulet',
  Ring: 'ring',
  Belt: 'belt',
  Boots: 'boots',
  Sword: 'weapon', Wand: 'weapon', Bow: 'weapon',
  Dagger: 'weapon', Staff: 'weapon', Hammer: 'weapon',
  Shovel: 'weapon', Axe: 'weapon', Scythe: 'weapon',
  Lance: 'weapon', 'Magic weapon': 'weapon', Pickaxe: 'weapon',
  Shield: 'shield',
  Pet: 'pet', Petsmount: 'pet',
  Dofus: 'dofus', Trophy: 'dofus',
  Prysmaradite: 'dofus',
  Mount: 'mount',
}
function slotFromType(type: string): string {
  return SLOT_MAP[type] ?? 'other'
}

// actionId -> AppEffect.stat, verified 2026-10-06 against dofus3-main 3.7.1.0
// by cross-referencing effects.json's EN description templates (e.g. actionId
// 125's template is "#1{{~1~2 to }}#2 Vitality") against the exact stat name
// strings STAT_META (src/features/equipment/statDisplay.ts) already expects.
const POSITIVE_STAT_IDS: Record<number, string> = {
  118: 'Strength', 119: 'Agility', 123: 'Chance', 124: 'Wisdom',
  125: 'Vitality', 126: 'Intelligence',
  111: 'AP', 128: 'MP', 117: 'Range',
  174: 'Initiative', 176: 'Prospecting', 178: 'Heal', 138: 'Power',
  752: 'Dodge', 753: 'Lock',
  115: '% Critical', 418: 'Critical Damage', 420: 'Critical Resistance',
  100: 'Neutral damage', 430: 'Neutral Damage',
  98:  'Air damage',     428: 'Air Damage',
  99:  'Fire damage',    424: 'Fire Damage',
  97:  'Earth damage',   422: 'Earth Damage',
  96:  'Water damage',   426: 'Water Damage',
  91: 'Water steal', 92: 'Earth steal', 93: 'Air steal', 94: 'Fire steal', 95: 'Neutral steal',
  210: '% Earth Resistance', 211: '% Water Resistance', 212: '% Air Resistance',
  213: '% Fire Resistance',  214: '% Neutral Resistance',
  240: 'Earth Resistance', 241: 'Water Resistance', 242: 'Air Resistance',
  243: 'Fire Resistance',  244: 'Neutral Resistance',
  160: 'AP Parry', 161: 'MP Parry', 410: 'AP Reduction', 412: 'MP Reduction',
  416: 'Pushback Resistance', 414: 'Pushback Damage',
  182: 'Summons', 2828: 'best-element steal',
}
// Same stats, but the game stores these as a malus template ("-#1 Stat") while
// the raw diceNum/diceSide are still positive magnitudes — negate on read.
const NEGATIVE_STAT_IDS: Record<number, string> = {
  155: 'Intelligence', 156: 'Wisdom', 419: 'Critical Damage', 171: '% Critical',
  186: 'Power', 162: 'AP Parry', 411: 'AP Reduction', 175: 'Initiative',
  755: 'Lock', 754: 'Dodge', 217: '% Air Resistance', 417: 'Pushback Resistance',
}

type RefEntry = { data?: Record<string, unknown>; rid?: string }
type RefMap   = { byId: Map<number, Record<string, unknown>>; byRid: Map<string, Record<string, unknown>> }

// GitHub's release-asset CDN occasionally 500s on a single large file while
// every other asset in the same release succeeds (observed firsthand on
// en.json for 3.7.1.0 — gone on the 4th attempt, seconds apart). This runs
// unattended weekly via CI, so retry with backoff instead of failing outright
// on what's usually a transient edge hiccup, not a real outage.
//
// `"rid":<digits>` values are 64-bit ids (e.g. 398376278496924688) that
// overflow JS's float64 safe-integer range (2^53) — plain JSON.parse silently
// rounds them, and distinct rids collide onto the same rounded number (66370
// genuinely distinct rids in items.json collapse to just 1039 after a normal
// parse). Quoting every rid digit string before parsing keeps its exact value
// as a string, since that's the only use rid has here (an opaque lookup key,
// never arithmetic) — this must run on every file that embeds effect
// instances (items.json, item_sets.json), so it's applied to all of them.
async function fetchJson<T>(version: string, file: string, attempt = 1): Promise<T> {
  const url = `${GH_BASE}/${version}/${file}`
  const res = await fetch(url)
  if (res.ok) {
    const text = await res.text()
    return JSON.parse(text.replace(/"rid":(\d+)/g, '"rid":"$1"')) as T
  }
  if (attempt < 4) {
    await new Promise(r => setTimeout(r, attempt * 3000))
    return fetchJson<T>(version, file, attempt + 1)
  }
  throw new Error(`GET ${url} -> ${res.status} ${res.statusText} (after ${attempt} attempts)`)
}

function parseRefs(raw: unknown): RefMap {
  const byId = new Map<number, Record<string, unknown>>()
  const byRid = new Map<string, Record<string, unknown>>()
  const refs = ((raw as Record<string, unknown>)?.references as Record<string, unknown>)?.RefIds as RefEntry[]
  if (!Array.isArray(refs)) return { byId, byRid }
  for (const ref of refs) {
    if (ref.data?.id != null) byId.set(Number(ref.data.id), ref.data)
    if (ref.rid != null && ref.data) byRid.set(ref.rid, ref.data)
  }
  return { byId, byRid }
}

function effectFromRid(rid: string, byRid: Map<string, Record<string, unknown>>): AppEffect | null {
  const eff = byRid.get(rid)
  if (!eff) return null
  const actionId = Number(eff.actionId)
  const neg = NEGATIVE_STAT_IDS[actionId]
  const pos = POSITIVE_STAT_IDS[actionId]
  const stat = neg ?? pos
  if (!stat) return null
  const sign = neg ? -1 : 1
  return { stat, min: sign * Number(eff.diceNum ?? 0), max: sign * Number(eff.diceSide ?? 0), effect_id: actionId }
}

// `{ Array: [...] }` wrapper used throughout this data format for lists.
function unwrapArray(v: unknown): unknown[] {
  return ((v as Record<string, unknown>)?.Array ?? []) as unknown[]
}

export type RawGameData = {
  version:   string
  items:     RefMap
  sets:      RefMap
  typeNames: Map<number, string>  // typeId -> canonical EN name
}

export async function fetchRawGameData(version: string): Promise<RawGameData> {
  const [rawItems, rawSets, rawTypes, rawEn] = await Promise.all([
    fetchJson<unknown>(version, 'items.json'),
    fetchJson<unknown>(version, 'item_sets.json'),
    fetchJson<unknown>(version, 'item_types.json'),
    fetchJson<{ entries: Record<string, string> }>(version, 'en.json'),
  ])
  const items = parseRefs(rawItems)
  const sets  = parseRefs(rawSets)
  const types = parseRefs(rawTypes)

  const typeNames = new Map<number, string>()
  for (const [typeId, t] of types.byId) {
    const name = rawEn.entries[String(t.nameId)]
    if (name) typeNames.set(typeId, name)
  }
  return { version, items, sets, typeNames }
}

export async function buildEquipmentAndSets(
  raw: RawGameData, lang: string,
): Promise<{ equipment: AppItem[]; sets: AppSet[] }> {
  const { entries } = await fetchJson<{ entries: Record<string, string> }>(raw.version, `${lang}.json`)
  const t = (id: unknown) => entries[String(id)] ?? ''

  const equipment: AppItem[] = []
  for (const [id, data] of raw.items.byId) {
    // item_types.json/item_sets.json are separate files with their own RefIds
    // pools — items.byId only ever holds items.json's own entries, but not
    // every entry there is a wearable item (recipes, resources, quest items
    // share the same file); only real equipment carries all three of these.
    if (data.nameId == null || data.typeId == null || data.possibleEffects == null) continue
    const typeName = raw.typeNames.get(Number(data.typeId)) ?? ''
    // items.json has every item in the game (resources, quest items,
    // cosmetics/"Ceremonial" costumes, mount breeds, recipes, consumables,
    // real equipment — ~21.5k total) with no single "is equipment" flag.
    // SLOT_MAP's keys ARE the exact set of types the old REST API's
    // items/equipment/all endpoint used to return — anything else (Ceremonial
    // Hat, Roleplay buff, Dragoturkey the mount breed, etc.) isn't gear the
    // planner equips, so skip it the same way that endpoint implicitly did.
    if (!(typeName in SLOT_MAP)) continue
    const isWeapon = data.apCost !== undefined
    const effects: AppEffect[] = []
    for (const ref of unwrapArray(data.possibleEffects)) {
      const rid = (ref as { rid?: string }).rid
      if (rid == null) continue
      const eff = effectFromRid(rid, raw.items.byRid)
      if (eff) effects.push(eff)
    }
    const item: AppItem = {
      ankama_id: id,
      name:      t(data.nameId),
      level:     Number(data.level ?? 1),
      type:      typeName,
      slot:      isWeapon ? 'weapon' : slotFromType(typeName),
      effects,
      set_id:    Number(data.itemSetId ?? -1) >= 0 ? Number(data.itemSetId) : null,
      image_url: data.iconId != null ? `https://api.dofusdu.de/dofus3/v1/img/item/${data.iconId}-128.png` : null,
    }
    const desc = t(data.descriptionId)
    if (desc) item.description = desc
    if (isWeapon) {
      item.ap_cost      = Number(data.apCost ?? 0)
      item.crit_chance  = Number(data.criticalHitProbability ?? 0)
      item.crit_bonus   = Number(data.criticalHitBonus ?? 0)
      item.min_range    = Number(data.minRange ?? 0)
      item.max_range    = Number(data.range ?? 0)
      item.max_per_turn = Number(data.maxCastPerTurn ?? 0)
    }
    equipment.push(item)
  }

  const sets: AppSet[] = []
  for (const [id, data] of raw.sets.byId) {
    if (data.nameId == null || data.items == null) continue
    const bonuses: Record<number, AppEffect[]> = {}
    unwrapArray(data.effects).forEach((tier, idx) => {
      const refs = unwrapArray((tier as Record<string, unknown>).values)
      const pieceEffects: AppEffect[] = []
      for (const ref of refs) {
        const rid = (ref as { rid?: string }).rid
        if (rid == null) continue
        const eff = effectFromRid(rid, raw.sets.byRid)
        if (eff) pieceEffects.push(eff)
      }
      if (pieceEffects.length > 0) bonuses[idx + 1] = pieceEffects
    })
    sets.push({
      ankama_id: id,
      name:      t(data.nameId),
      items:     unwrapArray(data.items).map(v => Number(v)).filter(v => v > 0),
      bonuses,
    })
  }

  return { equipment, sets }
}
