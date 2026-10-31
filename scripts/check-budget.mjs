// JavaScript and CSS each prerendered page loads before it is interactive
// (its <script>, modulepreload and stylesheet links), brotli-compressed as
// Cloudflare serves them, checked against a budget. Deterministic, unlike a
// timed Lighthouse run: a dependency or an eager import that grows the
// critical path fails here first. Run after `pnpm build`.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { brotliCompressSync } from 'node:zlib'

const CLIENT = 'dist/client'

// kB, brotli. Measured 2026-10-31 (0.3.140) plus ~10% headroom; raise them
// on purpose, in the same commit as the change that needs it.
const BUDGETS = {
  '/':                 { js: 210, css: 10 },
  '/explore':          { js: 190, css: 10 },
  '/about':            { js: 180, css: 10 },
  '/classes/iop':      { js: 172, css: 10 },
  '/sets':             { js: 170, css: 10 },
  '/sets/gobball-set': { js: 183, css: 10 },
}

const sizeCache = new Map()
function brotliKb(path) {
  if (!sizeCache.has(path)) sizeCache.set(path, brotliCompressSync(readFileSync(join(CLIENT, path))).length / 1024)
  return sizeCache.get(path)
}

function pageAssets(route) {
  const html = readFileSync(join(CLIENT, route === '/' ? '' : route, 'index.html'), 'utf-8')
  const urls = (pattern) => [...new Set([...html.matchAll(pattern)].map(m => m[1]))]
  // The inline module script imports the manifest and the route modules.
  const js = urls(/(?:<link rel="modulepreload" href="|<script[^>]* src="|import ")(\/assets\/[^"]+\.js)"/g)
  const css = urls(/<link rel="stylesheet" href="(\/assets\/[^"]+\.css)"/g)
  return { js, css }
}

let failed = false
for (const [route, budget] of Object.entries(BUDGETS)) {
  const { js, css } = pageAssets(route)
  const jsKb = js.reduce((sum, path) => sum + brotliKb(path), 0)
  const cssKb = css.reduce((sum, path) => sum + brotliKb(path), 0)
  const over = jsKb > budget.js || cssKb > budget.css
  failed ||= over
  console.log(`${over ? 'OVER' : 'ok  '} ${route.padEnd(20)} js ${jsKb.toFixed(1).padStart(6)} / ${budget.js} kB (${js.length} files)   css ${cssKb.toFixed(1).padStart(5)} / ${budget.css} kB`)
}
if (failed) {
  console.error('\nA page is over its JavaScript or CSS budget (scripts/check-budget.mjs).')
  process.exit(1)
}
