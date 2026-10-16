/**
 * Upload extracted character assets (char-assets/) to the R2 bucket the
 * worker serves under /char/*.
 *
 * Usage: pnpm upload-characters [--only skins/10.bin,looks.json]
 * Requires `wrangler login` and the bucket from wrangler.jsonc.
 */

import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { spawn } from 'node:child_process'

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

// Relative, slash-separated file paths: on Windows the command goes through
// a shell, which would split an absolute path containing spaces.
function upload({ path, key }) {
  const type = TYPES[key.split('.').pop()] ?? 'application/octet-stream'
  const file = relative(process.cwd(), path).split(sep).join('/')
  return new Promise(done => {
    const child = spawn('npx', ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', file, '--content-type', type, '--remote'],
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
