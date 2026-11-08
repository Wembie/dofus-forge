/**
 * Keeps every set and class share card (4 languages, ~3,800) rendered in the
 * private OG bucket, so the Worker only ever serves them: a render costs
 * 0.3–1.4 s of CPU, past the Workers Free plan's 10 ms per request. Same
 * rendering code as the Worker (src/worker/ogRender.ts), fed from public/
 * instead of the ASSETS binding and rasterized with resvg's Node build, so
 * the PNGs are the ones the Worker would produce.
 *
 * Incremental: each card's input (texts, numbers, image paths) is hashed
 * together with a fingerprint of everything that draws it (this code, the
 * card templates, fonts, logo, stat icons, class portraits, satori/resvg
 * versions). A per-shard manifest in the bucket remembers the hash each key
 * was stored with; only cards whose hash changed are rendered and
 * overwritten. A game patch that changes ten sets re-renders ten cards; a
 * template change re-renders all of them, with no version to bump.
 * Item icons are part of the input by path, not by pixels.
 *
 * Build cards are not generated here: the Worker stores each one the first
 * time it renders it.
 *
 * Upload goes through Cloudflare's REST API with CLOUDFLARE_API_TOKEN (R2
 * write) and CLOUDFLARE_ACCOUNT_ID.
 *
 * Usage:
 *   pnpm og:pregenerate                 render + upload what changed
 *   pnpm og:pregenerate --force         re-render and re-upload everything
 *   pnpm og:pregenerate --shard 2/4     this shard's cards only: run all 4 at
 *                                       once (rasterizing is CPU-bound)
 *   pnpm og:pregenerate --out <dir>     write PNGs locally, no upload
 *   pnpm og:pregenerate --limit <n>     at most n renders (testing)
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { Resvg } from '@cf-wasm/resvg/node'
import { setSlugs } from '../src/data/setGuide.ts'
import type { OgFont } from '../src/worker/ogImage.ts'
import {
  OG_BUCKET_NAME, OG_KEY_VERSION, cardHash, classCardInput, pageCardKey, pageManifestKey, renderPageCard, setCardInput,
  type OgSources, type PageCardInput,
} from '../src/worker/ogRender.ts'
import type { Lang, WorkerAppItem, WorkerAppSet } from '../src/worker/data.ts'

const ROOT = process.cwd()
const PUBLIC = join(ROOT, 'public')
const LANGS: Lang[] = ['en', 'es', 'fr', 'pt']
const ORIGIN = 'https://dofusforge.com'
const ASSETS_URL = 'https://assets.dofusforge.com/'

const arg = (name: string) => {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}
const FORCE = process.argv.includes('--force')
const OUT = arg('--out')
const LIMIT = Number(arg('--limit') ?? Infinity)
const [SHARD, SHARDS] = (arg('--shard') ?? '0/1').split('/').map(Number)
if (!(Number.isInteger(SHARDS) && SHARDS >= 1 && Number.isInteger(SHARD) && SHARD >= 0 && SHARD < SHARDS)) throw new Error('--shard must look like 0/4')

const TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json' }

// The ASSETS binding, answered from public/: the files the deploy serves.
const assets = {
  async fetch(input: Request | string) {
    const path = decodeURIComponent(new URL(typeof input === 'string' ? input : input.url).pathname)
    const file = join(PUBLIC, path)
    if (!file.startsWith(PUBLIC) || !existsSync(file)) return new Response('Not found', { status: 404 })
    return new Response(readFileSync(file), { headers: { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' } })
  },
} as unknown as Fetcher

// The ASSETS_BUCKET binding (item icons), read from its public domain.
const itemBucket = {
  async get(key: string) {
    const res = await fetch(`${ASSETS_URL}${key}`, { signal: AbortSignal.timeout(15_000) })
    return res.ok ? { arrayBuffer: () => res.arrayBuffer() } : null
  },
} as unknown as Pick<R2Bucket, 'get'>

const FONT_DIR = join(ROOT, 'src', 'worker', 'fonts')
const font = (file: string) => {
  const buf = readFileSync(join(FONT_DIR, file))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}
const FONTS: OgFont[] = [
  { name: 'Cinzel', data: font('Cinzel-Bold.ttf'), weight: 700, style: 'normal' },
  { name: 'Inter', data: font('Inter-Regular.ttf'), weight: 400, style: 'normal' },
  { name: 'JetBrainsMono', data: font('JetBrainsMono-Bold.ttf'), weight: 700, style: 'normal' },
]

const src: OgSources = { assets, origin: ORIGIN, bucket: itemBucket, fonts: FONTS }

/** Everything that draws a card besides its input: a change here re-renders every card. */
function rendererFingerprint(): string {
  const files = [
    'src/worker/ogRender.ts',
    'src/worker/ogPages.ts',
    'src/worker/data.ts',
    'src/data/setGuide.ts',
    'public/brand/mark-256.png',
    ...readdirSync(FONT_DIR).sort().map(f => `src/worker/fonts/${f}`),
    ...['public/data/stats-og', 'public/data/classes'].flatMap(dir => readdirSync(join(ROOT, dir)).sort().map(f => `${dir}/${f}`)),
  ]
  const hash = createHash('sha256')
  // The same fingerprint on any machine: '/' paths, sorted listings, and
  // source files with LF line endings (a Windows checkout has CRLF, CI LF).
  for (const file of files) {
    const bytes = readFileSync(join(ROOT, file))
    hash.update(file).update('\0').update(file.endsWith('.ts') ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes).update('\0')
  }
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> }
  hash.update(`satori ${pkg.dependencies?.satori} resvg ${pkg.dependencies?.['@cf-wasm/resvg']}`)
  return hash.digest('hex')
}

