/**
 * ETL: DofusDude public API -> normalized static JSON
 *
 * Usage:
 *   pnpm fetch-data [--force]
 *
 * Endpoints (verified against DofusDude OpenAPI spec):
 *   GET /dofus3/v1/meta/version
 *   GET /dofus3/v1/{lang}/items/equipment/all
 *   GET /dofus3/v1/{lang}/items/consumables/all
 *   GET /dofus3/v1/{lang}/sets/all
 *   GET /dofus3/v1/{lang}/mounts/all
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { normalizeItem, normalizeSet, type AppItem, type RawItem, type RawSet } from './lib/normalize.ts'

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

function sortedStringify(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

function buildSearchIndex(items: AppItem[]): object[] {
  return items.map(it => ({
    id:    it.ankama_id,
    name:  it.name,
    type:  it.type,
    slot:  it.slot,
    level: it.level,
  })).sort((a, b) => a.id - b.id)
}

async function main() {
  console.log('Fetching game version...')
  const versionData = await get<{ version: string }>(`/${GAME}/${VER}/meta/version`)
  const gameVersion = versionData.version

  const versionFile = join(DATA_DIR, 'version.json')
  if (!FORCE && existsSync(versionFile)) {
    const existing = JSON.parse(readFileSync(versionFile, 'utf-8')) as { gameVersion: string }
    if (existing.gameVersion === gameVersion) {
      console.log(`Up to date (${gameVersion}). Pass --force to refresh.`)
      process.exit(0)
    }
  }

  console.log(`New version: ${gameVersion}. Fetching all languages...`)

  for (const lang of LANGS) {
    console.log(`  [${lang}] fetching...`)
    const langDir = join(DATA_DIR, lang)
    mkdirSync(langDir, { recursive: true })

    const [rawEquipment, rawConsumables, rawSets, rawMounts] = await Promise.all([
      get<{ items: RawItem[] }>(`/${GAME}/${VER}/${lang}/items/equipment/all`),
      get<{ items: RawItem[] }>(`/${GAME}/${VER}/${lang}/items/consumables/all`),
      get<{ sets: RawSet[] }>(`/${GAME}/${VER}/${lang}/sets/all`),
      get<{ mounts: RawItem[] }>(`/${GAME}/${VER}/${lang}/mounts/all`),
    ])

    const equipment   = rawEquipment.items.map(normalizeItem)
    const consumables = rawConsumables.items.map(normalizeItem)
    const sets        = rawSets.sets.map(normalizeSet)
    const mounts      = rawMounts.mounts.map(normalizeItem)

    writeFileSync(join(langDir, 'equipment.json'),   sortedStringify(equipment), 'utf-8')
    writeFileSync(join(langDir, 'consumables.json'), sortedStringify(consumables), 'utf-8')
    writeFileSync(join(langDir, 'sets.json'),        sortedStringify(sets), 'utf-8')
    writeFileSync(join(langDir, 'mounts.json'),      sortedStringify(mounts), 'utf-8')

    const index = buildSearchIndex([...equipment, ...mounts])
    writeFileSync(join(langDir, 'index.json'), sortedStringify(index), 'utf-8')

    console.log(`  [${lang}] done. equipment=${equipment.length} sets=${sets.length}`)
  }

  const versionOut = { gameVersion, generatedAt: new Date().toISOString() }
  writeFileSync(versionFile, JSON.stringify(versionOut, null, 2), 'utf-8')
  console.log(`Done. Version ${gameVersion} written.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
