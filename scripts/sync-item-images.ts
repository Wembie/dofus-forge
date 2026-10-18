/**
 * Keep the self-hosted item icon mirror (R2, served by the worker at
 * /img/item/*, see src/worker/index.ts) in sync with the catalog.
 *
 * Runs after fetch-data: diffs the filenames referenced by
 * public/data/*\/equipment.json's image_url against
 * public/data/item-images-synced.json (the manifest of what's already been
 * uploaded), downloads only the new ones from DofusDude's versioned GitHub
 * release tarball, and uploads them via scripts/upload-items.mjs.
 *
 * Skips the (166MB) tarball download entirely when nothing's new, unless
 * --force. Requires `wrangler` to be authenticated (CLOUDFLARE_API_TOKEN +
 * CLOUDFLARE_ACCOUNT_ID env vars in CI, or a prior `wrangler login` locally).
 *
 * Usage: pnpm sync-item-images [--force]
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { execSync, execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const DATA_DIR = join(ROOT, 'public', 'data')
const MANIFEST_FILE = join(DATA_DIR, 'item-images-synced.json')
const ITEM_ASSETS_DIR = join(ROOT, 'item-assets')
const FORCE = process.argv.includes('--force')

function neededFilenames(): Set<string> {
  const needed = new Set<string>()
  const locales = readdirSync(DATA_DIR).filter(name => statSync(join(DATA_DIR, name)).isDirectory())
  for (const locale of locales) {
    const path = join(DATA_DIR, locale, 'equipment.json')
    if (!existsSync(path)) continue
    const items = JSON.parse(readFileSync(path, 'utf-8')) as Array<{ image_url?: string | null }>
    for (const item of items) {
      const match = item.image_url?.match(/^\/img\/item\/([\w-]+\.png)$/)
      if (match) needed.add(match[1])
    }
  }
  return needed
}

function readManifest(): Set<string> {
  if (!existsSync(MANIFEST_FILE)) return new Set()
  return new Set(JSON.parse(readFileSync(MANIFEST_FILE, 'utf-8')) as string[])
}

async function main() {
  const versionFile = join(DATA_DIR, 'version.json')
  if (!existsSync(versionFile)) {
    console.error('Run pnpm fetch-data first to set the game version.')
    process.exit(1)
  }
  const gameVersion = (JSON.parse(readFileSync(versionFile, 'utf-8')) as { gameVersion: string }).gameVersion

  const needed = neededFilenames()
  const synced = readManifest()
  const missing = [...needed].filter(f => FORCE || !synced.has(f))

  if (missing.length === 0) {
    console.log('Item image mirror up to date, nothing to sync.')
    return
  }

  console.log(`${missing.length} item icon(s) need syncing to R2 (${gameVersion}).`)

  const tmp = join(tmpdir(), 'df3-item-sync')
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  rmSync(ITEM_ASSETS_DIR, { recursive: true, force: true })
  mkdirSync(ITEM_ASSETS_DIR, { recursive: true })

  const tarPath = join(tmp, 'items_128.tar.gz')
  console.log('Downloading items_images_128.tar.gz...')
  const res = await fetch(`https://github.com/dofusdude/dofus3-main/releases/download/${gameVersion}/items_images_128.tar.gz`)
  if (!res.ok) throw new Error(`Failed to download item image tarball: ${res.status}`)
  writeFileSync(tarPath, Buffer.from(await res.arrayBuffer()))

  console.log('Extracting needed icons...')
  const extracted: string[] = []
  for (const filename of missing) {
    const member = `data/img/item/2x/${filename}`
    try {
      execSync(`tar -xzf "${tarPath}" --strip-components=4 -C "${ITEM_ASSETS_DIR}" "${member}"`, { stdio: 'pipe' })
      extracted.push(filename)
    } catch {
      console.warn(`  not in this version's tarball, will rely on the dofusdu fallback: ${filename}`)
    }
  }

  if (extracted.length > 0) {
    console.log(`Uploading ${extracted.length} icon(s) to R2...`)
    execFileSync('node', ['scripts/upload-items.mjs', '--only', extracted.join(',')], { stdio: 'inherit', cwd: ROOT })
  }

  // Mark every attempted filename as synced, not just the ones actually
  // uploaded — a filename the tarball genuinely doesn't have (e.g. a
  // cosmetic/quest item excluded from this image pack) would otherwise
  // never leave `missing`, forcing a fresh 166MB tarball download every
  // single hourly run forever chasing it. The worker's live-CDN fallback
  // already serves those regardless.
  const updatedManifest = [...new Set([...synced, ...missing])].sort()
  writeFileSync(MANIFEST_FILE, JSON.stringify(updatedManifest, null, 2) + '\n', 'utf-8')
  console.log(`Manifest updated (${updatedManifest.length} icons tracked, ${extracted.length} newly uploaded).`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