// ── R2 through Cloudflare's REST API ─────────────────────────────────────
// Only the exact keys this script writes may reach the URL (page cards with
// the same slug rule as the Worker's PAGE_OG_ROUTE, and the shard
// manifests), so a malformed or tampered data file can't address anything
// else in the account.
const STORABLE_KEY = new RegExp(
  `^v${OG_KEY_VERSION}/pages/(?:(?:en|es|fr|pt)/(?:set|class)/[a-z0-9-]{1,80}\\.png|_manifest/\\d{1,2}-of-\\d{1,2}\\.json)$`,
)

function r2() {
  const token = process.env.CLOUDFLARE_API_TOKEN
  const account = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!token || !account) throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required to upload (or pass --out <dir>)')
  if (!/^[0-9a-f]{32}$/.test(account)) throw new Error('CLOUDFLARE_ACCOUNT_ID is not a Cloudflare account id')
  const base = `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${OG_BUCKET_NAME}/objects/`
  const url = (key: string) => {
    if (!STORABLE_KEY.test(key)) throw new Error(`refusing an unexpected key: ${JSON.stringify(key)}`)
    return base + key
  }
  const headers = { Authorization: `Bearer ${token}` }
  return {
    async getJson<T>(key: string): Promise<T | null> {
      const res = await fetch(url(key), { headers })
      if (res.status === 404) { await res.body?.cancel(); return null }
      if (!res.ok) throw new Error(`R2 GET ${key}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`)
      return (await res.json()) as T
    },
    async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
      for (let attempt = 1; ; attempt++) {
        const res = await fetch(url(key), { method: 'PUT', headers: { ...headers, 'Content-Type': contentType }, body })
        if (res.ok) return
        const text = await res.text()
        if (attempt >= 3 || res.status === 401 || res.status === 403) throw new Error(`R2 PUT ${key}: HTTP ${res.status} ${text.slice(0, 300)}`)
        await new Promise(r => setTimeout(r, 1000 * attempt))
      }
    },
  }
}

// ── Main ─────────────────────────────────────────────────────────────────
type Card = { lang: Lang; kind: 'set' | 'class'; slug: string; key: string }
type Manifest = Record<string, string>   // key → content hash

