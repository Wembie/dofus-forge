/**
 * Upload extracted character assets (char-assets/) to chars/ in the assets
 * R2 bucket (public at VITE_ASSETS_URL; the worker serves /char/*).
 *
 * Usage: pnpm upload-characters [--only skins/10.bin,looks.json] [--since-minutes 90]
 * Requires `wrangler login` and the ASSETS_BUCKET bucket from wrangler.jsonc.
 */

import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = join(process.cwd(), 'char-assets')
const config = readFileSync(join(process.cwd(), 'wrangler.jsonc'), 'utf8')
const BUCKET = config.match(/\{\s*"binding"\s*:\s*"ASSETS_BUCKET"\s*,\s*"bucket_name"\s*:\s*"([^"]+)"/)?.[1]
if (!BUCKET) throw new Error('no ASSETS_BUCKET r2 bucket in wrangler.jsonc')

const TYPES = { json: 'application/json', bin: 'application/octet-stream', webp: 'image/webp' }

// `_`-prefixed entries are local scratch (matching sheets, icons), never published.
function walk(dir) {
  return readdirSync(dir).filter(name => !name.startsWith('_')).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const onlyArg = process.argv.indexOf('--only')
const only = onlyArg > 0 ? new Set(process.argv[onlyArg + 1].split(',')) : null
const sinceArg = process.argv.indexOf('--since-minutes')
const since = sinceArg > 0 ? Date.now() - Number(process.argv[sinceArg + 1]) * 60_000 : 0
const files = walk(ROOT)
  .map(path => ({ path, key: relative(ROOT, path).split(sep).join('/') }))
  .filter(f => !only || only.has(f.key))
  .filter(f => statSync(f.path).mtimeMs >= since)

// Relative, slash-separated file paths: on Windows the command goes through
// a shell, which would split an absolute path containing spaces.
function upload({ path, key }) {
  const type = TYPES[key.split('.').pop()] ?? 'application/octet-stream'
  const file = relative(process.cwd(), path).split(sep).join('/')
  return new Promise(done => {
    const child = spawn('npx', ['wrangler', 'r2', 'object', 'put', `${BUCKET}/chars/${key}`, '--file', file, '--content-type', type, '--cache-control', 'public,max-age=86400,stale-while-revalidate=604800', '--remote'],
      { stdio: ['ignore', 'ignore', 'inherit'], shell: process.platform === 'win32' })
    child.on('close', code => done(code === 0))
  })
}

const queue = [...files]
const failed = []
let done = 0
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let f = queue.shift(); f; f = queue.shift()) {
    if (await upload(f)) console.log(`[${++done}/${files.length}] ${f.key}`)
    else failed.push(f.key)
  }
}))
if (failed.length) {
  console.error(`failed (${failed.length}): ${failed.join(',')}`)
  console.error('retry with: pnpm upload-characters --only <comma-separated keys>')
  process.exit(1)
}
