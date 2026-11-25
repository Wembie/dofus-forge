/**
 * ETL: the 32 companion "legendary bonus" spells (Croquette infusée, fed to
 * a legendary pet/mount — one specific fixed spell per croquette, the
 * player's own choice, not a random roll since patch 3.3).
 *
 * Usage: pnpm fetch-legendary-pets [--force]
 *
 * api.dofusdu.de files these 32 items as "Pet Food" (type id 75, level 200)
 * under /items/resources/all, each carrying the same "-special spell-" meta
 * effect format fetch-passives.ts already parses for item passives
 * (`{{spell,ID,GRADE::Name}} (level 200): ...`). Reuses its exported
 * `extractEffects` against the same raw game-data release (spells,
 * spell_levels, effects) to get the bearer's own stat effects — no text
 * parsing for the numbers, same as every other passive in this app.
 *
 * The croquette's own English name ("Moskito-Infused Croquette") gives a
 * stable, readable slug ("moskito") with no hand-kept id map. Its family
 * (Bakushana / Poukachi / Kwakarticho / Magicrabe) comes from its recipe's
 * first ingredient, a "<Family> Animal Legend" resource — also no hand map.
 * The croquette's name is just flavor text — any of the 32 can be fed to any
 * companion that can go legendary at all (a Pet or Petsmount item; a
 * Dragoturkey/Seemyool/Rhineetle mount can't), not only its namesake.
 *
 * What this does NOT auto-update: the bonus's display name/text in
 * public/locales/*\/translation.json (petleg_<slug>_name / _text) and which
 * ones get a `control` in src/engine/petLegendary.ts (LEGENDARY_LAYOUT) —
 * those still need a one-time human look whenever a slug here is new to
 * that file (the console warns when one is).
 *
 * Output: src/data/legendaryPets.generated.ts
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { checkedVersion } from './lib/safety.ts'
import { extractEffects, getJson, parseRefs, type GeneratedEffect } from './fetch-passives.ts'

const ROOT  = process.cwd()
const OUT   = join(ROOT, 'src', 'data', 'legendaryPets.generated.ts')
const FORCE = process.argv.includes('--force')
const META_URL = 'https://api.dofusdu.de/dofus3/v1/meta/version'
const ITEMS_URL = 'https://api.dofusdu.de/dofus3/v1/en/items/resources/all'
const PET_FOOD_TYPE_ID = 75

type ResourceItem = {
  ankama_id?: unknown
  name?: unknown
  level?: unknown
  type?: { id?: unknown }
  recipe?: { item_ankama_id?: unknown }[]
  effects?: { formatted?: unknown; type?: { is_meta?: unknown } }[]
}

export type LegendaryPool = 'bakushana' | 'poukachi' | 'kwakarticho' | 'magicrabe'
const FAMILY_WORD: Record<string, LegendaryPool> = {
  Bakusharna: 'bakushana', Pukachi: 'poukachi', Kwaketch: 'kwakarticho', Magikrab: 'magicrabe',
}

/** The spell id + bonus name out of the item's "-special spell-" meta effect. */
function specialSpell(item: ResourceItem): { spell: number; name: string } | null {
  for (const e of item.effects ?? []) {
    if (e.type?.is_meta !== true || typeof e.formatted !== 'string') continue
    const m = /\{\{spell,(\d+),(\d+)::([^}]+)\}\}/.exec(e.formatted)
    if (m) return { spell: Number(m[1]), name: m[3] }
  }
  return null
}

/** "Moskito-Infused Croquette" → "moskito". Stable as long as Ankama keeps
 * naming them this way; no hand-kept map to go stale. */
function slugOf(name: string): string | null {
  const m = /^(.+?)-Infused Croquette$/i.exec(name)
  return m ? m[1].toLowerCase().replace(/[^a-z]/g, '') : null
}

/** The croquette's family, from its recipe's "<Family> Animal Legend" ingredient. */
function familyOf(item: ResourceItem, byId: Map<number, ResourceItem>): LegendaryPool | null {
  const firstId = item.recipe?.[0]?.item_ankama_id
  const first = typeof firstId === 'number' ? byId.get(firstId) : undefined
  const firstName = typeof first?.name === 'string' ? first.name : ''
  for (const [word, pool] of Object.entries(FAMILY_WORD)) if (firstName.includes(word)) return pool
  return null
}

export type LegendaryPetSource = { pool: LegendaryPool; spell: number; itemId: number; effects: GeneratedEffect[] }

