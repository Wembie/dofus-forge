/**
 * Renders every set and class share card (4 languages) ahead of time and
 * stores it in the private OG bucket, so the Worker only ever serves them:
 * a render costs 15–200 ms of CPU, past the Workers Free plan's 10 ms per
 * request. Same rendering code as the Worker (src/worker/ogRender.ts), fed
 * from public/ instead of the ASSETS binding and rasterized with resvg's
 * Node build, so the PNGs are the ones the Worker would produce.
 *
 * Keys carry the game data version and OG_RENDER_VERSION. Once a version is
 * complete a marker object is written, and later runs for that version exit
 * right away (unless --force). Build cards are not generated here: the
 * Worker stores each one the first time it renders it.
 *
 * Upload goes through Cloudflare's REST API with CLOUDFLARE_API_TOKEN (R2
 * write) and CLOUDFLARE_ACCOUNT_ID.
 *
 * Usage:
 *   pnpm og:pregenerate                 render + upload what is missing
 *   pnpm og:pregenerate --force         re-render and re-upload everything
 *   pnpm og:pregenerate --out <dir>     write PNGs locally, no upload
 *   pnpm og:pregenerate --limit <n>     only the first n cards (testing)
 *   pnpm og:pregenerate --shard 2/4     every 4th card from the 3rd: run 4 at
 *                                       once (rasterizing is CPU-bound), then
 *   pnpm og:pregenerate --mark-complete once all shards succeeded
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { Resvg } from '@cf-wasm/resvg/node'
import { setSlugs } from '../src/data/setGuide.ts'
import type { OgFont } from '../src/worker/ogImage.ts'
import { OG_BUCKET_NAME, OG_RENDER_VERSION, pageCardKey, pageCardsCompleteKey, renderClassCard, renderSetCard, type OgSources } from '../src/worker/ogRender.ts'
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
const MARK_COMPLETE = process.argv.includes('--mark-complete')
if (!(SHARDS >= 1 && SHARD >= 0 && SHARD < SHARDS)) throw new Error('--shard must look like 0/4')

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

const font = (file: string) => {
  const buf = readFileSync(join(ROOT, 'src', 'worker', 'fonts', file))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}
const FONTS: OgFont[] = [
  { name: 'Cinzel', data: font('Cinzel-Bold.ttf'), weight: 700, style: 'normal' },
  { name: 'Inter', data: font('Inter-Regular.ttf'), weight: 400, style: 'normal' },
  { name: 'JetBrainsMono', data: font('JetBrainsMono-Bold.ttf'), weight: 700, style: 'normal' },
]

const src: OgSources = { assets, origin: ORIGIN, bucket: itemBucket, fonts: FONTS }

// ── R2 through Cloudflare's REST API ─────────────────────────────────────
// pageCardKey() / pageCardsCompleteKey() with a numeric game version and the
// same slug rule as the Worker's PAGE_OG_ROUTE.
const STORABLE_KEY = new RegExp(
  `^v${OG_RENDER_VERSION}/pages/\\d+(?:\\.\\d+){0,3}/(?:_complete|(?:en|es|fr|pt)/(?:set|class)/[a-z0-9-]{1,80}\\.png)$`,
)

function r2() {
  const token = process.env.CLOUDFLARE_API_TOKEN
  const account = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!token || !account) throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required to upload (or pass --out <dir>)')
  if (!/^[0-9a-f]{32}$/.test(account)) throw new Error('CLOUDFLARE_ACCOUNT_ID is not a Cloudflare account id')
  const base = `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${OG_BUCKET_NAME}/objects/`
  // Keys are built from data files (game version, set slugs): only the exact
  // shapes this script writes may reach the URL, so a malformed or tampered
  // data file can't address anything else in the account.
  const url = (key: string) => {
    if (!STORABLE_KEY.test(key)) throw new Error(`refusing to store an unexpected key: ${JSON.stringify(key)}`)
    return base + key
  }
  const headers = { Authorization: `Bearer ${token}` }
  return {
    async exists(key: string): Promise<boolean> {
      const res = await fetch(url(key), { headers })
      await res.body?.cancel()
      if (res.status === 404) return false
      if (!res.ok) throw new Error(`R2 GET ${key}: HTTP ${res.status}`)
      return true
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
type Card = { lang: Lang; kind: 'set' | 'class'; slug: string }

function allCards(): Card[] {
  const read = <T>(path: string): T => JSON.parse(readFileSync(join(PUBLIC, path), 'utf8')) as T
  const setsEn = read<WorkerAppSet[]>('data/en/sets.json')
  const equipmentEn = read<WorkerAppItem[]>('data/en/equipment.json')
  const setSlugList = [...setSlugs(setsEn, new Set(equipmentEn.map(it => it.ankama_id))).values()]
  const classSlugs = Object.keys(read<Record<string, unknown>>('data/class-names.json'))
  return LANGS.flatMap(lang => [
    ...classSlugs.map(slug => ({ lang, kind: 'class' as const, slug })),
    ...setSlugList.map(slug => ({ lang, kind: 'set' as const, slug })),
  ])
}

async function main() {
  const gameVersion = (JSON.parse(readFileSync(join(PUBLIC, 'data', 'version.json'), 'utf8')) as { gameVersion: string }).gameVersion
  const store = OUT ? null : r2()

  if (MARK_COMPLETE) {
    if (!store) throw new Error('--mark-complete uploads a marker: drop --out')
    await store.put(pageCardsCompleteKey(gameVersion), new TextEncoder().encode(new Date().toISOString()), 'text/plain')
    console.log(`Marked share cards for game data ${gameVersion} as complete.`)
    return
  }

  if (store && !FORCE && await store.exists(pageCardsCompleteKey(gameVersion))) {
    console.log(`Share cards for game data ${gameVersion} are already stored; nothing to do (--force to redo).`)
    return
  }

  const cards = allCards().filter((_, i) => i % SHARDS === SHARD).slice(0, LIMIT)
  console.log(`Rendering ${cards.length} share cards for game data ${gameVersion}${SHARDS > 1 ? ` (shard ${SHARD}/${SHARDS})` : ''}${OUT ? ` into ${OUT}` : ''}`)

  const uploads = new Set<Promise<void>>()
  const failures: string[] = []
  let done = 0
  let missing = 0
  const started = Date.now()

  for (const card of cards) {
    const key = pageCardKey(gameVersion, card.lang, card.kind, card.slug)
    try {
      const svg = card.kind === 'set' ? await renderSetCard(src, card.lang, card.slug) : await renderClassCard(src, card.lang, card.slug)
      if (svg === null) { missing++; continue }
      const png = (await Resvg.async(svg)).render().asPng()
      if (OUT) {
        const file = join(OUT, key)
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, png)
      } else {
        const upload = store!.put(key, png, 'image/png').catch(e => { failures.push(`${key}: ${(e as Error).message}`) })
        uploads.add(upload)
        void upload.finally(() => uploads.delete(upload))
        if (uploads.size >= 8) await Promise.race(uploads)
      }
    } catch (e) {
      failures.push(`${key}: ${(e as Error).message}`)
    }
    if (++done % 200 === 0) console.log(`  ${done}/${cards.length} (${Math.round((Date.now() - started) / 1000)} s)`)
    // A bad token fails every upload the same way: stop instead of rendering thousands more.
    if (failures.length >= 20) break
  }
  await Promise.all(uploads)

  console.log(`Done: ${done - missing - failures.length} stored, ${missing} skipped (no such page), ${failures.length} failed, ${Math.round((Date.now() - started) / 1000)} s`)
  if (failures.length) {
    for (const f of failures.slice(0, 20)) console.error(`  ${f}`)
    process.exit(1)
  }
  // A single full run marks itself; sharded runs are marked by --mark-complete.
  if (store && LIMIT === Infinity && SHARDS === 1) await store.put(pageCardsCompleteKey(gameVersion), new TextEncoder().encode(new Date().toISOString()), 'text/plain')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