/** Every page card, assigned to a shard by its key (stable when sets are added or removed). */
function shardCards(): Card[] {
  const read = <T>(path: string): T => JSON.parse(readFileSync(join(PUBLIC, path), 'utf8')) as T
  const setsEn = read<WorkerAppSet[]>('data/en/sets.json')
  const equipmentEn = read<WorkerAppItem[]>('data/en/equipment.json')
  const setSlugList = [...setSlugs(setsEn, new Set(equipmentEn.map(it => it.ankama_id))).values()]
  const classSlugs = Object.keys(read<Record<string, unknown>>('data/class-names.json'))
  const shardOf = (key: string) => createHash('sha256').update(key).digest().readUInt32BE(0) % SHARDS
  return LANGS
    .flatMap(lang => [
      ...classSlugs.map(slug => ({ lang, kind: 'class' as const, slug })),
      ...setSlugList.map(slug => ({ lang, kind: 'set' as const, slug })),
    ])
    .map(card => ({ ...card, key: pageCardKey(card.lang, card.kind, card.slug) }))
    .filter(card => shardOf(card.key) === SHARD)
}

async function main() {
  const store = OUT ? null : r2()
  const fingerprint = rendererFingerprint()
  const manifestKey = pageManifestKey(SHARD, SHARDS)
  const localManifest = OUT ? join(OUT, manifestKey) : null
  const previous: Manifest = FORCE ? {} : (store
    ? await store.getJson<Manifest>(manifestKey)
    : localManifest && existsSync(localManifest) ? JSON.parse(readFileSync(localManifest, 'utf8')) as Manifest : null) ?? {}
  const next: Manifest = {}

  const cards = shardCards()
  const label = `${SHARDS > 1 ? `shard ${SHARD}/${SHARDS}, ` : ''}${cards.length} cards`
  console.log(`Checking ${label}${OUT ? ` into ${OUT}` : ''}`)

  const uploads = new Set<Promise<void>>()
  const failures: string[] = []
  let rendered = 0
  let unchanged = 0
  let missing = 0
  const started = Date.now()

  for (const card of cards) {
    if (rendered >= LIMIT || failures.length >= 20) break
    try {
      const input: PageCardInput | null = card.kind === 'set'
        ? await setCardInput(src, card.lang, card.slug)
        : await classCardInput(src, card.lang, card.slug)
      if (!input) { missing++; continue }
      const hash = await cardHash(fingerprint, input)
      if (previous[card.key] === hash) { next[card.key] = hash; unchanged++; continue }

      const png = (await Resvg.async(await renderPageCard(src, input))).render().asPng()
      rendered++
      if (OUT) {
        const file = join(OUT, card.key)
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, png)
        next[card.key] = hash
      } else {
        const upload = store!.put(card.key, png, 'image/png')
          .then(() => { next[card.key] = hash })
          .catch(e => { failures.push(`${card.key}: ${(e as Error).message}`) })
        uploads.add(upload)
        void upload.finally(() => uploads.delete(upload))
        if (uploads.size >= 8) await Promise.race(uploads)
      }
      if (rendered % 100 === 0) console.log(`  ${rendered} rendered (${Math.round((Date.now() - started) / 1000)} s)`)
    } catch (e) {
      failures.push(`${card.key}: ${(e as Error).message}`)
    }
  }
  await Promise.all(uploads)

  // Saved even after failures: what was stored is recorded, the rest is
  // retried on the next run. A card that is gone from the catalog drops out.
  if (store && rendered > 0) await store.put(manifestKey, new TextEncoder().encode(JSON.stringify(next)), 'application/json')
  if (localManifest) { mkdirSync(dirname(localManifest), { recursive: true }); writeFileSync(localManifest, JSON.stringify(next)) }

  console.log(`Done (${label}): ${rendered} rendered, ${unchanged} unchanged, ${missing} skipped (no such page), ${failures.length} failed, ${Math.round((Date.now() - started) / 1000)} s`)
  if (failures.length) {
    for (const f of failures.slice(0, 20)) console.error(`  ${f}`)
    process.exit(1)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
