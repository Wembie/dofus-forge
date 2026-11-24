import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { checkedVersion, extractRegularFiles } from './lib/safety.ts'
import { STAT_MAP, IGNORED_STATS } from '../src/engine/statMap.ts'
import type { AppItem, AppSet } from './lib/normalize.ts'
import { CAP_KEYS } from '../tools/beta/stats.ts'

const root = process.cwd()
const dir = resolve(root, 'tools/beta/data')
const api = 'https://api.dofusdu.de/dofus3beta/v1'
const ids = [31564, 31565, 31566, 31569, 31571, 31573]
const langs = ['en', 'es', 'fr', 'pt']
const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: ${response.status}`)
  return response.json() as Promise<T>
}

async function main() {
  const version = checkedVersion((await json<{ version: unknown }>(`${api}/meta/version`)).version)
  mkdirSync(dir, { recursive: true })
  const syncing = resolve(dir, '.sync-in-progress')
  writeFileSync(syncing, version)
  for (const script of ['fetch-data', 'fetch-spells', 'fetch-passives']) {
    execFileSync(process.execPath, [resolve(root, 'node_modules/tsx/dist/cli.mjs'), resolve(root, `scripts/${script}.ts`), '--beta', ...(process.argv.includes('--force') ? ['--force'] : [])], { cwd: root, stdio: 'inherit' })
  }
  for (const lang of langs) {
    const runes = await Promise.all(ids.map(id => json<{ ankama_id: number; name: string; description: string }>(`${api}/${lang}/items/resources/${id}`)))
    if (runes.some(r => !ids.includes(r.ankama_id) || !r.name || !r.description)) throw new Error(`Incomplete Dracorune descriptions: ${lang}`)
    writeFileSync(resolve(dir, lang, 'dracorunes.json'), JSON.stringify(runes, null, 2))
  }
  const portraits = resolve(dir, 'beta-classes')
  mkdirSync(portraits, { recursive: true })
  const imageArchive = await fetch(`https://github.com/dofusdude/dofus3-beta/releases/download/${version}/class_head_images_64.tar.gz`)
  if (!imageArchive.ok) throw new Error(`Beta class portraits: ${imageArchive.status}`)
  const archivePath = resolve(portraits, 'heads.tar.gz')
  writeFileSync(archivePath, Buffer.from(await imageArchive.arrayBuffer()))
  const wanted = Object.fromEntries([210, 211].map(id => [`data/img/class_head/2x/Head_${id}-64.png`, resolve(portraits, `Head_${id}-64.png`)]))
  if (extractRegularFiles(archivePath, wanted).length !== 2) throw new Error('Missing Bellaphone portraits')
  const live = read<AppItem[]>(resolve(root, 'public/data/en/equipment.json'))
  const beta = read<AppItem[]>(resolve(dir, 'en/equipment.json'))
  const liveSets = read<AppSet[]>(resolve(root, 'public/data/en/sets.json'))
  const betaSets = read<AppSet[]>(resolve(dir, 'en/sets.json'))
  const fingerprint = (item: AppItem) => JSON.stringify({ ...item, image_url: undefined, name: undefined, description: undefined })
  const previous = new Map(live.map(item => [item.ankama_id, item]))
  const previousSets = new Map(liveSets.map(set => [set.ankama_id, set]))
  const knownUnknowns = new Set(live.flatMap(it => it.effects.map(e => e.stat)).filter(s => !STAT_MAP[s] && !IGNORED_STATS.has(s)))
  const changes = {
    betaVersion: version,
    liveVersion: read<{ gameVersion: string }>(resolve(root, 'public/data/version.json')).gameVersion,
    generatedAt: new Date().toISOString(),
    items: beta.length,
    sets: betaSets.length,
    addedItems: beta.filter(it => !previous.has(it.ankama_id)).map(it => ({ id: it.ankama_id, name: it.name, level: it.level, slot: it.slot })),
    changedItems: beta.filter(it => previous.has(it.ankama_id) && fingerprint(it) !== fingerprint(previous.get(it.ankama_id)!)).map(it => ({ id: it.ankama_id, name: it.name })),
    removedItems: live.filter(it => !beta.some(b => b.ankama_id === it.ankama_id)).map(it => ({ id: it.ankama_id, name: it.name })),
    addedSets: betaSets.filter(s => !previousSets.has(s.ankama_id)).map(s => ({ id: s.ankama_id, name: s.name })),
    changedSets: betaSets.filter(s => previousSets.has(s.ankama_id) && JSON.stringify({ items: s.items, bonuses: s.bonuses }) !== JSON.stringify({ items: previousSets.get(s.ankama_id)!.items, bonuses: previousSets.get(s.ankama_id)!.bonuses })).map(s => ({ id: s.ankama_id, name: s.name })),
    newUnmappedEffects: [...new Set(beta.flatMap(it => it.effects.map(e => e.stat)).filter(s => !STAT_MAP[s] && !(s in CAP_KEYS) && !IGNORED_STATS.has(s) && !knownUnknowns.has(s)))],
  }
  const catalogs = ['version.json', 'spells-version.json'].map(file => read<{ gameVersion: string }>(resolve(dir, file)).gameVersion)
  const latest = checkedVersion((await json<{ version: unknown }>(`${api}/meta/version`)).version)
  if (catalogs.some(v => v !== version) || latest !== version || !readFileSync(resolve(dir, 'passives.generated.ts'), 'utf8').includes(`gameVersion: '${version}'`)) {
    throw new Error('Beta changed during synchronization. Run pnpm fetch-beta again.')
  }
  writeFileSync(resolve(dir, 'changes.json'), JSON.stringify(changes, null, 2))
  unlinkSync(syncing)
  console.log(`Beta ${version}: ${changes.addedItems.length} added items, ${changes.changedItems.length} changed items, ${changes.addedSets.length} added sets.`)
  if (existsSync(resolve(root, 'public/data/version.json'))) console.log(`Official data kept at ${changes.liveVersion}. Local files: tools/beta/data/`)
}

main().catch(error => { console.error(error); process.exitCode = 1 })
