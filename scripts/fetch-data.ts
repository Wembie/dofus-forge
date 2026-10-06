/**
 * ETL: DofusDude public API -> normalized static JSON
 *
 * Usage:
 *   pnpm fetch-data [--force]
 *
 * Verified endpoints (against live DofusDude API 2026-08-05):
 *   GET /dofus3/v1/meta/version             -> { version, release, update_stamp }
 *   GET /dofus3/v1/{lang}/items/equipment/all -> { items: RawItem[] }
 *   GET /dofus3/v1/{lang}/items/consumables/all -> { items: RawItem[] }
 *   GET /dofus3/v1/{lang}/sets/all           -> { sets: RawSet[] }
 *   GET /dofus3/v1/{lang}/mounts/all         -> { mounts: RawMount[] }
 *
 * Confirmed field shapes:
 *   image_urls: { icon, sd }  (no "hd" field)
 *   effects[]: { int_minimum, int_maximum, type: { name, id } }
 *   parent_set: { id, name }
 *   sets.effects: Record<"2"|"3"..., effect[]>  (string-keyed by piece count)
 *   mounts: { ankama_id, name, family: { name }, image_urls }  — no level/type/effects
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  normalizeItem, normalizeSet, normalizeMount, slotFromType,
  type AppItem, type RawItem, type RawSet, type RawMount,
} from './lib/normalize.ts'

const BASE_URL = 'https://api.dofusdu.de'
const GAME     = 'dofus3'
const VER      = 'v1'
const LANGS    = ['es', 'en', 'fr', 'pt', 'de'] as const
const DATA_DIR = join(process.cwd(), 'public', 'data')
const FORCE    = process.argv.includes('--force')

async function get<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

function stringify(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

function buildSearchIndex(items: AppItem[]) {
  return items
    .map(it => ({ id: it.ankama_id, name: it.name, type: it.type, slot: it.slot, level: it.level }))
    .sort((a, b) => a.id - b.id)
}

async function main() {
  console.log('Fetching game version...')
  const meta = await get<{ version: string }>(`/${GAME}/${VER}/meta/version`)
  const gameVersion = meta.version

  const versionFile = join(DATA_DIR, 'version.json')
  if (!FORCE && existsSync(versionFile)) {
    const existing = JSON.parse(readFileSync(versionFile, 'utf-8')) as { gameVersion: string }
    if (existing.gameVersion === gameVersion) {
      console.log(`Up to date (${gameVersion}). Pass --force to refresh.`)
      process.exit(0)
    }
  }

  console.log(`New version: ${gameVersion}. Fetching all languages...`)

  // Build canonical (EN) type map: ankama_id → English type name.
  // Non-English API responses return localized type names (e.g. "Dragopavo" instead of
  // "Dragoturkey"), which breaks slotConfig.ts apiTypes filters. We override type+slot
  // in every language with the EN canonical value so filtering always works.
  console.log('  Fetching EN canonical types...')
  const enRaw = await get<{ items: RawItem[] }>(`/${GAME}/${VER}/en/items/equipment/all`)
  const canonicalType = new Map<number, string>()
  for (const item of enRaw.items) {
    if (item.ankama_id != null) canonicalType.set(item.ankama_id, item.type?.name ?? '')
  }

  for (const lang of LANGS) {
    console.log(`  [${lang}] fetching...`)
    const langDir = join(DATA_DIR, lang)
    mkdirSync(langDir, { recursive: true })

    const [rawEquip, rawConsum, rawSets, rawMounts] = await Promise.all([
      get<{ items: RawItem[] }>(`/${GAME}/${VER}/${lang}/items/equipment/all`),
      get<{ items: RawItem[] }>(`/${GAME}/${VER}/${lang}/items/consumables/all`),
      get<{ sets: RawSet[] }>(`/${GAME}/${VER}/${lang}/sets/all`),
      get<{ mounts: RawMount[] }>(`/${GAME}/${VER}/${lang}/mounts/all`),
    ])

    const equipment = rawEquip.items.map(raw => {
      const item = normalizeItem(raw)
      const cType = canonicalType.get(item.ankama_id)
      if (cType !== undefined && lang !== 'en') {
        item.type = cType
        if (!raw.is_weapon) item.slot = slotFromType(cType)
      }
      return item
    })
    const consumables = rawConsum.items.map(normalizeItem)
    const sets        = rawSets.sets.map(normalizeSet)
    const mounts      = rawMounts.mounts.map(normalizeMount)

    writeFileSync(join(langDir, 'equipment.json'),   stringify(equipment),   'utf-8')
    writeFileSync(join(langDir, 'consumables.json'), stringify(consumables), 'utf-8')
    writeFileSync(join(langDir, 'sets.json'),        stringify(sets),        'utf-8')
    writeFileSync(join(langDir, 'mounts.json'),      stringify(mounts),      'utf-8')

    // search index: equipment only (has level + slot for filtering)
    const index = buildSearchIndex(equipment)
    writeFileSync(join(langDir, 'index.json'), stringify(index), 'utf-8')

    console.log(`  [${lang}] done — equipment:${equipment.length} sets:${sets.length} mounts:${mounts.length}`)
  }

  writeFileSync(versionFile, stringify({ gameVersion, generatedAt: new Date().toISOString() }), 'utf-8')
  console.log(`Done. Version ${gameVersion} written.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
