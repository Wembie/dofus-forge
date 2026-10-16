/**
 * Upload extracted character assets (char-assets/) to the R2 bucket the
 * worker serves under /char/*.
 *
 * Usage: pnpm upload-characters [--only skins/10.bin,looks.json]
 * Requires `wrangler login` and the bucket from wrangler.jsonc.
 */

import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = join(process.cwd(), 'char-assets')
const config = readFileSync(join(process.cwd(), 'wrangler.jsonc'), 'utf8')
const BUCKET = config.match(/"bucket_name"\s*:\s*"([^"]+)"/)?.[1]
if (!BUCKET) throw new Error('no r2 bucket in wrangler.jsonc')

const TYPES = { json: 'application/json', bin: 'application/octet-stream', webp: 'image/webp' }

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const onlyArg = process.argv.indexOf('--only')
const only = onlyArg > 0 ? new Set(process.argv[onlyArg + 1].split(',')) : null
const files = walk(ROOT)
  .map(path => ({ path, key: relative(ROOT, path).split(sep).join('/') }))
  .filter(f => !only || only.has(f.key))

let done = 0
for (const { path, key } of files) {
  const type = TYPES[key.split('.').pop()] ?? 'application/octet-stream'
  const res = spawnSync('npx', ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', path, '--content-type', type, '--remote'],
    { stdio: 'inherit', shell: process.platform === 'win32' })
  if (res.status !== 0) {
    console.error(`failed: ${key}`)
    process.exit(1)
  }
  console.log(`[${++done}/${files.length}] ${key}`)
}