async function main() {
  const version = checkedVersion((await getJson(META_URL) as { version?: unknown }).version)
  if (!FORCE && existsSync(OUT) && readFileSync(OUT, 'utf8').includes(`gameVersion: '${version}'`)) {
    console.log(`Legendary pet bonuses up to date (${version}). Pass --force to refresh.`)
    return
  }
  console.log(`Generating legendary pet bonuses for ${version}…`)
  const base = `https://github.com/dofusdude/dofus3-main/releases/download/${encodeURIComponent(version)}`
  const [spellsRaw, levelsRaw, effectsRaw, textsRaw, itemsRaw] = await Promise.all([
    ...['spells.json', 'spell_levels.json', 'effects.json', 'en.json'].map(f => getJson(`${base}/${f}`)),
    getJson(ITEMS_URL),
  ])
  const spells = parseRefs(spellsRaw), levels = parseRefs(levelsRaw), effects = parseRefs(effectsRaw)
  const texts = (textsRaw as { entries: Record<string, string> }).entries
  const items = ((itemsRaw as { items?: ResourceItem[] }).items ?? [])
  const byId = new Map(items.flatMap(it => typeof it.ankama_id === 'number' ? [[it.ankama_id, it] as const] : []))

  const croquettes = items.filter(it =>
    it.type?.id === PET_FOOD_TYPE_ID && it.level === 200 && specialSpell(it) != null)

  const result: Record<string, LegendaryPetSource> = {}
  const problems: string[] = []
  for (const item of croquettes) {
    const id = item.ankama_id
    const name = typeof item.name === 'string' ? item.name : ''
    const spell = specialSpell(item)!
    const slug = slugOf(name)
    const pool = familyOf(item, byId)
    if (typeof id !== 'number' || !slug || !pool) { problems.push(`${name || id}: slug=${slug} pool=${pool}`); continue }
    result[slug] = { pool, spell: spell.spell, itemId: id, effects: extractEffects(spell.spell, spells, levels, effects, texts) }
  }
  if (problems.length) console.warn(`Skipped ${problems.length} croquette(s), couldn't resolve slug/family:\n  ${problems.join('\n  ')}`)

  const KNOWN_SLUGS = new Set([
    'moskito', 'chafer', 'domoizelle', 'koalak', 'spimush', 'persaport', 'dreggon', 'pingwinkle',
    'wabbit', 'trool', 'gobbette', 'sauroshell', 'piwi', 'kitsou', 'scurvion', 'leopena',
    'bwork', 'kanig', 'greedoblop', 'crackler', 'strich', 'kozaru', 'pandora', 'bambooto',
    'boowolf', 'treechnid', 'arachnee', 'neye', 'tofoone', 'bwak', 'scaraleaf', 'thoronduddleswell',
  ])
  const unknown = Object.keys(result).filter(s => !KNOWN_SLUGS.has(s))
  if (unknown.length) console.warn(
    `New legendary pet bonus slug(s) not yet in src/engine/petLegendary.ts or the 4 locale files: ${unknown.join(', ')}\n` +
    `Add petleg_<slug>_name/_text to public/locales/{es,en,fr,pt}/translation.json and a LEGENDARY_BONUSES entry by hand.`,
  )

  const slugs = Object.keys(result).sort()
  const body = slugs.map(s => `  ${JSON.stringify(s)}: ${JSON.stringify(result[s])},`).join('\n')
  writeFileSync(OUT,
    `// Generated by scripts/fetch-legendary-pets.ts from the game data — do not edit.\n` +
    `// The 32 companion "Croquette infusée" bonuses: which family crafts them and\n` +
    `// the bearer's own stat effects. Names/text stay hand-translated (see\n` +
    `// src/engine/petLegendary.ts) since the game doesn't expose them under a\n` +
    `// stable key the way item passives are.\n` +
    `import type { GeneratedEffect } from './passives.generated.ts'\n\n` +
    `export const LEGENDARY_PET_DATA_VERSION = { gameVersion: '${version}' } as const\n\n` +
    `export type LegendaryPool = 'bakushana' | 'poukachi' | 'kwakarticho' | 'magicrabe'\n` +
    `export type LegendaryPetSource = { pool: LegendaryPool; spell: number; itemId: number; effects: GeneratedEffect[] }\n\n` +
    `export const LEGENDARY_PET_DATA: Record<string, LegendaryPetSource> = {\n${body}\n}\n`)
  console.log(`Wrote ${slugs.length} legendary pet bonuses → ${OUT}`)
}

if (process.argv[1]?.endsWith('fetch-legendary-pets.ts')) {
  main().catch(err => { console.error(err); process.exit(1) })
}
