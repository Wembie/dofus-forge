// Bakes the real rendered body HTML into each crawlable static page, not
// just the <head> metadata postbuild-lang-pages.mjs already handles.
//
// Why this exists: the app is pure CSR (src/main.tsx uses createRoot, not
// hydrateRoot), so the raw HTML served to any crawler that doesn't execute
// JS is just `<div id="root"></div>` — confirmed live on production: the
// homepage's visible body text (scripts stripped) was 20 characters ("Skip
// to main content"), identical on /about despite that page having 191 lines
// of real written content. Google's AdSense review flagged the site as
// "low value content" for exactly this reason — not a writing-quality
// problem, a visibility problem.
//
// Fix: launch the real built app in a headless browser (same `vite preview`
// a developer would use), visit each indexed route, let it fully render,
// and overwrite that route's static index.html with the live rendered DOM.
// Since the app is CSR-only (createRoot, not hydrateRoot), a real browser
// with JS enabled just wipes this snapshot and re-renders fresh on mount —
// zero hydration-mismatch risk. Only non-JS crawlers ever see the baked-in
// snapshot.
//
// Scope: only the routes postbuild-lang-pages.mjs treats as indexable (not
// the noindex-gated my-builds/account pages — no SEO value, and the content
// behind them is just a sign-in prompt), and not the self-canonicalizing
// /en/* mirror pages (their canonical tag already points elsewhere; their
// only job is correct metadata, which they already have).

import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DIST = join(process.cwd(), 'dist')
const PORT = 4174
// Same check vite.config.ts uses — this script always runs right after
// `vite build` in the same `pnpm build` invocation, so it sees the same env.
const BASE = (process.env.CF_PAGES || process.env.CLOUDFLARE_DEPLOY) ? '/' : '/dofus-forge/'
// "localhost", not 127.0.0.1: vite preview's default bind only answers on
// whichever one Node's DNS resolves "localhost" to on this machine, and on
// Windows that isn't always 127.0.0.1 — confirmed by hand (curl got a 200
// against localhost, a connection failure against the literal IPv4).
const ORIGIN = `http://localhost:${PORT}`
const LANGS = ['en', 'es', 'fr', 'pt']
const LANG_PATH = { en: '', es: '/es', fr: '/fr', pt: '/pt' }
const CLASS_IDS = Object.keys(JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', 'class-names.json'), 'utf-8')))
const SLUGS = ['', 'explore', 'about', 'how-to-use', 'forge-guide', 'shortcuts', 'privacy', 'terms', ...CLASS_IDS.map(id => `classes/${id}`)]
// Generous: the very first request to a cold preview server (always the
// home page, first in the loop) pays extra one-time cost compiling/caching
// assets on top of its own game-data load — timed at 2.4s warm, but needs
// real headroom on a cold server.
const PAGE_TIMEOUT_MS = 20_000
// Sanity floor: never let a broken/partial capture replace an existing file
// with something worse than the ~20-char empty-shell baseline we're fixing.
const MIN_TEXT_LENGTH = 150

function langDir(lang, slug) {
  const parts = slug ? slug.split('/') : []
  return lang === 'en' ? join(DIST, ...parts) : join(DIST, lang, ...parts)
}

function visibleTextLength(html) {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? ''
  const text = body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 404) return
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error(`Preview server not reachable at ${url} after ${timeoutMs}ms`)
}

async function main() {
  console.log(`Starting preview server on :${PORT} for prerendering (base ${BASE})...`)
  // Invoke vite's bin directly instead of through npx/a shell: a shell-wrapped
  // child's PID is the shell itself, so killing it on Windows can leave the
  // real vite process (and its held port) orphaned — this spawns vite
  // directly as the one real child process, which `.kill()` actually stops.
  const viteBin = join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js')
  const preview = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'pipe',
  })

  try {
    try {
      await waitForServer(`${ORIGIN}${BASE}`, 20_000)
    } catch (err) {
      console.warn(`Skipping prerendering — ${err.message}`)
      return
    }

    let browser
    try {
      browser = await chromium.launch()
    } catch (err) {
      // This step is an enhancement, not a requirement: if the build
      // environment doesn't have (or can't install) a Chromium binary — e.g.
      // Cloudflare Workers Builds' remote container, never verified to
      // support this — skip it without failing the whole production
      // deploy. The site still ships correctly, just without the richer
      // crawler-visible snapshots this adds on top.
      console.warn(`Skipping prerendering — could not launch a browser: ${err.message.split('\n')[0]}`)
      return
    }
    const page = await browser.newPage()

    let written = 0
    let skipped = 0
    for (const lang of LANGS) {
      for (const slug of SLUGS) {
        const urlPath = slug ? `${LANG_PATH[lang]}/${slug}` : (LANG_PATH[lang] || '/')
        const dir = langDir(lang, slug)
        const file = join(dir, 'index.html')
        if (!existsSync(file)) { console.warn(`  skip (no file on disk): ${urlPath}`); skipped++; continue }

        const url = `${ORIGIN}${BASE.slice(0, -1)}${urlPath}`
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT_MS })
          // One extra beat past networkidle for any render that follows the
          // last network response (e.g. a state update after a fetch resolves).
          await page.waitForTimeout(250)
          const html = await page.evaluate(() => document.documentElement.outerHTML)
          const textLen = visibleTextLength(html)
          if (textLen < MIN_TEXT_LENGTH) {
            console.warn(`  skip (only ${textLen} chars of visible text): ${urlPath}`)
            skipped++
            continue
          }
          writeFileSync(file, `<!doctype html>\n${html}\n`, 'utf-8')
          console.log(`  + prerendered (${textLen} chars): ${urlPath}`)
          written++
        } catch (err) {
          console.warn(`  skip (${err.message.split('\n')[0]}): ${urlPath}`)
          skipped++
        }
      }
    }

    await browser.close()
    console.log(`Prerendering done: ${written} written, ${skipped} skipped.`)
  } finally {
    preview.kill()
  }
}

main().catch(err => {
  // Never fail the production build over this enhancement step — worst case,
  // the site ships with the metadata-only static pages it already had.
  console.warn('Skipping prerendering — unexpected error:', err.message)
})
