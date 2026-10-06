/**
 * ETL: equipment/sets from dofus3-main's raw GitHub release data, mounts +
 * consumables + the game version check from the DofusDude REST API.
 *
 * Usage:
 *   pnpm fetch-data [--force]
 *
 * Equipment/sets moved off the REST API (items/equipment/all, sets/all) as of
 * Dofus 3.7: that API stopped returning `effects` for any item or set, on
 * both bulk and single-item endpoints, with no fix on our end possible — see
 * scripts/lib/rawGameData.ts for the full story and the replacement source.
 * Mounts never carried effects to begin with, and consumables aren't used
 * anywhere in the app (src/data/loaders.ts), so both stay on the REST API —
 * no reason to move something that isn't broken.
 *
 * Verified endpoints (REST, still used here):
 *   GET /dofus3/v1/meta/version                 -> { version, release, update_stamp }
 *   GET /dofus3/v1/{lang}/items/consumables/all -> { items: RawItem[] }
 *   GET /dofus3/v1/{lang}/mounts/all            -> { mounts: RawMount[] }
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { normalizeItem, normalizeMount, type AppItem, type RawItem, type RawMount } from './lib/normalize.ts'
import { fetchRawGameData, buildEquipmentAndSets } from './lib/rawGameData.ts'

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

  console.log(`New version: ${gameVersion}. Fetching raw equipment/sets data (GitHub)...`)
  const raw = await fetchRawGameData(gameVersion)

  for (const lang of LANGS) {
    console.log(`  [${lang}] fetching...`)
    const langDir = join(DATA_DIR, lang)
    mkdirSync(langDir, { recursive: true })

    const [{ equipment, sets }, rawConsum, rawMounts] = await Promise.all([
      buildEquipmentAndSets(raw, lang),
      get<{ items: RawItem[] }>(`/${GAME}/${VER}/${lang}/items/consumables/all`),
      get<{ mounts: RawMount[] }>(`/${GAME}/${VER}/${lang}/mounts/all`),
    ])

    const consumables = rawConsum.items.map(normalizeItem)
    const mounts       = rawMounts.mounts.map(normalizeMount)

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
